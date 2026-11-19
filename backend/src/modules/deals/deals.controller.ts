import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, UseGuards } from '@nestjs/common';
import { ParseObjectIdPipe } from '../../common/validation/parse-object-id.pipe';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { AuthUser } from '../auth/jwt-payload';
import { DealsService } from './deals.service';
import { ProposeDealDto } from './dto/propose-deal.dto';

@Controller()
@UseGuards(JwtAuthGuard)
export class DealsController {
  constructor(private readonly deals: DealsService) {}

  @Get('conversations/:id/deal')
  current(@CurrentUser() user: AuthUser, @Param('id', ParseObjectIdPipe) id: string) {
    return this.deals.current(id, user.id);
  }

  @Post('conversations/:id/deal')
  propose(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseObjectIdPipe) id: string,
    @Body() dto: ProposeDealDto,
  ) {
    return this.deals.propose(id, user.id, dto);
  }

  @Post('deals/:id/confirm')
  @HttpCode(HttpStatus.OK)
  confirm(@CurrentUser() user: AuthUser, @Param('id', ParseObjectIdPipe) id: string) {
    return this.deals.confirm(id, user.id);
  }

  @Post('deals/:id/cancel')
  @HttpCode(HttpStatus.OK)
  cancel(@CurrentUser() user: AuthUser, @Param('id', ParseObjectIdPipe) id: string) {
    return this.deals.cancel(id, user.id);
  }
}
