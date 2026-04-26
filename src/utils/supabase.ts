import { getCookies, setCookie } from '@tanstack/react-start/server'
import { createServerClient } from '@supabase/ssr'

export function getSupabaseServerClient() {
  return createServerClient(
    (process.env?.VITE_SUPABASE_URL || 
     // @ts-ignore
     globalThis?.process?.env?.VITE_SUPABASE_URL ||
     import.meta.env?.VITE_SUPABASE_URL)!,
    (process.env?.VITE_SUPABASE_ANON_KEY || 
     // @ts-ignore
     globalThis?.process?.env?.VITE_SUPABASE_ANON_KEY ||
     import.meta.env?.VITE_SUPABASE_ANON_KEY)!,
    {
      cookies: {
        getAll() {
          return Object.entries(getCookies()).map(([name, value]) => ({
            name,
            value,
          }))
        },
        setAll(cookies: Array<{ name: string; value: string; [key: string]: unknown }>) {
          cookies.forEach((cookie) => {
            setCookie(cookie.name, cookie.value)
          })
        },
      },
    },
  )
}
