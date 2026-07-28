import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { BearerToken } from '../common/decorators/bearer-token.decorator';
import { AccessService } from './access.service';
import { ScanDto } from './dto/scan.dto';
import { JwtPayload } from '../common/interfaces/jwt-payload.interface';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('access')
export class AccessController {
  constructor(private readonly accessService: AccessService) {}

  @RequirePermissions('access:scan')
  @Post('scan')
  scan(@Body() dto: ScanDto, @BearerToken() token: string, @CurrentUser() user: JwtPayload) {
    const canOverride = user.perms.includes('access:override');
    return this.accessService.scan(dto, token, user.sub, canOverride);
  }

  @RequirePermissions('access:scan')
  @Get('logs')
  findLogs(@Query('eventId') eventId?: string, @Query('gateId') gateId?: string) {
    return this.accessService.findLogs(eventId, gateId);
  }

  @RequirePermissions('access:scan')
  @Get('sync-package')
  syncPackage(@Query('eventId') eventId: string, @BearerToken() token: string) {
    return this.accessService.syncPackage(token, eventId);
  }
}
