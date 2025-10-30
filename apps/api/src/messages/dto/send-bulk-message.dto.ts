import { IsString, IsOptional, IsNumber, IsArray, IsEnum, IsBoolean, Min, Max, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export enum MessageType {
  TEXT = 'TEXT',
  MEDIA = 'MEDIA',
  AUDIO = 'AUDIO',
  LOCATION = 'LOCATION',
  CONTACT = 'CONTACT',
  BUTTONS = 'BUTTONS',
  STICKER = 'STICKER',
  TEMPLATE = 'TEMPLATE',
  STATUS = 'STATUS',
}

export enum MediaType {
  IMAGE = 'image',
  VIDEO = 'video',
  AUDIO = 'audio',
  DOCUMENT = 'document',
}

export class ContactDto {
  @IsString()
  fullName: string;

  @IsString()
  phoneNumber: string;

  @IsOptional()
  @IsString()
  organization?: string;

  @IsOptional()
  @IsString()
  email?: string;
}

export class ButtonDto {
  @IsString()
  title: string;

  @IsString()
  displayText: string;

  @IsString()
  id: string;
}

export class SendBulkMessageDto {
  @IsString()
  instanceId: string;

  @IsString()
  organizationId: string;

  @IsEnum(MessageType)
  messageType: MessageType;

  @IsArray()
  @IsString({ each: true })
  recipients: string[]; // Array of phone numbers or group JIDs

  @IsOptional()
  @IsString()
  campaignId?: string;

  // Text message
  @IsOptional()
  @IsString()
  text?: string;

  // Media message
  @IsOptional()
  @IsEnum(MediaType)
  mediaType?: MediaType;

  @IsOptional()
  @IsString()
  media?: string; // URL or base64

  @IsOptional()
  @IsString()
  caption?: string;

  @IsOptional()
  @IsString()
  fileName?: string;

  // Location message
  @IsOptional()
  @IsString()
  locationName?: string;

  @IsOptional()
  @IsString()
  locationAddress?: string;

  @IsOptional()
  @IsNumber()
  latitude?: number;

  @IsOptional()
  @IsNumber()
  longitude?: number;

  // Contact message
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ContactDto)
  contacts?: ContactDto[];

  // Buttons message
  @IsOptional()
  @IsString()
  buttonsTitle?: string;

  @IsOptional()
  @IsString()
  buttonsDescription?: string;

  @IsOptional()
  @IsString()
  buttonsFooter?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ButtonDto)
  buttons?: ButtonDto[];

  // Template message
  @IsOptional()
  @IsString()
  templateName?: string;

  @IsOptional()
  @IsString()
  templateLanguage?: string;

  // Sending interval (in seconds) - random between min and max
  @IsOptional()
  @IsNumber()
  @Min(61)
  @Max(300)
  intervalMinSeconds?: number = 61;

  @IsOptional()
  @IsNumber()
  @Min(61)
  @Max(300)
  intervalMaxSeconds?: number = 120;

  @IsOptional()
  @IsBoolean()
  sendToGroups?: boolean = false;
}

export class GetGroupsDto {
  @IsString()
  instanceId: string;

  @IsString()
  organizationId: string;
}
