import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsEnum, IsOptional, IsObject, IsDateString, IsUUID, ValidateNested, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';

export enum LogType {
  AUDIT = 'audit',
  TRANSACTION = 'transaction',
  USER_ACTIVITY = 'user_activity',
}

export enum LogStatus {
  SUCCESS = 'success',
  FAILURE = 'failure',
  PARTIAL = 'partial',
  TIMEOUT = 'timeout',
  CANCELLED = 'cancelled',
}

export class BaseLogDto {
  @ApiProperty({ enum: LogType, description: 'Type of log event' })
  @IsEnum(LogType)
  type: LogType;

  @ApiProperty({ description: 'Unique event identifier' })
  @IsString()
  event_id: string;

  @ApiProperty({ description: 'Source service that generated the event' })
  @IsString()
  source_service: string;

  @ApiPropertyOptional({ description: 'Correlation ID for tracing related events' })
  @IsOptional()
  @IsUUID()
  correlation_id?: string;

  @ApiProperty({ enum: LogStatus, description: 'Status of the event' })
  @IsEnum(LogStatus)
  status: LogStatus;

  @ApiProperty({ type: Object, description: 'Event-specific payload' })
  @IsObject()
  payload: Record<string, any>;

  @ApiPropertyOptional({ description: 'ISO 8601 timestamp' })
  @IsOptional()
  @IsDateString()
  timestamp?: string;
}

export class CreateAuditLogDto extends BaseLogDto {
  @ApiProperty({ description: 'Action performed (e.g., create, update, delete)' })
  @IsString()
  action: string;

  @ApiPropertyOptional({ description: 'ID of the user or system that initiated the event' })
  @IsOptional()
  @IsString()
  actor_id?: string;

  @ApiPropertyOptional({ description: 'IP address of the request origin' })
  @IsOptional()
  @IsString()
  ip_address?: string;

  @ApiPropertyOptional({ description: 'User agent string' })
  @IsOptional()
  @IsString()
  user_agent?: string;
}

export class CreateTransactionLogDto extends BaseLogDto {
  @ApiProperty({ description: 'Unique transaction identifier' })
  @IsString()
  transaction_id: string;

  @ApiProperty({ description: 'Transaction start timestamp' })
  @IsDateString()
  timestamp_start: string;

  @ApiProperty({ description: 'Transaction end timestamp' })
  @IsDateString()
  timestamp_end: string;

  @ApiProperty({ description: 'Duration in milliseconds' })
  @IsNumber()
  duration_ms: number;

  @ApiPropertyOptional({ description: 'Target service for the transaction' })
  @IsOptional()
  @IsString()
  target_service?: string;
}