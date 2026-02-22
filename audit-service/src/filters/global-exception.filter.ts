import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { BaseHttpError, SystemError } from '../exceptions/base.exception';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status: number;
    let errorResponse: any;

    // Handle different types of exceptions
    if (exception instanceof BaseHttpError) {
      // Our custom errors
      status = exception.getStatus();
      const errorData = exception.getResponse() as any;
      errorResponse = {
        ...errorData,
        error: {
          ...errorData.error,
          path: request.url,
          correlation_id: request.headers['x-correlation-id'] as string,
        },
      };
      
      // Log business errors as warnings, system errors as errors
      if (exception instanceof SystemError) {
        this.logger.error(
          `System error: ${exception.message}`,
          exception.stack,
          { details: exception.details, path: request.url }
        );
      } else {
        this.logger.warn(
          `Business error: ${exception.message}`,
          { details: exception.details, path: request.url }
        );
      }
    } else if (exception instanceof HttpException) {
      // Standard NestJS HTTP exceptions
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();
      
      errorResponse = {
        success: false,
        message: typeof exceptionResponse === 'string' 
          ? exceptionResponse 
          : (exceptionResponse as any).message || 'An error occurred',
        error: {
          code: 'HTTP_EXCEPTION',
          details: typeof exceptionResponse === 'object' ? exceptionResponse : undefined,
          timestamp: new Date().toISOString(),
          path: request.url,
          correlation_id: request.headers['x-correlation-id'] as string,
        },
      };
      
      this.logger.warn(
        `HTTP exception: ${exception.message}`,
        { status, path: request.url }
      );
    } else if (exception instanceof Error) {
      // Unhandled JavaScript errors (programmer errors)
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      errorResponse = {
        success: false,
        message: 'An unexpected error occurred',
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          details: process.env.NODE_ENV === 'development' ? {
            message: exception.message,
            stack: exception.stack,
          } : undefined,
          timestamp: new Date().toISOString(),
          path: request.url,
          correlation_id: request.headers['x-correlation-id'] as string,
        },
      };
      
      // Log full error details for debugging
      this.logger.error(
        `Unhandled error: ${exception.message}`,
        exception.stack,
        { path: request.url }
      );
    } else {
      // Unknown error type
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      errorResponse = {
        success: false,
        message: 'An unknown error occurred',
        error: {
          code: 'UNKNOWN_ERROR',
          timestamp: new Date().toISOString(),
          path: request.url,
          correlation_id: request.headers['x-correlation-id'] as string,
        },
      };
      
      this.logger.error(
        'Unknown error type caught',
        exception,
        { path: request.url }
      );
    }

    // Send response
    response.status(status).json(errorResponse);
  }
}