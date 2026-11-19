import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  RawBodyRequest,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Request } from 'express';
import { ParseObjectIdPipe } from '../../common/validation/parse-object-id.pipe';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { AuthUser } from '../auth/jwt-payload';
import { PrivateUploadDto } from '../uploads/dto/private-upload.dto';
import { UploadsService } from '../uploads/uploads.service';
import { BillingService } from './billing.service';

/** Estado de cuenta del vecino con Bara Bara y pago de comisiones por SPEI. */
@Controller('commissions')
@UseGuards(JwtAuthGuard)
export class BillingController {
  constructor(
    private readonly billing: BillingService,
    private readonly uploads: UploadsService,
  ) {}

  @Get()
  summary(@CurrentUser() user: AuthUser) {
    return this.billing.summary(user.id);
  }

  /** Genera (o reutiliza) la referencia SPEI con el monto exacto a transferir. */
  @Post('payments')
  @HttpCode(HttpStatus.OK)
  createPayment(@CurrentUser() user: AuthUser) {
    return this.billing.createPayment(user.id);
  }

  /** Firma para subir el comprobante a la carpeta privada del vecino. */
  @Post('proof-signature')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  proofSignature(@CurrentUser() user: AuthUser) {
    return this.uploads.createPrivateSignature(user.id, 'payment');
  }

  @Post('payments/:id/proof')
  @HttpCode(HttpStatus.OK)
  submitProof(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseObjectIdPipe) id: string,
    @Body() dto: PrivateUploadDto,
  ) {
    return this.billing.submitProof(user.id, id, dto);
  }
}

/** Conciliación automática: lo llama el banco o el agregador de pagos, no un vecino. */
@Controller('payments')
export class PaymentsWebhookController {
  constructor(private readonly billing: BillingService) {}

  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 120, ttl: 60_000 } })
  webhook(@Req() req: RawBodyRequest<Request>, @Headers('x-barabara-signature') signature?: string) {
    // La firma se verifica sobre el cuerpo crudo (main.ts: rawBody), no sobre el JSON ya parseado.
    return this.billing.handleWebhook(req.rawBody, signature);
  }
}
