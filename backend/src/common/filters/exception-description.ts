import { HttpException, HttpStatus } from '@nestjs/common';

interface ExceptionDescription {
  status: number;
  message: string;
  error: string;
}

export function describeException(exception: unknown): ExceptionDescription {
  if (!(exception instanceof HttpException)) {
    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'Internal server error',
      error: 'Internal Server Error',
    };
  }

  const status = exception.getStatus();
  const payload = exception.getResponse();

  if (typeof payload === 'string') {
    return { status, message: payload, error: exception.name };
  }

  const { message, error } = payload as { message?: string | string[]; error?: string };

  return {
    status,
    message: Array.isArray(message) ? message.join('; ') : (message ?? exception.message),
    error: error ?? exception.name,
  };
}
