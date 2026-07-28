import { Module } from '@nestjs/common';
import { RowsService } from './rows.service';
import { RowsController } from './rows.controller';

@Module({
  controllers: [RowsController],
  providers: [RowsService],
})
export class RowsModule {}
