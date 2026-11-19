import { Module } from '@nestjs/common';
import { BillingModule } from '../billing/billing.module';
import { UploadsModule } from '../uploads/uploads.module';
import { ListingsController } from './listings.controller';
import { ListingsService } from './listings.service';

@Module({
  imports: [UploadsModule, BillingModule],
  controllers: [ListingsController],
  providers: [ListingsService],
})
export class ListingsModule {}
