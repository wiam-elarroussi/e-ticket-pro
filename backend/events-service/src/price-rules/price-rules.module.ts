import { Module } from '@nestjs/common';
import { PriceRulesService } from './price-rules.service';
import { PriceRulesController } from './price-rules.controller';

@Module({
  controllers: [PriceRulesController],
  providers: [PriceRulesService],
})
export class PriceRulesModule {}
