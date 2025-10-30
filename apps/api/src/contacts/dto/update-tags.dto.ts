import { IsArray, IsOptional, IsString } from 'class-validator';

export class UpdateTagsDto {
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags: string[] = [];
}
