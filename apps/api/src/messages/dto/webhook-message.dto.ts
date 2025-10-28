import { IsEnum, IsOptional, IsString } from 'class-validator';

export enum MessageStatus {
  PENDING = 'PENDING',
  SENT = 'SENT',
  DELIVERED = 'DELIVERED',
  READ = 'READ',
  FAILED = 'FAILED',
}

export class WebhookMessageDto {
  @IsString()
  instanceId: string;

  @IsString()
  messageId: string;

  @IsEnum(MessageStatus)
  status: MessageStatus;

  @IsString()
  @IsOptional()
  error?: string;

  @IsString()
  @IsOptional()
  timestamp?: string;
}
