import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Logger,
} from '@nestjs/common';
import { WhatsappService } from './whatsapp.service';
import { CreateWhatsappInstanceDto } from './dto/create-instance.dto';
import { UpdateWhatsappInstanceDto } from './dto/update-instance.dto';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { OrganizationGuard } from '../common/guards/organization.guard';
import { CurrentUser } from '../auth/current-user.decorator';

interface RequestUser {
  userId: string;
  organizationId: string;
}

@Controller('whatsapp/instances')
@UseGuards(JwtAuthGuard, OrganizationGuard)
export class WhatsappController {
  private readonly logger = new Logger(WhatsappController.name);
  
  constructor(private readonly whatsappService: WhatsappService) {}

  @Post()
  create(@CurrentUser() user: RequestUser, @Body() createDto: CreateWhatsappInstanceDto) {
    this.logger.log(`Creating instance for organization ${user.organizationId}: ${createDto.name}`);
    return this.whatsappService.create(user.organizationId, createDto);
  }

  @Get()
  findAll(@CurrentUser() user: RequestUser) {
    this.logger.log(`Finding all instances for organization ${user.organizationId}`);
    return this.whatsappService.findAll(user.organizationId);
  }

  @Get(':id')
  findOne(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.whatsappService.findOne(user.organizationId, id);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body() updateDto: UpdateWhatsappInstanceDto,
  ) {
    return this.whatsappService.update(user.organizationId, id, updateDto);
  }

  @Delete(':id')
  remove(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.whatsappService.remove(user.organizationId, id);
  }

  @Get(':id/qrcode')
  getQRCode(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.whatsappService.getQRCode(user.organizationId, id);
  }

  @Post(':id/connect')
  connect(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.whatsappService.connect(user.organizationId, id);
  }

  @Post(':id/disconnect')
  disconnect(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.whatsappService.disconnect(user.organizationId, id);
  }
}
