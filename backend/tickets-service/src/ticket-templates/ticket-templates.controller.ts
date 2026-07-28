import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { TicketTemplatesService } from './ticket-templates.service';
import { CreateTicketTemplateDto } from './dto/create-ticket-template.dto';
import { UpdateTicketTemplateDto } from './dto/update-ticket-template.dto';
import { JwtPayload } from '../common/interfaces/jwt-payload.interface';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('ticket-templates')
export class TicketTemplatesController {
  constructor(private readonly ticketTemplatesService: TicketTemplatesService) {}

  @RequirePermissions('templates:read')
  @Get()
  findAll() {
    return this.ticketTemplatesService.findAll();
  }

  @RequirePermissions('templates:read')
  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.ticketTemplatesService.findById(id);
  }

  @RequirePermissions('templates:create')
  @Post()
  create(@Body() dto: CreateTicketTemplateDto, @CurrentUser() user: JwtPayload) {
    return this.ticketTemplatesService.create(dto, user.sub);
  }

  @RequirePermissions('templates:update')
  @Patch(':id')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateTicketTemplateDto) {
    return this.ticketTemplatesService.update(id, dto);
  }

  @RequirePermissions('templates:delete')
  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.ticketTemplatesService.remove(id);
  }
}
