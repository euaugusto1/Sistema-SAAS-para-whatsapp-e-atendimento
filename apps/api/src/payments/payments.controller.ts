import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  Headers,
  RawBodyRequest,
  Req,
} from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { StripeService } from './stripe.service';
import { MercadoPagoService } from './mercadopago.service';
import {
  CreateSubscriptionDto,
  CancelSubscriptionDto,
  UpdateSubscriptionDto,
} from './dto/subscription.dto';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { SkipRateLimit } from '../common/decorators/rate-limit.decorator';
import { Request } from 'express';

@Controller('payments')
export class PaymentsController {
  constructor(
    private readonly paymentsService: PaymentsService,
    private readonly stripeService: StripeService,
    private readonly mercadopagoService: MercadoPagoService,
  ) {}

  @Get('plans')
  @Public()
  async getPlans() {
    return this.paymentsService.getPlans();
  }

  @Post('subscriptions')
  @UseGuards(JwtAuthGuard)
  async createSubscription(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateSubscriptionDto,
  ) {
    return this.paymentsService.createSubscription(userId, dto);
  }

  @Get('subscriptions')
  @UseGuards(JwtAuthGuard)
  async getSubscriptions(@CurrentUser('id') userId: string) {
    return this.paymentsService.getUserSubscriptions(userId);
  }

  @Post('subscriptions/cancel')
  @UseGuards(JwtAuthGuard)
  async cancelSubscription(
    @CurrentUser('id') userId: string,
    @Body() dto: CancelSubscriptionDto,
  ) {
    return this.paymentsService.cancelSubscription(userId, dto);
  }

  @Post('subscriptions/update')
  @UseGuards(JwtAuthGuard)
  async updateSubscription(
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateSubscriptionDto,
  ) {
    return this.paymentsService.updateSubscription(userId, dto);
  }

  @Get('payments')
  @UseGuards(JwtAuthGuard)
  async getPayments(
    @CurrentUser('id') userId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.paymentsService.getUserPayments(
      userId,
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 50,
    );
  }

  /**
   * Stripe webhook endpoint
   * Receives events from Stripe (payment success, failure, subscription updates, etc.)
   */
  @Public()
  @SkipRateLimit()
  @Post('webhook/stripe')
  @HttpCode(HttpStatus.OK)
  async handleStripeWebhook(
    @Headers('stripe-signature') signature: string,
    @Req() request: RawBodyRequest<Request>,
  ) {
    const payload = request.rawBody;

    if (!payload) {
      throw new Error('No payload received');
    }

    try {
      const event = this.stripeService.verifyWebhookSignature(payload, signature);

      // Handle different event types
      switch (event.type) {
        case 'payment_intent.succeeded':
          await this.stripeService.handlePaymentSuccess(event.data.object as any);
          break;

        case 'payment_intent.payment_failed':
          await this.stripeService.handlePaymentFailed(event.data.object as any);
          break;

        case 'customer.subscription.updated':
          // Handle subscription updates
          break;

        case 'customer.subscription.deleted':
          // Handle subscription cancellation
          break;

        case 'invoice.payment_succeeded':
          // Handle invoice payment
          break;

        case 'invoice.payment_failed':
          // Handle failed invoice payment
          break;

        default:
          console.log(`Unhandled event type: ${event.type}`);
      }

      return { received: true };
    } catch (error) {
      console.error('Stripe webhook error:', error);
      throw error;
    }
  }

  /**
   * MercadoPago webhook endpoint
   * Receives IPN notifications from MercadoPago
   */
  @Public()
  @SkipRateLimit()
  @Post('webhook/mercadopago')
  @HttpCode(HttpStatus.OK)
  async handleMercadoPagoWebhook(@Body() body: any, @Query() query: any) {
    try {
      // MercadoPago sends notifications in query params
      const { type, id, topic } = query;

      if (topic === 'payment' || type === 'payment') {
        await this.mercadopagoService.handlePaymentNotification(id);
      }

      return { received: true };
    } catch (error) {
      console.error('MercadoPago webhook error:', error);
      throw error;
    }
  }
}
