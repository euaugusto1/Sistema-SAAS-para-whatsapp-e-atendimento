import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import Stripe from 'stripe';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class StripeService {
  private readonly logger = new Logger(StripeService.name);
  private stripe: Stripe;

  constructor(private prisma: PrismaService) {
    const apiKey = process.env.STRIPE_SECRET_KEY;
    
    if (!apiKey) {
      this.logger.warn('Stripe API key not configured');
      return;
    }

    this.stripe = new Stripe(apiKey, {
      apiVersion: '2024-11-20.acacia',
      typescript: true,
    });
  }

  /**
   * Create a Stripe customer
   */
  async createCustomer(userId: string, email: string, name?: string) {
    try {
      const customer = await this.stripe.customers.create({
        email,
        name: name || undefined,
        metadata: {
          userId,
        },
      });

      this.logger.log(`Created Stripe customer: ${customer.id} for user: ${userId}`);
      return customer;
    } catch (error) {
      this.logger.error('Failed to create Stripe customer', error);
      throw new BadRequestException('Failed to create customer');
    }
  }

  /**
   * Create a subscription
   */
  async createSubscription(
    customerId: string,
    priceId: string,
    paymentMethodId?: string,
  ) {
    try {
      const subscriptionData: Stripe.SubscriptionCreateParams = {
        customer: customerId,
        items: [{ price: priceId }],
        payment_behavior: 'default_incomplete',
        payment_settings: {
          save_default_payment_method: 'on_subscription',
        },
        expand: ['latest_invoice.payment_intent'],
      };

      if (paymentMethodId) {
        subscriptionData.default_payment_method = paymentMethodId;
      }

      const subscription = await this.stripe.subscriptions.create(subscriptionData);

      this.logger.log(`Created Stripe subscription: ${subscription.id}`);
      return subscription;
    } catch (error) {
      this.logger.error('Failed to create Stripe subscription', error);
      throw new BadRequestException('Failed to create subscription');
    }
  }

  /**
   * Cancel a subscription
   */
  async cancelSubscription(subscriptionId: string, immediate = false) {
    try {
      const subscription = await this.stripe.subscriptions.update(subscriptionId, {
        cancel_at_period_end: !immediate,
      });

      if (immediate) {
        await this.stripe.subscriptions.cancel(subscriptionId);
      }

      this.logger.log(`Canceled Stripe subscription: ${subscriptionId}`);
      return subscription;
    } catch (error) {
      this.logger.error('Failed to cancel Stripe subscription', error);
      throw new BadRequestException('Failed to cancel subscription');
    }
  }

  /**
   * Update subscription plan
   */
  async updateSubscription(subscriptionId: string, newPriceId: string) {
    try {
      const subscription = await this.stripe.subscriptions.retrieve(subscriptionId);
      
      const updated = await this.stripe.subscriptions.update(subscriptionId, {
        items: [
          {
            id: subscription.items.data[0].id,
            price: newPriceId,
          },
        ],
        proration_behavior: 'create_prorations',
      });

      this.logger.log(`Updated Stripe subscription: ${subscriptionId}`);
      return updated;
    } catch (error) {
      this.logger.error('Failed to update Stripe subscription', error);
      throw new BadRequestException('Failed to update subscription');
    }
  }

  /**
   * Create payment intent for one-time payment
   */
  async createPaymentIntent(amount: number, currency = 'brl', customerId?: string) {
    try {
      const paymentIntent = await this.stripe.paymentIntents.create({
        amount: Math.round(amount * 100), // Convert to cents
        currency,
        customer: customerId,
        automatic_payment_methods: {
          enabled: true,
        },
      });

      this.logger.log(`Created payment intent: ${paymentIntent.id}`);
      return paymentIntent;
    } catch (error) {
      this.logger.error('Failed to create payment intent', error);
      throw new BadRequestException('Failed to create payment intent');
    }
  }

  /**
   * Get subscription details
   */
  async getSubscription(subscriptionId: string) {
    try {
      return await this.stripe.subscriptions.retrieve(subscriptionId, {
        expand: ['latest_invoice', 'customer'],
      });
    } catch (error) {
      this.logger.error('Failed to get Stripe subscription', error);
      throw new BadRequestException('Subscription not found');
    }
  }

  /**
   * Create Stripe price for a plan
   */
  async createPrice(
    productId: string,
    amount: number,
    currency = 'brl',
    interval: 'month' | 'year' = 'month',
  ) {
    try {
      const price = await this.stripe.prices.create({
        product: productId,
        unit_amount: Math.round(amount * 100),
        currency,
        recurring: {
          interval,
        },
      });

      this.logger.log(`Created Stripe price: ${price.id}`);
      return price;
    } catch (error) {
      this.logger.error('Failed to create Stripe price', error);
      throw new BadRequestException('Failed to create price');
    }
  }

  /**
   * Verify webhook signature
   */
  verifyWebhookSignature(payload: string | Buffer, signature: string): Stripe.Event {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    
    if (!webhookSecret) {
      throw new Error('Stripe webhook secret not configured');
    }

    try {
      return this.stripe.webhooks.constructEvent(payload, signature, webhookSecret);
    } catch (error) {
      this.logger.error('Failed to verify Stripe webhook', error);
      throw new BadRequestException('Invalid webhook signature');
    }
  }

  /**
   * Handle successful payment
   */
  async handlePaymentSuccess(paymentIntent: Stripe.PaymentIntent) {
    const customerId = paymentIntent.customer as string;
    const amount = paymentIntent.amount / 100;

    // Find user by Stripe customer ID
    const subscription = await this.prisma.subscription.findFirst({
      where: { stripeCustomerId: customerId },
      include: { user: true },
    });

    if (!subscription) {
      this.logger.warn(`No subscription found for customer: ${customerId}`);
      return;
    }

    // Create payment record
    await this.prisma.payment.create({
      data: {
        userId: subscription.userId,
        subscriptionId: subscription.id,
        amount,
        currency: paymentIntent.currency.toUpperCase(),
        status: 'SUCCEEDED',
        paymentProvider: 'STRIPE',
        paymentMethod: paymentIntent.payment_method as string,
        stripePaymentIntentId: paymentIntent.id,
        paidAt: new Date(),
      },
    });

    this.logger.log(`Recorded successful payment for user: ${subscription.userId}`);
  }

  /**
   * Handle failed payment
   */
  async handlePaymentFailed(paymentIntent: Stripe.PaymentIntent) {
    const customerId = paymentIntent.customer as string;

    const subscription = await this.prisma.subscription.findFirst({
      where: { stripeCustomerId: customerId },
    });

    if (!subscription) {
      this.logger.warn(`No subscription found for customer: ${customerId}`);
      return;
    }

    // Update subscription status
    await this.prisma.subscription.update({
      where: { id: subscription.id },
      data: { status: 'PAST_DUE' },
    });

    // Create failed payment record
    await this.prisma.payment.create({
      data: {
        userId: subscription.userId,
        subscriptionId: subscription.id,
        amount: paymentIntent.amount / 100,
        currency: paymentIntent.currency.toUpperCase(),
        status: 'FAILED',
        paymentProvider: 'STRIPE',
        stripePaymentIntentId: paymentIntent.id,
        failedAt: new Date(),
        errorMessage: paymentIntent.last_payment_error?.message,
      },
    });

    this.logger.warn(`Payment failed for user: ${subscription.userId}`);
  }
}
