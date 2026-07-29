import { IsOptional, IsUUID } from 'class-validator';

export class ChannelsQueryDto {
  @IsOptional()
  @IsUUID()
  eventId?: string;
}
