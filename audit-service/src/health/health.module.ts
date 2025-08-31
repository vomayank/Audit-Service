import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';
import { BullModule } from '@nestjs/bull';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'audit-queue',
    }),
  ],
  controllers: [HealthController],
})
export class HealthModule {}