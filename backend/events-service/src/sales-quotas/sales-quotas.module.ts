import { Module } from '@nestjs/common';
import { SalesQuotasService } from './sales-quotas.service';
import { SalesQuotasController } from './sales-quotas.controller';

@Module({
  controllers: [SalesQuotasController],
  providers: [SalesQuotasService],
})
export class SalesQuotasModule {}
