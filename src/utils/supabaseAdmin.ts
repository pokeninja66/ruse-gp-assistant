/**
 * Server-only Supabase admin client.
 * Uses the service_role key which bypasses RLS — ONLY call from createServerFn handlers.
 * The service role key is read from process.env (no VITE_ prefix) so it is never
 * embedded in the client bundle.
 */
import { createClient } from '@supabase/supabase-js'

let _adminClient: ReturnType<typeof createClient> | null = null

export function getSupabaseAdminClient() {
  if (_adminClient) return _adminClient

  const url = import.meta.env.VITE_SUPABASE_URL as string
  const serviceRoleKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY as string

  if (!url) throw new Error('Missing VITE_SUPABASE_URL')
  if (!serviceRoleKey) {
    throw new Error(
      'Missing VITE_SUPABASE_SERVICE_ROLE_KEY in .env — add it from Supabase Dashboard → Settings → API',
    )
  }

  _adminClient = createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })

  return _adminClient
}
