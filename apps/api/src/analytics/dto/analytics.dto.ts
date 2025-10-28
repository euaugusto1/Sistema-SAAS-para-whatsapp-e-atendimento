import { IsEnum, IsOptional, IsDateString, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';

export enum MetricPeriod {
  LAST_7_DAYS = 'last_7_days',
  LAST_30_DAYS = 'last_30_days',
  LAST_90_DAYS = 'last_90_days',
  THIS_MONTH = 'this_month',
  LAST_MONTH = 'last_month',
  CUSTOM = 'custom',
}

export enum MetricType {
  MESSAGES = 'messages',
  CAMPAIGNS = 'campaigns',
  CONTACTS = 'contacts',
  REVENUE = 'revenue',
  ENGAGEMENT = 'engagement',
}

export class GetMetricsDto {
  @IsOptional()
  @IsEnum(MetricPeriod)
  period?: MetricPeriod = MetricPeriod.LAST_30_DAYS;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsEnum(MetricType, { each: true })
  metrics?: MetricType[];
}

export class GetCampaignMetricsDto {
  @IsOptional()
  @IsEnum(MetricPeriod)
  period?: MetricPeriod = MetricPeriod.LAST_30_DAYS;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;
}

export class GetMessageMetricsDto {
  @IsOptional()
  @IsEnum(MetricPeriod)
  period?: MetricPeriod = MetricPeriod.LAST_7_DAYS;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  groupByHours?: number;
}

export class GetRevenueMetricsDto {
  @IsOptional()
  @IsEnum(MetricPeriod)
  period?: MetricPeriod = MetricPeriod.THIS_MONTH;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;
}

export interface DashboardMetrics {
  overview: {
    totalMessages: number;
    messagesSent: number;
    messagesDelivered: number;
    messagesFailed: number;
    deliveryRate: number;
    totalContacts: number;
    activeContacts: number;
    totalCampaigns: number;
    activeCampaigns: number;
    totalRevenue: number;
    monthlyRevenue: number;
    activeSubscriptions: number;
  };
  messagesByDay: Array<{
    date: string;
    sent: number;
    delivered: number;
    failed: number;
  }>;
  messagesByStatus: Array<{
    status: string;
    count: number;
    percentage: number;
  }>;
  campaignPerformance: Array<{
    id: string;
    name: string;
    totalRecipients: number;
    sentCount: number;
    deliveredCount: number;
    failedCount: number;
    deliveryRate: number;
    completedAt: Date | null;
  }>;
  topContacts: Array<{
    id: string;
    name: string;
    phone: string;
    messageCount: number;
    lastMessageAt: Date;
  }>;
  revenueByMonth: Array<{
    month: string;
    revenue: number;
    subscriptions: number;
    payments: number;
  }>;
}

export interface CampaignAnalytics {
  campaignId: string;
  campaignName: string;
  status: string;
  totalRecipients: number;
  sentCount: number;
  deliveredCount: number;
  failedCount: number;
  deliveryRate: number;
  averageDeliveryTime: number;
  messagesByHour: Array<{
    hour: string;
    sent: number;
    delivered: number;
    failed: number;
  }>;
  recipientsByStatus: Array<{
    status: string;
    count: number;
    percentage: number;
  }>;
  errorsByType: Array<{
    error: string;
    count: number;
  }>;
  timeline: Array<{
    timestamp: Date;
    event: string;
    count: number;
  }>;
}

export interface MessageAnalytics {
  totalMessages: number;
  sentMessages: number;
  deliveredMessages: number;
  failedMessages: number;
  deliveryRate: number;
  averageDeliveryTime: number;
  messagesByDirection: {
    inbound: number;
    outbound: number;
  };
  messagesByHour: Array<{
    hour: string;
    count: number;
  }>;
  messagesByDay: Array<{
    date: string;
    count: number;
  }>;
  messagesByStatus: Array<{
    status: string;
    count: number;
    percentage: number;
  }>;
  topErrorMessages: Array<{
    error: string;
    count: number;
  }>;
}

export interface RevenueAnalytics {
  totalRevenue: number;
  monthlyRevenue: number;
  yearlyRevenue: number;
  averageRevenuePerUser: number;
  totalPayments: number;
  successfulPayments: number;
  failedPayments: number;
  paymentSuccessRate: number;
  revenueByMonth: Array<{
    month: string;
    revenue: number;
    payments: number;
  }>;
  revenueByPlan: Array<{
    plan: string;
    revenue: number;
    subscriptions: number;
  }>;
  revenueByProvider: Array<{
    provider: string;
    revenue: number;
    payments: number;
  }>;
  mrr: number; // Monthly Recurring Revenue
  arr: number; // Annual Recurring Revenue
  churnRate: number;
  ltv: number; // Lifetime Value
}
