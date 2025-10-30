import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { PrismaService } from '../../prisma/prisma.service';
import { WhatsappService } from '../../whatsapp/whatsapp.service';

interface MessageJob {
  messageId: string;
  instanceId: string;
  to: string;
  body: string;
  mediaUrl?: string;
  mediaType?: string;
}

@Processor('messages')
export class MessageProcessor {
  private readonly logger = new Logger(MessageProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly whatsappService: WhatsappService,
  ) {}

  @Process('send-message')
  async sendMessage(job: Job<MessageJob>) {
    const { messageId, instanceId, to, body, mediaUrl, mediaType } = job.data;

    this.logger.log(`Processing message ${messageId}${mediaUrl ? ' with media' : ''}`);

    try {
      // Prepare media object if available
      const media = mediaUrl ? {
        url: mediaUrl,
        type: mediaType || 'image',
        caption: body,
      } : undefined;

      // Send message via WhatsApp (with or without media)
      const result = await this.whatsappService.sendMessage(instanceId, to, body, media);

      if (result.success) {
        // Update message status
        await this.prisma.message.update({
          where: { id: messageId },
          data: {
            status: 'SENT',
            sentAt: new Date(),
          },
        });

        this.logger.log(`Message ${messageId} sent successfully`);
      } else {
        // Mark as failed
        await this.prisma.message.update({
          where: { id: messageId },
          data: {
            status: 'FAILED',
            errorMessage: result.error || 'Unknown error',
          },
        });

        this.logger.error(`Message ${messageId} failed: ${result.error}`);

        // If this is the last attempt, don't retry
        if (job.attemptsMade >= (job.opts.attempts || 3)) {
          this.logger.error(`Message ${messageId} failed after ${job.attemptsMade} attempts`);
        }

        throw new Error(result.error || 'Failed to send message');
      }
    } catch (error) {
      this.logger.error(`Error processing message ${messageId}:`, error);

      // Update message with error
      await this.prisma.message.update({
        where: { id: messageId },
        data: {
          status: 'FAILED',
          errorMessage: error.message || 'Unknown error',
        },
      });

      throw error;
    }
  }

  @Process('retry-message')
  async retryMessage(job: Job<MessageJob>) {
    this.logger.log(`Retrying message ${job.data.messageId} (attempt ${job.attemptsMade + 1})`);
    return this.sendMessage(job);
  }
}
