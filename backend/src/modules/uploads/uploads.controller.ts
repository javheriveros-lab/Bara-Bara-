import { Controller, Get, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { AuthUser } from '../auth/jwt-payload';
import { UploadsService } from './uploads.service';

@Controller('uploads')
export class UploadsController {
  constructor(private readonly uploads: UploadsService) {}

  /** Para que los clientes oculten el selector de fotos si ImageKit no está configurado. */
  @Get('status')
  status() {
    return { enabled: this.uploads.enabled };
  }

  /** Una firma por foto; caduca en 30 min (ImageKit admite hasta 1 h). */
  @Post('signature')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  signature(@CurrentUser() user: AuthUser) {
    return this.uploads.createSignature(user.id);
  }
}
