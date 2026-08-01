import { IsIn, IsOptional, IsUUID } from 'class-validator';

export class ExportOrdersQueryDto {
  @IsOptional()
  @IsUUID()
  eventId?: string;

  @IsIn(['csv', 'xlsx', 'pdf', 'xml', 'docx'])
  format!: 'csv' | 'xlsx' | 'pdf' | 'xml' | 'docx';
}

export class ExportAccessLogsQueryDto {
  @IsIn(['csv', 'xlsx', 'pdf', 'xml', 'docx'])
  format!: 'csv' | 'xlsx' | 'pdf' | 'xml' | 'docx';
}

export class ExportCrmQueryDto {
  @IsOptional()
  @IsUUID()
  eventId?: string;

  @IsIn(['csv', 'xlsx', 'docx'])
  format!: 'csv' | 'xlsx' | 'docx';
}
