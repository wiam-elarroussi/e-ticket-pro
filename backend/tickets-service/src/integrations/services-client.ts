import { BadGatewayException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

interface ServiceResponse<T> {
  status: number;
  data: T;
}

/**
 * Client HTTP vers venue-service, appelé lors de la génération manuelle d'un billet
 * (module 4) quand un siège précis est associé au billet : mêmes principes que le
 * client équivalent de pos-service (aucune authentification de service à service,
 * le token de l'opérateur est transmis tel quel).
 */
@Injectable()
export class ServicesClient {
  constructor(private readonly config: ConfigService) {}

  private async request<T>(baseUrl: string, path: string, token: string, init?: RequestInit): Promise<ServiceResponse<T>> {
    let res: Response;
    try {
      res = await fetch(`${baseUrl}${path}`, {
        ...init,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...(init?.headers ?? {}) },
      });
    } catch {
      throw new BadGatewayException(`Service indisponible : ${baseUrl}`);
    }
    const text = await res.text();
    const data = text ? JSON.parse(text) : undefined;
    return { status: res.status, data: data as T };
  }

  private get venueBaseUrl() {
    return this.config.get<string>('VENUE_SERVICE_URL', 'http://localhost:3003');
  }

  getSeat(token: string, seatId: string) {
    return this.request<{ id: string; status: string; number: number; label: string | null }>(
      this.venueBaseUrl,
      `/seats/${seatId}`,
      token,
    );
  }

  setSeatStatus(token: string, seatId: string, status: string) {
    return this.request<{ id: string; status: string }>(this.venueBaseUrl, `/seats/${seatId}/status`, token, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  }
}
