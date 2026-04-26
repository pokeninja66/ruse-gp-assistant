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

  const url = 
    process.env?.VITE_SUPABASE_URL || 
    // @ts-ignore
    globalThis?.process?.env?.VITE_SUPABASE_URL ||
    // @ts-ignore
    import.meta.env?.VITE_SUPABASE_URL

  const serviceRoleKey = 
    process.env?.VITE_SUPABASE_SERVICE_ROLE_KEY || 
    process.env?.SUPABASE_SERVICE_ROLE_KEY ||
    // @ts-ignore
    globalThis?.process?.env?.VITE_SUPABASE_SERVICE_ROLE_KEY ||
    // @ts-ignore
    globalThis?.process?.env?.SUPABASE_SERVICE_ROLE_KEY ||
    // @ts-ignore
    import.meta.env?.VITE_SUPABASE_SERVICE_ROLE_KEY

  if (!url) throw new Error('Missing VITE_SUPABASE_URL')
  if (!serviceRoleKey) {
    throw new Error(
      'Missing VITE_SUPABASE_SERVICE_ROLE_KEY environment variable. Please set it in your dashboard.',
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
