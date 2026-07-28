import { Module } from '@nestjs/common';
import { StandsService } from './stands.service';
import { StandsController } from './stands.controller';

@Module({
  controllers: [StandsController],
  providers: [StandsService],
})
export class StandsModule {}
