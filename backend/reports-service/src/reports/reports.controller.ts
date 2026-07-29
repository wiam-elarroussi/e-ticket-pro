import { Controller, Get, Param, ParseUUIDPipe, Query, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { BearerToken } from '../common/decorators/bearer-token.decorator';
import { ReportsService } from './reports.service';
import { ExportsService } from './export/exports.service';
import { CompareEventsQueryDto } from './dto/compare-events.dto';
import { ChannelsQueryDto } from './dto/channels-query.dto';
import { ExportAccessLogsQueryDto, ExportCrmQueryDto, ExportOrdersQueryDto } from './dto/export-query.dto';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('reports')
export class ReportsController {
  constructor(
    private readonly reportsService: ReportsService,
    private readonly exportsService: ExportsService,
  ) {}

  /** 7.2 — Comparatif entre plusieurs événements. Doit précéder ':eventId' des autres routes à 1 segment. */
  @RequirePermissions('reports:read')
  @Get('compare')
  compare(@Query() query: CompareEventsQueryDto, @BearerToken() token: string) {
    return this.reportsService.compareEvents(token, query.eventIds);
  }

  /** 7.2 — Répartition des ventes par canal, globale ou pour un événement. */
  @RequirePermissions('reports:read')
  @Get('channels')
  channels(@Query() query: ChannelsQueryDto, @BearerToken() token: string) {
    return this.reportsService.getChannelBreakdown(token, query.eventId);
  }

  /** 7.3 — Export de l'historique des ventes (toutes ou pour un événement donné). */
  @RequirePermissions('reports:read')
  @Get('export/orders')
  async exportOrders(@Query() query: ExportOrdersQueryDto, @BearerToken() token: string, @Res() res: Response) {
    const result = await this.exportsService.exportOrders(token, query.eventId, query.format);
    this.sendFile(res, result);
  }

  /** 7.3 — Export du journal de contrôle d'accès d'un événement. */
  @RequirePermissions('reports:read')
  @Get('export/access-logs/:eventId')
  async exportAccessLogs(
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @Query() query: ExportAccessLogsQueryDto,
    @BearerToken() token: string,
    @Res() res: Response,
  ) {
    const result = await this.exportsService.exportAccessLogs(token, eventId, query.format);
    this.sendFile(res, result);
  }

  /** 7.3 — Export CRM (contacts acheteurs/abonnés) : permission distincte, données personnelles à usage marketing. */
  @RequirePermissions('reports:export-crm')
  @Get('export/crm')
  async exportCrm(@Query() query: ExportCrmQueryDto, @BearerToken() token: string, @Res() res: Response) {
    const result = await this.exportsService.exportCrmContacts(token, query.eventId, query.format);
    this.sendFile(res, result);
  }

  /** 7.1 — Tableau de bord live d'un événement. Route à 2 segments : ne collisionne pas avec les routes ci-dessus. */
  @RequirePermissions('reports:read')
  @Get('dashboard/:eventId')
  dashboard(@Param('eventId', ParseUUIDPipe) eventId: string, @BearerToken() token: string) {
    return this.reportsService.getDashboard(token, eventId);
  }

  private sendFile(res: Response, result: { contentType: string; filename: string; body: string | Buffer }) {
    res.setHeader('Content-Type', result.contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
    res.send(result.body);
  }
}
