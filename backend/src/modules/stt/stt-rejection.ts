import { STT_CLOSE_CODE } from './types/stt.types';

export class SttRejection extends Error {
  constructor(
    readonly code: number,
    message: string,
  ) {
    super(message);
    this.name = 'SttRejection';
  }

  static unauthorized(): SttRejection {
    return new SttRejection(STT_CLOSE_CODE.unauthorized, 'Invalid access token');
  }

  static notFound(): SttRejection {
    return new SttRejection(STT_CLOSE_CODE.notFound, 'Meeting is not available');
  }
}
