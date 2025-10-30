import { PartialType } from '@nestjs/mapped-types';
import { CreateContactDto } from './create-contact.dto';
import { IsArray, IsBoolean, IsOptional, IsString } from 'class-validator';

export class UpdateContactDto extends PartialType(CreateContactDto) {
	@IsArray()
	@IsString({ each: true })
	@IsOptional()
	tags?: string[];

	@IsBoolean()
	@IsOptional()
	isBlocked?: boolean;
}
