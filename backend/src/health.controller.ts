import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { PrismaService } from './prisma/prisma.service';

@SkipThrottle()
@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  /** Con MongoDB, Prisma conecta de forma perezosa: el ping confirma que la BD responde de verdad. */
  @Get()
  async check() {
    try {
      await this.prisma.$runCommandRaw({ ping: 1 });
      return { status: 'ok', service: 'bara-bara-api', database: 'up' };
    } catch {
      throw new ServiceUnavailableException({ status: 'error', service: 'bara-bara-api', database: 'down' });
    }
  }
}
