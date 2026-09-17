import { type ArgumentsHost, Catch, type ExceptionFilter, Logger } from '@nestjs/common';
import type { Request, Response } from 'express';
import type { ErrorResponse } from '~/common/dto';
import { describeException } from './exception-description';

const LOWEST_SERVER_ERROR_STATUS = 500;

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const http = host.switchToHttp();
    const request = http.getRequest<Request>();
    const response = http.getResponse<Response>();

    const { status, message, error } = describeException(exception);

    if (status >= LOWEST_SERVER_ERROR_STATUS) {
      this.logger.error(
        `${request.method} ${request.url} failed [${request.id}]`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    }

    const body: ErrorResponse = {
      statusCode: status,
      message,
      error,
      requestId: request.id,
    };

    response.status(status).json(body);
  }
}
