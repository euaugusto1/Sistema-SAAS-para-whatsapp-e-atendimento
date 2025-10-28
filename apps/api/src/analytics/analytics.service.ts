import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  GetMetricsDto,
  GetCampaignMetricsDto,
  GetMessageMetricsDto,
  GetRevenueMetricsDto,
  DashboardMetrics,
  CampaignAnalytics,
  MessageAnalytics,
  RevenueAnalytics,
  MetricPeriod,
} from './dto/analytics.dto';

@Injectable()
export class AnalyticsService {
  constructor(private prisma: PrismaService) {}

  private getDateRange(period: MetricPeriod, startDate?: string, endDate?: string) {
    const now = new Date();
    let start: Date;
    let end: Date = now;

    if (period === MetricPeriod.CUSTOM && startDate && endDate) {
      return {
        start: new Date(startDate),
        end: new Date(endDate),
      };
    }

    switch (period) {
      case MetricPeriod.LAST_7_DAYS:
        start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case MetricPeriod.LAST_30_DAYS:
        start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case MetricPeriod.LAST_90_DAYS:
        start = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case MetricPeriod.THIS_MONTH:
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case MetricPeriod.LAST_MONTH:
        start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        end = new Date(now.getFullYear(), now.getMonth(), 0);
        break;
      default:
        start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    return { start, end };
  }

  async getDashboardMetrics(
    organizationId: string,
    dto: GetMetricsDto,
  ): Promise<DashboardMetrics> {
    const { start, end } = this.getDateRange(dto.period, dto.startDate, dto.endDate);

    // Overview metrics
    const [
      totalMessages,
      messagesSent,
      messagesDelivered,
      messagesFailed,
      totalContacts,
      activeContacts,
      totalCampaigns,
      activeCampaigns,
      payments,
      activeSubscriptions,
    ] = await Promise.all([
      this.prisma.message.count({
        where: { organizationId, sentAt: { gte: start, lte: end } },
      }),
      this.prisma.message.count({
        where: {
          organizationId,
          sentAt: { gte: start, lte: end },
          status: { in: ['SENT', 'DELIVERED', 'READ'] },
        },
      }),
      this.prisma.message.count({
        where: {
          organizationId,
          sentAt: { gte: start, lte: end },
          status: { in: ['DELIVERED', 'READ'] },
        },
      }),
      this.prisma.message.count({
        where: {
          organizationId,
          sentAt: { gte: start, lte: end },
          status: 'FAILED',
        },
      }),
      this.prisma.contact.count({ where: { organizationId } }),
      this.prisma.contact.count({
        where: {
          organizationId,
          messages: { some: { sentAt: { gte: start, lte: end } } },
        },
      }),
      this.prisma.campaign.count({ where: { organizationId } }),
      this.prisma.campaign.count({
        where: { organizationId, status: { in: ['SCHEDULED', 'SENDING'] } },
      }),
      this.prisma.payment.aggregate({
        where: {
          user: { ownedOrganizations: { some: { id: organizationId } } },
          paidAt: { gte: start, lte: end },
          status: 'SUCCEEDED',
        },
        _sum: { amount: true },
        _count: true,
      }),
      this.prisma.subscription.count({
        where: {
          user: { ownedOrganizations: { some: { id: organizationId } } },
          status: 'ACTIVE',
        },
      }),
    ]);

    const deliveryRate = totalMessages > 0 ? (messagesDelivered / totalMessages) * 100 : 0;

    // Messages by day
    const messagesByDay = await this.getMessagesByDay(organizationId, start, end);

    // Messages by status
    const messagesByStatus = await this.getMessagesByStatus(organizationId, start, end);

    // Campaign performance
    const campaignPerformance = await this.getCampaignPerformance(
      organizationId,
      start,
      end,
    );

    // Top contacts
    const topContacts = await this.getTopContacts(organizationId, start, end);

    // Revenue by month
    const revenueByMonth = await this.getRevenueByMonth(organizationId, start, end);

    return {
      overview: {
        totalMessages,
        messagesSent,
        messagesDelivered,
        messagesFailed,
        deliveryRate: Math.round(deliveryRate * 100) / 100,
        totalContacts,
        activeContacts,
        totalCampaigns,
        activeCampaigns,
        totalRevenue: Number(payments._sum.amount || 0),
        monthlyRevenue: Number(payments._sum.amount || 0),
        activeSubscriptions,
      },
      messagesByDay,
      messagesByStatus,
      campaignPerformance,
      topContacts,
      revenueByMonth,
    };
  }

  private async getMessagesByDay(
    organizationId: string,
    start: Date,
    end: Date,
  ): Promise<DashboardMetrics['messagesByDay']> {
    const messages = await this.prisma.$queryRaw<
      Array<{ date: string; status: string; count: bigint }>
    >`
      SELECT 
        DATE(sent_at) as date,
        status,
        COUNT(*) as count
      FROM messages
      WHERE organization_id = ${organizationId}
        AND sent_at >= ${start}
        AND sent_at <= ${end}
      GROUP BY DATE(sent_at), status
      ORDER BY date ASC
    `;

    const grouped = new Map<string, { sent: number; delivered: number; failed: number }>();

    messages.forEach((msg) => {
      const date = msg.date;
      if (!grouped.has(date)) {
        grouped.set(date, { sent: 0, delivered: 0, failed: 0 });
      }
      const data = grouped.get(date)!;
      const count = Number(msg.count);

      if (['SENT', 'DELIVERED', 'READ'].includes(msg.status)) {
        data.sent += count;
      }
      if (['DELIVERED', 'READ'].includes(msg.status)) {
        data.delivered += count;
      }
      if (msg.status === 'FAILED') {
        data.failed += count;
      }
    });

    return Array.from(grouped.entries()).map(([date, data]) => ({
      date,
      ...data,
    }));
  }

  private async getMessagesByStatus(
    organizationId: string,
    start: Date,
    end: Date,
  ): Promise<DashboardMetrics['messagesByStatus']> {
    const messages = await this.prisma.message.groupBy({
      by: ['status'],
      where: {
        organizationId,
        sentAt: { gte: start, lte: end },
      },
      _count: true,
    });

    const total = messages.reduce((sum, msg) => sum + msg._count, 0);

    return messages.map((msg) => ({
      status: msg.status,
      count: msg._count,
      percentage: total > 0 ? Math.round((msg._count / total) * 10000) / 100 : 0,
    }));
  }

  private async getCampaignPerformance(
    organizationId: string,
    start: Date,
    end: Date,
  ): Promise<DashboardMetrics['campaignPerformance']> {
    const campaigns = await this.prisma.campaign.findMany({
      where: {
        organizationId,
        startedAt: { gte: start, lte: end },
      },
      select: {
        id: true,
        name: true,
        totalRecipients: true,
        sentCount: true,
        deliveredCount: true,
        failedCount: true,
        completedAt: true,
      },
      orderBy: { startedAt: 'desc' },
      take: 10,
    });

    return campaigns.map((campaign) => ({
      ...campaign,
      deliveryRate:
        campaign.totalRecipients > 0
          ? Math.round((campaign.deliveredCount / campaign.totalRecipients) * 10000) / 100
          : 0,
    }));
  }

  private async getTopContacts(
    organizationId: string,
    start: Date,
    end: Date,
  ): Promise<DashboardMetrics['topContacts']> {
    const contacts = await this.prisma.$queryRaw<
      Array<{
        id: string;
        name: string | null;
        phone: string;
        message_count: bigint;
        last_message_at: Date;
      }>
    >`
      SELECT 
        c.id,
        c.name,
        c.phone,
        COUNT(m.id) as message_count,
        MAX(m.sent_at) as last_message_at
      FROM contacts c
      INNER JOIN messages m ON m.contact_id = c.id
      WHERE c.organization_id = ${organizationId}
        AND m.sent_at >= ${start}
        AND m.sent_at <= ${end}
      GROUP BY c.id, c.name, c.phone
      ORDER BY message_count DESC
      LIMIT 10
    `;

    return contacts.map((contact) => ({
      id: contact.id,
      name: contact.name || 'Sem nome',
      phone: contact.phone,
      messageCount: Number(contact.message_count),
      lastMessageAt: contact.last_message_at,
    }));
  }

  private async getRevenueByMonth(
    organizationId: string,
    start: Date,
    end: Date,
  ): Promise<DashboardMetrics['revenueByMonth']> {
    const payments = await this.prisma.$queryRaw<
      Array<{
        month: string;
        revenue: any;
        subscriptions: bigint;
        payments: bigint;
      }>
    >`
      SELECT 
        TO_CHAR(p.paid_at, 'YYYY-MM') as month,
        SUM(p.amount) as revenue,
        COUNT(DISTINCT p.subscription_id) as subscriptions,
        COUNT(*) as payments
      FROM payments p
      INNER JOIN users u ON u.id = p.user_id
      INNER JOIN organizations o ON o.owner_id = u.id
      WHERE o.id = ${organizationId}
        AND p.paid_at >= ${start}
        AND p.paid_at <= ${end}
        AND p.status = 'SUCCEEDED'
      GROUP BY TO_CHAR(p.paid_at, 'YYYY-MM')
      ORDER BY month ASC
    `;

    return payments.map((p) => ({
      month: p.month,
      revenue: Number(p.revenue),
      subscriptions: Number(p.subscriptions),
      payments: Number(p.payments),
    }));
  }

  async getCampaignAnalytics(
    campaignId: string,
    dto: GetCampaignMetricsDto,
  ): Promise<CampaignAnalytics> {
    const campaign = await this.prisma.campaign.findUnique({
      where: { id: campaignId },
      include: {
        recipients: {
          select: {
            status: true,
            sentAt: true,
            deliveredAt: true,
            errorMessage: true,
          },
        },
      },
    });

    if (!campaign) {
      throw new Error('Campaign not found');
    }

    // Calculate delivery rate and average delivery time
    const deliveredRecipients = campaign.recipients.filter(
      (r) => r.status === 'DELIVERED' || r.status === 'READ',
    );
    const deliveryRate =
      campaign.totalRecipients > 0
        ? (deliveredRecipients.length / campaign.totalRecipients) * 100
        : 0;

    const deliveryTimes = deliveredRecipients
      .filter((r) => r.sentAt && r.deliveredAt)
      .map((r) => r.deliveredAt!.getTime() - r.sentAt!.getTime());
    const averageDeliveryTime =
      deliveryTimes.length > 0
        ? deliveryTimes.reduce((sum, time) => sum + time, 0) / deliveryTimes.length / 1000
        : 0;

    // Messages by hour
    const messagesByHour = await this.getMessagesByHour(campaignId);

    // Recipients by status
    const recipientsByStatus = await this.getRecipientsByStatus(campaignId);

    // Errors by type
    const errorsByType = await this.getErrorsByType(campaignId);

    // Timeline
    const timeline = await this.getCampaignTimeline(campaignId);

    return {
      campaignId: campaign.id,
      campaignName: campaign.name,
      status: campaign.status,
      totalRecipients: campaign.totalRecipients,
      sentCount: campaign.sentCount,
      deliveredCount: campaign.deliveredCount,
      failedCount: campaign.failedCount,
      deliveryRate: Math.round(deliveryRate * 100) / 100,
      averageDeliveryTime: Math.round(averageDeliveryTime * 100) / 100,
      messagesByHour,
      recipientsByStatus,
      errorsByType,
      timeline,
    };
  }

  private async getMessagesByHour(campaignId: string) {
    const messages = await this.prisma.$queryRaw<
      Array<{ hour: string; status: string; count: bigint }>
    >`
      SELECT 
        TO_CHAR(sent_at, 'YYYY-MM-DD HH24:00') as hour,
        status,
        COUNT(*) as count
      FROM campaign_recipients
      WHERE campaign_id = ${campaignId}
        AND sent_at IS NOT NULL
      GROUP BY TO_CHAR(sent_at, 'YYYY-MM-DD HH24:00'), status
      ORDER BY hour ASC
    `;

    const grouped = new Map<string, { sent: number; delivered: number; failed: number }>();

    messages.forEach((msg) => {
      if (!grouped.has(msg.hour)) {
        grouped.set(msg.hour, { sent: 0, delivered: 0, failed: 0 });
      }
      const data = grouped.get(msg.hour)!;
      const count = Number(msg.count);

      if (['SENT', 'DELIVERED', 'READ'].includes(msg.status)) {
        data.sent += count;
      }
      if (['DELIVERED', 'READ'].includes(msg.status)) {
        data.delivered += count;
      }
      if (msg.status === 'FAILED') {
        data.failed += count;
      }
    });

    return Array.from(grouped.entries()).map(([hour, data]) => ({
      hour,
      ...data,
    }));
  }

  private async getRecipientsByStatus(campaignId: string) {
    const recipients = await this.prisma.campaignRecipient.groupBy({
      by: ['status'],
      where: { campaignId },
      _count: true,
    });

    const total = recipients.reduce((sum, r) => sum + r._count, 0);

    return recipients.map((r) => ({
      status: r.status,
      count: r._count,
      percentage: total > 0 ? Math.round((r._count / total) * 10000) / 100 : 0,
    }));
  }

  private async getErrorsByType(campaignId: string) {
    const errors = await this.prisma.$queryRaw<
      Array<{ error: string | null; count: bigint }>
    >`
      SELECT 
        error_message as error,
        COUNT(*) as count
      FROM campaign_recipients
      WHERE campaign_id = ${campaignId}
        AND status = 'FAILED'
        AND error_message IS NOT NULL
      GROUP BY error_message
      ORDER BY count DESC
      LIMIT 10
    `;

    return errors.map((e) => ({
      error: e.error || 'Unknown error',
      count: Number(e.count),
    }));
  }

  private async getCampaignTimeline(campaignId: string) {
    const events = await this.prisma.$queryRaw<
      Array<{ timestamp: Date; event: string; count: bigint }>
    >`
      SELECT 
        DATE_TRUNC('hour', sent_at) as timestamp,
        'sent' as event,
        COUNT(*) as count
      FROM campaign_recipients
      WHERE campaign_id = ${campaignId}
        AND sent_at IS NOT NULL
      GROUP BY DATE_TRUNC('hour', sent_at)
      
      UNION ALL
      
      SELECT 
        DATE_TRUNC('hour', delivered_at) as timestamp,
        'delivered' as event,
        COUNT(*) as count
      FROM campaign_recipients
      WHERE campaign_id = ${campaignId}
        AND delivered_at IS NOT NULL
      GROUP BY DATE_TRUNC('hour', delivered_at)
      
      ORDER BY timestamp ASC
    `;

    return events.map((e) => ({
      timestamp: e.timestamp,
      event: e.event,
      count: Number(e.count),
    }));
  }

  async getMessageAnalytics(
    organizationId: string,
    dto: GetMessageMetricsDto,
  ): Promise<MessageAnalytics> {
    const { start, end } = this.getDateRange(dto.period, dto.startDate, dto.endDate);

    const [totalMessages, sentMessages, deliveredMessages, failedMessages, directionStats] =
      await Promise.all([
        this.prisma.message.count({
          where: { organizationId, sentAt: { gte: start, lte: end } },
        }),
        this.prisma.message.count({
          where: {
            organizationId,
            sentAt: { gte: start, lte: end },
            status: { in: ['SENT', 'DELIVERED', 'READ'] },
          },
        }),
        this.prisma.message.count({
          where: {
            organizationId,
            sentAt: { gte: start, lte: end },
            status: { in: ['DELIVERED', 'READ'] },
          },
        }),
        this.prisma.message.count({
          where: {
            organizationId,
            sentAt: { gte: start, lte: end },
            status: 'FAILED',
          },
        }),
        this.prisma.message.groupBy({
          by: ['direction'],
          where: {
            organizationId,
            sentAt: { gte: start, lte: end },
          },
          _count: true,
        }),
      ]);

    const deliveryRate = totalMessages > 0 ? (deliveredMessages / totalMessages) * 100 : 0;

    // Calculate average delivery time
    const deliveryTimes = await this.prisma.$queryRaw<Array<{ avg_time: number }>>`
      SELECT 
        AVG(EXTRACT(EPOCH FROM (delivered_at - sent_at))) as avg_time
      FROM messages
      WHERE organization_id = ${organizationId}
        AND sent_at >= ${start}
        AND sent_at <= ${end}
        AND delivered_at IS NOT NULL
        AND status IN ('DELIVERED', 'READ')
    `;

    const averageDeliveryTime = deliveryTimes[0]?.avg_time || 0;

    const messagesByDirection = {
      inbound: directionStats.find((s) => s.direction === 'INBOUND')?._count || 0,
      outbound: directionStats.find((s) => s.direction === 'OUTBOUND')?._count || 0,
    };

    // Messages by hour, day, status
    const [messagesByHour, messagesByDay, messagesByStatus, topErrorMessages] =
      await Promise.all([
        this.getMessagesByHourAnalytics(organizationId, start, end),
        this.getMessagesByDayAnalytics(organizationId, start, end),
        this.getMessagesByStatus(organizationId, start, end),
        this.getTopErrorMessages(organizationId, start, end),
      ]);

    return {
      totalMessages,
      sentMessages,
      deliveredMessages,
      failedMessages,
      deliveryRate: Math.round(deliveryRate * 100) / 100,
      averageDeliveryTime: Math.round(averageDeliveryTime * 100) / 100,
      messagesByDirection,
      messagesByHour,
      messagesByDay,
      messagesByStatus,
      topErrorMessages,
    };
  }

  private async getMessagesByHourAnalytics(
    organizationId: string,
    start: Date,
    end: Date,
  ) {
    const messages = await this.prisma.$queryRaw<
      Array<{ hour: string; count: bigint }>
    >`
      SELECT 
        TO_CHAR(sent_at, 'HH24:00') as hour,
        COUNT(*) as count
      FROM messages
      WHERE organization_id = ${organizationId}
        AND sent_at >= ${start}
        AND sent_at <= ${end}
      GROUP BY TO_CHAR(sent_at, 'HH24:00')
      ORDER BY hour ASC
    `;

    return messages.map((m) => ({
      hour: m.hour,
      count: Number(m.count),
    }));
  }

  private async getMessagesByDayAnalytics(
    organizationId: string,
    start: Date,
    end: Date,
  ) {
    const messages = await this.prisma.$queryRaw<
      Array<{ date: string; count: bigint }>
    >`
      SELECT 
        TO_CHAR(sent_at, 'YYYY-MM-DD') as date,
        COUNT(*) as count
      FROM messages
      WHERE organization_id = ${organizationId}
        AND sent_at >= ${start}
        AND sent_at <= ${end}
      GROUP BY TO_CHAR(sent_at, 'YYYY-MM-DD')
      ORDER BY date ASC
    `;

    return messages.map((m) => ({
      date: m.date,
      count: Number(m.count),
    }));
  }

  private async getTopErrorMessages(
    organizationId: string,
    start: Date,
    end: Date,
  ) {
    const errors = await this.prisma.$queryRaw<
      Array<{ error: string | null; count: bigint }>
    >`
      SELECT 
        error_message as error,
        COUNT(*) as count
      FROM messages
      WHERE organization_id = ${organizationId}
        AND sent_at >= ${start}
        AND sent_at <= ${end}
        AND status = 'FAILED'
        AND error_message IS NOT NULL
      GROUP BY error_message
      ORDER BY count DESC
      LIMIT 10
    `;

    return errors.map((e) => ({
      error: e.error || 'Unknown error',
      count: Number(e.count),
    }));
  }

  async getRevenueAnalytics(
    organizationId: string,
    dto: GetRevenueMetricsDto,
  ): Promise<RevenueAnalytics> {
    const { start, end } = this.getDateRange(dto.period, dto.startDate, dto.endDate);

    // Get all payments for the organization owner
    const payments = await this.prisma.payment.findMany({
      where: {
        user: {
          ownedOrganizations: { some: { id: organizationId } },
        },
        paidAt: { gte: start, lte: end },
      },
      include: {
        subscription: {
          include: {
            plan: true,
          },
        },
      },
    });

    const totalRevenue = payments
      .filter((p) => p.status === 'SUCCEEDED')
      .reduce((sum, p) => sum + Number(p.amount), 0);

    const totalPayments = payments.length;
    const successfulPayments = payments.filter((p) => p.status === 'SUCCEEDED').length;
    const failedPayments = payments.filter((p) => p.status === 'FAILED').length;
    const paymentSuccessRate =
      totalPayments > 0 ? (successfulPayments / totalPayments) * 100 : 0;

    // Revenue by month
    const revenueByMonth = await this.getRevenueByMonth(organizationId, start, end);

    // Revenue by plan
    const revenueByPlan = await this.getRevenueByPlan(organizationId, start, end);

    // Revenue by provider
    const revenueByProvider = await this.getRevenueByProvider(organizationId, start, end);

    // Calculate MRR and ARR
    const activeSubscriptions = await this.prisma.subscription.findMany({
      where: {
        user: {
          ownedOrganizations: { some: { id: organizationId } },
        },
        status: 'ACTIVE',
      },
      include: {
        plan: true,
      },
    });

    const mrr = activeSubscriptions.reduce(
      (sum, sub) => sum + Number(sub.plan.priceMonthly || 0),
      0,
    );
    const arr = mrr * 12;

    // Calculate churn rate (simplified)
    const canceledSubscriptions = await this.prisma.subscription.count({
      where: {
        user: {
          ownedOrganizations: { some: { id: organizationId } },
        },
        canceledAt: { gte: start, lte: end },
      },
    });

    const totalSubscriptions = await this.prisma.subscription.count({
      where: {
        user: {
          ownedOrganizations: { some: { id: organizationId } },
        },
        createdAt: { lte: start },
      },
    });

    const churnRate =
      totalSubscriptions > 0 ? (canceledSubscriptions / totalSubscriptions) * 100 : 0;

    // Calculate LTV (simplified: average revenue per user)
    const uniqueUsers = new Set(payments.map((p) => p.userId)).size;
    const averageRevenuePerUser = uniqueUsers > 0 ? totalRevenue / uniqueUsers : 0;
    const ltv = averageRevenuePerUser * (1 / (churnRate / 100 || 0.05)); // Assume 5% churn if 0

    // Monthly revenue (current month)
    const currentMonthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const monthlyPayments = await this.prisma.payment.aggregate({
      where: {
        user: {
          ownedOrganizations: { some: { id: organizationId } },
        },
        paidAt: { gte: currentMonthStart },
        status: 'SUCCEEDED',
      },
      _sum: { amount: true },
    });

    const monthlyRevenue = Number(monthlyPayments._sum.amount || 0);

    // Yearly revenue
    const yearStart = new Date(new Date().getFullYear(), 0, 1);
    const yearlyPayments = await this.prisma.payment.aggregate({
      where: {
        user: {
          ownedOrganizations: { some: { id: organizationId } },
        },
        paidAt: { gte: yearStart },
        status: 'SUCCEEDED',
      },
      _sum: { amount: true },
    });

    const yearlyRevenue = Number(yearlyPayments._sum.amount || 0);

    return {
      totalRevenue,
      monthlyRevenue,
      yearlyRevenue,
      averageRevenuePerUser: Math.round(averageRevenuePerUser * 100) / 100,
      totalPayments,
      successfulPayments,
      failedPayments,
      paymentSuccessRate: Math.round(paymentSuccessRate * 100) / 100,
      revenueByMonth,
      revenueByPlan,
      revenueByProvider,
      mrr: Math.round(mrr * 100) / 100,
      arr: Math.round(arr * 100) / 100,
      churnRate: Math.round(churnRate * 100) / 100,
      ltv: Math.round(ltv * 100) / 100,
    };
  }

  private async getRevenueByPlan(organizationId: string, start: Date, end: Date) {
    const revenue = await this.prisma.$queryRaw<
      Array<{
        plan: string;
        revenue: any;
        subscriptions: bigint;
      }>
    >`
      SELECT 
        pl.name as plan,
        SUM(p.amount) as revenue,
        COUNT(DISTINCT s.id) as subscriptions
      FROM payments p
      INNER JOIN subscriptions s ON s.id = p.subscription_id
      INNER JOIN plans pl ON pl.id = s.plan_id
      INNER JOIN users u ON u.id = p.user_id
      INNER JOIN organizations o ON o.owner_id = u.id
      WHERE o.id = ${organizationId}
        AND p.paid_at >= ${start}
        AND p.paid_at <= ${end}
        AND p.status = 'SUCCEEDED'
      GROUP BY pl.name
      ORDER BY revenue DESC
    `;

    return revenue.map((r) => ({
      plan: r.plan,
      revenue: Number(r.revenue),
      subscriptions: Number(r.subscriptions),
    }));
  }

  private async getRevenueByProvider(organizationId: string, start: Date, end: Date) {
    const revenue = await this.prisma.$queryRaw<
      Array<{
        provider: string;
        revenue: any;
        payments: bigint;
      }>
    >`
      SELECT 
        p.payment_provider as provider,
        SUM(p.amount) as revenue,
        COUNT(*) as payments
      FROM payments p
      INNER JOIN users u ON u.id = p.user_id
      INNER JOIN organizations o ON o.owner_id = u.id
      WHERE o.id = ${organizationId}
        AND p.paid_at >= ${start}
        AND p.paid_at <= ${end}
        AND p.status = 'SUCCEEDED'
      GROUP BY p.payment_provider
      ORDER BY revenue DESC
    `;

    return revenue.map((r) => ({
      provider: r.provider,
      revenue: Number(r.revenue),
      payments: Number(r.payments),
    }));
  }
}
