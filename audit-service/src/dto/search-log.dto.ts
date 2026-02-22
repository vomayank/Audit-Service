import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsDateString, IsNumber, Min, Max, IsEnum, IsObject } from 'class-validator';
import { Type } from 'class-transformer';
import { LogStatus, LogType } from './create-log.dto';

export class SearchLogsDto {
  @ApiPropertyOptional({ description: 'Actor ID to filter by' })
  @IsOptional()
  @IsString()
  actor_id?: string;

  @ApiPropertyOptional({ description: 'Source service to filter by' })
  @IsOptional()
  @IsString()
  source_service?: string;

  @ApiPropertyOptional({ description: 'Correlation ID to filter by' })
  @IsOptional()
  @IsString()
  correlation_id?: string;

  @ApiPropertyOptional({ enum: LogType, description: 'Log type to filter by' })
  @IsOptional()
  @IsEnum(LogType)
  type?: LogType;

  @ApiPropertyOptional({ enum: LogStatus, description: 'Status to filter by' })
  @IsOptional()
  @IsEnum(LogStatus)
  status?: LogStatus;

  @ApiPropertyOptional({ description: 'Start date for time range filter (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  start_date?: string;

  @ApiPropertyOptional({ description: 'End date for time range filter (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  end_date?: string;

  @ApiPropertyOptional({ description: 'Page number for pagination', default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Number of items per page', default: 20, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiPropertyOptional({ description: 'Sort field', default: 'timestamp' })
  @IsOptional()
  @IsString()
  sort_by?: string = 'timestamp';

  @ApiPropertyOptional({ description: 'Sort order', enum: ['asc', 'desc'], default: 'desc' })
  @IsOptional()
  @IsEnum(['asc', 'desc'])
  sort_order?: 'asc' | 'desc' = 'desc';
}

export class AdvancedSearchDto {
  @ApiPropertyOptional({ 
    description: 'Advanced filter conditions',
    type: 'array',
    items: {
      type: 'object',
      properties: {
        field: { type: 'string' },
        operator: { type: 'string', enum: ['eq', 'ne', 'gt', 'gte', 'lt', 'lte', 'in', 'nin', 'regex'] },
        value: { type: 'any' }
      }
    }
  })
  @IsOptional()
  filters?: Array<{
    field: string;
    operator: 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'nin' | 'regex';
    value: any;
  }>;

  @ApiPropertyOptional({ description: 'Fields to include in response' })
  @IsOptional()
  projection?: string[];

  @ApiPropertyOptional({ description: 'Aggregation pipeline stages' })
  @IsOptional()
  @IsObject()
  aggregation?: Record<string, any>[];

  @ApiPropertyOptional({ description: 'Page number for pagination', default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Number of items per page', default: 20, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiPropertyOptional({ description: 'Sort configuration' })
  @IsOptional()
  @IsObject()
  sort?: Record<string, 1 | -1>;
}