import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { MessagesService } from './messages.service';
import { MessagesController } from './messages.controller';
import { EvolutionApiService } from './evolution-api.service';
import { MessageProcessor } from './processors/message.processor';
// @ts-ignore
import { BulkMessageProcessor } from './processors/bulk-message.processor';
import { PrismaModule } from '../prisma/prisma.module';
import { WhatsappModule } from '../whatsapp/whatsapp.module';
import { OrganizationsModule } from '../organizations/organizations.module';

@Module({
  imports: [
    PrismaModule,
    WhatsappModule,
    OrganizationsModule,
    BullModule.registerQueue({
      name: 'messages',
    }),
  ],
  controllers: [MessagesController],
  providers: [MessagesService, EvolutionApiService, MessageProcessor, BulkMessageProcessor],
  exports: [MessagesService, EvolutionApiService],
})
export class MessagesModule {}
