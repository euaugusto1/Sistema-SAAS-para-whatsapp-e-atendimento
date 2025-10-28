import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

interface MercadoPagoCustomer {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
}

interface MercadoPagoSubscription {
  id: string;
  status: string;
  payer_id: string;
  preapproval_plan_id: string;
  next_payment_date: string;
}

@Injectable()
export class MercadoPagoService {
  private readonly logger = new Logger(MercadoPagoService.name);
  private readonly accessToken: string;
  private readonly baseUrl = 'https://api.mercadopago.com';

  constructor(private prisma: PrismaService) {
    this.accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
    
    if (!this.accessToken) {
      this.logger.warn('MercadoPago access token not configured');
    }
  }

  /**
   * Create a MercadoPago customer
   */
  async createCustomer(email: string, firstName?: string, lastName?: string) {
    try {
      const response = await fetch(`${this.baseUrl}/v1/customers`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          first_name: firstName,
          last_name: lastName,
        }),
      });

      if (!response.ok) {
        throw new Error(`MercadoPago API error: ${response.statusText}`);
      }

      const customer = await response.json();
      this.logger.log(`Created MercadoPago customer: ${customer.id}`);
      return customer;
    } catch (error) {
      this.logger.error('Failed to create MercadoPago customer', error);
      throw new BadRequestException('Failed to create customer');
    }
  }

  /**
   * Create a subscription (preapproval)
   */
  async createSubscription(
    customerId: string,
    planId: string,
    cardToken: string,
  ) {
    try {
      const response = await fetch(`${this.baseUrl}/preapproval`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          payer_id: customerId,
          preapproval_plan_id: planId,
          card_token_id: cardToken,
          status: 'authorized',
          back_url: process.env.MERCADOPAGO_BACK_URL,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || response.statusText);
      }

      const subscription = await response.json();
      this.logger.log(`Created MercadoPago subscription: ${subscription.id}`);
      return subscription;
    } catch (error) {
      this.logger.error('Failed to create MercadoPago subscription', error);
      throw new BadRequestException('Failed to create subscription');
    }
  }

  /**
   * Cancel a subscription
   */
  async cancelSubscription(subscriptionId: string) {
    try {
      const response = await fetch(`${this.baseUrl}/preapproval/${subscriptionId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: 'cancelled',
        }),
      });

      if (!response.ok) {
        throw new Error(`MercadoPago API error: ${response.statusText}`);
      }

      const subscription = await response.json();
      this.logger.log(`Canceled MercadoPago subscription: ${subscriptionId}`);
      return subscription;
    } catch (error) {
      this.logger.error('Failed to cancel MercadoPago subscription', error);
      throw new BadRequestException('Failed to cancel subscription');
    }
  }

  /**
   * Get subscription details
   */
  async getSubscription(subscriptionId: string) {
    try {
      const response = await fetch(`${this.baseUrl}/preapproval/${subscriptionId}`, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
        },
      });

      if (!response.ok) {
        throw new Error(`MercadoPago API error: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      this.logger.error('Failed to get MercadoPago subscription', error);
      throw new BadRequestException('Subscription not found');
    }
  }

  /**
   * Create payment preference for one-time payment
   */
  async createPaymentPreference(
    amount: number,
    description: string,
    userId: string,
  ) {
    try {
      const response = await fetch(`${this.baseUrl}/checkout/preferences`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          items: [
            {
              title: description,
              quantity: 1,
              unit_price: amount,
              currency_id: 'BRL',
            },
          ],
          back_urls: {
            success: `${process.env.FRONTEND_URL}/payment/success`,
            failure: `${process.env.FRONTEND_URL}/payment/failure`,
            pending: `${process.env.FRONTEND_URL}/payment/pending`,
          },
          auto_return: 'approved',
          external_reference: userId,
          notification_url: `${process.env.API_URL}/payments/webhook/mercadopago`,
        }),
      });

      if (!response.ok) {
        throw new Error(`MercadoPago API error: ${response.statusText}`);
      }

      const preference = await response.json();
      this.logger.log(`Created payment preference: ${preference.id}`);
      return preference;
    } catch (error) {
      this.logger.error('Failed to create payment preference', error);
      throw new BadRequestException('Failed to create payment preference');
    }
  }

  /**
   * Get payment details
   */
  async getPayment(paymentId: string) {
    try {
      const response = await fetch(`${this.baseUrl}/v1/payments/${paymentId}`, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
        },
      });

      if (!response.ok) {
        throw new Error(`MercadoPago API error: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      this.logger.error('Failed to get payment', error);
      throw new BadRequestException('Payment not found');
    }
  }

  /**
   * Handle payment notification (webhook)
   */
  async handlePaymentNotification(paymentId: string) {
    try {
      const payment = await this.getPayment(paymentId);
      
      const subscription = await this.prisma.subscription.findFirst({
        where: { mercadopagoCustomerId: payment.payer.id },
        include: { user: true },
      });

      if (!subscription) {
        this.logger.warn(`No subscription found for payer: ${payment.payer.id}`);
        return;
      }

      if (payment.status === 'approved') {
        await this.handlePaymentSuccess(payment, subscription);
      } else if (payment.status === 'rejected') {
        await this.handlePaymentFailed(payment, subscription);
      }

      this.logger.log(`Processed payment notification: ${paymentId}`);
    } catch (error) {
      this.logger.error('Failed to handle payment notification', error);
      throw error;
    }
  }

  /**
   * Handle successful payment
   */
  private async handlePaymentSuccess(payment: any, subscription: any) {
    await this.prisma.payment.create({
      data: {
        userId: subscription.userId,
        subscriptionId: subscription.id,
        amount: payment.transaction_amount,
        currency: payment.currency_id,
        status: 'SUCCEEDED',
        paymentProvider: 'MERCADOPAGO',
        paymentMethod: payment.payment_method_id,
        mercadopagoPaymentId: payment.id.toString(),
        paidAt: new Date(payment.date_approved),
      },
    });

    // Update subscription if it was past due
    if (subscription.status === 'PAST_DUE') {
      await this.prisma.subscription.update({
        where: { id: subscription.id },
        data: { status: 'ACTIVE' },
      });
    }

    this.logger.log(`Recorded successful payment for user: ${subscription.userId}`);
  }

  /**
   * Handle failed payment
   */
  private async handlePaymentFailed(payment: any, subscription: any) {
    await this.prisma.subscription.update({
      where: { id: subscription.id },
      data: { status: 'PAST_DUE' },
    });

    await this.prisma.payment.create({
      data: {
        userId: subscription.userId,
        subscriptionId: subscription.id,
        amount: payment.transaction_amount,
        currency: payment.currency_id,
        status: 'FAILED',
        paymentProvider: 'MERCADOPAGO',
        mercadopagoPaymentId: payment.id.toString(),
        failedAt: new Date(),
        errorMessage: payment.status_detail,
      },
    });

    this.logger.warn(`Payment failed for user: ${subscription.userId}`);
  }
}
