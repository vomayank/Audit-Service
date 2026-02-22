import { Process, Processor, OnQueueActive, OnQueueCompleted, OnQueueFailed } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AuditLog, AuditLogDocument } from '../schemas/audit-log.schema';
import { TransactionLog, TransactionLogDocument } from '../schemas/transaction-log.schema';
import { LogType } from '../dto/create-log.dto';

@Processor('audit-queue')
export class AuditProcessor {
  private readonly logger = new Logger(AuditProcessor.name);

  constructor(
    @InjectModel(AuditLog.name)
    private readonly auditLogModel: Model<AuditLogDocument>,
    @InjectModel(TransactionLog.name)
    private readonly transactionLogModel: Model<TransactionLogDocument>,
  ) {}

  @Process('process-log')
  async handleLog(job: Job) {
    const startTime = Date.now();
    this.logger.debug(`Processing job ${job.id}`);

    try {
      const logData = job.data;
      const { type, ...data } = logData;

      // Ensure timestamp is a Date object
      if (data.timestamp) {
        data.timestamp = new Date(data.timestamp);
      } else {
        data.timestamp = new Date();
      }

      let result;

      switch (type) {
        case LogType.AUDIT:
        case LogType.USER_ACTIVITY:
          result = await this.processAuditLog(data);
          break;
        case LogType.TRANSACTION:
          result = await this.processTransactionLog(data);
          break;
        default:
          // Default to audit log for unknown types
          result = await this.processAuditLog(data);
      }

      const processingTime = Date.now() - startTime;
      this.logger.debug(`Job ${job.id} processed in ${processingTime}ms`);

      return {
        success: true,
        id: result._id,
        processingTime,
      };
    } catch (error) {
      this.logger.error(`Failed to process job ${job.id}`, error);
      throw error; // Re-throw to trigger retry mechanism
    }
  }

  private async processAuditLog(data: any): Promise<AuditLogDocument> {
    try {
      // Ensure tenant_id is present for multi-tenancy
      if (!data.tenant_id) {
        this.logger.warn('Processing log without tenant_id', { event_id: data.event_id });
      }
      
      const auditLog = new this.auditLogModel(data);
      return await auditLog.save();
    } catch (error) {
      this.logger.error('Failed to save audit log', error);
      throw new Error(`Database error: ${error.message}`);
    }
  }

  private async processTransactionLog(data: any): Promise<TransactionLogDocument> {
    try {
      // Ensure tenant_id is present for multi-tenancy
      if (!data.tenant_id) {
        this.logger.warn('Processing transaction log without tenant_id', { transaction_id: data.transaction_id });
      }
      
      // Ensure date fields are properly formatted
      if (data.timestamp_start) {
        data.timestamp_start = new Date(data.timestamp_start);
      }
      if (data.timestamp_end) {
        data.timestamp_end = new Date(data.timestamp_end);
      }

      // Calculate duration if not provided
      if (!data.duration_ms && data.timestamp_start && data.timestamp_end) {
        data.duration_ms = data.timestamp_end.getTime() - data.timestamp_start.getTime();
      }

      const transactionLog = new this.transactionLogModel(data);
      return await transactionLog.save();
    } catch (error) {
      this.logger.error('Failed to save transaction log', error);
      throw new Error(`Database error: ${error.message}`);
    }
  }

  @OnQueueActive()
  onActive(job: Job) {
    this.logger.debug(`Processing job ${job.id} of type ${job.name}`);
  }

  @OnQueueCompleted()
  onComplete(job: Job, result: any) {
    this.logger.debug(`Job ${job.id} completed with result:`, result);
  }

  @OnQueueFailed()
  onFailed(job: Job, error: Error) {
    this.logger.error(`Job ${job.id} failed with error:`, error.message);
    
    // Check if this was the last attempt
    if (job.attemptsMade >= (job.opts.attempts || 3)) {
      // Send to dead letter queue or alert administrators
      this.logger.error(`Job ${job.id} failed permanently after ${job.attemptsMade} attempts`);
      // Here you could implement dead letter queue logic or send alerts
    }
  }
}