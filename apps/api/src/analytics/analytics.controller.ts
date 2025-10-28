import { Controller, Get, Query, Param, UseGuards } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import {
  GetMetricsDto,
  GetCampaignMetricsDto,
  GetMessageMetricsDto,
  GetRevenueMetricsDto,
} from './dto/analytics.dto';

@Controller('analytics')
@UseGuards(JwtAuthGuard)
export class AnalyticsController {
  constructor(private analyticsService: AnalyticsService) {}

  @Get('dashboard')
  async getDashboard(
    @CurrentUser('organizationId') organizationId: string,
    @Query() dto: GetMetricsDto,
  ) {
    return this.analyticsService.getDashboardMetrics(organizationId, dto);
  }

  @Get('messages')
  async getMessageAnalytics(
    @CurrentUser('organizationId') organizationId: string,
    @Query() dto: GetMessageMetricsDto,
  ) {
    return this.analyticsService.getMessageAnalytics(organizationId, dto);
  }

  @Get('revenue')
  async getRevenueAnalytics(
    @CurrentUser('organizationId') organizationId: string,
    @Query() dto: GetRevenueMetricsDto,
  ) {
    return this.analyticsService.getRevenueAnalytics(organizationId, dto);
  }

  @Get('campaigns/:id')
  async getCampaignAnalytics(
    @Param('id') campaignId: string,
    @Query() dto: GetCampaignMetricsDto,
  ) {
    return this.analyticsService.getCampaignAnalytics(campaignId, dto);
  }
}
