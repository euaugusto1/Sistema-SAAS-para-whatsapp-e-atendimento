import { IsOptional, IsString } from 'class-validator';

export class AddToListDto {
  @IsString()
  @IsOptional()
  listId?: string;

  @IsString()
  @IsOptional()
  listName?: string;
}
