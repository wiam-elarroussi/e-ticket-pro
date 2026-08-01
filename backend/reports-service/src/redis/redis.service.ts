import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

/** Instance partagée avec auth-service, utilisée uniquement en lecture pour le flag de révocation de session. */
@Injectable()
export class RedisService extends Redis implements OnModuleDestroy {
  constructor(configService: ConfigService) {
    super({
      host: configService.get<string>('REDIS_HOST', 'localhost'),
      port: configService.get<number>('REDIS_PORT', 6379),
      password: configService.get<string>('REDIS_PASSWORD') || undefined,
      keyPrefix: 'eticketpro:',
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false,
    });
    this.on('error', () => {
      // Suppress unhandled redis connection error logs when offline
    });
  }

  async onModuleDestroy() {
    await this.quit();
  }
}
