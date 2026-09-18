import { BadRequestException, NotFoundException } from '@nestjs/common';
import { describeException } from './exception-description';

describe('describeException', () => {
  it('describes an unknown error as an internal failure', () => {
    expect(describeException(new Error('boom'))).toEqual({
      status: 500,
      message: 'Internal server error',
      error: 'Internal Server Error',
    });
  });

  it('keeps the status and message of an http exception', () => {
    expect(describeException(new NotFoundException('Meeting not found'))).toEqual({
      status: 404,
      message: 'Meeting not found',
      error: 'Not Found',
    });
  });

  it('passes a body that is too large through as 413', () => {
    const tooLarge = Object.assign(new Error('request entity too large'), {
      status: 413,
      name: 'PayloadTooLargeError',
    });

    expect(describeException(tooLarge)).toEqual({
      status: 413,
      message: 'request entity too large',
      error: 'PayloadTooLargeError',
    });
  });

  it('hides a server-side error that carries its own status', () => {
    const upstream = Object.assign(new Error('socket hang up'), { status: 502 });

    expect(describeException(upstream).message).toBe('Internal server error');
  });

  it('joins validation messages into one line', () => {
    const exception = new BadRequestException([
      'email must be an email',
      'name is required',
    ]);

    expect(describeException(exception).message).toBe(
      'email must be an email; name is required',
    );
  });
});
