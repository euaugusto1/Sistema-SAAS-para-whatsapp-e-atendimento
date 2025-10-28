import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
} from '@nestjs/common';
import { CampaignsService } from './campaigns.service';
import { CreateCampaignDto } from './dto/create-campaign.dto';
import { UpdateCampaignDto } from './dto/update-campaign.dto';
import { SendCampaignDto } from './dto/send-campaign.dto';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { OrganizationGuard } from '../common/guards/organization.guard';
import { CurrentUser } from '../auth/current-user.decorator';

@Controller('campaigns')
@UseGuards(JwtAuthGuard, OrganizationGuard)
export class CampaignsController {
  constructor(private readonly campaignsService: CampaignsService) {}

  @Post()
  create(@Body() dto: CreateCampaignDto) {
    return this.campaignsService.create(dto.organizationId, dto);
  }

  @Get()
  findAll(
    @Query('organizationId') organizationId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.campaignsService.findAll(
      organizationId,
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 20,
    );
  }

  @Get(':id')
  findOne(@Query('organizationId') organizationId: string, @Param('id') id: string) {
    return this.campaignsService.findOne(organizationId, id);
  }

  @Patch(':id')
  update(
    @Query('organizationId') organizationId: string,
    @Param('id') id: string,
    @Body() dto: UpdateCampaignDto,
  ) {
    return this.campaignsService.update(organizationId, id, dto);
  }

  @Delete(':id')
  remove(@Query('organizationId') organizationId: string, @Param('id') id: string) {
    return this.campaignsService.remove(organizationId, id);
  }

  @Post(':id/start')
  start(
    @Query('organizationId') organizationId: string,
    @Param('id') id: string,
    @Body() dto: SendCampaignDto,
  ) {
    return this.campaignsService.start(organizationId, id);
  }

  @Post(':id/pause')
  pause(@Query('organizationId') organizationId: string, @Param('id') id: string) {
    return this.campaignsService.pause(organizationId, id);
  }

  @Post(':id/resume')
  resume(@Query('organizationId') organizationId: string, @Param('id') id: string) {
    return this.campaignsService.resume(organizationId, id);
  }

  @Get(':id/stats')
  getStats(@Query('organizationId') organizationId: string, @Param('id') id: string) {
    return this.campaignsService.getStats(organizationId, id);
  }
}
