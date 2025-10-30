import { InjectQueue } from '@nestjs/bull';
import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Queue, Job } from 'bull';
import { PrismaService } from '../prisma/prisma.service';
import { WhatsappService } from '../whatsapp/whatsapp.service';
import { EvolutionApiService } from './evolution-api.service';
import { SendMessageDto } from './dto/send-message.dto';
import { SendBulkMessageDto, GetGroupsDto, MessageType } from './dto/send-bulk-message.dto';
import { WebhookMessageDto } from './dto/webhook-message.dto';

@Injectable()
export class MessagesService {
  private readonly logger = new Logger(MessagesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly whatsappService: WhatsappService,
    private readonly evolutionApi: EvolutionApiService,
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

    // Validate phone number format
    const cleanPhone = dto.to.replace(/\D/g, '');
    if (cleanPhone.length < 10 || cleanPhone.length > 15) {
      throw new BadRequestException('Número de telefone inválido.');
    }

    // Find or create contact
    let contact = await this.prisma.contact.findFirst({
      where: {
        organizationId: dto.organizationId,
        phone: cleanPhone,
      },
    });

    if (!contact) {
      contact = await this.prisma.contact.create({
        data: {
          organizationId: dto.organizationId,
          phone: cleanPhone,
          name: dto.contactName,
        },
      });
    }

    // Create message record
    const message = await this.prisma.message.create({
      data: {
        organizationId: dto.organizationId,
        instanceId: dto.instanceId,
        campaignId: dto.campaignId,
        contactId: contact.id,
        phone: cleanPhone,
        direction: 'OUTBOUND',
        content: dto.message,
        mediaUrl: dto.mediaUrl,
        mediaType: dto.mediaType,
        status: 'PENDING',
      },
    });

    // Add to queue for processing
    await this.messageQueue.add(
      'send-message',
      {
        messageId: message.id,
        instanceId: dto.instanceId,
        to: cleanPhone,
        body: dto.message,
        mediaUrl: dto.mediaUrl,
        mediaType: dto.mediaType,
      },
      {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000,
        },
        removeOnComplete: 100, // Keep last 100 completed jobs
        removeOnFail: 500, // Keep last 500 failed jobs
      },
    );

    this.logger.log(`Message ${message.id} added to queue for ${cleanPhone}`);

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
        orderBy: { sentAt: 'desc' },
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
      // Find message by phone and instance (no externalId in schema yet)
      const message = await this.prisma.message.findFirst({
        where: {
          instanceId: webhookData.instanceId,
          phone: webhookData.phone,
        },
        orderBy: {
          sentAt: 'desc',
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
          errorMessage: webhookData.error,
          deliveredAt: webhookData.status === 'DELIVERED' ? new Date() : undefined,
          readAt: webhookData.status === 'READ' ? new Date() : undefined,
        },
      });

