import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { AuthModule } from '../auth/auth.module';
import { PartnersService } from './partners.service';
import { PartnersController } from './partners.controller';
import { PartnerJwtStrategy } from './strategies/partner-jwt.strategy';

@Module({
  imports: [AuthModule, PassportModule, JwtModule.register({})],
  controllers: [PartnersController],
  providers: [PartnersService, PartnerJwtStrategy],
  exports: [PartnersService],
})
export class PartnersModule {}
