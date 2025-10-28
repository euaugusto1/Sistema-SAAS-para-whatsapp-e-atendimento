import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCampaignDto } from './dto/create-campaign.dto';
import { UpdateCampaignDto } from './dto/update-campaign.dto';

@Injectable()
export class CampaignsService {
  private readonly logger = new Logger(CampaignsService.name);

  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue('campaigns') private readonly campaignQueue: Queue,
  ) {}

  async create(organizationId: string, dto: CreateCampaignDto) {
    // Verify instance exists and belongs to organization
    const instance = await this.prisma.whatsappInstance.findFirst({
      where: {
        id: dto.instanceId,
        organizationId,
      },
    });

    if (!instance) {
      throw new BadRequestException('Instância WhatsApp não encontrada.');
    }

    // Verify instance is connected
    if (instance.status !== 'CONNECTED') {
      throw new BadRequestException('Instância WhatsApp não está conectada.');
    }

    // Create campaign
    const campaign = await this.prisma.campaign.create({
      data: {
        organizationId,
        name: dto.name,
        instanceId: dto.instanceId,
        templateId: dto.templateId,
        message: dto.message,
        scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : null,
        status: 'DRAFT',
      },
    });

    // Create campaign recipients
    if (dto.contactIds && dto.contactIds.length > 0) {
      await this.prisma.campaignRecipient.createMany({
        data: dto.contactIds.map((contactId) => ({
          campaignId: campaign.id,
          contactId,
          status: 'PENDING',
        })),
      });
    }

    return campaign;
  }

  async findAll(organizationId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const [campaigns, total] = await Promise.all([
      this.prisma.campaign.findMany({
        where: { organizationId },
        include: {
          instance: true,
          _count: {
            select: {
              recipients: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.campaign.count({
        where: { organizationId },
      }),
    ]);

    return {
      campaigns,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(organizationId: string, id: string) {
    const campaign = await this.prisma.campaign.findFirst({
      where: {
        id,
        organizationId,
      },
      include: {
        instance: true,
        template: true,
        recipients: {
          include: {
            contact: true,
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!campaign) {
      throw new NotFoundException('Campanha não encontrada.');
    }

    return campaign;
  }

  async update(organizationId: string, id: string, dto: UpdateCampaignDto) {
    const campaign = await this.findOne(organizationId, id);

    // Can only update DRAFT campaigns
    if (campaign.status !== 'DRAFT') {
      throw new BadRequestException('Apenas campanhas em rascunho podem ser editadas.');
    }

    return this.prisma.campaign.update({
      where: { id },
      data: {
        ...(dto.name && { name: dto.name }),
        ...(dto.message && { message: dto.message }),
        ...(dto.scheduledAt && { scheduledAt: new Date(dto.scheduledAt) }),
      },
    });
  }

  async remove(organizationId: string, id: string) {
    const campaign = await this.findOne(organizationId, id);

    // Can only delete DRAFT or COMPLETED campaigns
    if (!['DRAFT', 'COMPLETED', 'FAILED'].includes(campaign.status)) {
      throw new BadRequestException('Não é possível excluir uma campanha em execução.');
    }

    return this.prisma.campaign.delete({
      where: { id },
    });
  }

  async start(organizationId: string, id: string) {
    const campaign = await this.findOne(organizationId, id);

    // Verify campaign can be started
    if (!['DRAFT', 'PAUSED'].includes(campaign.status)) {
      throw new BadRequestException('Esta campanha não pode ser iniciada.');
    }

    // Verify there are recipients
    if (campaign.recipients.length === 0) {
      throw new BadRequestException('A campanha não possui destinatários.');
    }

    // Update campaign status
    await this.prisma.campaign.update({
      where: { id },
      data: {
        status: 'SCHEDULED',
        startedAt: new Date(),
      },
    });

    // Add campaign to queue
    await this.campaignQueue.add(
      'process-campaign',
      {
        campaignId: id,
        organizationId,
      },
      {
        delay: campaign.scheduledAt ? new Date(campaign.scheduledAt).getTime() - Date.now() : 0,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000,
        },
      },
    );

    this.logger.log(`Campaign ${id} added to queue`);

    return { message: 'Campanha iniciada com sucesso' };
  }

  async pause(organizationId: string, id: string) {
    const campaign = await this.findOne(organizationId, id);

    if (campaign.status !== 'RUNNING') {
      throw new BadRequestException('Apenas campanhas em execução podem ser pausadas.');
    }

    await this.prisma.campaign.update({
      where: { id },
      data: { status: 'PAUSED' },
    });

    return { message: 'Campanha pausada com sucesso' };
  }

  async resume(organizationId: string, id: string) {
    const campaign = await this.findOne(organizationId, id);

    if (campaign.status !== 'PAUSED') {
      throw new BadRequestException('Apenas campanhas pausadas podem ser retomadas.');
    }

    await this.prisma.campaign.update({
      where: { id },
      data: { status: 'RUNNING' },
    });

    // Re-add to queue
    await this.campaignQueue.add(
      'process-campaign',
      {
        campaignId: id,
        organizationId,
      },
      {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000,
        },
      },
    );

    return { message: 'Campanha retomada com sucesso' };
  }

  async getStats(organizationId: string, id: string) {
    const campaign = await this.findOne(organizationId, id);

    const stats = await this.prisma.campaignRecipient.groupBy({
      by: ['status'],
      where: { campaignId: id },
      _count: true,
    });

    const statsMap = stats.reduce((acc, stat) => {
      acc[stat.status.toLowerCase()] = stat._count;
      return acc;
    }, {} as Record<string, number>);

    const total = campaign.recipients.length;
    const sent = statsMap.sent || 0;
    const delivered = statsMap.delivered || 0;
    const failed = statsMap.failed || 0;
    const pending = statsMap.pending || 0;

    return {
      total,
      sent,
      delivered,
      failed,
      pending,
      progress: total > 0 ? Math.round((sent / total) * 100) : 0,
    };
  }
}
