import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type AuditLogDocument = AuditLog & Document;

@Schema({
  timestamps: true,
  collection: 'audit_logs',
})
export class AuditLog {
  @Prop({ required: true, index: true })
  event_id: string;

  @Prop({ required: true, index: true })
  timestamp: Date;

  @Prop({ required: true, index: true })
  source_service: string;

  @Prop({ index: true })
  tenant_id: string;

  @Prop({ index: true })
  actor_id: string;

  @Prop({ index: true })
  correlation_id: string;

  @Prop({ required: true })
  action: string;

  @Prop({ required: true, enum: ['success', 'failure', 'partial'] })
  status: string;

  @Prop({ type: Object })
  payload: Record<string, any>;

  @Prop()
  ip_address?: string;

  @Prop()
  user_agent?: string;

  @Prop({ type: Object })
  metadata?: Record<string, any>;
}

export const AuditLogSchema = SchemaFactory.createForClass(AuditLog);

// Create compound indexes for optimal query performance
AuditLogSchema.index({ tenant_id: 1, timestamp: -1 });
AuditLogSchema.index({ tenant_id: 1, actor_id: 1, timestamp: -1 });
AuditLogSchema.index({ correlation_id: 1 });
AuditLogSchema.index({ tenant_id: 1, source_service: 1, timestamp: -1 });
AuditLogSchema.index({ 'payload.ip_address': 1 }, { sparse: true });