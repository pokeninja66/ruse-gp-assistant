import * as React from 'react'
import { Link } from '@tanstack/react-router'

export function Auth({
  actionText,
  onSubmit,
  status,
  afterSubmit,
  mode = 'login',
}: {
  actionText: string
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void
  status: 'pending' | 'idle' | 'success' | 'error'
  afterSubmit?: React.ReactNode
  mode?: 'login' | 'signup'
}) {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-gray-950">
      {/* Background glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-violet-600/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-cyan-600/20 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md mx-4">
        {/* Card */}
        <div className="bg-gray-900/80 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl p-8">
          {/* Logo / brand */}
          <div className="flex items-center gap-3 mb-8">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
            </div>
            <span className="text-lg font-bold text-white tracking-tight">GP Assistant</span>
          </div>

          <h1 className="text-2xl font-bold text-white mb-1">
            {mode === 'login' ? 'Welcome back' : 'Create your account'}
          </h1>
          <p className="text-gray-400 text-sm mb-6">
            {mode === 'login'
              ? 'Sign in to access your recordings.'
              : 'Sign up to start recording and saving audio.'}
          </p>

          <form
            onSubmit={(e) => {
              e.preventDefault()
              onSubmit(e)
            }}
            className="space-y-4"
          >
            <div>
              <label htmlFor="email" className="block text-xs font-medium text-gray-400 mb-1.5">
                Email address
              </label>
              <input
                type="email"
                name="email"
                id="email"
                placeholder="you@example.com"
                required
                className="w-full px-3.5 py-2.5 rounded-lg bg-gray-800 border border-white/10 text-white placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/60 focus:border-violet-500/60 transition"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-xs font-medium text-gray-400 mb-1.5">
                Password
              </label>
              <input
                type="password"
                name="password"
                id="password"
                placeholder={mode === 'signup' ? 'At least 6 characters' : '••••••••'}
                required
                minLength={mode === 'signup' ? 6 : undefined}
                className="w-full px-3.5 py-2.5 rounded-lg bg-gray-800 border border-white/10 text-white placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/60 focus:border-violet-500/60 transition"
              />
            </div>

            <button
              type="submit"
              id={mode === 'login' ? 'login-submit-btn' : 'signup-submit-btn'}
              disabled={status === 'pending'}
              className="w-full py-2.5 px-4 rounded-lg bg-gradient-to-r from-violet-600 to-cyan-600 hover:from-violet-500 hover:to-cyan-500 text-white font-semibold text-sm transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed mt-2"
            >
              {status === 'pending' ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                  </svg>
                  {mode === 'login' ? 'Signing in…' : 'Creating account…'}
                </span>
              ) : actionText}
            </button>

            {afterSubmit ?? null}
          </form>

          {/* Toggle mode link */}
          <p className="mt-6 text-center text-sm text-gray-500">
            {mode === 'login' ? (
              <>
                Don't have an account?{' '}
                <Link to="/signup" className="text-violet-400 hover:text-violet-300 font-medium transition-colors">
                  Sign up
                </Link>
              </>
            ) : (
              <>
                Already have an account?{' '}
                <Link to="/login" className="text-violet-400 hover:text-violet-300 font-medium transition-colors">
                  Sign in
                </Link>
              </>
            )}
          </p>
        </div>
      </div>
    </div>
  )
}
