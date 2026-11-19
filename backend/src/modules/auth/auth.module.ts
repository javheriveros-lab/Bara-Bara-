import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { ThrottlerModule } from '@nestjs/throttler';
import { UsersModule } from '../users/users.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';

/** Global: JwtService y JwtAuthGuard quedan disponibles en todos los módulos (HTTP y WebSocket). */
@Global()
@Module({
  imports: [
    UsersModule,
    // Límite global holgado (APP_GUARD en AppModule); las rutas sensibles fijan el suyo con @Throttle.
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 600 }]),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const secret = config.get<string>('JWT_SECRET');
        if (!secret || secret.length < 32 || secret.startsWith('cambia-esto')) {
          throw new Error('JWT_SECRET falta o es inseguro (mínimo 32 caracteres aleatorios).');
        }
        return {
          secret,
          signOptions: { expiresIn: config.get<string>('JWT_EXPIRES_IN') ?? '7d' },
        };
      },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtAuthGuard],
  exports: [JwtModule, JwtAuthGuard],
})
export class AuthModule {}
