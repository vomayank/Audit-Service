import { HttpException, HttpStatus } from '@nestjs/common';

export interface ErrorResponse {
  success: false;
  message: string;
  error: {
    code: string;
    details?: any;
    timestamp: string;
    path?: string;
    correlation_id?: string;
  };
}

export class BaseHttpError extends HttpException {
  constructor(
    message: string,
    statusCode: HttpStatus,
    public readonly errorCode: string,
    public readonly details?: any,
  ) {
    super(
      {
        success: false,
        message,
        error: {
          code: errorCode,
          details,
          timestamp: new Date().toISOString(),
        },
      },
      statusCode,
    );
  }
}

export class BusinessError extends BaseHttpError {
  constructor(message: string, errorCode: string, details?: any) {
    super(message, HttpStatus.BAD_REQUEST, errorCode, details);
  }
}

export class ValidationError extends BaseHttpError {
  constructor(message: string, details?: any) {
    super(message, HttpStatus.UNPROCESSABLE_ENTITY, 'VALIDATION_ERROR', details);
  }
}

export class NotFoundError extends BaseHttpError {
  constructor(resource: string, identifier?: string) {
    const message = identifier
      ? `${resource} with identifier '${identifier}' not found`
      : `${resource} not found`;
    super(message, HttpStatus.NOT_FOUND, 'RESOURCE_NOT_FOUND', { resource, identifier });
  }
}

export class SystemError extends BaseHttpError {
  constructor(message: string, details?: any) {
    super(message, HttpStatus.INTERNAL_SERVER_ERROR, 'SYSTEM_ERROR', details);
  }
}

export class DatabaseError extends SystemError {
  constructor(operation: string, details?: any) {
    super(`Database operation '${operation}' failed`, { operation, ...details });
  }
}

export class QueueError extends SystemError {
  constructor(operation: string, details?: any) {
    super(`Queue operation '${operation}' failed`, { operation, ...details });
  }
}