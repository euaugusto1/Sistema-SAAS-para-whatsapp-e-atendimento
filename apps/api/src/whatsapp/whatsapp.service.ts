import {
    BadRequestException,
    Injectable,
    Logger,
    NotFoundException,
} from "@nestjs/common";
import { InstanceStatus as PrismaInstanceStatus } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { CreateWhatsappInstanceDto } from "./dto/create-instance.dto";
import { UpdateWhatsappInstanceDto } from "./dto/update-instance.dto";
import {
    InstanceStatus,
    QRCodeData,
} from "./interfaces/whatsapp-provider.interface";
import { EvolutionApiProvider } from "./providers/evolution-api.provider";

@Injectable()
export class WhatsappService {
  private readonly logger = new Logger(WhatsappService.name);
  private readonly provider: EvolutionApiProvider;

  constructor(private readonly prisma: PrismaService) {
    this.provider = new EvolutionApiProvider();
  }

  async create(organizationId: string, dto: CreateWhatsappInstanceDto) {
    this.logger.log(`Creating instance for organization ${organizationId}: ${dto.name}`);
    
    // Check if instance with same name already exists
    const existingByName = await this.prisma.whatsappInstance.findFirst({
      where: {
        organizationId,
        name: dto.name,
      },
    });

    if (existingByName) {
      throw new BadRequestException("Já existe uma instância com este nome nesta organização.");
    }

    // Check if phone number is already in use (if provided)
    if (dto.phoneNumber) {
      const existingByPhone = await this.prisma.whatsappInstance.findFirst({
        where: {
          phoneNumber: dto.phoneNumber,
        },
        include: {
          organization: {
            select: {
              name: true,
            },
          },
        },
      });

      if (existingByPhone) {
        const orgName = existingByPhone.organization?.name || 'outra organização';
        throw new BadRequestException(
          `Este número de telefone (${dto.phoneNumber}) já está cadastrado na instância "${existingByPhone.name}" (${orgName}). Por favor, use um número diferente ou remova a instância existente.`
        );
      }
    }

    // Create instance in database
    const instance = await this.prisma.whatsappInstance.create({
      data: {
        organizationId,
        name: dto.name,
        phoneNumber: dto.phoneNumber,
        status: PrismaInstanceStatus.DISCONNECTED,
      },
    });

    this.logger.log(`✅ Instance created in DB: ${instance.id}`);

    // Initialize connection (will generate QR code)
    try {
      await this.provider.connect(instance.id);

      // Update status
      await this.prisma.whatsappInstance.update({
        where: { id: instance.id },
        data: { status: PrismaInstanceStatus.CONNECTING },
      });
      
      this.logger.log(`✅ Instance ${instance.id} status updated to CONNECTING`);
    } catch (error) {
      this.logger.error(`Failed to connect instance ${instance.id}:`, error);
      // Não atualiza para ERROR porque não existe no enum, mantém DISCONNECTED
    }

    return instance;
  }

  async findAll(organizationId: string) {
    this.logger.log(`Finding all instances for organization: ${organizationId}`);
    
    const instances = await this.prisma.whatsappInstance.findMany({
      where: { organizationId },
      orderBy: { createdAt: "desc" },
    });

    this.logger.log(`Found ${instances.length} instances`);

    // Update statuses from provider
    for (const instance of instances) {
      try {
        const status = await this.provider.getStatus(instance.id);
        const statusString = this.mapStatusToString(status);

        if (instance.status !== statusString) {
          await this.prisma.whatsappInstance.update({
            where: { id: instance.id },
            data: { status: statusString },
          });
          instance.status = statusString;
        }
      } catch (error) {
        this.logger.warn(`Failed to update status for instance ${instance.id}`);
      }
    }

    return instances;
  }

