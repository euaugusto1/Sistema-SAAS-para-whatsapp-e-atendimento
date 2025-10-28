import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateWhatsappInstanceDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  phoneNumber?: string;
}
