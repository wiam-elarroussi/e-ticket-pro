import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { AuthGuard } from '@nestjs/passport';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { CurrentCustomer } from '../common/decorators/current-customer.decorator';
import { BearerToken } from '../common/decorators/bearer-token.decorator';
import { Public } from '../common/decorators/public.decorator';
import { TicketsService } from './tickets.service';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { ImportTicketsDto } from './dto/import-tickets.dto';
import { JwtPayload } from '../common/interfaces/jwt-payload.interface';
import { CodeImageType } from '../common/security/code-image.util';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('tickets')
export class TicketsController {
  constructor(private readonly ticketsService: TicketsService) {}

  @RequirePermissions('tickets:read')
  @Get()
  findAll(@Query('templateId') templateId?: string, @Query('eventId') eventId?: string) {
    return this.ticketsService.findAll(templateId, eventId);
  }

  /** Vérification d'intégrité (checksum Mode 4) + existence réelle. Doit précéder ':id'. */
  @RequirePermissions('tickets:read')
  @Get('verify')
  verify(@Query('code') code: string) {
    return this.ticketsService.verifyCode(code);
  }

  /**
   * Vérification par identifiant NFC/RFID (bracelet ou carte sans contact) — pas de
   * checksum ici : l'unicité du tag (assertNfcTagAvailable à la création) est la
   * garantie d'intégrité, comme pour une puce physique inclonable. Doit précéder ':id'.
   */
  @RequirePermissions('tickets:read')
  @Get('verify-nfc')
  verifyNfc(@Query('nfcTagId') nfcTagId: string) {
    return this.ticketsService.verifyNfc(nfcTagId);
  }

  /** Export CSV des codes générés. Doit précéder ':id'. */
  @RequirePermissions('tickets:read')
  @Get('export.csv')
  async exportCsv(@Query('templateId') templateId: string | undefined, @Res() res: Response) {
    const csv = await this.ticketsService.exportCsv(templateId);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="billets.csv"');
    res.send(csv);
  }

  @RequirePermissions('tickets:create')
  @Post()
  create(@Body() dto: CreateTicketDto, @CurrentUser() user: JwtPayload, @BearerToken() token: string) {
    return this.ticketsService.create(dto, user.sub, token);
  }

  /**
   * Généré par pos-service pour le compte d'un achat public (E-Ticket-Pay,
   * module Réservation & Achat) — appelée avec le token du client final, pas
   * un opérateur. Le siège est déjà marqué Vendu à ce stade (public-status
   * de venue-service), donc dto.seatId reste vide ici comme pour le flux staff.
   */
  @Public()
  @UseGuards(AuthGuard('customer-jwt'))
  @Post('customer-purchase')
  createForCustomer(
    @Body() dto: CreateTicketDto,
    @CurrentCustomer('sub') customerId: string,
    @BearerToken() token: string,
  ) {
    return this.ticketsService.create(dto, customerId, token);
  }

  /** Génération en masse (ex: lot de bracelets VIP pré-imprimés). */
  @RequirePermissions('tickets:create')
  @Post('import')
  importBulk(@Body() dto: ImportTicketsDto, @CurrentUser() user: JwtPayload) {
    return this.ticketsService.importBulk(dto, user.sub);
  }

  /**
   * "Mes billets" (E-Ticket-Pay) : relecture d'un billet acheté par le client
   * lui-même (pour ré-afficher son QR code) — droit `customer-jwt`, pas
   * `tickets:read` (réservé au personnel). Doit précéder ':id'.
   */
  @Public()
  @UseGuards(AuthGuard('customer-jwt'))
  @Get('customer/:id')
  findOneForCustomer(@Param('id', ParseUUIDPipe) id: string, @CurrentCustomer('sub') customerId: string) {
    return this.ticketsService.findByIdForCustomer(id, customerId);
  }

  @RequirePermissions('tickets:read')
  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.ticketsService.findById(id);
  }

  @RequirePermissions('tickets:read')
  @Get(':id/code-image')
  getCodeImage(@Param('id', ParseUUIDPipe) id: string, @Query('type') type: CodeImageType = 'qrcode') {
    return this.ticketsService.getCodeImage(id, type);
  }

  /** Droit distinct de la création : réimpression sécurisée et tracée (billet perdu/invitation). */
  @RequirePermissions('tickets:reprint')
  @Patch(':id/reprint')
  reprint(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: JwtPayload) {
    return this.ticketsService.reprint(id, user.sub);
  }

  /** Liste noire (module 6) : le billet échouera désormais la validation au scan. */
  @RequirePermissions('tickets:cancel')
  @Patch(':id/cancel')
  cancel(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: JwtPayload) {
    return this.ticketsService.cancel(id, user.sub);
  }
}
