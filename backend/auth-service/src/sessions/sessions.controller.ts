import { Controller, Delete, Get, Param, ParseUUIDPipe, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { SessionsService } from './sessions.service';
import { JwtPayload } from '../common/interfaces/jwt-payload.interface';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('sessions')
export class SessionsController {
  constructor(private readonly sessionsService: SessionsService) {}

  @Get('me')
  listMine(@CurrentUser() user: JwtPayload) {
    return this.sessionsService.listForUser(user.sub);
  }

  @RequirePermissions('sessions:read')
  @Get()
  listAll(@Query('userId') userId?: string) {
    return this.sessionsService.listActive(userId);
  }

  // Segments multiples ("mine/others", "by-user/:id") : pas d'ambiguïté de
  // routage avec ":id" (mono-segment) contrairement à /users/me, donc l'ordre
  // de déclaration importe peu ici — laissé avant ":id" par cohérence.
  @Delete('mine/others')
  revokeAllMine(@CurrentUser() user: JwtPayload) {
    return this.sessionsService.revokeAllOthers(user.sub, user.sid);
  }

  @RequirePermissions('sessions:revoke')
  @Delete('by-user/:userId')
  revokeAllForUser(@Param('userId', ParseUUIDPipe) userId: string, @CurrentUser() admin: JwtPayload) {
    return this.sessionsService.revokeAllForUser(userId, admin.sub);
  }

  // Pas de @RequirePermissions ici : l'auto-révocation (déconnexion d'un autre
  // appareil) est toujours permise, la vérification "sessions:revoke" pour un
  // tiers est faite dans le service au cas par cas.
  @Delete(':id')
  revoke(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: JwtPayload) {
    return this.sessionsService.revoke(id, user);
  }
}
