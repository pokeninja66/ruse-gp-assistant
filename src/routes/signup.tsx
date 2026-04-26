import { redirect, createFileRoute, Link } from '@tanstack/react-router'
import { createServerFn, useServerFn } from '@tanstack/react-start'
import * as React from 'react'
import { useMutation } from '../hooks/useMutation'
import { getSupabaseServerClient } from '../utils/supabase'

export const signupFn = createServerFn({ method: 'POST' })
  .inputValidator((d: { email: string; password: string; uin?: string; redirectUrl?: string }) => d)
  .handler(async ({ data }): Promise<{ error: boolean; message: string } | undefined> => {
    const supabase = getSupabaseServerClient()
    const { data: signUpData, error } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        data: { uin: data.uin || null }
      }
    })

    if (error) {
      return { error: true, message: error.message }
    }

    if (signUpData.user && signUpData.user.identities?.length === 0) {
      return { error: true, message: 'Акаунт с този имейл вече съществува. Моля, влезте.' }
    }

    // Also update profile with UIN if provided
    if (signUpData.user && data.uin) {
      await supabase.from('profiles').upsert({
        id: signUpData.user.id,
        email: data.email,
        uin: data.uin,
        role: 'doctor',
      })
    }

    throw redirect({ href: data.redirectUrl || '/patients' })
  })

export const Route = createFileRoute('/signup')({
  component: SignupComp,
})

function SignupComp() {
  const [showPassword, setShowPassword] = React.useState(false)

  const signupMutation = useMutation({
    fn: useServerFn(signupFn),
  })

  const result = signupMutation.data as { error: boolean; message: string } | undefined
  const isPending = signupMutation.status === 'pending'

  return (
    <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', background: 'hsl(var(--mp-bg))' }}>
      {/* Header */}
      <header style={{ padding: '1.5rem 2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
          <div style={{ width: 36, height: 36, borderRadius: '0.5rem', background: 'hsl(var(--mp-green))', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2.25}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
            </svg>
          </div>
          <span style={{ fontSize: '1.125rem', fontWeight: 700, letterSpacing: '-0.02em', color: 'hsl(var(--mp-text))' }}>
            MedPortal BG
          </span>
        </div>
      </header>

      <main style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem 1rem' }}>
        <div className="mp-card" style={{ width: '100%', maxWidth: 480, padding: '2.5rem' }}>
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'hsl(var(--mp-text))', letterSpacing: '-0.02em', margin: 0 }}>
              Регистрация
            </h1>
            <p style={{ marginTop: '0.5rem', fontSize: '0.875rem', color: 'hsl(var(--mp-text-muted))', lineHeight: 1.6 }}>
              Създайте акаунт за достъп до MedPortal BG.
            </p>
          </div>

          <form
            style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}
            onSubmit={(e) => {
              e.preventDefault()
              const formData = new FormData(e.target as HTMLFormElement)
              signupMutation.mutate({
                data: {
                  email: formData.get('email') as string,
                  password: formData.get('password') as string,
                  uin: formData.get('uin') as string || undefined,
                },
              })
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
              <label htmlFor="email" className="mp-label">Имейл <span style={{ color: 'hsl(var(--mp-danger))' }}>*</span></label>
              <input id="email" name="email" type="email" required placeholder="doctor@medportal.bg" className="mp-input" style={{ height: 54, fontSize: '0.9375rem', fontWeight: 500 }} />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
              <label htmlFor="uin" className="mp-label">
                УИН на лекар <span style={{ fontWeight: 400, color: 'hsl(var(--mp-text-muted))' }}>(незадължително)</span>
              </label>
              <input id="uin" name="uin" type="text" placeholder="Въведете УИН" className="mp-input" style={{ height: 54, fontSize: '0.9375rem', fontWeight: 500 }} />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
              <label htmlFor="password" className="mp-label">Парола <span style={{ color: 'hsl(var(--mp-danger))' }}>*</span></label>
              <div style={{ position: 'relative' }}>
                <input
                  id="password" name="password" required
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Минимум 6 символа"
                  className="mp-input"
                  style={{ height: 54, paddingRight: 44, fontSize: '0.9375rem', fontWeight: 500 }}
                />
                <button type="button" onClick={() => setShowPassword(s => !s)} style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'hsl(var(--mp-text-muted))', padding: 0 }}>
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                    {showPassword
                      ? <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                      : <><path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></>
                    }
                  </svg>
                </button>
              </div>
            </div>

            {result?.error && (
              <div style={{ padding: '0.75rem 1rem', borderRadius: '0.5rem', background: 'hsl(var(--mp-danger-bg))', border: '1px solid hsl(var(--mp-danger) / 0.3)', color: 'hsl(var(--mp-danger))', fontSize: '0.875rem' }}>
                {result.message}
              </div>
            )}

            <button
              type="submit"
              disabled={isPending}
              className="mp-btn-primary"
              style={{ height: 58, fontSize: '0.9375rem', marginTop: '0.25rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
            >
              {isPending ? 'Регистрация…' : 'Регистрирай се'}
            </button>
          </form>

          <div className="mp-info-box" style={{ marginTop: '1.5rem' }}>
            Само за оторизирани медицински специалисти.
          </div>

          <p style={{ textAlign: 'center', marginTop: '1.25rem', fontSize: '0.875rem', color: 'hsl(var(--mp-text-muted))' }}>
            Вече имате акаунт?{' '}
            <Link to="/login" style={{ color: 'hsl(var(--mp-green))', fontWeight: 700, textDecoration: 'none' }}>
              Вход
            </Link>
          </p>
        </div>
      </main>

      <footer style={{ padding: '1.25rem 2rem', borderTop: '1px solid hsl(var(--mp-border) / 0.5)' }}>
        <p style={{ textAlign: 'center', fontSize: '0.75rem', color: 'hsl(var(--mp-text-subtle))' }}>
          © 2024 MedPortal BG. Всички права запазени.
        </p>
      </footer>
    </div>
  )
}
