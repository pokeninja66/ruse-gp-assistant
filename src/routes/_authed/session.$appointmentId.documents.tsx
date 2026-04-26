import { createFileRoute, useNavigate, Link } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import * as React from 'react'
import { AppSidebar } from '../../components/AppSidebar'
import { logoutFn } from '../logout'
import { getAppointmentFn } from '../../utils/appointments'

export const Route = createFileRoute('/_authed/session/$appointmentId/documents')({
  component: DocumentsPage,
})

const DOCUMENT_TYPES = [
  { id: 'soap', label: 'SOAP Бележка', icon: '📄', desc: 'Структурирана медицинска бележка (Subjective, Objective, Assessment, Plan)' },
  { id: 'prescription', label: 'Рецепта', icon: '💊', desc: 'Лекарско предписание за назначена терапия' },
  { id: 'referral-doc', label: 'Документ за направление', icon: '📤', desc: 'Официален документ за направление към специалист' },
  { id: 'sick-leave', label: 'Болничен лист', icon: '🏥', desc: 'Документ за временна неработоспособност' },
  { id: 'certificate', label: 'Медицинско удостоверение', icon: '📋', desc: 'Общо медицинско удостоверение' },
]

function DocumentsPage() {
  const { appointmentId } = Route.useParams()
  const { user } = Route.useRouteContext()
  const navigate = useNavigate()
  const doLogout = useServerFn(logoutFn)
  const doGetAppointment = useServerFn(getAppointmentFn)

  const [generated, setGenerated] = React.useState<string | null>(null)
  const [patientId, setPatientId] = React.useState<string | null>(null)
  const [patientName, setPatientName] = React.useState('')

  React.useEffect(() => {
    doGetAppointment({ data: { appointmentId } }).then(res => {
      if (res.appointment) {
        setPatientId(res.appointment.patient_id)
        setPatientName(`${res.appointment.patients.first_name} ${res.appointment.patients.last_name}`)
      }
    })
  }, [appointmentId])

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
        <div style={{ maxWidth: 1100 }}>
          {/* Header */}
          <div className="mb-8">
            <nav className="flex items-center gap-1.5 text-xs font-medium text-mp-text-muted mb-3">
              <Link to="/patients" className="hover:text-mp-green transition-colors text-decoration-none">Пациенти</Link>
              <span>›</span>
              <span className="text-mp-text font-semibold">Документи</span>
            </nav>
            <h1 className="text-4xl font-extrabold text-mp-text tracking-tight">Документи</h1>
            <p className="text-mp-text-muted mt-2 text-lg">Генерирайте официални документи, амбулаторни листове и рецепти.</p>
          </div>

          <div className="flex flex-col gap-8">
            <div className="mp-card p-8">
              <h2 className="text-xl font-bold text-mp-text mb-6">Достъпни шаблони</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {DOCUMENT_TYPES.map(doc => (
                  <div key={doc.id} className="group p-6 rounded-2xl border border-mp-border bg-mp-card-2 hover:bg-white hover:border-mp-green/30 hover:shadow-lg transition-all flex flex-col gap-4">
                    <div className="text-4xl">{doc.icon}</div>
                    <div className="flex-1">
                      <h3 className="font-bold text-lg text-mp-text">{doc.label}</h3>
                      <p className="text-sm text-mp-text-muted mt-2 leading-relaxed">{doc.desc}</p>
                    </div>
                    <button
                      type="button"
                      className="mp-btn-outline w-full h-11 flex items-center justify-center gap-2 group-hover:bg-mp-green group-hover:text-white group-hover:border-mp-green transition-all"
                      onClick={() => setGenerated(doc.id)}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><path d="M12 4v16m8-8H4"/></svg>
                      ГЕНЕРИРАЙ
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {generated && (
              <div className="mp-card p-8 bg-mp-green-light border-mp-green/20 animate-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-mp-green flex items-center justify-center text-white">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><path d="M20 6L9 17l-5-5"/></svg>
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-mp-green-dark">Документът е готов</h2>
                      <p className="text-xs font-medium text-mp-green-dark/60 mt-0.5">ТИП: {DOCUMENT_TYPES.find(d => d.id === generated)?.label}</p>
                    </div>
                  </div>
                  <span className="mp-badge-ok">ВАЛИДЕН</span>
                </div>
                
                <div className="p-8 bg-white/70 rounded-2xl border border-mp-green/10 shadow-inner font-mono text-sm leading-loose text-mp-text">
                  <div className="flex justify-between items-start mb-6">
                    <div className="font-bold text-lg border-b-2 border-mp-text pb-1 uppercase tracking-tighter">МЕДИЦИНСКИ ЦЕНТЪР MEDPORTAL</div>
                    <div className="text-right">
                      <p>ДАТА: {new Date().toLocaleDateString('bg-BG')}</p>
                      <p>ID: {appointmentId.slice(0, 8).toUpperCase()}</p>
                    </div>
                  </div>
                  <p className="whitespace-pre-wrap">{`ТИП ДОКУМЕНТ: ${DOCUMENT_TYPES.find(d => d.id === generated)?.label}\n\n[Автоматично генерирано съдържание на базата на попълнената анамнеза, статус и терапия от този преглед.]\n\nПодпис: ............................\nПечат: (М.П.)`}</p>
                </div>

                <div className="mt-8 flex items-center gap-4">
                  <button type="button" className="mp-btn-primary h-14 px-10 shadow-lg shadow-mp-green/20 flex items-center gap-3">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4m4-5l5 5 5-5m-5 5V3"/></svg>
                    ИЗТЕГЛИ PDF
                  </button>
                  <button 
                    type="button" 
                    className="mp-btn-ghost h-14 px-8" 
                    onClick={() => setGenerated(null)}
                  >
                    ЗАТВОРИ
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="mt-12 pt-8 border-t border-mp-border flex items-center justify-between flex-wrap gap-4">
            <Link 
              to={`/session/${appointmentId}/results`} 
              className="mp-btn-ghost h-14 px-8 text-decoration-none inline-flex items-center"
            >
              ← НАЗАД КЪМ РЕЗУЛТАТИ
            </Link>
            <Link 
              to="/patients" 
              className="mp-btn-primary h-14 px-12 text-decoration-none inline-flex items-center shadow-lg shadow-mp-green/20"
            >
              ✓ ПРИКЛЮЧИ ПРЕГЛЕДА
            </Link>
          </div>
        </div>

        <div className="h-20" />
      </main>
    </div>
  )
}
