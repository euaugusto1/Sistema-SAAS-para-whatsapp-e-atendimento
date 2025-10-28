import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { PrismaService } from '../prisma/prisma.service';
import { WhatsappService } from '../whatsapp/whatsapp.service';
import { SendMessageDto } from './dto/send-message.dto';
import { WebhookMessageDto } from './dto/webhook-message.dto';

@Injectable()
export class MessagesService {
  private readonly logger = new Logger(MessagesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly whatsappService: WhatsappService,
    @InjectQueue('messages') private readonly messageQueue: Queue,
  ) {}

  async send(dto: SendMessageDto) {
    // Verify instance exists and is connected
    const instance = await this.prisma.whatsappInstance.findFirst({
      where: {
        id: dto.instanceId,
        organizationId: dto.organizationId,
      },
    });

    if (!instance) {
      throw new NotFoundException('Instância WhatsApp não encontrada.');
    }

    if (instance.status !== 'CONNECTED') {
      throw new BadRequestException('Instância WhatsApp não está conectada.');
    }

    // Create message record
    const message = await this.prisma.message.create({
      data: {
        organizationId: dto.organizationId,
        instanceId: dto.instanceId,
        campaignId: dto.campaignId,
        to: dto.to,
        body: dto.message,
        status: 'PENDING',
        direction: 'OUTBOUND',
      },
    });

    // Add to queue for processing
    await this.messageQueue.add(
      'send-message',
      {
        messageId: message.id,
        instanceId: dto.instanceId,
        to: dto.to,
        body: dto.message,
      },
      {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000,
        },
      },
    );

    this.logger.log(`Message ${message.id} added to queue`);

    return message;
  }

  async findAll(organizationId: string, page = 1, limit = 50) {
    const skip = (page - 1) * limit;

    const [messages, total] = await Promise.all([
      this.prisma.message.findMany({
        where: { organizationId },
        include: {
          instance: true,
          campaign: true,
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.message.count({
        where: { organizationId },
      }),
    ]);

    return {
      messages,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(organizationId: string, id: string) {
    const message = await this.prisma.message.findFirst({
      where: {
        id,
        organizationId,
      },
      include: {
        instance: true,
        campaign: true,
      },
    });

    if (!message) {
      throw new NotFoundException('Mensagem não encontrada.');
    }

    return message;
  }

  async handleWebhook(webhookData: WebhookMessageDto) {
    this.logger.log(`Webhook received for message: ${webhookData.messageId}`);

    try {
      // Find message by external ID or instance + timestamp
      const message = await this.prisma.message.findFirst({
        where: {
          OR: [
            { externalId: webhookData.messageId },
            {
              instanceId: webhookData.instanceId,
              // Match by timestamp if externalId not available
            },
          ],
        },
      });

      if (!message) {
        this.logger.warn(`Message not found for webhook: ${webhookData.messageId}`);
        return;
      }

      // Update message status
      await this.prisma.message.update({
        where: { id: message.id },
        data: {
          status: webhookData.status,
          error: webhookData.error,
          deliveredAt: webhookData.status === 'DELIVERED' ? new Date() : undefined,
          readAt: webhookData.status === 'READ' ? new Date() : undefined,
          failedAt: webhookData.status === 'FAILED' ? new Date() : undefined,
        },
      });

      // If message is part of a campaign, update recipient status
      if (message.campaignId) {
        const recipient = await this.prisma.campaignRecipient.findFirst({
          where: {
            campaignId: message.campaignId,
            contact: {
              phoneNumber: message.to,
            },
          },
        });

        if (recipient) {
          await this.prisma.campaignRecipient.update({
            where: { id: recipient.id },
            data: {
              status: webhookData.status,
              deliveredAt: webhookData.status === 'DELIVERED' ? new Date() : undefined,
              error: webhookData.error,
            },
          });
        }
      }

      this.logger.log(`Message ${message.id} updated to status: ${webhookData.status}`);
    } catch (error) {
      this.logger.error(`Error processing webhook:`, error);
      throw error;
    }
  }

  async retry(organizationId: string, id: string) {
    const message = await this.findOne(organizationId, id);

    if (message.status !== 'FAILED') {
      throw new BadRequestException('Apenas mensagens com falha podem ser reenviadas.');
    }

    // Update status to PENDING
    await this.prisma.message.update({
      where: { id },
      data: {
        status: 'PENDING',
        error: null,
        failedAt: null,
      },
    });

    // Add to queue again
    await this.messageQueue.add(
      'send-message',
      {
        messageId: id,
        instanceId: message.instanceId,
        to: message.to,
        body: message.body,
      },
      {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000,
        },
      },
    );

    this.logger.log(`Message ${id} added to retry queue`);

    return { message: 'Mensagem adicionada à fila de reenvio' };
  }

  async getStats(organizationId: string, startDate?: Date, endDate?: Date) {
    const where: any = { organizationId };

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = startDate;
      if (endDate) where.createdAt.lte = endDate;
    }

    const stats = await this.prisma.message.groupBy({
      by: ['status'],
      where,
      _count: true,
    });

    const statsMap = stats.reduce((acc, stat) => {
      acc[stat.status.toLowerCase()] = stat._count;
      return acc;
    }, {} as Record<string, number>);

    const total = await this.prisma.message.count({ where });

    return {
      total,
      pending: statsMap.pending || 0,
      sent: statsMap.sent || 0,
      delivered: statsMap.delivered || 0,
      read: statsMap.read || 0,
      failed: statsMap.failed || 0,
      successRate: total > 0 ? Math.round(((statsMap.delivered || 0) / total) * 100) : 0,
    };
  }
}
