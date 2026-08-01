import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { JwtStrategy } from './jwt.strategy';
import { CustomerJwtStrategy } from './customer-jwt.strategy';

@Module({
  imports: [PassportModule],
  providers: [JwtStrategy, CustomerJwtStrategy],
})
export class AuthModule {}
