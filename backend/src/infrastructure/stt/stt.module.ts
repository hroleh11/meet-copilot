import { Global, Module } from '@nestjs/common';
import { DeepgramSttProvider } from './deepgram-stt.provider';
import { SttProvider } from './stt.provider';

@Global()
@Module({
  providers: [{ provide: SttProvider, useClass: DeepgramSttProvider }],
  exports: [SttProvider],
})
export class SttProviderModule {}
