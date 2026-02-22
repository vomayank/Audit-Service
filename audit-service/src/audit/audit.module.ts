import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuditController } from './audit.controller';
import { AuditService } from './audit.service';
import { QueueModule } from '../queue/queue.module';
import { AuditLog, AuditLogSchema } from '../schemas/audit-log.schema';
import { TransactionLog, TransactionLogSchema } from '../schemas/transaction-log.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: AuditLog.name, schema: AuditLogSchema },
      { name: TransactionLog.name, schema: TransactionLogSchema },
    ]),
    QueueModule,
  ],
  controllers: [AuditController],
  providers: [AuditService],
  exports: [AuditService],
})
export class AuditModule {}