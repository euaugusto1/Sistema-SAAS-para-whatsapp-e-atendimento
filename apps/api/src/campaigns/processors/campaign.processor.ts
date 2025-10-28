import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { PrismaService } from '../../prisma/prisma.service';
import { WhatsappService } from '../../whatsapp/whatsapp.service';

interface CampaignJob {
  campaignId: string;
  organizationId: string;
}

@Processor('campaigns')
export class CampaignProcessor {
  private readonly logger = new Logger(CampaignProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly whatsappService: WhatsappService,
  ) {}

  @Process('process-campaign')
  async processCampaign(job: Job<CampaignJob>) {
    const { campaignId, organizationId } = job.data;

    this.logger.log(`Processing campaign ${campaignId}`);

    try {
      // Get campaign with recipients
      const campaign = await this.prisma.campaign.findUnique({
        where: { id: campaignId },
        include: {
          instance: true,
          recipients: {
            where: { status: 'PENDING' },
            include: { contact: true },
          },
        },
      });

      if (!campaign) {
        throw new Error('Campaign not found');
      }

      // Check if campaign is paused
      if (campaign.status === 'PAUSED') {
        this.logger.log(`Campaign ${campaignId} is paused, skipping`);
        return;
      }

      // Update campaign status to RUNNING
      await this.prisma.campaign.update({
        where: { id: campaignId },
        data: { status: 'RUNNING' },
      });

      const totalRecipients = campaign.recipients.length;
      let processed = 0;
      let failed = 0;

      // Process each recipient
      for (const recipient of campaign.recipients) {
        try {
          // Check if campaign is still running
          const currentCampaign = await this.prisma.campaign.findUnique({
            where: { id: campaignId },
            select: { status: true },
          });

          if (currentCampaign?.status === 'PAUSED') {
            this.logger.log(`Campaign ${campaignId} was paused, stopping processing`);
            break;
          }

          // Skip if recipient doesn't have phone number
          if (!recipient.contact.phoneNumber) {
            await this.prisma.campaignRecipient.update({
              where: { id: recipient.id },
              data: {
                status: 'FAILED',
                error: 'Contact has no phone number',
              },
            });
            failed++;
            continue;
          }

          // Prepare message (replace variables if any)
          let message = campaign.message || '';
          message = message.replace(/\{name\}/g, recipient.contact.name || '');
          message = message.replace(/\{phone\}/g, recipient.contact.phoneNumber || '');

          // Send message
          const result = await this.whatsappService.sendMessage(
            campaign.instanceId,
            recipient.contact.phoneNumber,
            message,
          );

          if (result.success) {
            // Update recipient status
            await this.prisma.campaignRecipient.update({
              where: { id: recipient.id },
              data: {
                status: 'SENT',
                sentAt: new Date(),
              },
            });

            // Create message record
            await this.prisma.message.create({
              data: {
                organizationId,
                instanceId: campaign.instanceId,
                campaignId: campaign.id,
                to: recipient.contact.phoneNumber,
                body: message,
                status: 'SENT',
                direction: 'OUTBOUND',
              },
            });

            processed++;
          } else {
            // Update recipient with error
            await this.prisma.campaignRecipient.update({
              where: { id: recipient.id },
              data: {
                status: 'FAILED',
                error: result.error || 'Unknown error',
              },
            });

            failed++;
          }

          // Update job progress
          await job.progress(Math.round((processed / totalRecipients) * 100));

          // Add delay between messages to avoid rate limiting (2-5 seconds)
          const delay = Math.floor(Math.random() * 3000) + 2000;
          await new Promise((resolve) => setTimeout(resolve, delay));
        } catch (error) {
          this.logger.error(`Error processing recipient ${recipient.id}:`, error);

          await this.prisma.campaignRecipient.update({
            where: { id: recipient.id },
            data: {
              status: 'FAILED',
              error: error.message || 'Unknown error',
            },
          });

          failed++;
        }
      }

      // Update campaign status
      const finalStatus = failed === totalRecipients ? 'FAILED' : 'COMPLETED';

      await this.prisma.campaign.update({
        where: { id: campaignId },
        data: {
          status: finalStatus,
          completedAt: new Date(),
        },
      });

      this.logger.log(
        `Campaign ${campaignId} completed. Processed: ${processed}, Failed: ${failed}`,
      );
    } catch (error) {
      this.logger.error(`Error processing campaign ${campaignId}:`, error);

      await this.prisma.campaign.update({
        where: { id: campaignId },
        data: {
          status: 'FAILED',
          completedAt: new Date(),
        },
      });

      throw error;
    }
  }
}
