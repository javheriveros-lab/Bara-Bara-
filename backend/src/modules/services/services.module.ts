import { Module } from '@nestjs/common';
import { BillingModule } from '../billing/billing.module';
import { UploadsModule } from '../uploads/uploads.module';
import { ServicesController } from './services.controller';
import { ServicesService } from './services.service';

@Module({
  imports: [UploadsModule, BillingModule],
  controllers: [ServicesController],
  providers: [ServicesService],
})
export class ServicesModule {}
