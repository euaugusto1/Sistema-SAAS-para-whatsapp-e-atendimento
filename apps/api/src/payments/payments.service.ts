import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StripeService } from './stripe.service';
import { MercadoPagoService } from './mercadopago.service';
import {
  CreateSubscriptionDto,
  CancelSubscriptionDto,
  UpdateSubscriptionDto,
  BillingInterval,
} from './dto/subscription.dto';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private prisma: PrismaService,
    private stripeService: StripeService,
    private mercadopagoService: MercadoPagoService,
  ) {}

  /**
   * Create a new subscription
   */
  async createSubscription(userId: string, dto: CreateSubscriptionDto) {
    // Get user
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { subscriptions: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Check if user already has an active subscription
    const activeSubscription = user.subscriptions.find(
      (sub) => sub.status === 'ACTIVE' || sub.status === 'TRIALING',
    );

    if (activeSubscription) {
      throw new BadRequestException('User already has an active subscription');
    }

    // Get plan
    const plan = await this.prisma.plan.findUnique({
      where: { id: dto.planId },
    });

    if (!plan || !plan.isActive) {
      throw new NotFoundException('Plan not found or inactive');
    }

    // Calculate period dates
    const now = new Date();
    const periodEnd = new Date(now);
    if (dto.interval === BillingInterval.MONTHLY) {
      periodEnd.setMonth(periodEnd.getMonth() + 1);
    } else {
      periodEnd.setFullYear(periodEnd.getFullYear() + 1);
    }

    try {
      if (dto.paymentProvider === 'STRIPE') {
        return await this.createStripeSubscription(user, plan, dto, now, periodEnd);
      } else {
        return await this.createMercadoPagoSubscription(user, plan, dto, now, periodEnd);
      }
    } catch (error) {
      this.logger.error('Failed to create subscription', error);
      throw new BadRequestException('Failed to create subscription');
    }
  }

  /**
   * Create Stripe subscription
   */
  private async createStripeSubscription(user: any, plan: any, dto: any, periodStart: Date, periodEnd: Date) {
    // Create or get Stripe customer
    let customerId = user.subscriptions.find(s => s.stripeCustomerId)?.stripeCustomerId;
    
    if (!customerId) {
      const customer = await this.stripeService.createCustomer(user.id, user.email, user.name);
      customerId = customer.id;
    }

    // Get price based on interval
    const amount = dto.interval === BillingInterval.MONTHLY
      ? plan.priceMonthly
      : plan.priceYearly;

    if (!amount) {
      throw new BadRequestException('Plan price not configured');
    }

    // Create Stripe subscription
    const stripeSubscription = await this.stripeService.createSubscription(
      customerId,
      process.env[`STRIPE_PRICE_${plan.id}_${dto.interval}`], // You need to store price IDs
      dto.paymentMethodId,
    );

    // Create subscription record
    const subscription = await this.prisma.subscription.create({
      data: {
        userId: user.id,
        planId: plan.id,
        status: 'ACTIVE',
        currentPeriodStart: periodStart,
        currentPeriodEnd: periodEnd,
        paymentProvider: 'STRIPE',
        stripeCustomerId: customerId,
        stripeSubscriptionId: stripeSubscription.id,
      },
      include: {
        plan: true,
      },
    });

    this.logger.log(`Created subscription for user: ${user.id}`);
    return subscription;
  }

  /**
   * Create MercadoPago subscription
   */
  private async createMercadoPagoSubscription(user: any, plan: any, dto: any, periodStart: Date, periodEnd: Date) {
    // Create or get MercadoPago customer
    let customerId = user.subscriptions.find(s => s.mercadopagoCustomerId)?.mercadopagoCustomerId;
    
    if (!customerId) {
      const names = user.name?.split(' ') || [];
      const customer = await this.mercadopagoService.createCustomer(
        user.email,
        names[0],
        names.slice(1).join(' '),
      );
      customerId = customer.id;
    }

    // Create MercadoPago subscription
    const mpSubscription = await this.mercadopagoService.createSubscription(
      customerId,
      process.env[`MERCADOPAGO_PLAN_${plan.id}_${dto.interval}`], // You need to store plan IDs
      dto.paymentMethodId,
    );

    // Create subscription record
    const subscription = await this.prisma.subscription.create({
      data: {
        userId: user.id,
        planId: plan.id,
        status: 'ACTIVE',
        currentPeriodStart: periodStart,
        currentPeriodEnd: periodEnd,
        paymentProvider: 'MERCADOPAGO',
        mercadopagoCustomerId: customerId,
        mercadopagoSubscriptionId: mpSubscription.id,
      },
      include: {
        plan: true,
      },
    });

    this.logger.log(`Created subscription for user: ${user.id}`);
    return subscription;
  }

  /**
   * Cancel subscription
   */
  async cancelSubscription(userId: string, dto: CancelSubscriptionDto) {
    const subscription = await this.prisma.subscription.findFirst({
      where: {
        id: dto.subscriptionId,
        userId,
      },
    });

    if (!subscription) {
      throw new NotFoundException('Subscription not found');
    }

    if (subscription.status === 'CANCELLED') {
      throw new BadRequestException('Subscription already cancelled');
    }

    try {
      // Cancel in payment provider
      if (subscription.paymentProvider === 'STRIPE' && subscription.stripeSubscriptionId) {
        await this.stripeService.cancelSubscription(
          subscription.stripeSubscriptionId,
          dto.cancelImmediately,
        );
      } else if (subscription.paymentProvider === 'MERCADOPAGO' && subscription.mercadopagoSubscriptionId) {
        await this.mercadopagoService.cancelSubscription(subscription.mercadopagoSubscriptionId);
      }

      // Update subscription
      const updated = await this.prisma.subscription.update({
        where: { id: subscription.id },
        data: {
          status: dto.cancelImmediately ? 'CANCELLED' : subscription.status,
          cancelAtPeriodEnd: !dto.cancelImmediately,
          canceledAt: dto.cancelImmediately ? new Date() : null,
        },
        include: {
          plan: true,
        },
      });

      this.logger.log(`Cancelled subscription: ${subscription.id}`);
      return updated;
    } catch (error) {
      this.logger.error('Failed to cancel subscription', error);
      throw new BadRequestException('Failed to cancel subscription');
    }
  }

  /**
   * Update subscription plan
   */
  async updateSubscription(userId: string, dto: UpdateSubscriptionDto) {
    const subscription = await this.prisma.subscription.findFirst({
      where: {
        id: dto.subscriptionId,
        userId,
      },
    });

    if (!subscription) {
      throw new NotFoundException('Subscription not found');
    }

    if (!dto.planId) {
      throw new BadRequestException('Plan ID is required');
    }

    const newPlan = await this.prisma.plan.findUnique({
      where: { id: dto.planId },
    });

    if (!newPlan || !newPlan.isActive) {
      throw new NotFoundException('Plan not found or inactive');
    }

    try {
      // Update in payment provider
      if (subscription.paymentProvider === 'STRIPE' && subscription.stripeSubscriptionId) {
        const newPriceId = process.env[`STRIPE_PRICE_${newPlan.id}_MONTHLY`];
        await this.stripeService.updateSubscription(subscription.stripeSubscriptionId, newPriceId);
      }

      // Update subscription
      const updated = await this.prisma.subscription.update({
        where: { id: subscription.id },
        data: {
          planId: newPlan.id,
        },
        include: {
          plan: true,
        },
      });

      this.logger.log(`Updated subscription: ${subscription.id}`);
      return updated;
    } catch (error) {
      this.logger.error('Failed to update subscription', error);
      throw new BadRequestException('Failed to update subscription');
    }
  }

  /**
   * Get user subscriptions
   */
  async getUserSubscriptions(userId: string) {
    return this.prisma.subscription.findMany({
      where: { userId },
      include: {
        plan: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  /**
   * Get user payments
   */
  async getUserPayments(userId: string, page = 1, limit = 50) {
    const skip = (page - 1) * limit;

    const [payments, total] = await Promise.all([
      this.prisma.payment.findMany({
        where: { userId },
        include: {
          subscription: {
            include: {
              plan: true,
            },
          },
        },
        skip,
        take: limit,
        orderBy: {
          createdAt: 'desc',
        },
      }),
      this.prisma.payment.count({
        where: { userId },
      }),
    ]);

    return {
      payments,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get available plans
   */
  async getPlans() {
    return this.prisma.plan.findMany({
      where: { isActive: true },
      orderBy: {
        priceMonthly: 'asc',
      },
    });
  }
}
