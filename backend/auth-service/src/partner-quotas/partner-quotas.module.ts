import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PartnerQuotasService } from './partner-quotas.service';
import { PartnerQuotasController } from './partner-quotas.controller';

@Module({
  imports: [AuthModule],
  controllers: [PartnerQuotasController],
  providers: [PartnerQuotasService],
  exports: [PartnerQuotasService],
})
export class PartnerQuotasModule {}
