import { IsBoolean } from 'class-validator';

export class BlockContactDto {
  @IsBoolean()
  isBlocked: boolean;
}
