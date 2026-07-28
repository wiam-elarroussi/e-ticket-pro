import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { RowsService } from './rows.service';
import { CreateRowDto } from './dto/create-row.dto';
import { UpdateRowDto } from './dto/update-row.dto';
import { GenerateSeatsDto } from './dto/generate-seats.dto';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('rows')
export class RowsController {
  constructor(private readonly rowsService: RowsService) {}

  @RequirePermissions('venues:read')
  @Get()
  findAll(@Query('zoneId') zoneId?: string) {
    return this.rowsService.findAll(zoneId);
  }

  @RequirePermissions('venues:create')
  @Post()
  create(@Body() dto: CreateRowDto) {
    return this.rowsService.create(dto);
  }

  @RequirePermissions('venues:update')
  @Patch(':id')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateRowDto) {
    return this.rowsService.update(id, dto);
  }

  /** Numérotation automatique/séquentielle des sièges du rang (exigence 2.2). */
  @RequirePermissions('venues:update')
  @Post(':id/seats/generate')
  generateSeats(@Param('id', ParseUUIDPipe) id: string, @Body() dto: GenerateSeatsDto) {
    return this.rowsService.generateSeats(id, dto);
  }

  @RequirePermissions('venues:delete')
  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.rowsService.remove(id);
  }
}
