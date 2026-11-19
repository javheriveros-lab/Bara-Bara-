import { Body, Controller, Get, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { AuthUser } from '../auth/jwt-payload';
import { UploadsService } from '../uploads/uploads.service';
import { SubmitVerificationDto } from './dto/verification.dto';
import { VerificationService } from './verification.service';

@Controller('verification')
@UseGuards(JwtAuthGuard)
export class VerificationController {
  constructor(
    private readonly verification: VerificationService,
    private readonly uploads: UploadsService,
  ) {}

  @Get('me')
  mine(@CurrentUser() user: AuthUser) {
    return this.verification.mine(user.id);
  }

  /** Firma para subir un documento a la carpeta privada `bara-bara/private/kyc/<userId>`. */
  @Post('signature')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  signature(@CurrentUser() user: AuthUser) {
    return this.uploads.createPrivateSignature(user.id, 'kyc');
  }

  @Post()
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  submit(@CurrentUser() user: AuthUser, @Body() dto: SubmitVerificationDto) {
    return this.verification.submit(user.id, dto);
  }
}
