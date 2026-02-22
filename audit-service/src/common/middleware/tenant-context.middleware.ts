import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

declare global {
  namespace Express {
    interface Request {
      context?: {
        userId?: string;
        tenantId?: string;
        correlationId?: string;
      };
    }
  }
}

/**
 * Middleware to extract and validate tenant context from headers
 * Headers are set by the RBAC service during authentication
 */
@Injectable()
export class TenantContextMiddleware implements NestMiddleware {
  private readonly logger = new Logger(TenantContextMiddleware.name);

  use(req: Request, res: Response, next: NextFunction) {
    // Extract headers set by RBAC service
    const userId = req.headers['x-user-id'] as string;
    const tenantId = req.headers['x-tenant-id'] as string;
    const correlationId = (req.headers['x-correlation-id'] || 
                          req.headers['x-request-id'] || 
                          this.generateCorrelationId()) as string;

    // Attach context to request object
    req.context = {
      userId,
      tenantId,
      correlationId,
    };

    // Log the context for debugging
    this.logger.debug(`Request context - User: ${userId}, Tenant: ${tenantId}, Correlation: ${correlationId}`);

    // Set correlation ID in response headers for tracing
    res.setHeader('X-Correlation-Id', correlationId);

    next();
  }

  private generateCorrelationId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}