import { Module } from '@nestjs/common';
import { UploadsModule } from '../uploads/uploads.module';
import { BillingController, PaymentsWebhookController } from './billing.controller';
import { BillingService } from './billing.service';

@Module({
  imports: [UploadsModule],
  controllers: [BillingController, PaymentsWebhookController],
  providers: [BillingService],
  exports: [BillingService],
})
export class BillingModule {}
