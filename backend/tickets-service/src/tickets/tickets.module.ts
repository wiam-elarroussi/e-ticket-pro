import { Module } from '@nestjs/common';
import { TicketsService } from './tickets.service';
import { TicketsController } from './tickets.controller';
import { ServicesClient } from '../integrations/services-client';

@Module({
  controllers: [TicketsController],
  providers: [TicketsService, ServicesClient],
})
export class TicketsModule {}
