import 'dotenv/config';
import { z } from 'zod';

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(10000), // Render injects PORT
  SUPABASE_URL: z.string().url(),
  SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1), // only used to store engine output
  ML_ENGINE_URL: z.string().url(),
  ML_ENGINE_API_KEY: z.string().min(16),
  ML_ENGINE_TIMEOUT_MS: z.coerce.number().default(60_000), // covers a cold start on Render
  FRONTEND_URL: z.string().min(1).transform((s) => s.split(',').map((u) => u.trim())),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  console.error('Invalid environment variables:', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
