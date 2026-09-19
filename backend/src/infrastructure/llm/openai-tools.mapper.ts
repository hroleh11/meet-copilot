import type { FunctionTool, ResponseInput } from 'openai/resources/responses/responses';
import type { LlmItem, LlmTool } from './llm.agent';

export function toResponseInput(items: LlmItem[]): ResponseInput {
  return items.map((item) =>
    item.kind === 'message'
      ? { role: item.role, content: item.text }
      : {
          type: 'function_call_output' as const,
          call_id: item.callId,
          output: item.output,
        },
  );
}

export function toFunctionTools(tools: LlmTool[]): FunctionTool[] {
  return tools.map((tool) => ({
    type: 'function',
    name: tool.name,
    description: tool.description,
    parameters: tool.parameters,
    strict: false,
  }));
}
