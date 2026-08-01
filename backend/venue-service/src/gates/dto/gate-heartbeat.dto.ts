import { IsEnum } from 'class-validator';
import { GateDeviceStatus } from '@prisma/client';

export class GateHeartbeatDto {
  @IsEnum(GateDeviceStatus)
  status!: GateDeviceStatus;
}
