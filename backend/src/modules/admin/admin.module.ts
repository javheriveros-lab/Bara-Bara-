import { Module } from '@nestjs/common';
import { BillingModule } from '../billing/billing.module';
import { ReportsModule } from '../reports/reports.module';
import { VerificationModule } from '../verification/verification.module';
import { AdminController } from './admin.controller';
import { AdminGuard } from './admin.guard';

@Module({
  imports: [VerificationModule, BillingModule, ReportsModule],
  controllers: [AdminController],
  providers: [AdminGuard],
})
export class AdminModule {}
