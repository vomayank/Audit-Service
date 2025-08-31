import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type TransactionLogDocument = TransactionLog & Document;

@Schema({
  timestamps: true,
  collection: 'transaction_logs',
})
export class TransactionLog {
  @Prop({ required: true, index: true })
  transaction_id: string;

  @Prop({ index: true })
  tenant_id: string;

  @Prop({ index: true })
  correlation_id: string;

  @Prop({ required: true, index: true })
  timestamp_start: Date;

  @Prop({ required: true })
  timestamp_end: Date;

  @Prop({ required: true })
  duration_ms: number;

  @Prop({ required: true, enum: ['success', 'failure', 'timeout', 'cancelled'] })
  status: string;

  @Prop({ required: true, index: true })
  source_service: string;

  @Prop()
  target_service?: string;

  @Prop({ type: Object })
  payload: {
    request_path?: string;
    request_method?: string;
    response_status_code?: number;
    error_message?: string;
    [key: string]: any;
  };

  @Prop({ type: Object })
  performance_metrics?: {
    cpu_usage?: number;
    memory_usage?: number;
    [key: string]: any;
  };
}

export const TransactionLogSchema = SchemaFactory.createForClass(TransactionLog);

// Create compound indexes for performance queries
TransactionLogSchema.index({ tenant_id: 1, timestamp_start: -1 });
TransactionLogSchema.index({ tenant_id: 1, source_service: 1, status: 1, timestamp_start: -1 });
TransactionLogSchema.index({ transaction_id: 1 });
TransactionLogSchema.index({ correlation_id: 1 });
TransactionLogSchema.index({ tenant_id: 1, status: 1, timestamp_start: -1 });