      // If message is part of a campaign, update recipient status
      if (message.campaignId && message.contactId) {
        const recipient = await this.prisma.campaignRecipient.findFirst({
          where: {
            campaignId: message.campaignId,
            contactId: message.contactId,
          },
        });

        if (recipient) {
          await this.prisma.campaignRecipient.update({
            where: { id: recipient.id },
            data: {
              status: webhookData.status,
              deliveredAt: webhookData.status === 'DELIVERED' ? new Date() : undefined,
              errorMessage: webhookData.error,
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
        errorMessage: null,
      },
    });

    // Add to queue again
    await this.messageQueue.add(
      'send-message',
      {
        messageId: id,
        instanceId: message.instanceId,
        to: message.phone,
        body: message.content,
        mediaUrl: message.mediaUrl,
        mediaType: message.mediaType,
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

  /**
   * Get groups from Evolution API
   */
  async getGroups(dto: GetGroupsDto) {
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

    try {
      const groups = await this.evolutionApi.fetchAllGroups(instance.name);
      return { groups };
    } catch (error) {
      this.logger.error(`Failed to fetch groups: ${error.message}`);
      throw new BadRequestException('Falha ao buscar grupos: ' + error.message);
    }
  }

  /**
   * Send bulk messages with interval
   */
  async sendBulk(dto: SendBulkMessageDto) {
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

    // Create a bulk job that will process recipients with intervals
    const job = await this.messageQueue.add(
      'bulk-send',
      {
        organizationId: dto.organizationId,
        instanceId: dto.instanceId,
        instanceName: instance.name,
        messageType: dto.messageType,
        recipients: dto.recipients,
        campaignId: dto.campaignId,
        intervalMinSeconds: dto.intervalMinSeconds || 61,
        intervalMaxSeconds: dto.intervalMaxSeconds || 120,
        // Message data
        text: dto.text,
        mediaType: dto.mediaType,
        media: dto.media,
        caption: dto.caption,
        fileName: dto.fileName,
        locationName: dto.locationName,
        locationAddress: dto.locationAddress,
        latitude: dto.latitude,
        longitude: dto.longitude,
        contacts: dto.contacts,
        buttonsTitle: dto.buttonsTitle,
        buttonsDescription: dto.buttonsDescription,
        buttonsFooter: dto.buttonsFooter,
        buttons: dto.buttons,
        templateName: dto.templateName,
        templateLanguage: dto.templateLanguage,
      },
      {
        attempts: 1, // Don't retry bulk jobs
        removeOnComplete: false, // Keep for progress tracking
        removeOnFail: false,
      },
    );

    this.logger.log(`Bulk send job ${job.id} created for ${dto.recipients.length} recipients`);

    const avgInterval = (dto.intervalMinSeconds + dto.intervalMaxSeconds) / 2 || 90;
    
    return {
      jobId: job.id.toString(),
      totalRecipients: dto.recipients.length,
      estimatedDuration: Math.ceil(dto.recipients.length * avgInterval),
      message: 'Envio em massa iniciado. Use o jobId para acompanhar o progresso.',
    };
  }

  /**
   * Get bulk sending progress
   */
  async getBulkProgress(jobId: string) {
    try {
      const job: Job = await this.messageQueue.getJob(jobId);

      if (!job) {
        throw new NotFoundException('Job não encontrado.');
      }

      const state = await job.getState();
      const progress = job.progress();
      const data = job.data;

      return {
        jobId,
        state,
        progress,
        totalRecipients: data.recipients.length,
        processedRecipients: Math.floor((progress / 100) * data.recipients.length),
        createdAt: job.timestamp,
        finishedAt: job.finishedOn,
        failedReason: job.failedReason,
      };
    } catch (error) {
      this.logger.error(`Failed to get bulk progress: ${error.message}`);
      throw new BadRequestException('Falha ao buscar progresso: ' + error.message);
    }
  }

  /**
   * Upload media file and convert to base64
   */
  async uploadMedia(file: any, organizationId: string) {
    if (!file) {
      throw new BadRequestException('Nenhum arquivo enviado.');
    }

    // Validate file size (max 16MB)
    const maxSize = 16 * 1024 * 1024; // 16MB
    if (file.size > maxSize) {
      throw new BadRequestException('Arquivo muito grande. Máximo: 16MB');
    }

    // Validate file type
    const allowedMimeTypes = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'video/mp4',
      'video/mpeg',
      'audio/mpeg',
      'audio/ogg',
      'audio/wav',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ];

    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException('Tipo de arquivo não permitido.');
    }

    // Convert to base64
    const base64 = file.buffer.toString('base64');
    const dataUrl = `data:${file.mimetype};base64,${base64}`;

    this.logger.log(`Media uploaded: ${file.originalname} (${file.size} bytes)`);

    return {
      fileName: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
      base64: dataUrl,
      type: this.getMediaTypeFromMime(file.mimetype),
    };
  }

  private getMediaTypeFromMime(mimeType: string): string {
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType.startsWith('video/')) return 'video';
    if (mimeType.startsWith('audio/')) return 'audio';
    return 'document';
  }
}
