import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { OwnerStatusDto } from '../../common/validation/owner-status.dto';
import { ParseObjectIdPipe } from '../../common/validation/parse-object-id.pipe';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { AuthUser } from '../auth/jwt-payload';
import { CreateListingDto } from './dto/create-listing.dto';
import { ListListingsQuery } from './dto/list-listings.query';
import { ListingsService } from './listings.service';

@Controller('listings')
export class ListingsController {
  constructor(private readonly listings: ListingsService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateListingDto) {
    return this.listings.create(user.id, dto);
  }

  @Get()
  findAll(@Query() query: ListListingsQuery) {
    return this.listings.findAll(query);
  }

  /** Va antes de :id para que "mine" no se lea como un id. */
  @Get('mine')
  @UseGuards(JwtAuthGuard)
  findMine(@CurrentUser() user: AuthUser) {
    return this.listings.findMine(user.id);
  }

  @Get(':id')
  findOne(@Param('id', ParseObjectIdPipe) id: string) {
    return this.listings.findOne(id);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  update(@CurrentUser() user: AuthUser, @Param('id', ParseObjectIdPipe) id: string, @Body() dto: CreateListingDto) {
    return this.listings.update(id, user.id, dto);
  }

  @Post(':id/status')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  setStatus(@CurrentUser() user: AuthUser, @Param('id', ParseObjectIdPipe) id: string, @Body() dto: OwnerStatusDto) {
    return this.listings.setStatus(id, user.id, dto.status);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  remove(@CurrentUser() user: AuthUser, @Param('id', ParseObjectIdPipe) id: string) {
    return this.listings.remove(id, user.id);
  }
}
