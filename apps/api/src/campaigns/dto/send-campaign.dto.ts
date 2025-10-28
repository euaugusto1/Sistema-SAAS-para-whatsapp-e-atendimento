import { IsBoolean, IsOptional } from 'class-validator';

export class SendCampaignDto {
  @IsBoolean()
  @IsOptional()
  immediately?: boolean = false;
}
