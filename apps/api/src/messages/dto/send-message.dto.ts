import { IsNotEmpty, IsOptional, IsString, IsUUID, IsUrl } from 'class-validator';

export class SendMessageDto {
  @IsString()
  @IsUUID()
  instanceId: string;

  @IsString()
  @IsNotEmpty()
  to: string;

  @IsString()
  @IsNotEmpty()
  message: string;

  @IsString()
  @IsOptional()
  campaignId?: string;

  @IsString()
  @IsNotEmpty()
  organizationId: string;

  @IsString()
  @IsOptional()
  contactName?: string;

  @IsUrl()
  @IsOptional()
  mediaUrl?: string;

  @IsString()
  @IsOptional()
  mediaType?: string; // image, video, audio, document
}
