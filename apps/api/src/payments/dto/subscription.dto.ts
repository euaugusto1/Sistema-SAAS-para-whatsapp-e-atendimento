import { IsString, IsNotEmpty, IsEnum, IsOptional, IsNumber, Min } from 'class-validator';

export enum BillingInterval {
  MONTHLY = 'MONTHLY',
  YEARLY = 'YEARLY',
}

export class CreateSubscriptionDto {
  @IsString()
  @IsNotEmpty()
  planId: string;

  @IsEnum(BillingInterval)
  interval: BillingInterval;

  @IsString()
  @IsNotEmpty()
  paymentProvider: 'STRIPE' | 'MERCADOPAGO';

  @IsString()
  @IsOptional()
  paymentMethodId?: string; // Stripe payment method ID or MercadoPago token
}

export class CancelSubscriptionDto {
  @IsString()
  @IsNotEmpty()
  subscriptionId: string;

  @IsOptional()
  cancelImmediately?: boolean;
}

export class UpdateSubscriptionDto {
  @IsString()
  @IsNotEmpty()
  subscriptionId: string;

  @IsString()
  @IsOptional()
  planId?: string;
}

export class CreatePaymentIntentDto {
  @IsNumber()
  @Min(0.5)
  amount: number;

  @IsString()
  @IsNotEmpty()
  currency: string = 'BRL';

  @IsString()
  @IsOptional()
  description?: string;
}
