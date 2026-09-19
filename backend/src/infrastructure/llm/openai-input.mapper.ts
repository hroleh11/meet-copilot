import type { ResponseInput } from 'openai/resources/responses/responses';
import type { LlmImage, LlmMessage } from './llm.provider';

export function toStreamInput(messages: LlmMessage[]): ResponseInput {
  return messages.map((message) =>
    message.image
      ? {
          role: 'user' as const,
          content: [
            { type: 'input_text' as const, text: message.text },
            toInputImage(message.image),
          ],
        }
      : { role: message.role, content: message.text },
  );
}

function toInputImage(image: LlmImage) {
  return {
    type: 'input_image' as const,
    detail: 'auto' as const,
    image_url: `data:${image.mimeType};base64,${image.dataBase64}`,
  };
}
