import { Module } from '@nestjs/common';
import { SubscriptionFormulasService } from './subscription-formulas.service';
import { SubscriptionFormulasController } from './subscription-formulas.controller';

@Module({
  controllers: [SubscriptionFormulasController],
  providers: [SubscriptionFormulasService],
})
export class SubscriptionFormulasModule {}
