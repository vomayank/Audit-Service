import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { QueueService } from './queue.service';
import { AuditProcessor } from './audit.processor';
import { AuditLog, AuditLogSchema } from '../schemas/audit-log.schema';
import { TransactionLog, TransactionLogSchema } from '../schemas/transaction-log.schema';

@Module({
  imports: [
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        redis: {
          host: configService.get('redis.host'),
          port: configService.get('redis.port'),
        },
      }),
      inject: [ConfigService],
    }),
    BullModule.registerQueue({
      name: 'audit-queue',
      defaultJobOptions: {
        removeOnComplete: true,
        removeOnFail: false,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
      },
    }),
    MongooseModule.forFeature([
      { name: AuditLog.name, schema: AuditLogSchema },
      { name: TransactionLog.name, schema: TransactionLogSchema },
    ]),
  ],
  providers: [QueueService, AuditProcessor],
  exports: [QueueService],
})
export class QueueModule {}