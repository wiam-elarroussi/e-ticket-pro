import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-local';
import { CustomersService } from '../customers.service';

@Injectable()
export class CustomerLocalStrategy extends PassportStrategy(Strategy, 'customer-local') {
  constructor(private readonly customersService: CustomersService) {
    super({ usernameField: 'email', passwordField: 'password' });
  }

  async validate(email: string, password: string) {
    const customer = await this.customersService.validateCredentials(email, password);
    if (!customer) {
      throw new UnauthorizedException('Identifiants invalides');
    }
    return customer;
  }
}
