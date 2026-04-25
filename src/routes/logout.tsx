import { redirect, createFileRoute } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { getSupabaseServerClient } from '../utils/supabase'

export const logoutFn = createServerFn({ method: 'POST' }).handler(async () => {
  const supabase = getSupabaseServerClient()
  const { error } = await supabase.auth.signOut()

  if (error) {
    return { error: true, message: error.message }
  }

  throw redirect({ href: '/' })
})

// Keep the route so navigating to /logout still works as a fallback
export const Route = createFileRoute('/logout')({
  preload: false,
  loader: () => logoutFn(),
})
