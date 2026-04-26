import { Link, useRouterState } from '@tanstack/react-router'
import * as React from 'react'

type NavItem = {
  label: string
  shortLabel: string
  icon: React.ReactNode
  href?: string
  sessionOnly?: boolean // only show when in a session context
}

const globalNavItems: NavItem[] = [
  {
    label: 'Пациенти',
    shortLabel: 'Пациенти',
    href: '/patients',
    icon: (
      <svg className="w-[19px] h-[19px] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
      </svg>
    ),
  },
  {
    label: 'Записи',
    shortLabel: 'Записи',
    href: '/recordings',
    icon: (
      <svg className="w-[19px] h-[19px] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
      </svg>
    ),
  },
  {
    label: 'Лекарства',
    shortLabel: 'Лекарства',
    href: '/drugs',
    icon: (
      <svg className="w-[19px] h-[19px] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23-.693L5 14.5m14.8.8l1.402 1.402c1 1 .03 2.703-1.382 2.703H4.18c-1.412 0-2.382-1.703-1.382-2.703L4.2 15.3" />
      </svg>
    ),
  },
]

type SessionNavItem = NavItem & { href: string }

function getSessionNavItems(appointmentId: string, patientId?: string): SessionNavItem[] {
  const base = `/session/${appointmentId}`
  return [
    {
      label: 'Пациент',
      shortLabel: 'Пациент',
      href: `${base}/patient`,
      icon: (
        <svg className="w-[17px] h-[17px] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
        </svg>
      ),
    },
    {
      label: 'Анамнеза',
      shortLabel: 'Анамнеза',
      href: `${base}/anamnesis`,
      icon: (
        <svg className="w-[17px] h-[17px] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
        </svg>
      ),
    },
    {
      label: 'Статус / Преглед',
      shortLabel: 'Статус',
      href: `${base}/status`,
      icon: (
        <svg className="w-[17px] h-[17px] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
        </svg>
      ),
    },
    {
      label: 'Диагноза',
      shortLabel: 'Диагноза',
      href: `${base}/diagnosis`,
      icon: (
        <svg className="w-[17px] h-[17px] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    {
      label: 'Терапия',
      shortLabel: 'Терапия',
      href: `${base}/therapy`,
      icon: (
        <svg className="w-[17px] h-[17px] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082" />
        </svg>
      ),
    },
    {
      label: 'Направление',
      shortLabel: 'Направл.',
      href: `${base}/referral`,
      icon: (
        <svg className="w-[17px] h-[17px] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
        </svg>
      ),
    },
    {
      label: 'Изследвания',
      shortLabel: 'Изследв.',
      href: `${base}/test-orders`,
      icon: (
        <svg className="w-[17px] h-[17px] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M11.35 3.836c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m8.9-4.414c.376.023.75.05 1.124.08 1.131.094 1.976 1.057 1.976 2.192V16.5A2.25 2.25 0 0118 18.75h-2.25m-7.5-10.5H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V18.75m-7.5-10.5h6.375c.621 0 1.125.504 1.125 1.125v9.375m-8.25-3l1.5 1.5 3-3.75" />
        </svg>
      ),
    },
    {
      label: 'Резултати',
      shortLabel: 'Резулт.',
      href: `${base}/results`,
      icon: (
        <svg className="w-[17px] h-[17px] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
        </svg>
      ),
    },
    {
      label: 'Документи',
      shortLabel: 'Документи',
      href: `${base}/documents`,
      icon: (
        <svg className="w-[17px] h-[17px] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
        </svg>
      ),
    },
    {
      label: 'История',
      shortLabel: 'История',
      href: patientId ? `/patients/${patientId}/history` : '/history',
      icon: (
        <svg className="w-[17px] h-[17px] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
  ]
}

interface AppSidebarProps {
  user?: { email: string } | null
  appointmentId?: string
  patientId?: string
  patientName?: string
  onLogout?: () => void
}

export function AppSidebar({ user, appointmentId, patientId, patientName, onLogout }: AppSidebarProps) {
  const { location } = useRouterState()
  const pathname = location.pathname
  const [isMobileOpen, setIsMobileOpen] = React.useState(false)

  const isInSession = !!appointmentId
  const sessionNavItems = isInSession ? getSessionNavItems(appointmentId, patientId) : []

  const closeMobile = () => setIsMobileOpen(false)

  return (
    <>
      {/* Mobile Top Bar */}
      <div className="md:hidden flex items-center justify-between p-4 bg-mp-sidebar border-b border-mp-border fixed top-0 left-0 right-0 z-[60] h-16">
        <Link to="/" className="flex items-center gap-2 text-decoration-none">
          <img src="/favicon.png" alt="Logo" className="w-8 h-8 object-contain" />
          <span style={{ fontSize: '1.125rem', fontStyle: 'italic', fontWeight: 800, color: 'hsl(var(--mp-green))' }}>
            GP Assistant
          </span>
        </Link>
        <button 
          onClick={() => setIsMobileOpen(!isMobileOpen)}
          className="p-2 rounded-lg text-mp-text hover:bg-mp-bg transition-colors"
        >
          {isMobileOpen ? (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M18 6L6 18M6 6l12 12"/></svg>
          ) : (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><path d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"/></svg>
          )}
        </button>
      </div>

      {/* Mobile Backdrop */}
      {isMobileOpen && (
        <div 
          className="md:hidden fixed inset-0 bg-mp-text/20 backdrop-blur-sm z-[55] animate-in fade-in duration-200"
          onClick={closeMobile}
        />
      )}

      <aside className={`mp-sidebar ${isMobileOpen ? 'mobile-open' : ''}`}>
        {/* Brand - hidden on mobile if you want, but now it's in the drawer too */}
        <div style={{ padding: '1.5rem 1.5rem 1.25rem' }}>
          <Link to="/" onClick={closeMobile} style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', textDecoration: 'none' }}>
            <div style={{
              width: 42, height: 42, borderRadius: '0.5rem',
              background: 'transparent',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
            }}>
              <img 
                src="/favicon.png" 
                alt="Logo" 
                style={{ width: '100%', height: '100%', objectFit: 'contain' }} 
              />
            </div>
            <span style={{ fontSize: '1.25rem', fontStyle: 'italic', fontWeight: 800, letterSpacing: '-0.03em', color: 'hsl(var(--mp-green))' }}>
              GP Assistant
            </span>
          </Link>

          {user && (
            <div style={{ marginTop: '1rem', paddingLeft: '0.25rem' }}>
              <p style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'hsl(var(--mp-text))', lineHeight: 1.3, opacity: 0.9 }}>
                {user.email}
              </p>
              <p style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'hsl(var(--mp-green-mid))', marginTop: '0.125rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Лекар / GP
              </p>
            </div>
          )}
        </div>

        {/* Session context banner */}
        {isInSession && patientName && (
          <div style={{
            margin: '0 0.75rem',
            padding: '0.625rem 0.875rem',
            background: 'hsl(var(--mp-green-light))',
            border: '1px solid hsl(var(--mp-green) / 0.25)',
            borderRadius: '0.5rem',
            marginBottom: '0.5rem'
          }}>
            <p style={{ fontSize: '0.6875rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'hsl(var(--mp-green-dark))', marginBottom: '0.125rem' }}>
              Активен преглед
            </p>
            <p style={{ fontSize: '0.875rem', fontWeight: 600, color: 'hsl(var(--mp-text))' }}>
              {patientName}
            </p>
          </div>
        )}

        {/* Session nav */}
        {isInSession && (
          <nav style={{ flex: 1, padding: '0 0.75rem', overflowY: 'auto' }}>
            <p style={{ fontSize: '0.6875rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'hsl(var(--mp-text-subtle))', padding: '0.25rem 0.25rem 0.5rem 0.5rem' }}>
              Стъпки на прегледа
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.125rem' }}>
              {sessionNavItems.map((item) => {
                const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
                return (
                  <Link 
                    key={item.label} 
                    to={item.href} 
                    onClick={closeMobile}
                    className={`mp-nav-item ${isActive ? 'active' : ''}`}
                  >
                    {item.icon}
                    <span>{item.label}</span>
                  </Link>
                )
              })}
            </div>

            <div style={{ height: '1px', background: 'hsl(var(--mp-border))', margin: '0.875rem 0' }} />
            <p style={{ fontSize: '0.6875rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'hsl(var(--mp-text-subtle))', padding: '0 0.25rem 0.5rem 0.5rem' }}>
              Навигация
            </p>
          </nav>
        )}

        {/* Global nav */}
        <nav style={{ flex: isInSession ? 0 : 1, padding: '0 0.75rem', paddingTop: isInSession ? 0 : '0.25rem' }}>
          {!isInSession && (
            <p style={{ fontSize: '0.6875rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'hsl(var(--mp-text-subtle))', padding: '0.25rem 0.25rem 0.5rem 0.5rem' }}>
              Главно меню
            </p>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.125rem' }}>
            {globalNavItems.map((item) => {
              const isActive = item.href && (pathname === item.href || pathname.startsWith(item.href + '/'))
              return item.href ? (
                <Link 
                  key={item.label} 
                  to={item.href} 
                  onClick={closeMobile}
                  className={`mp-nav-item ${isActive ? 'active' : ''}`}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </Link>
              ) : (
                <button key={item.label} type="button" className="mp-nav-item">
                  {item.icon}
                  <span>{item.label}</span>
                </button>
              )
            })}
          </div>
        </nav>

        {/* New Exam CTA + Logout */}
        <div style={{ padding: '1rem 0.75rem', borderTop: '1px solid hsl(var(--mp-border))' }}>
          {isInSession ? (
            <Link
              to="/patients"
              onClick={closeMobile}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                width: '100%', height: 48, borderRadius: '0.5rem',
                background: 'hsl(var(--mp-green))', color: '#fff',
                fontWeight: 700, fontSize: '0.875rem', textDecoration: 'none', marginBottom: '0.5rem',
              }}
            >
              ← Всички пациенти
            </Link>
          ) : (
            <Link
              to="/patients"
              onClick={closeMobile}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                width: '100%', height: 52, borderRadius: '0.5rem',
                background: 'hsl(var(--mp-green))', color: '#fff',
                fontWeight: 700, fontSize: '0.9375rem', textDecoration: 'none', marginBottom: '0.5rem',
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              Нов преглед
            </Link>
          )}
          {onLogout && (
            <button
              onClick={() => { onLogout(); closeMobile(); }}
              type="button"
              className="mp-btn-ghost"
              style={{ width: '100%', height: 40, fontSize: '0.8125rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.375rem' }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
              </svg>
              Изход
            </button>
          )}
        </div>
      </aside>
    </>
  )
}
