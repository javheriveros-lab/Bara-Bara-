import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, Query, UseGuards } from '@nestjs/common';
import { CommissionPaymentStatus, ReportStatus, VerificationStatus } from '@prisma/client';
import { IsEnum, IsOptional } from 'class-validator';
import { ParseObjectIdPipe } from '../../common/validation/parse-object-id.pipe';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { AuthUser } from '../auth/jwt-payload';
import { BillingService } from '../billing/billing.service';
import { ReportsService } from '../reports/reports.service';
import { ReviewNoteDto } from '../verification/dto/verification.dto';
import { VerificationService } from '../verification/verification.service';
import { AdminGuard } from './admin.guard';

class VerificationQuery {
  @IsOptional()
  @IsEnum(VerificationStatus)
  status: VerificationStatus = 'PENDING';
}

class ReportsQuery {
  @IsOptional()
  @IsEnum(ReportStatus)
  status: ReportStatus = 'OPEN';
}

class PaymentsQuery {
  @IsOptional()
  @IsEnum(CommissionPaymentStatus)
  status: CommissionPaymentStatus = 'PROOF_SUBMITTED';
}

/** Revisión manual: verificaciones de identidad y comprobantes de pago de comisiones. */
@Controller('admin')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminController {
  constructor(
    private readonly verification: VerificationService,
    private readonly billing: BillingService,
    private readonly reports: ReportsService,
  ) {}

  @Get('verifications')
  verifications(@Query() { status }: VerificationQuery) {
    return this.verification.listForReview(status);
  }

  @Post('verifications/:userId/approve')
  @HttpCode(HttpStatus.OK)
  approveVerification(@Param('userId', ParseObjectIdPipe) userId: string) {
    return this.verification.approve(userId);
  }

  @Post('verifications/:userId/reject')
  @HttpCode(HttpStatus.OK)
  rejectVerification(@Param('userId', ParseObjectIdPipe) userId: string, @Body() { note }: ReviewNoteDto) {
    return this.verification.reject(userId, note);
  }

  @Get('payments')
  payments(@Query() { status }: PaymentsQuery) {
    return this.billing.listForReview(status);
  }

  @Post('payments/:id/approve')
  @HttpCode(HttpStatus.OK)
  approvePayment(@CurrentUser() admin: AuthUser, @Param('id', ParseObjectIdPipe) id: string) {
    return this.billing.markPaid(id, { reviewerId: admin.id });
  }

  @Post('payments/:id/reject')
  @HttpCode(HttpStatus.OK)
  rejectPayment(
    @CurrentUser() admin: AuthUser,
    @Param('id', ParseObjectIdPipe) id: string,
    @Body() { note }: ReviewNoteDto,
  ) {
    return this.billing.reject(id, admin.id, note);
  }

  @Get('reports')
  reportList(@Query() { status }: ReportsQuery) {
    return this.reports.listForReview(status);
  }

  @Post('reports/:id/remove')
  @HttpCode(HttpStatus.OK)
  removeReported(@CurrentUser() admin: AuthUser, @Param('id', ParseObjectIdPipe) id: string) {
    return this.reports.removeContent(id, admin.id);
  }

  @Post('reports/:id/dismiss')
  @HttpCode(HttpStatus.OK)
  dismissReport(@CurrentUser() admin: AuthUser, @Param('id', ParseObjectIdPipe) id: string) {
    return this.reports.dismiss(id, admin.id);
  }

  @Post('users/:userId/suspend')
  @HttpCode(HttpStatus.OK)
  suspendUser(
    @CurrentUser() admin: AuthUser,
    @Param('userId', ParseObjectIdPipe) userId: string,
    @Body() { note }: ReviewNoteDto,
  ) {
    return this.reports.suspendUser(userId, admin.id, note);
  }

  @Post('users/:userId/unsuspend')
  @HttpCode(HttpStatus.OK)
  unsuspendUser(@Param('userId', ParseObjectIdPipe) userId: string) {
    return this.reports.unsuspendUser(userId);
  }
}
