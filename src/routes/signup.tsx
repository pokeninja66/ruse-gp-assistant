import { redirect, createFileRoute } from '@tanstack/react-router'
import { createServerFn, useServerFn } from '@tanstack/react-start'
import * as React from 'react'
import { useMutation } from '../hooks/useMutation'
import { Auth } from '../components/Auth'
import { getSupabaseServerClient } from '../utils/supabase'

export const signupFn = createServerFn({ method: 'POST' })
  .inputValidator(
    (d: { email: string; password: string; redirectUrl?: string }) => d,
  )
  .handler(async ({ data }): Promise<{ error: boolean; message: string } | undefined> => {
    const supabase = getSupabaseServerClient()
    const { data: signUpData, error } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
    })

    if (error) {
      return { error: true, message: error.message }
    }

    // Supabase quirk: empty identities means the user already exists
    if (signUpData.user && signUpData.user.identities?.length === 0) {
      return {
        error: true,
        message: 'An account with this email already exists. Please sign in.',
      }
    }

    // Email confirmation is disabled — session is available immediately
    throw redirect({ href: data.redirectUrl || '/recordings' })
  })

export const Route = createFileRoute('/signup')({
  component: SignupComp,
})

function SignupComp() {
  const signupMutation = useMutation({
    fn: useServerFn(signupFn),
  })

  const result = signupMutation.data as
    | { error: boolean; message: string }
    | undefined

  return (
    <Auth
      mode="signup"
      actionText="Create Account"
      status={signupMutation.status}
      onSubmit={(e) => {
        const formData = new FormData(e.target as HTMLFormElement)
        signupMutation.mutate({
          data: {
            email: formData.get('email') as string,
            password: formData.get('password') as string,
          },
        })
      }}
      afterSubmit={
        result?.error ? (
          <div className="mt-3 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
            {result.message}
          </div>
        ) : null
      }
    />
  )
}
