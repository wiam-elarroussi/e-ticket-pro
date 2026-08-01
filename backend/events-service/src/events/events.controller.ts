import { BadRequestException, Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Query, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { Public } from '../common/decorators/public.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { EventsService } from './events.service';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { JwtPayload } from '../common/interfaces/jwt-payload.interface';

// Extension dérivée du mimetype validé, jamais du nom de fichier fourni par le
// client (ex: "photo.jfif" côté Windows a bien un mimetype image/jpeg, mais
// l'extension .jfif est absente de la table MIME d'Express -> Content-Type
// application/octet-stream au lieu d'image/jpeg au moment de servir le fichier).
const IMAGE_MIME_TO_EXT: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
};

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('events')
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @RequirePermissions('events:read')
  @Get()
  findAll(@Query('venueId') venueId?: string) {
    return this.eventsService.findAll(venueId);
  }

  /**
   * Catalogue public (E-Ticket-Pay) : uniquement les événements PUBLISHED,
   * contrairement à GET /events qui expose aussi les DRAFT/CANCELLED aux
   * opérateurs. Doit être déclarée avant GET :id pour ne pas être capturée
   * par le paramètre de route.
   */
  @Public()
  @Get('public')
  findAllPublished(@Query('venueId') venueId?: string) {
    return this.eventsService.findAllPublished(venueId);
  }

  @Public()
  @Get('public/:id')
  findOnePublished(@Param('id', ParseUUIDPipe) id: string) {
    return this.eventsService.findPublishedById(id);
  }

  @RequirePermissions('events:read')
  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.eventsService.findById(id);
  }

  /**
   * Affiche/photo d'événement (affichée sur le catalogue public E-Ticket-Pay) —
   * upload séparé de la création/modification de l'événement : le formulaire
   * envoie d'abord le fichier ici, récupère le chemin, puis l'inclut dans le
   * payload JSON classique de POST/PATCH /events. Stockage disque local
   * (uploads/events), servi statiquement en /uploads (cf. main.ts).
   */
  @RequirePermissions('events:create')
  @Post('upload-image')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads/events',
        filename: (_req, file, cb) => {
          const ext = IMAGE_MIME_TO_EXT[file.mimetype] ?? '';
          const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
          cb(null, unique);
        },
      }),
      fileFilter: (_req, file, cb) => {
        if (!IMAGE_MIME_TO_EXT[file.mimetype]) {
          cb(new BadRequestException('Formats acceptés : JPEG, PNG, WEBP'), false);
          return;
        }
        cb(null, true);
      },
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
  )
  uploadImage(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('Aucun fichier reçu');
    }
    return { url: `/uploads/events/${file.filename}` };
  }

  @RequirePermissions('events:create')
  @Post()
  create(@Body() dto: CreateEventDto, @CurrentUser() user: JwtPayload) {
    return this.eventsService.create(dto, user.sub);
  }

  @RequirePermissions('events:update')
  @Patch(':id')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateEventDto) {
    return this.eventsService.update(id, dto);
  }

  @RequirePermissions('events:delete')
  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.eventsService.remove(id);
  }
}
