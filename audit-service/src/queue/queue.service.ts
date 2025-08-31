import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { QueueError } from '../exceptions/base.exception';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class QueueService {
  private readonly logger = new Logger(QueueService.name);

  constructor(
    @InjectQueue('audit-queue') private readonly auditQueue: Queue,
  ) {}

  async addLogToQueue(logData: any, priority: number = 0): Promise<string> {
    try {
      const jobId = uuidv4();
      const job = await this.auditQueue.add('process-log', logData, {
        jobId,
        priority,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
      });

      this.logger.debug(`Added job ${job.id} to queue`);
      return job.id as string;
    } catch (error) {
      this.logger.error('Failed to add job to queue', error);
      throw new QueueError('add', { error: error.message });
    }
  }

  async getQueueStats() {
    try {
      const [waiting, active, completed, failed, delayed] = await Promise.all([
        this.auditQueue.getWaitingCount(),
        this.auditQueue.getActiveCount(),
        this.auditQueue.getCompletedCount(),
        this.auditQueue.getFailedCount(),
        this.auditQueue.getDelayedCount(),
      ]);

      return {
        waiting,
        active,
        completed,
        failed,
        delayed,
        total: waiting + active + completed + failed + delayed,
      };
    } catch (error) {
      this.logger.error('Failed to get queue stats', error);
      throw new QueueError('stats', { error: error.message });
    }
  }

  async cleanQueue(grace: number = 5000) {
    try {
      await this.auditQueue.clean(grace, 'completed');
      await this.auditQueue.clean(grace, 'failed');
      this.logger.log('Queue cleaned successfully');
    } catch (error) {
      this.logger.error('Failed to clean queue', error);
      throw new QueueError('clean', { error: error.message });
    }
  }

  async pauseQueue() {
    await this.auditQueue.pause();
    this.logger.log('Queue paused');
  }

  async resumeQueue() {
    await this.auditQueue.resume();
    this.logger.log('Queue resumed');
  }
}