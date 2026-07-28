import { Module } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { ServicesClient } from '../integrations/services-client';

@Module({
  controllers: [OrdersController],
  providers: [OrdersService, ServicesClient],
})
export class OrdersModule {}
