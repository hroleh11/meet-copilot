import { z } from 'zod';

const effortSchema = z.enum(['none', 'minimal', 'low', 'medium', 'high', 'xhigh', 'max']);

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(5070),
  API_PREFIX: z.string().min(1).default('api/v1'),
  DESKTOP_REDIRECT_URL: z.string().min(1),
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().min(1),
  AT_SECRET: z.string().min(16),
  RT_SECRET: z.string().min(16),
  GOOGLE_CLIENT_ID: z.string().min(1),
  GOOGLE_CLIENT_SECRET: z.string().min(1),
  GOOGLE_CALLBACK_URL: z.url(),
  DEEPGRAM_API_KEY: z.string().min(1),
  OPENAI_API_KEY: z.string().min(1),
  REPLY_MODEL: z.string().min(1).default('gpt-5.2'),
  REPLY_EFFORT: effortSchema.default('low'),
  SUMMARY_MODEL: z.string().min(1).default('gpt-5-mini'),
  SUMMARY_EFFORT: effortSchema.default('low'),
  WINDOW_MAX_CHARS: z.coerce.number().int().positive().default(6_000),
  SUMMARY_TRIGGER_CHARS: z.coerce.number().int().positive().default(3_000),
  FINISHED_MEETING_TTL_SECONDS: z.coerce.number().int().positive().default(86_400),
});

export type Env = z.infer<typeof envSchema>;

export function validateEnv(config: Record<string, unknown>): Env {
  const result = envSchema.safeParse(config);

  if (result.success) {
    return result.data;
  }

  const errors = result.error.issues
    .map((issue) => `${issue.path.join('.') || 'env'}: ${issue.message}`)
    .join('\n');

  throw new Error(`Environment validation failed:\n${errors}`);
}
