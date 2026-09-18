import { BadGatewayException, HttpException, HttpStatus } from '@nestjs/common';
import {
  APIConnectionError,
  APIError,
  AuthenticationError,
  RateLimitError,
} from 'openai';

export function toHttpException(error: unknown): HttpException {
  if (error instanceof AuthenticationError) {
    return new BadGatewayException('The language provider rejected our key');
  }

  if (error instanceof RateLimitError) {
    return new HttpException(
      'The language provider is rate limiting us',
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }

  if (error instanceof APIConnectionError) {
    return new BadGatewayException('Could not reach the language provider');
  }

  if (error instanceof APIError) {
    return new BadGatewayException('The language provider failed');
  }

  return new BadGatewayException('The language provider failed');
}
