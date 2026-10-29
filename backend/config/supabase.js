// ─── Supabase Client Configuration ──────────────────────────────────────────
// Initializes two Supabase clients:
//   1. `supabase`     — uses anon key (respects RLS)
//   2. `supabaseAdmin` — uses service_role key (bypasses RLS for backend ops)
// ─────────────────────────────────────────────────────────────────────────────

import { createClient } from '@supabase/supabase-js';
import { env } from './environment.js';

/**
 * Public Supabase client — respects Row Level Security.
 * Use for operations where RLS enforcement is desired.
 */
export const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

/**
 * Admin Supabase client — bypasses RLS with service_role key.
 * Use ONLY for trusted backend operations (write PHI, audit logs, etc.)
 */
export const supabaseAdmin = createClient(
  env.SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);
