import { IsUUID } from 'class-validator';

export class CheckAccessQueryDto {
  @IsUUID()
  eventId!: string;
}
