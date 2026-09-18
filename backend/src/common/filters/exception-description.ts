import { HttpException, HttpStatus } from '@nestjs/common';

interface ExceptionDescription {
  status: number;
  message: string;
  error: string;
}

const LOWEST_CLIENT_ERROR_STATUS = 400;
const LOWEST_SERVER_ERROR_STATUS = 500;

function asClientError(exception: unknown): ExceptionDescription | null {
  if (!(exception instanceof Error)) {
    return null;
  }

  const status = (exception as { status?: unknown }).status;

  if (
    typeof status !== 'number' ||
    status < LOWEST_CLIENT_ERROR_STATUS ||
    status >= LOWEST_SERVER_ERROR_STATUS
  ) {
    return null;
  }

  return { status, message: exception.message, error: exception.name };
}

export function describeException(exception: unknown): ExceptionDescription {
  if (!(exception instanceof HttpException)) {
    return (
      asClientError(exception) ?? {
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Internal server error',
        error: 'Internal Server Error',
      }
    );
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
