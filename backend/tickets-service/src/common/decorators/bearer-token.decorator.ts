import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/** Jeton brut (pour le transmettre tel quel à venue-service lors du verrouillage d'un siège). */
export const BearerToken = createParamDecorator((_data: unknown, ctx: ExecutionContext): string => {
  const request = ctx.switchToHttp().getRequest();
  const header: string | undefined = request.headers.authorization;
  return header?.replace(/^Bearer\s+/i, '') ?? '';
});