  async findOne(organizationId: string, id: string) {
    const instance = await this.prisma.whatsappInstance.findFirst({
      where: {
        id,
        organizationId,
      },
    });

    if (!instance) {
      throw new NotFoundException("Instância não encontrada.");
    }

    // Update status from provider
    try {
      const status = await this.provider.getStatus(id);
      const statusString = this.mapStatusToString(status);

      if (instance.status !== statusString) {
        await this.prisma.whatsappInstance.update({
          where: { id },
          data: { status: statusString },
        });
        instance.status = statusString;
      }
    } catch (error) {
      this.logger.warn(`Failed to update status for instance ${id}`);
    }

    return instance;
  }

  async update(
    organizationId: string,
    id: string,
    dto: UpdateWhatsappInstanceDto
  ) {
    await this.findOne(organizationId, id);

    return this.prisma.whatsappInstance.update({
      where: { id },
      data: {
        ...(dto.name && { name: dto.name }),
        ...(dto.phoneNumber && { phoneNumber: dto.phoneNumber }),
      },
    });
  }

  async remove(organizationId: string, id: string) {
    const instance = await this.findOne(organizationId, id);

    // Disconnect from provider
    try {
      await this.provider.disconnect(id);
    } catch (error) {
      this.logger.warn(
        `Failed to disconnect instance ${id} from provider:`,
        error
      );
    }

    return this.prisma.whatsappInstance.delete({
      where: { id },
    });
  }

  async getQRCode(organizationId: string, id: string): Promise<QRCodeData> {
    this.logger.log(`Getting QR code for instance ${id}`);
    
    const instance = await this.findOne(organizationId, id);

    try {
      const qrCode = await this.provider.getQRCode(id);
      const status = await this.provider.getStatus(id);

      // Update status in database
      const statusString = this.mapStatusToString(status);
      await this.prisma.whatsappInstance.update({
        where: { id },
        data: { status: statusString },
      });

      if (!qrCode) {
        this.logger.warn(`No QR code available for instance ${id}, status: ${statusString}`);
      } else {
        this.logger.log(`✅ QR code retrieved for instance ${id}`);
      }

      return {
        qrCode,
        status,
        message: qrCode ? 'QR Code gerado com sucesso' : 'Aguardando QR Code. Tente novamente em alguns segundos.',
      };
    } catch (error) {
      this.logger.error(`Failed to get QR code for instance ${id}:`, error);
      throw new BadRequestException("Erro ao gerar QR code");
    }
  }

  async connect(organizationId: string, id: string) {
    const instance = await this.findOne(organizationId, id);

    try {
      await this.provider.connect(id);

      await this.prisma.whatsappInstance.update({
        where: { id },
        data: { status: PrismaInstanceStatus.CONNECTING },
      });

      return { message: "Conexão iniciada" };
    } catch (error) {
      this.logger.error(`Failed to connect instance ${id}:`, error);
      throw new BadRequestException("Erro ao conectar instância");
    }
  }

  async disconnect(organizationId: string, id: string) {
    const instance = await this.findOne(organizationId, id);

    try {
      await this.provider.disconnect(id);

      await this.prisma.whatsappInstance.update({
        where: { id },
        data: { status: PrismaInstanceStatus.DISCONNECTED },
      });

      return { message: "Desconectado com sucesso" };
    } catch (error) {
      this.logger.error(`Failed to disconnect instance ${id}:`, error);
      throw new BadRequestException("Erro ao desconectar instância");
    }
  }

  async sendMessage(
    instanceId: string, 
    to: string, 
    message: string,
    media?: { url: string; type: string; caption?: string; fileName?: string }
  ) {
    const result = await this.provider.sendMessage(instanceId, to, message, media);

    if (!result.success) {
      throw new BadRequestException(result.error || "Erro ao enviar mensagem");
    }

    return result;
  }

  private mapStatusToString(status: InstanceStatus): PrismaInstanceStatus {
    switch (status) {
      case InstanceStatus.CONNECTED:
        return PrismaInstanceStatus.CONNECTED;
      case InstanceStatus.CONNECTING:
      case InstanceStatus.QR_CODE:
        return PrismaInstanceStatus.CONNECTING;
      case InstanceStatus.DISCONNECTED:
      case InstanceStatus.ERROR:
      default:
        return PrismaInstanceStatus.DISCONNECTED;
    }
  }
}
