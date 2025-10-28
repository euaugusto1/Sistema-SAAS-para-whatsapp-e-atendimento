import { Module } from '@nestjs/common';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { StripeService } from './stripe.service';
import { MercadoPagoService } from './mercadopago.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [PaymentsController],
  providers: [PaymentsService, StripeService, MercadoPagoService],
  exports: [PaymentsService, StripeService, MercadoPagoService],
})
export class PaymentsModule {}
