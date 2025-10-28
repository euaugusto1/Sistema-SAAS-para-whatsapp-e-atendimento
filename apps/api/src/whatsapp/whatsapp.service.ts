import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CreateWhatsappInstanceDto } from "./dto/create-instance.dto";
import { UpdateWhatsappInstanceDto } from "./dto/update-instance.dto";
import { EvolutionApiProvider } from "./providers/evolution-api.provider";
import {
  InstanceStatus,
  QRCodeData,
} from "./interfaces/whatsapp-provider.interface";

@Injectable()
export class WhatsappService {
  private readonly logger = new Logger(WhatsappService.name);
  private readonly provider: EvolutionApiProvider;

  constructor(private readonly prisma: PrismaService) {
    this.provider = new EvolutionApiProvider();
  }

  async create(organizationId: string, dto: CreateWhatsappInstanceDto) {
    // Check if instance with same name already exists
    const existing = await this.prisma.whatsappInstance.findFirst({
      where: {
        organizationId,
        name: dto.name,
      },
    });

    if (existing) {
      throw new BadRequestException("Instância com este nome já existe.");
    }

    // Create instance in database
    const instance = await this.prisma.whatsappInstance.create({
      data: {
        organizationId,
        name: dto.name,
        phoneNumber: dto.phoneNumber,
        status: "DISCONNECTED",
      },
    });

    // Initialize connection (will generate QR code)
    try {
      await this.provider.connect(instance.id);

      // Update status
      await this.prisma.whatsappInstance.update({
        where: { id: instance.id },
        data: { status: "CONNECTING" },
      });
    } catch (error) {
      this.logger.error(`Failed to connect instance ${instance.id}:`, error);
      await this.prisma.whatsappInstance.update({
        where: { id: instance.id },
        data: { status: "ERROR" },
      });
    }

    return instance;
  }

  async findAll(organizationId: string) {
    const instances = await this.prisma.whatsappInstance.findMany({
      where: { organizationId },
      orderBy: { createdAt: "desc" },
    });

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
    await this.findOne(organizationId, id);

    try {
      const qrCode = await this.provider.getQRCode(id);
      const status = await this.provider.getStatus(id);

      // Update status in database
      const statusString = this.mapStatusToString(status);
      await this.prisma.whatsappInstance.update({
        where: { id },
        data: { status: statusString },
      });

      return {
        qrCode,
        status,
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
        data: { status: "CONNECTING" },
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
        data: { status: "DISCONNECTED" },
      });

      return { message: "Desconectado com sucesso" };
    } catch (error) {
      this.logger.error(`Failed to disconnect instance ${id}:`, error);
      throw new BadRequestException("Erro ao desconectar instância");
    }
  }

  async sendMessage(instanceId: string, to: string, message: string) {
    const result = await this.provider.sendMessage(instanceId, to, message);

    if (!result.success) {
      throw new BadRequestException(result.error || "Erro ao enviar mensagem");
    }

    return result;
  }

  private mapStatusToString(status: InstanceStatus): string {
    return status.toString();
  }
}
