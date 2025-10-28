import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { MessagesService } from './messages.service';
import { SendMessageDto } from './dto/send-message.dto';
import { WebhookMessageDto } from './dto/webhook-message.dto';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { OrganizationGuard } from '../common/guards/organization.guard';
import { Public } from '../common/decorators/public.decorator';
import { SkipRateLimit } from '../common/decorators/rate-limit.decorator';

@Controller('messages')
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) {}

  @Post()
  @UseGuards(JwtAuthGuard, OrganizationGuard)
  send(@Body() dto: SendMessageDto) {
    return this.messagesService.send(dto);
  }

  @Get()
  @UseGuards(JwtAuthGuard, OrganizationGuard)
  findAll(
    @Query('organizationId') organizationId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.messagesService.findAll(
      organizationId,
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 50,
    );
  }

  @Get('stats')
  @UseGuards(JwtAuthGuard, OrganizationGuard)
  getStats(
    @Query('organizationId') organizationId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.messagesService.getStats(
      organizationId,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
    );
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, OrganizationGuard)
  findOne(@Query('organizationId') organizationId: string, @Param('id') id: string) {
    return this.messagesService.findOne(organizationId, id);
  }

  @Post(':id/retry')
  @UseGuards(JwtAuthGuard, OrganizationGuard)
  retry(@Query('organizationId') organizationId: string, @Param('id') id: string) {
    return this.messagesService.retry(organizationId, id);
  }

  /**
   * Webhook endpoint to receive message status updates from Evolution API
   * This endpoint should be configured in Evolution API settings
   * No authentication required as it comes from external service
   */
  @Public()
  @SkipRateLimit()
  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  async handleWebhook(@Body() webhookData: WebhookMessageDto) {
    await this.messagesService.handleWebhook(webhookData);
    return { success: true };
  }
}
