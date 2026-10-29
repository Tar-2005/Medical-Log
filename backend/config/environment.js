// ─── Environment Configuration ──────────────────────────────────────────────
// Validates and exports all required environment variables at startup.
// Fails fast if any critical variable is missing.
// ─────────────────────────────────────────────────────────────────────────────

import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  // Supabase
  SUPABASE_URL: z.string().url('SUPABASE_URL must be a valid URL'),
  SUPABASE_ANON_KEY: z.string().min(1, 'SUPABASE_ANON_KEY is required'),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, 'SUPABASE_SERVICE_ROLE_KEY is required'),

  // Encryption
  AES_ENCRYPTION_KEY: z
    .string()
    .length(64, 'AES_ENCRYPTION_KEY must be a 64-char hex string (32 bytes)')
    .regex(/^[0-9a-fA-F]+$/, 'AES_ENCRYPTION_KEY must be valid hex'),

  // JWT
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  JWT_EXPIRY: z.string().default('15m'),

  // LLM — Using Gemini
  GEMINI_API_KEY: z.string().min(1, 'GEMINI_API_KEY is required'),
  LLM_MODEL: z.string().default('gemini-2.5-flash'),

  // Server
  PORT: z.coerce.number().default(4000),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
});

/**
 * Parse and validate environment variables.
 * Throws a descriptive error if validation fails.
 */
function validateEnv() {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    const formatted = result.error.issues
      .map((issue) => `  ✗ ${issue.path.join('.')}: ${issue.message}`)
      .join('\n');

    console.error('\n╔══════════════════════════════════════════╗');
    console.error('║  ENVIRONMENT VALIDATION FAILED           ║');
    console.error('╚══════════════════════════════════════════╝');
    console.error(formatted);
    console.error('\nCopy .env.example → .env and fill in all values.\n');
    process.exit(1);
  }

  return Object.freeze(result.data);
}

export const env = validateEnv();
