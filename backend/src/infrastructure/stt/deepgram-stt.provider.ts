import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DeepgramClient } from '@deepgram/sdk';
import type { Env } from '~/common/config';
import type { Language } from '~/generated/prisma/enums';
import { SttProvider, type SttStream, type SttStreamHandlers } from './stt.provider';
import { toSttResult } from './deepgram-result.mapper';

const KEEP_ALIVE_INTERVAL_MS = 8_000;

@Injectable()
export class DeepgramSttProvider extends SttProvider {
  private readonly logger = new Logger(DeepgramSttProvider.name);
  private readonly client: DeepgramClient;
  private readonly apiKey: string;

  constructor(configService: ConfigService<Env, true>) {
    super();
    this.apiKey = configService.getOrThrow<string>('DEEPGRAM_API_KEY');
    this.client = new DeepgramClient({ apiKey: this.apiKey });
  }

  async open(language: Language, handlers: SttStreamHandlers): Promise<SttStream> {
    const socket = await this.client.listen.v1.connect({
      Authorization: `Token ${this.apiKey}`,
      model: 'nova-3',
      language,
      encoding: 'linear16',
      sample_rate: 16_000,
      channels: 1,
      interim_results: 'true',
      smart_format: 'true',
      endpointing: 300,
    });

    socket.on('message', (message) => {
      const result = toSttResult(message);

      if (result) {
        handlers.onResult(result);
      }
    });

    socket.on('error', (error: Error) => {
      this.logger.error(`Deepgram stream failed: ${error.message}`);
      handlers.onError('Speech recognition failed');
    });

    socket.on('close', () => handlers.onClose());

    const keepAlive = setInterval(() => {
      socket.sendKeepAlive({ type: 'KeepAlive' });
    }, KEEP_ALIVE_INTERVAL_MS);

    return {
      send: (audio) => socket.sendMedia(audio),
      close: () => {
        clearInterval(keepAlive);
        socket.sendCloseStream({ type: 'CloseStream' });
        socket.close();
      },
    };
  }
}
