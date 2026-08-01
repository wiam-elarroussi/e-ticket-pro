import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { PartnerJwtPayload } from '../interfaces/partner-jwt-payload.interface';

export const CurrentPartner = createParamDecorator(
  (data: keyof PartnerJwtPayload | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const partner: PartnerJwtPayload = request.user;
    return data ? partner?.[data] : partner;
  },
);
