import { IsIn, IsOptional, IsUUID } from 'class-validator';

export class ExportOrdersQueryDto {
  @IsOptional()
  @IsUUID()
  eventId?: string;

  @IsIn(['csv', 'xlsx', 'pdf', 'xml'])
  format!: 'csv' | 'xlsx' | 'pdf' | 'xml';
}

export class ExportAccessLogsQueryDto {
  @IsIn(['csv', 'xlsx', 'pdf', 'xml'])
  format!: 'csv' | 'xlsx' | 'pdf' | 'xml';
}

export class ExportCrmQueryDto {
  @IsOptional()
  @IsUUID()
  eventId?: string;

  @IsIn(['csv', 'xlsx'])
  format!: 'csv' | 'xlsx';
}
