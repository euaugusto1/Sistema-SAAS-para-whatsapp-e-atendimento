import { PartialType } from '@nestjs/mapped-types';
import { CreateWhatsappInstanceDto } from './create-instance.dto';

export class UpdateWhatsappInstanceDto extends PartialType(CreateWhatsappInstanceDto) {}
