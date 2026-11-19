import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, ParseEnumPipe, Post, UseGuards } from '@nestjs/common';
import { ParseObjectIdPipe } from '../../common/validation/parse-object-id.pipe';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { AuthUser } from '../auth/jwt-payload';
import { SaveItemDto, type SavedKind } from './dto/save-item.dto';
import { SavedService } from './saved.service';

const KINDS = { listing: 'listing', service: 'service' } as const;

/** Guardados: el "carrito" de Bara Bara. Los tratos se siguen cerrando en el chat. */
@Controller('saved')
@UseGuards(JwtAuthGuard)
export class SavedController {
  constructor(private readonly saved: SavedService) {}

  @Get()
  list(@CurrentUser() user: AuthUser) {
    return this.saved.list(user.id);
  }

  @Get('keys')
  keys(@CurrentUser() user: AuthUser) {
    return this.saved.keys(user.id);
  }

  @Post()
  @HttpCode(HttpStatus.OK)
  save(@CurrentUser() user: AuthUser, @Body() dto: SaveItemDto) {
    return this.saved.save(user.id, dto.kind, dto.id);
  }

  @Delete(':kind/:id')
  remove(
    @CurrentUser() user: AuthUser,
    @Param('kind', new ParseEnumPipe(KINDS)) kind: SavedKind,
    @Param('id', ParseObjectIdPipe) id: string,
  ) {
    return this.saved.remove(user.id, kind, id);
  }
}
