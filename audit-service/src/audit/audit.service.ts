import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { QueueService } from '../queue/queue.service';
import { AuditLog, AuditLogDocument } from '../schemas/audit-log.schema';
import { TransactionLog, TransactionLogDocument } from '../schemas/transaction-log.schema';
import { CreateAuditLogDto, CreateTransactionLogDto, LogType } from '../dto/create-log.dto';
import { SearchLogsDto, AdvancedSearchDto } from '../dto/search-log.dto';
import { DatabaseError, NotFoundError } from '../exceptions/base.exception';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(
    @InjectModel(AuditLog.name)
    private readonly auditLogModel: Model<AuditLogDocument>,
    @InjectModel(TransactionLog.name)
    private readonly transactionLogModel: Model<TransactionLogDocument>,
    private readonly queueService: QueueService,
  ) {}

  // Ingestion methods - async via queue
  async ingestLog(logData: CreateAuditLogDto | CreateTransactionLogDto): Promise<{ success: boolean; message: string; data: { job_id: string } }> {
    try {
      // Add correlation ID if not provided
      if (!logData.correlation_id) {
        logData.correlation_id = uuidv4();
      }

      // Add timestamp if not provided
      if (!logData.timestamp) {
        logData.timestamp = new Date().toISOString();
      }

      // Add to queue for async processing
      const jobId = await this.queueService.addLogToQueue(logData);

      this.logger.debug(`Log ingested with job ID: ${jobId}`);

      return {
        success: true,
        message: 'Log event accepted for processing',
        data: {
          job_id: jobId,
        },
      };
    } catch (error) {
      this.logger.error('Failed to ingest log', error);
      throw new DatabaseError('ingest', { error: error.message });
    }
  }

  // Search methods - direct database queries
  async searchLogs(searchDto: SearchLogsDto): Promise<any> {
    try {
      const { page, limit, sort_by, sort_order, type, ...filters } = searchDto;
      
      // Build query
      const query: any = {};
      
      if (filters.actor_id) query.actor_id = filters.actor_id;
      if (filters.source_service) query.source_service = filters.source_service;
      if (filters.correlation_id) query.correlation_id = filters.correlation_id;
      if (filters.status) query.status = filters.status;
      
      // Date range filter
      if (filters.start_date || filters.end_date) {
        query.timestamp = {};
        if (filters.start_date) query.timestamp.$gte = new Date(filters.start_date);
        if (filters.end_date) query.timestamp.$lte = new Date(filters.end_date);
      }

      // Determine which collection to query
      let model: Model<any>;
      if (type === LogType.TRANSACTION) {
        model = this.transactionLogModel;
      } else {
        model = this.auditLogModel;
      }

      // Execute query with pagination
      const skip = (page - 1) * limit;
      const sortOptions: any = {};
      sortOptions[sort_by] = sort_order === 'asc' ? 1 : -1;

      const [data, total] = await Promise.all([
        model
          .find(query)
          .sort(sortOptions)
          .skip(skip)
          .limit(limit)
          .lean()
          .exec(),
        model.countDocuments(query),
      ]);

      const totalPages = Math.ceil(total / limit);

      return {
        success: true,
        message: 'Logs retrieved successfully',
        data: {
          items: data,
          pagination: {
            page,
            limit,
            total,
            totalPages,
            hasNext: page < totalPages,
            hasPrev: page > 1,
          },
        },
      };
    } catch (error) {
      this.logger.error('Failed to search logs', error);
      throw new DatabaseError('search', { error: error.message });
    }
  }

  async advancedSearch(searchDto: AdvancedSearchDto): Promise<any> {
    try {
      const { filters, projection, aggregation, page, limit, sort } = searchDto;
      
      // Build MongoDB query from filters
      const query: any = {};
      
      if (filters && filters.length > 0) {
        for (const filter of filters) {
          const { field, operator, value } = filter;
          
          switch (operator) {
            case 'eq':
              query[field] = value;
              break;
            case 'ne':
              query[field] = { $ne: value };
              break;
            case 'gt':
              query[field] = { $gt: value };
              break;
            case 'gte':
              query[field] = { $gte: value };
              break;
            case 'lt':
              query[field] = { $lt: value };
              break;
            case 'lte':
              query[field] = { $lte: value };
              break;
            case 'in':
              query[field] = { $in: value };
              break;
            case 'nin':
              query[field] = { $nin: value };
              break;
            case 'regex':
              query[field] = { $regex: value, $options: 'i' };
              break;
          }
        }
      }

      // If aggregation pipeline is provided, use it
      if (aggregation && aggregation.length > 0) {
        const pipeline = [
          { $match: query },
          ...aggregation,
          { $skip: (page - 1) * limit },
          { $limit: limit },
        ];

        const results = await this.auditLogModel.aggregate(pipeline).exec();
        
        return {
          success: true,
          message: 'Advanced search completed',
          data: {
            items: results,
            pagination: {
              page,
              limit,
            },
          },
        };
      }

      // Otherwise, use regular find query
      const skip = (page - 1) * limit;
      const sortOptions = sort || { timestamp: -1 };

      let queryBuilder = this.auditLogModel.find(query);
      
      if (projection && projection.length > 0) {
        queryBuilder = queryBuilder.select(projection.join(' '));
      }

      const [data, total] = await Promise.all([
        queryBuilder
          .sort(sortOptions)
          .skip(skip)
          .limit(limit)
          .lean()
          .exec(),
        this.auditLogModel.countDocuments(query),
      ]);

      const totalPages = Math.ceil(total / limit);

      return {
        success: true,
        message: 'Advanced search completed',
        data: {
          items: data,
          pagination: {
            page,
            limit,
            total,
            totalPages,
            hasNext: page < totalPages,
            hasPrev: page > 1,
          },
        },
      };
    } catch (error) {
      this.logger.error('Failed to perform advanced search', error);
      throw new DatabaseError('advanced_search', { error: error.message });
    }
  }

  async getLogById(id: string, type?: LogType): Promise<any> {
    try {
      let log;
      
      if (type === LogType.TRANSACTION) {
        log = await this.transactionLogModel.findById(id).lean().exec();
      } else {
        log = await this.auditLogModel.findById(id).lean().exec();
        if (!log && !type) {
          // If not found in audit logs and no type specified, try transaction logs
          log = await this.transactionLogModel.findById(id).lean().exec();
        }
      }

      if (!log) {
        throw new NotFoundError('Log', id);
      }

      return {
        success: true,
        message: 'Log retrieved successfully',
        data: log,
      };
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      this.logger.error('Failed to get log by ID', error);
      throw new DatabaseError('get_by_id', { error: error.message });
    }
  }

  async getLogsByCorrelationId(correlationId: string): Promise<any> {
    try {
      const [auditLogs, transactionLogs] = await Promise.all([
        this.auditLogModel.find({ correlation_id: correlationId }).lean().exec(),
        this.transactionLogModel.find({ correlation_id: correlationId }).lean().exec(),
      ]);

      const allLogs = [
        ...auditLogs.map(log => ({ ...log, _type: 'audit' })),
        ...transactionLogs.map(log => ({ ...log, _type: 'transaction' })),
      ].sort((a, b) => {
        const timeA = new Date(a.timestamp || a.timestamp_start).getTime();
        const timeB = new Date(b.timestamp || b.timestamp_start).getTime();
        return timeA - timeB;
      });

      return {
        success: true,
        message: 'Logs retrieved successfully',
        data: {
          correlation_id: correlationId,
          total: allLogs.length,
          logs: allLogs,
        },
      };
    } catch (error) {
      this.logger.error('Failed to get logs by correlation ID', error);
      throw new DatabaseError('get_by_correlation', { error: error.message });
    }
  }

  async getQueueStats(): Promise<any> {
    const stats = await this.queueService.getQueueStats();
    return {
      success: true,
      message: 'Queue statistics retrieved',
      data: stats,
    };
  }
}