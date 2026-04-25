import { redirect, createFileRoute } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { getSupabaseServerClient } from '../utils/supabase'

export const loginFn = createServerFn({ method: 'POST' })
  .inputValidator((d: { email: string; password: string }) => d)
  .handler(async ({ data }): Promise<{ error: boolean; message: string } | undefined> => {
    const supabase = getSupabaseServerClient()
    const { error } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    })

    if (error) {
      // Email confirmation was previously required — account exists but is unconfirmed.
      // Since confirmation is now disabled, signUp will return a session for the existing user.
      if (error.message === 'Email not confirmed') {
        const { error: signUpError } = await supabase.auth.signUp({
          email: data.email,
          password: data.password,
        })
        if (!signUpError) return undefined // session is now set via cookies
      }
      return { error: true, message: error.message }
    }
  })

export const Route = createFileRoute('/_authed')({
  beforeLoad: ({ context, location }) => {
    if (!context.user) {
      throw redirect({
        to: '/login',
        search: {
          redirect: location.href,
        },
      })
    }
  },
})
