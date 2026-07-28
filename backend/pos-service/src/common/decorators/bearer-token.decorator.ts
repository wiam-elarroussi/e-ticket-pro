import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/** Jeton brut (pour le transmettre tel quel aux autres microservices lors de l'encaissement). */
export const BearerToken = createParamDecorator((_data: unknown, ctx: ExecutionContext): string => {
  const request = ctx.switchToHttp().getRequest();
  const header: string | undefined = request.headers.authorization;
  return header?.replace(/^Bearer\s+/i, '') ?? '';
});
