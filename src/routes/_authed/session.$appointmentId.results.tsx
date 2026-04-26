import { createFileRoute, useNavigate, Link } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import * as React from 'react'
import { AppSidebar } from '../../components/AppSidebar'
import { logoutFn } from '../logout'
import { getAppointmentResultsFn } from '../../utils/appointments'
import { getAnamnesisFn } from '../../utils/anamnesis'

export const Route = createFileRoute('/_authed/session/$appointmentId/results')({
  component: ResultsPage,
})

function ResultsPage() {
  const { appointmentId } = Route.useParams()
  const { user } = Route.useRouteContext()
  const navigate = useNavigate()
  const doLogout = useServerFn(logoutFn)
  const doGetResults = useServerFn(getAppointmentResultsFn)
  const doGetAnamnesis = useServerFn(getAnamnesisFn)

  const [data, setData] = React.useState<any>(null)
  const [anamnesis, setAnamnesis] = React.useState<any>(null)
  const [loading, setLoading] = React.useState(true)
  const [patientId, setPatientId] = React.useState<string | null>(null)

  React.useEffect(() => {
    Promise.all([
      doGetResults({ data: { appointmentId } }),
      doGetAnamnesis({ data: { appointmentId } })
    ]).then(([res, ana]) => {
      if (res.data) {
        setData(res.data)
        setPatientId(res.data.appointment?.patient_id)
      }
      if (ana.data) setAnamnesis(ana.data)
      setLoading(false)
    })
  }, [appointmentId])

  if (loading) return <div className="mp-layout flex items-center justify-center"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-mp-green"></div></div>

  const appointment = data?.appointment || {}
  const patientName = appointment.patients ? `${appointment.patients.first_name} ${appointment.patients.last_name}` : 'Пациент'

  return (
    <div className="mp-layout">
      <AppSidebar 
        user={user} 
        appointmentId={appointmentId} 
        patientId={patientId || undefined} 
        patientName={patientName}
        onLogout={() => doLogout().then(() => navigate({ to: '/login' }))} 
      />
      <main className="mp-main">
        <div style={{ maxWidth: 1100, marginBottom: '2.5rem' }}>
          <nav className="flex items-center gap-1.5 text-xs font-medium text-mp-text-muted mb-3">
            <Link to="/patients" className="hover:text-mp-green transition-colors text-decoration-none">Пациенти</Link>
            <span>›</span>
            <span className="text-mp-text font-semibold">Обобщение</span>
          </nav>
          <h1 className="text-4xl font-extrabold text-mp-text tracking-tight">Резултати от анализа</h1>
          <p className="text-mp-text-muted mt-2 text-lg">Преглед на автоматично извлечените данни и заключения.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8" style={{ maxWidth: 1100 }}>
          
          {/* Left Column: Clinical Summary */}
          <div className="flex flex-col gap-8">
            <div className="mp-card p-8">
              <h2 className="text-xl font-bold text-mp-text mb-6">Клинично резюме</h2>
              {anamnesis?.ai_summary ? (
                <div className="mp-info-box">
                  {anamnesis.ai_summary}
                </div>
              ) : (
                <p className="text-mp-text-muted italic">Няма генерирано резюме за тази сесия.</p>
              )}
              
              {anamnesis?.symptoms?.length > 0 && (
                <div className="mt-8">
                  <h3 className="text-xs font-bold text-mp-text-muted uppercase tracking-wider mb-4">Разпознати симптоми</h3>
                  <div className="flex flex-wrap gap-2">
                    {anamnesis.symptoms.map((s: any, i: number) => (
                      <span key={i} className="px-3 py-1.5 rounded-lg bg-mp-danger/5 border border-mp-danger/10 text-mp-danger text-sm font-semibold">
                        {s.name || s}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="mp-card p-8">
              <h2 className="text-xl font-bold text-mp-text mb-6">Обективни данни</h2>
              {data?.entities?.some((e: any) => e.entity_type === 'vital') ? (
                <div className="grid grid-cols-2 gap-4">
                  {data.entities.filter((e: any) => e.entity_type === 'vital').map((v: any, i: number) => (
                    <div key={i} className="p-4 rounded-xl bg-mp-bg border border-mp-border">
                      <p className="text-[10px] font-bold text-mp-text-muted uppercase tracking-tight">{v.attributes?.type || 'Показател'}</p>
                      <p className="text-lg font-extrabold text-mp-text mt-0.5">{v.value}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-mp-text-muted italic">Не са открити жизнени показатели.</p>
              )}
            </div>
          </div>

          {/* Right Column: Diagnoses & Recommendation */}
          <div className="flex flex-col gap-8">
            <div className="mp-card p-8 border-mp-green/20 bg-mp-green/5">
              <h2 className="text-xl font-bold text-mp-text mb-6">AI Хипотези</h2>
              <div className="flex flex-col gap-4">
                {data?.entities?.filter((e: any) => e.entity_type === 'diagnosis').map((d: any, i: number) => (
                  <div key={i} className="p-5 rounded-2xl bg-white border border-mp-green/10 shadow-sm">
                    <div className="flex items-start justify-between">
                      <p className="text-lg font-bold text-mp-text leading-tight">{d.value}</p>
                      <span className="text-[10px] font-bold text-mp-green-dark bg-mp-green-light px-2 py-0.5 rounded uppercase">Вероятна</span>
                    </div>
                  </div>
                ))}
                {!data?.entities?.some((e: any) => e.entity_type === 'diagnosis') && (
                  <p className="text-mp-text-muted italic">Няма открити диагнози в записа.</p>
                )}
              </div>

              {data?.recommendation && (
                <div className="mt-8 pt-8 border-t border-mp-green/10">
                  <h3 className="text-xs font-bold text-mp-green-dark uppercase tracking-wider mb-4">Препоръчана терапия</h3>
                  <div className="p-5 rounded-2xl bg-mp-green text-white shadow-lg shadow-mp-green/20">
                    <p className="text-lg font-extrabold">{data.recommendation.drug_name}</p>
                    <p className="text-sm font-medium mt-1 opacity-90">{data.recommendation.dosage} · {data.recommendation.frequency}</p>
                    {data.recommendation.rationale && (
                      <p className="text-xs mt-4 pt-4 border-t border-white/20 opacity-80 leading-relaxed italic">
                        {data.recommendation.rationale}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="mp-card p-8 bg-mp-bg/50 border-dashed">
              <h2 className="text-xl font-bold text-mp-text mb-4">Следващи стъпки</h2>
              <div className="flex flex-col gap-3">
                <Link to="/session/$appointmentId/anamnesis" params={{ appointmentId }} className="mp-btn-primary h-14 text-decoration-none inline-flex items-center justify-center gap-2">
                  КЪМ РАБОТЕН ЛИСТ →
                </Link>
                 <Link to="/patients/$patientId" params={{ patientId: patientId || '' }} className="mp-btn-ghost h-12 text-decoration-none inline-flex items-center justify-center">
                  ЗАВЪРШИ ПРЕГЛЕДА
                </Link>
              </div>
            </div>
          </div>
        </div>
        <div style={{ height: '5rem' }} />
      </main>
    </div>
  )
}
