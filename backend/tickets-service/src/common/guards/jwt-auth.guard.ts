import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/** Toutes les routes de ce service exigent un access token valide : pas de notion de route publique ici. */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
