import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { CustomerJwtPayload } from '../interfaces/customer-jwt-payload.interface';

export const CurrentCustomer = createParamDecorator(
  (data: keyof CustomerJwtPayload | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const customer: CustomerJwtPayload = request.user;
    return data ? customer?.[data] : customer;
  },
);
