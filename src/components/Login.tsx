import { useRouter, useSearch } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import * as React from 'react'
import { useMutation } from '../hooks/useMutation'
import { loginFn } from '../routes/_authed'
import { Auth } from './Auth'

type LoginResult = { error: boolean; message: string } | undefined

export function Login() {
  const router = useRouter()
  // The _authed guard may have stored the intended destination
  const search = useSearch({ strict: false }) as { redirect?: string }

  const loginMutation = useMutation({
    fn: useServerFn(loginFn),
    onSuccess: async (ctx) => {
      const result = ctx.data as LoginResult
      if (!result?.error) {
        await router.invalidate()
        router.navigate({ to: search.redirect || '/recordings' })
      }
    },
  })

  const result = loginMutation.data as LoginResult

  return (
    <Auth
      mode="login"
      actionText="Sign In"
      status={loginMutation.status}
      onSubmit={(e) => {
        const formData = new FormData(e.target as HTMLFormElement)
        loginMutation.mutate({
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

