import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { PermissionsService } from './permissions.service';
import { LocalStrategy } from './strategies/local.strategy';
import { JwtStrategy } from './strategies/jwt.strategy';
import { JwtRefreshStrategy } from './strategies/jwt-refresh.strategy';

@Module({
  imports: [
    PassportModule,
    // Pas de secret global : access token (RS256) et refresh token (HS256)
    // sont signés avec des clés différentes, passées explicitement à chaque
    // appel de jwtService.sign() dans AuthService.
    JwtModule.register({}),
  ],
  controllers: [AuthController],
  providers: [AuthService, PermissionsService, LocalStrategy, JwtStrategy, JwtRefreshStrategy],
  exports: [PermissionsService, AuthService],
})
export class AuthModule {}
