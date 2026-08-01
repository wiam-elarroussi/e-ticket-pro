import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { CustomersController } from './customers.controller';
import { CustomersService } from './customers.service';
import { CustomerLocalStrategy } from './strategies/customer-local.strategy';
import { CustomerJwtStrategy } from './strategies/customer-jwt.strategy';
import { CustomerJwtRefreshStrategy } from './strategies/customer-jwt-refresh.strategy';

@Module({
  imports: [PassportModule, JwtModule.register({})],
  controllers: [CustomersController],
  providers: [CustomersService, CustomerLocalStrategy, CustomerJwtStrategy, CustomerJwtRefreshStrategy],
  exports: [CustomersService],
})
export class CustomersModule {}
