import { Module } from '@nestjs/common';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';
import { ExportsService } from './export/exports.service';
import { ServicesClient } from '../integrations/services-client';

@Module({
  controllers: [ReportsController],
  providers: [ReportsService, ExportsService, ServicesClient],
})
export class ReportsModule {}
