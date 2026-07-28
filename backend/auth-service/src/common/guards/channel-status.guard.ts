import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * Protège les endpoints de vente utilisés par les canaux distants/partenaires (module 1.3).
 * Bloque immédiatement si le canal a été désactivé en urgence (kill-switch) ou si
 * la requête arrive hors de sa plage horaire de vente autorisée.
 * Le canal est attendu dans le header "x-sales-channel-id".
 */
@Injectable()
export class ChannelStatusGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const channelId = request.headers['x-sales-channel-id'] as string | undefined;

    if (!channelId) {
      throw new ForbiddenException('Canal de vente non spécifié (header x-sales-channel-id requis)');
    }

    const channel = await this.prisma.salesChannel.findUnique({ where: { id: channelId } });

    if (!channel) {
      throw new NotFoundException('Canal de vente introuvable');
    }

    if (!channel.isActive) {
      throw new ForbiddenException('Ce canal de vente a été désactivé');
    }

    if (channel.salesWindowStart && channel.salesWindowEnd) {
      if (!this.isWithinSalesWindow(channel.salesWindowStart, channel.salesWindowEnd)) {
        throw new ForbiddenException('Ce canal de vente est en dehors de sa plage horaire autorisée');
      }
    }

    request.salesChannel = channel;
    return true;
  }

  private isWithinSalesWindow(start: Date, end: Date): boolean {
    const now = new Date();
    const currentMinutes = now.getUTCHours() * 60 + now.getUTCMinutes();
    const startMinutes = start.getUTCHours() * 60 + start.getUTCMinutes();
    const endMinutes = end.getUTCHours() * 60 + end.getUTCMinutes();

    // Gère le cas d'une fenêtre à cheval sur minuit (ex: 22:00 -> 02:00)
    if (startMinutes <= endMinutes) {
      return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
    }
    return currentMinutes >= startMinutes || currentMinutes <= endMinutes;
  }
}
