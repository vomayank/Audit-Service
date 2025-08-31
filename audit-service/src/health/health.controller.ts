import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { Queue } from 'bull';
import { InjectQueue } from '@nestjs/bull';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(
    @InjectConnection() private readonly mongoConnection: Connection,
    @InjectQueue('audit-queue') private readonly auditQueue: Queue,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Health check endpoint' })
  @ApiResponse({
    status: 200,
    description: 'Service is healthy',
    schema: {
      example: {
        status: 'healthy',
        timestamp: '2024-01-01T10:00:00Z',
        services: {
          api: 'up',
          database: 'up',
          queue: 'up',
        },
      },
    },
  })
  async check() {
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        api: 'up',
        database: 'unknown',
        queue: 'unknown',
      },
    };

    // Check MongoDB connection
    try {
      if (this.mongoConnection.readyState === 1) {
        health.services.database = 'up';
      } else {
        health.services.database = 'down';
        health.status = 'unhealthy';
      }
    } catch (error) {
      health.services.database = 'down';
      health.status = 'unhealthy';
    }

    // Check Redis/Queue connection
    try {
      const queueHealth = await this.auditQueue.isReady();
      health.services.queue = queueHealth ? 'up' : 'down';
      if (!queueHealth) {
        health.status = 'unhealthy';
      }
    } catch (error) {
      health.services.queue = 'down';
      health.status = 'unhealthy';
    }

    return health;
  }

  @Get('ready')
  @ApiOperation({ summary: 'Readiness check endpoint' })
  @ApiResponse({
    status: 200,
    description: 'Service is ready',
  })
  @ApiResponse({
    status: 503,
    description: 'Service is not ready',
  })
  async ready() {
    const isMongoReady = this.mongoConnection.readyState === 1;
    const isQueueReady = await this.auditQueue.isReady();

    if (isMongoReady && isQueueReady) {
      return { ready: true };
    }

    throw new Error('Service not ready');
  }

  @Get('live')
  @ApiOperation({ summary: 'Liveness check endpoint' })
  @ApiResponse({
    status: 200,
    description: 'Service is alive',
  })
  async live() {
    return { alive: true };
  }
}