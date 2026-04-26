import { createFileRoute, Link, redirect } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import { AppSidebar } from '../components/AppSidebar'
import { logoutFn } from './logout'
import { useRouter } from '@tanstack/react-router'
import * as React from 'react'

export const Route = createFileRoute('/')(
  {
    beforeLoad: ({ context }) => {
      if (!context.user) {
        throw redirect({ to: '/login' })
      }
    },
    component: Dashboard,
  }
)

function Dashboard() {
  const { user } = Route.useRouteContext()
  const doLogout = useServerFn(logoutFn)
  const router = useRouter()

  const quickActions = [
    {
      href: '/patients',
      label: 'Пациенти',
      sublabel: 'Управление на пациенти',
      desc: 'Достъп до всички пациенти, история на прегледи и нови консултации.',
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
        </svg>
      ),
      color: 'hsl(var(--mp-green))',
      colorLight: 'hsl(var(--mp-green-light))',
    },
    {
      href: '/recordings',
      label: 'Записи',
      sublabel: 'Аудио консултации',
      desc: 'Запишете и управлявайте аудио консултации. AI транскрипция и анализ.',
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
        </svg>
      ),
      color: 'hsl(var(--mp-danger))',
      colorLight: 'hsl(var(--mp-danger-bg))',
    },
    {
      href: '/drugs',
      label: 'Лекарства',
      sublabel: 'Каталог на лекарствата',
      desc: 'Разгледайте наличните лекарства, дозировки и ATC кодове.',
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23-.693L5 14.5m14.8.8l1.402 1.402c1 1 .03 2.703-1.382 2.703H4.18c-1.412 0-2.382-1.703-1.382-2.703L4.2 15.3" />
        </svg>
      ),
      color: 'hsl(var(--mp-info))',
      colorLight: 'hsl(var(--mp-info-bg))',
    },
  ]

  return (
    <div className="mp-layout">
      <AppSidebar
        user={user}
        onLogout={async () => {
          await doLogout()
          await router.invalidate()
        }}
      />
      <main className="mp-main">
        {/* Greeting */}
        <div style={{ marginBottom: '2.5rem' }}>
          <p style={{ fontSize: '0.875rem', fontWeight: 600, color: 'hsl(var(--mp-text-muted))', marginBottom: '0.25rem' }}>
            {new Date().toLocaleDateString('bg-BG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
          <h1 style={{ fontSize: '2.125rem', fontWeight: 800, color: 'hsl(var(--mp-text))', letterSpacing: '-0.03em', margin: 0 }}>
            Добър ден 👋
          </h1>
          <p style={{ marginTop: '0.5rem', fontSize: '1rem', color: 'hsl(var(--mp-text-muted))' }}>
            {user?.email} · MedPortal BG
          </p>
        </div>

        {/* Start new session CTA */}
        <div style={{
          marginBottom: '2.5rem',
          padding: '2rem 2.5rem',
          borderRadius: '1.25rem',
          background: `linear-gradient(135deg, hsl(var(--mp-green-dark)) 0%, hsl(var(--mp-green-mid)) 100%)`,
          color: '#fff',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1.5rem',
          boxShadow: '0 8px 32px -8px hsl(var(--mp-green) / 0.5)',
        }}>
          <div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 800, letterSpacing: '-0.02em', margin: 0 }}>
              Започнете нов преглед
            </h2>
            <p style={{ marginTop: '0.5rem', fontSize: '0.9375rem', opacity: 0.85 }}>
              Изберете пациент и преминете през стъпките на консултацията.
            </p>
          </div>
          <Link to="/patients" style={{
            display: 'inline-flex', alignItems: 'center', gap: '0.625rem',
            height: 56, padding: '0 1.75rem', borderRadius: '0.75rem',
            background: '#fff', color: 'hsl(var(--mp-green-dark))',
            fontWeight: 700, fontSize: '0.9375rem', textDecoration: 'none',
            whiteSpace: 'nowrap', flexShrink: 0,
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Избери пациент
          </Link>
        </div>

        {/* Quick actions */}
        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'hsl(var(--mp-text))', letterSpacing: '-0.02em', margin: '0 0 1.25rem' }}>
          Бърз достъп
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.25rem', marginBottom: '2.5rem' }}>
          {quickActions.map(a => (
            <Link key={a.href} to={a.href} style={{ textDecoration: 'none' }}>
              <div className="mp-card" style={{
                padding: '1.75rem',
                display: 'flex', flexDirection: 'column', gap: '1rem',
                cursor: 'pointer',
                transition: 'transform 0.15s, box-shadow 0.15s',
              }}
                onMouseEnter={e => {
                  const el = e.currentTarget as HTMLDivElement
                  el.style.transform = 'translateY(-2px)'
                  el.style.boxShadow = `0 8px 32px -8px ${a.color}40, 0 2px 8px -4px hsl(214 55% 12% / 0.08)`
                }}
                onMouseLeave={e => {
                  const el = e.currentTarget as HTMLDivElement
                  el.style.transform = ''
                  el.style.boxShadow = ''
                }}
              >
                <div style={{ width: 52, height: 52, borderRadius: '0.75rem', background: a.colorLight, display: 'flex', alignItems: 'center', justifyContent: 'center', color: a.color }}>
                  {a.icon}
                </div>
                <div>
                  <p style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'hsl(var(--mp-text-muted))', marginBottom: '0.25rem' }}>{a.sublabel}</p>
                  <h3 style={{ fontSize: '1.125rem', fontWeight: 700, color: 'hsl(var(--mp-text))', margin: 0 }}>{a.label}</h3>
                  <p style={{ marginTop: '0.5rem', fontSize: '0.875rem', color: 'hsl(var(--mp-text-muted))', lineHeight: 1.55 }}>{a.desc}</p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.875rem', fontWeight: 600, color: a.color, marginTop: 'auto' }}>
                  Отвори
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12h15m0 0l-6.75-6.75M19.5 12l-6.75 6.75" />
                  </svg>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* Info box */}
        <div className="mp-info-box">
          <strong>Съвет:</strong> Стартирайте консултация от профила на пациент и следвайте стъпките: Анамнеза → Статус → Диагноза → Терапия → Направление → Изследвания → Документи.
        </div>
      </main>
    </div>
  )
}
