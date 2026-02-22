import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  Param,
  HttpStatus,
  HttpCode,
  ValidationPipe,
  UseInterceptors,
  ClassSerializerInterceptor,
  Req,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBearerAuth,
  ApiHeader,
} from '@nestjs/swagger';
import { AuditService } from './audit.service';
import { CreateAuditLogDto, CreateTransactionLogDto, LogType } from '../dto/create-log.dto';
import { SearchLogsDto, AdvancedSearchDto } from '../dto/search-log.dto';
import { ReqContext, RequestContext, UserId, TenantId } from '../common/decorators/request-context.decorator';
import { Request } from 'express';

@ApiTags('Audit Logs')
@Controller('v1/logs')
@UseInterceptors(ClassSerializerInterceptor)
@ApiHeader({
  name: 'x-user-id',
  description: 'User ID from RBAC service',
  required: false,
})
@ApiHeader({
  name: 'x-tenant-id',
  description: 'Tenant ID from RBAC service',
  required: false,
})
@ApiHeader({
  name: 'x-correlation-id',
  description: 'Correlation ID for request tracing',
  required: false,
})
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Post()
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ 
    summary: 'Ingest a new log event',
    description: 'Accepts a log event and queues it for asynchronous processing'
  })
  @ApiResponse({
    status: HttpStatus.ACCEPTED,
    description: 'Log event accepted for processing',
    schema: {
      example: {
        success: true,
        message: 'Log event accepted for processing',
        data: {
          job_id: '123e4567-e89b-12d3-a456-426614174000'
        }
      }
    }
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid request data',
  })
  @ApiResponse({
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    description: 'Internal server error',
  })
  async ingestLog(
    @Body(ValidationPipe) logData: CreateAuditLogDto | CreateTransactionLogDto,
    @ReqContext() context: RequestContext,
  ) {
    // Enrich log data with context from RBAC headers
    const enrichedLogData = {
      ...logData,
      tenant_id: context.tenantId,
      actor_id: logData['actor_id'] || context.userId,
      correlation_id: logData.correlation_id || context.correlationId,
      ip_address: logData['ip_address'] || context.ipAddress,
      user_agent: logData['user_agent'] || context.userAgent,
    };
    
    return this.auditService.ingestLog(enrichedLogData);
  }

  @Get()
  @ApiOperation({ 
    summary: 'Search for log events',
    description: 'Search and retrieve log events with filtering and pagination'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Logs retrieved successfully',
    schema: {
      example: {
        success: true,
        message: 'Logs retrieved successfully',
        data: {
          items: [],
          pagination: {
            page: 1,
            limit: 20,
            total: 100,
            totalPages: 5,
            hasNext: true,
            hasPrev: false
          }
        }
      }
    }
  })
  async searchLogs(
    @Query(ValidationPipe) searchDto: SearchLogsDto,
    @TenantId() tenantId: string,
  ) {
    // Automatically filter by tenant ID from RBAC headers
    const tenantScopedSearch = {
      ...searchDto,
      tenant_id: tenantId,
    };
    return this.auditService.searchLogs(tenantScopedSearch);
  }

  @Post('search')
  @ApiOperation({ 
    summary: 'Advanced search with complex filters',
    description: 'Perform advanced search with custom filters, aggregations, and projections'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Advanced search completed',
  })
  async advancedSearch(
    @Body(ValidationPipe) searchDto: AdvancedSearchDto,
    @TenantId() tenantId: string,
  ) {
    // Ensure tenant isolation in advanced search
    const tenantScopedSearch = {
      ...searchDto,
      filters: [
        ...(searchDto.filters || []),
        { field: 'tenant_id', operator: 'eq' as const, value: tenantId },
      ],
    };
    return this.auditService.advancedSearch(tenantScopedSearch);
  }

  @Get('correlation/:correlationId')
  @ApiOperation({ 
    summary: 'Get logs by correlation ID',
    description: 'Retrieve all logs associated with a specific correlation ID'
  })
  @ApiParam({
    name: 'correlationId',
    description: 'The correlation ID to search for',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Logs retrieved successfully',
  })
  async getLogsByCorrelationId(
    @Param('correlationId') correlationId: string,
    @TenantId() tenantId: string,
  ) {
    return this.auditService.getLogsByCorrelationId(correlationId, tenantId);
  }

  @Get('stats/queue')
  @ApiOperation({ 
    summary: 'Get queue statistics',
    description: 'Retrieve current statistics for the audit log processing queue'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Queue statistics retrieved',
    schema: {
      example: {
        success: true,
        message: 'Queue statistics retrieved',
        data: {
          waiting: 10,
          active: 2,
          completed: 1000,
          failed: 5,
          delayed: 0,
          total: 1017
        }
      }
    }
  })
  async getQueueStats() {
    return this.auditService.getQueueStats();
  }

  @Get(':id')
  @ApiOperation({ 
    summary: 'Get log by ID',
    description: 'Retrieve a specific log entry by its ID'
  })
  @ApiParam({
    name: 'id',
    description: 'The log ID',
    example: '507f1f77bcf86cd799439011',
  })
  @ApiQuery({
    name: 'type',
    enum: LogType,
    required: false,
    description: 'Specify the log type to search in specific collection',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Log retrieved successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Log not found',
  })
  async getLogById(
    @Param('id') id: string,
    @Query('type') type?: LogType,
    @TenantId() tenantId: string,
  ) {
    return this.auditService.getLogById(id, type, tenantId);
  }
}