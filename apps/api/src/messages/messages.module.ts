import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { MessagesService } from './messages.service';
import { MessagesController } from './messages.controller';
import { MessageProcessor } from './processors/message.processor';
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
  providers: [MessagesService, MessageProcessor],
  exports: [MessagesService],
})
export class MessagesModule {}
