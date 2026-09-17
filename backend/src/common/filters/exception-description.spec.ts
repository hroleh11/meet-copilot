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
