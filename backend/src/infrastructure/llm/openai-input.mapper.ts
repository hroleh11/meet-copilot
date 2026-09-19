import type { ResponseInput } from 'openai/resources/responses/responses';
import type { LlmImage } from './llm.provider';

export function toStreamInput(
  blocks: string[],
  image: LlmImage | undefined,
): string | ResponseInput {
  const text = blocks.join('\n\n');

  if (!image) {
    return text;
  }

  return [
    {
      role: 'user',
      content: [
        { type: 'input_text', text },
        {
          type: 'input_image',
          detail: 'auto',
          image_url: `data:${image.mimeType};base64,${image.dataBase64}`,
        },
      ],
    },
  ];
}
