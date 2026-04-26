import { useRouter, useSearch, Link } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import * as React from 'react'
import { useMutation } from '../hooks/useMutation'
import { loginFn } from '../routes/_authed'

type LoginResult = { error: boolean; message: string } | undefined

export function Login() {
  const router = useRouter()
  const search = useSearch({ strict: false }) as { redirect?: string }
  const [showPassword, setShowPassword] = React.useState(false)

  const loginMutation = useMutation({
    fn: useServerFn(loginFn),
    onSuccess: async (ctx) => {
      const result = ctx.data as LoginResult
      if (!result?.error) {
        await router.invalidate()
        router.navigate({ to: search.redirect || '/patients' })
      }
    },
  })

  const result = loginMutation.data as LoginResult
  const isPending = loginMutation.status === 'pending'

  return (
    <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', background: 'hsl(var(--mp-bg))' }}>
      {/* Header */}
      <header style={{ padding: '1.5rem 2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
          <div style={{
            width: 36, height: 36, borderRadius: '0.5rem',
            background: 'hsl(var(--mp-green))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2.25}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
            </svg>
          </div>
          <span style={{ fontSize: '1.125rem', fontWeight: 700, letterSpacing: '-0.02em', color: 'hsl(var(--mp-text))' }}>
            MedPortal BG
          </span>
        </div>
      </header>

      {/* Main */}
      <main style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem 1rem' }}>
        <div className="mp-card" style={{ width: '100%', maxWidth: 460, padding: '2.5rem' }}>
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'hsl(var(--mp-text))', letterSpacing: '-0.02em', margin: 0 }}>
              Вход за лекар
            </h1>
            <p style={{ marginTop: '0.5rem', fontSize: '0.875rem', color: 'hsl(var(--mp-text-muted))', lineHeight: 1.6 }}>
              Моля, въведете своите данни за достъп до платформата.
            </p>
          </div>

          <form
            style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}
            onSubmit={(e) => {
              e.preventDefault()
              const formData = new FormData(e.target as HTMLFormElement)
              loginMutation.mutate({
                data: {
                  email: formData.get('email') as string,
                  password: formData.get('password') as string,
                },
              })
            }}
          >
            {/* Email */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label htmlFor="email" className="mp-label">Имейл</label>
              <div style={{ position: 'relative' }}>
                <svg style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'hsl(var(--mp-text-muted))' }} width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                </svg>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  placeholder="doctor@medportal.bg"
                  className="mp-input"
                  style={{ height: 54, paddingLeft: 44, fontSize: '0.9375rem', fontWeight: 500 }}
                />
              </div>
            </div>

            {/* Password */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label htmlFor="password" className="mp-label">Парола</label>
              <div style={{ position: 'relative' }}>
                <svg style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'hsl(var(--mp-text-muted))' }} width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                </svg>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="••••••••"
                  className="mp-input"
                  style={{ height: 54, paddingLeft: 44, paddingRight: 44, fontSize: '0.9375rem', fontWeight: 500 }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(s => !s)}
                  aria-label={showPassword ? 'Скрий паролата' : 'Покажи паролата'}
                  style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'hsl(var(--mp-text-muted))', padding: 0 }}
                >
                  {showPassword ? (
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" /></svg>
                  ) : (
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                  )}
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
              style={{ height: 58, fontSize: '0.9375rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
            >
              {isPending ? (
                <>
                  <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" style={{ opacity: 0.25 }} />
                    <path fill="currentColor" d="M4 12a8 8 0 018-8v8z" style={{ opacity: 0.75 }} />
                  </svg>
                  Влизане…
                </>
              ) : 'Вход'}
            </button>
          </form>

          {/* Info note */}
          <div className="mp-info-box" style={{ marginTop: '1.5rem' }}>
            Тази секция е само за оторизирани медицински специалисти.
          </div>

          {/* Signup link */}
          <p style={{ textAlign: 'center', marginTop: '1.25rem', fontSize: '0.875rem', color: 'hsl(var(--mp-text-muted))' }}>
            Нямате акаунт?{' '}
            <Link to="/signup" style={{ color: 'hsl(var(--mp-green))', fontWeight: 700, textDecoration: 'none' }}>
              Регистрация
            </Link>
          </p>
        </div>
      </main>

      {/* Footer */}
      <footer style={{ padding: '1.25rem 2rem', borderTop: '1px solid hsl(var(--mp-border) / 0.5)' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', fontSize: '0.75rem', color: 'hsl(var(--mp-text-subtle))' }}>
          <p>© 2024 MedPortal BG. Всички права запазени.</p>
          <nav style={{ display: 'flex', gap: '1.5rem' }}>
            <a href="#" style={{ color: 'inherit', textDecoration: 'none' }}>Помощ</a>
            <a href="#" style={{ color: 'inherit', textDecoration: 'none' }}>Поверителност</a>
            <a href="#" style={{ color: 'inherit', textDecoration: 'none' }}>Условия</a>
          </nav>
        </div>
      </footer>
    </div>
  )
}
