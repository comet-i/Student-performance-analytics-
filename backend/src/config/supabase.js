import { createClient } from '@supabase/supabase-js';
import { env } from './env.js';

// One client per request, carrying the caller's JWT, so Postgres RLS scopes every query to that user.
export const createUserClient = (accessToken) =>
  createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });

// Bypasses RLS. Used only to store predictions/recommendations produced by the analytics engine,
// always with a user_id taken from the verified JWT.
export const admin = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});
