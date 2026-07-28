import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { SalesChannelsService } from './sales-channels.service';
import { SalesChannelsController } from './sales-channels.controller';

@Module({
  imports: [AuthModule],
  controllers: [SalesChannelsController],
  providers: [SalesChannelsService],
  exports: [SalesChannelsService],
})
export class SalesChannelsModule {}
