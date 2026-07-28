import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/** Guard dédié à POST /auth/refresh, délègue à JwtRefreshStrategy. */
@Injectable()
export class JwtRefreshGuard extends AuthGuard('jwt-refresh') {}
