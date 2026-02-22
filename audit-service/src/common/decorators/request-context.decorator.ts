import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export interface RequestContext {
  userId?: string;
  tenantId?: string;
  correlationId?: string;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Decorator to extract request context from headers
 * Headers are populated by the RBAC service
 */
export const ReqContext = createParamDecorator(
  (data: keyof RequestContext | undefined, ctx: ExecutionContext): RequestContext | any => {
    const request = ctx.switchToHttp().getRequest();
    
    const context: RequestContext = {
      userId: request.headers['x-user-id'],
      tenantId: request.headers['x-tenant-id'],
      correlationId: request.headers['x-correlation-id'] || request.headers['x-request-id'],
      ipAddress: request.headers['x-forwarded-for'] || request.ip,
      userAgent: request.headers['user-agent'],
    };

    return data ? context[data] : context;
  },
);

/**
 * Decorator to get current user ID from x-user-id header
 */
export const UserId = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest();
    return request.headers['x-user-id'];
  },
);

/**
 * Decorator to get current tenant ID from x-tenant-id header
 */
export const TenantId = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest();
    return request.headers['x-tenant-id'];
  },
);