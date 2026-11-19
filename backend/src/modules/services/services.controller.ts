import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { OwnerStatusDto } from '../../common/validation/owner-status.dto';
import { ParseObjectIdPipe } from '../../common/validation/parse-object-id.pipe';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { AuthUser } from '../auth/jwt-payload';
import { CreateServiceDto } from './dto/create-service.dto';
import { ListServicesQuery } from './dto/list-services.query';
import { ServicesService } from './services.service';

@Controller('services')
export class ServicesController {
  constructor(private readonly services: ServicesService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateServiceDto) {
    return this.services.create(user.id, dto);
  }

  @Get()
  findAll(@Query() query: ListServicesQuery) {
    return this.services.findAll(query);
  }

  /** Va antes de :id para que "mine" no se lea como un id. */
  @Get('mine')
  @UseGuards(JwtAuthGuard)
  findMine(@CurrentUser() user: AuthUser) {
    return this.services.findMine(user.id);
  }

  @Get(':id')
  findOne(@Param('id', ParseObjectIdPipe) id: string) {
    return this.services.findOne(id);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  update(@CurrentUser() user: AuthUser, @Param('id', ParseObjectIdPipe) id: string, @Body() dto: CreateServiceDto) {
    return this.services.update(id, user.id, dto);
  }

  @Post(':id/status')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  setStatus(@CurrentUser() user: AuthUser, @Param('id', ParseObjectIdPipe) id: string, @Body() dto: OwnerStatusDto) {
    return this.services.setStatus(id, user.id, dto.status);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  remove(@CurrentUser() user: AuthUser, @Param('id', ParseObjectIdPipe) id: string) {
    return this.services.remove(id, user.id);
  }
}
