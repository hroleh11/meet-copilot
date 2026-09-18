import { BadGatewayException, HttpException, HttpStatus } from '@nestjs/common';
import Anthropic from '@anthropic-ai/sdk';

export function toHttpException(error: unknown): HttpException {
  if (error instanceof Anthropic.AuthenticationError) {
    return new BadGatewayException('The language provider rejected our key');
  }

  if (error instanceof Anthropic.RateLimitError) {
    return new HttpException(
      'The language provider is rate limiting us',
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }

  if (error instanceof Anthropic.APIConnectionError) {
    return new BadGatewayException('Could not reach the language provider');
  }

  if (error instanceof Anthropic.APIError) {
    return new BadGatewayException('The language provider failed');
  }

  return new BadGatewayException('The language provider failed');
}
