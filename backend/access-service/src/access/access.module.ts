import { Module } from '@nestjs/common';
import { AccessService } from './access.service';
import { AccessController } from './access.controller';
import { ServicesClient } from '../integrations/services-client';

@Module({
  controllers: [AccessController],
  providers: [AccessService, ServicesClient],
})
export class AccessModule {}
