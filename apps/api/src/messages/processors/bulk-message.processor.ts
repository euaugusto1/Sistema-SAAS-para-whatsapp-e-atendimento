import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { EvolutionApiService } from '../evolution-api.service';
import { PrismaService } from '../../prisma/prisma.service';
import { MessageType } from '../dto/send-bulk-message.dto';

@Processor('messages')
export class BulkMessageProcessor {
  private readonly logger = new Logger(BulkMessageProcessor.name);

  constructor(
    private readonly evolutionApi: EvolutionApiService,
    private readonly prisma: PrismaService,
  ) {}

  @Process('bulk-send')
  async handleBulkSend(job: Job) {
    const {
      organizationId,
      instanceId,
      instanceName,
      messageType,
      recipients,
      campaignId,
      intervalMinSeconds,
      intervalMaxSeconds,
      ...messageData
    } = job.data;

    this.logger.log(`Processing bulk send job ${job.id} for ${recipients.length} recipients`);
    this.logger.log(`Random interval: ${intervalMinSeconds}-${intervalMaxSeconds}s`);

    let processedCount = 0;
    const results = {
      success: 0,
      failed: 0,
      errors: [],
    };

    for (const recipient of recipients) {
      try {
        // Wait for random interval before sending (except first message)
        if (processedCount > 0) {
          const randomInterval = this.getRandomInterval(intervalMinSeconds, intervalMaxSeconds);
          const delayMs = randomInterval * 1000;
          this.logger.log(`Waiting ${randomInterval}s before next message...`);
          await this.sleep(delayMs);
        }

        // Send message based on type
        let response;
        switch (messageType) {
          case MessageType.TEXT:
            response = await this.evolutionApi.sendText(instanceName, {
              number: recipient,
              text: messageData.text,
            });
            break;

          case MessageType.MEDIA:
            response = await this.evolutionApi.sendMedia(instanceName, {
              number: recipient,
              mediaType: messageData.mediaType,
              media: messageData.media,
              caption: messageData.caption,
              fileName: messageData.fileName,
            });
            break;

          case MessageType.AUDIO:
            response = await this.evolutionApi.sendAudio(instanceName, {
              number: recipient,
              audio: messageData.media,
            });
            break;

          case MessageType.LOCATION:
            response = await this.evolutionApi.sendLocation(instanceName, {
              number: recipient,
              name: messageData.locationName,
              address: messageData.locationAddress,
              latitude: messageData.latitude,
              longitude: messageData.longitude,
            });
            break;

          case MessageType.CONTACT:
            response = await this.evolutionApi.sendContact(instanceName, {
              number: recipient,
              contacts: messageData.contacts,
            });
            break;

          case MessageType.BUTTONS:
            response = await this.evolutionApi.sendButtons(instanceName, {
              number: recipient,
              title: messageData.buttonsTitle,
              description: messageData.buttonsDescription,
              footer: messageData.buttonsFooter,
              buttons: messageData.buttons,
            });
            break;

          case MessageType.STICKER:
            response = await this.evolutionApi.sendSticker(instanceName, {
              number: recipient,
              image: messageData.media,
            });
            break;

          case MessageType.TEMPLATE:
            response = await this.evolutionApi.sendTemplate(instanceName, {
              number: recipient,
              templateName: messageData.templateName,
              language: messageData.templateLanguage || 'pt_BR',
            });
            break;

          case MessageType.STATUS:
            response = await this.evolutionApi.sendStatus(instanceName, messageData.text);
            break;

          default:
            throw new Error(`Unsupported message type: ${messageType}`);
        }

        // Save message to database
        await this.prisma.message.create({
          data: {
            organizationId,
            instanceId,
            campaignId,
            phone: recipient,
            direction: 'OUTBOUND',
            content: messageData.text || messageData.caption || `[${messageType}]`,
            mediaUrl: messageData.media,
            mediaType: messageData.mediaType,
            status: 'SENT',
            sentAt: new Date(),
          },
        });

        results.success++;
        this.logger.log(`Message sent successfully to ${recipient}`);
      } catch (error) {
        results.failed++;
        results.errors.push({
          recipient,
          error: error.message,
        });
        this.logger.error(`Failed to send message to ${recipient}: ${error.message}`);

        // Save failed message
        try {
          await this.prisma.message.create({
            data: {
              organizationId,
              instanceId,
              campaignId,
              phone: recipient,
              direction: 'OUTBOUND',
              content: messageData.text || messageData.caption || `[${messageType}]`,
              mediaUrl: messageData.media,
              mediaType: messageData.mediaType,
              status: 'FAILED',
              errorMessage: error.message,
            },
          });
        } catch (dbError) {
          this.logger.error(`Failed to save error message: ${dbError.message}`);
        }
      }

      processedCount++;
      
      // Update job progress
      const progress = Math.round((processedCount / recipients.length) * 100);
      await job.progress(progress);
    }

    this.logger.log(
      `Bulk send job ${job.id} completed. Success: ${results.success}, Failed: ${results.failed}`,
    );

    return results;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private getRandomInterval(min: number, max: number): number {
    // Gera um número aleatório entre min e max (inclusive)
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }
}
