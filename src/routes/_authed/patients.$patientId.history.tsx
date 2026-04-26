import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import * as React from 'react'
import { AppSidebar } from '../../components/AppSidebar'
import { logoutFn } from '../logout'
import { getPatientFullHistoryFn } from '../../utils/patients'
import { deleteRecordingFn } from '../../utils/recordings'

import { deleteDiagnosisFn, deleteTherapyPlanFn, deleteReferralFn, deleteTestOrderFn } from '../../utils/clinical'

export const Route = createFileRoute('/_authed/patients/$patientId/history')({
  component: HistoryPage,
})

function HistoryPage() {
  const { patientId } = Route.useParams()
  const { user } = Route.useRouteContext()
  const navigate = useNavigate()
  const doLogout = useServerFn(logoutFn)
  const doGetHistory = useServerFn(getPatientFullHistoryFn)

  const [history, setHistory] = React.useState<any>(null)
  const [loading, setLoading] = React.useState(true)

  const doDeleteDiagnosis = useServerFn(deleteDiagnosisFn)
  const doDeleteTherapy = useServerFn(deleteTherapyPlanFn)
  const doDeleteReferral = useServerFn(deleteReferralFn)
  const doDeleteTest = useServerFn(deleteTestOrderFn)
  const doDeleteRecording = useServerFn(deleteRecordingFn)

  const loadHistory = React.useCallback(() => {
    setLoading(true)
    doGetHistory({ data: { patientId } }).then(res => {
      if (!res.error) setHistory(res.history)
      setLoading(false)
    })
  }, [patientId, doGetHistory])

  React.useEffect(() => {
    loadHistory()
  }, [loadHistory])

  const handleDelete = async (item: any) => {
    if (!window.confirm(`Наистина ли искате да изтриете този запис (${kindLabels[item.kind]})?`)) return
    
    let res: any = { error: true, message: 'Unknown type' }
    if (item.kind === 'diagnosis') res = await doDeleteDiagnosis({ data: { id: item.id } })
    else if (item.kind === 'prescription') res = await doDeleteTherapy({ data: { id: item.id } })
    else if (item.kind === 'referral') res = await doDeleteReferral({ data: { id: item.id } })
    else if (item.kind === 'test') res = await doDeleteTest({ data: { id: item.id } })
    else if (item.kind === 'recording') res = await doDeleteRecording({ data: { id: item.id, storagePath: item.recording?.storage_path } })
    else if (item.kind === 'visit') {
      alert('За да изтриете преглед, моля направете го от списъка с пациенти или досието.')
      return
    }

    if (!res.error) {
      loadHistory()
    } else {
      alert('Грешка при изтриване: ' + res.message)
    }
  }

  if (loading) return <div className="mp-layout flex items-center justify-center"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-mp-green"></div></div>

  const patient = history?.patient
  const timeline: any[] = []

  // Build timeline items from multiple sources
  if (history) {
    history.appointments.forEach((a: any) => {
      timeline.push({
        id: a.id,
        date: new Date(a.created_at),
        kind: 'visit',
        title: a.reason_for_visit || 'Преглед',
        detail: a.summary || 'Няма въведено резюме.',
        appointmentId: a.id
      })
    })

    history.diagnoses.forEach((d: any) => {
      timeline.push({
        id: d.id,
        date: new Date(d.created_at),
        kind: 'diagnosis',
        title: d.diagnosis_code ? `${d.diagnosis_code} — ${d.diagnosis_name}` : d.diagnosis_name,
        detail: d.notes || '',
        appointmentId: d.appointment_id
      })
    })

    history.therapy.forEach((t: any) => {
      timeline.push({
        id: t.id,
        date: new Date(t.created_at),
        kind: 'prescription',
        title: 'Терапевтичен план',
        detail: t.plan_description,
        appointmentId: t.appointment_id
      })
    })

    history.referrals.forEach((r: any) => {
      timeline.push({
        id: r.id,
        date: new Date(r.created_at),
        kind: 'referral',
        title: `Направление за ${r.specialty}`,
        detail: r.reason,
        appointmentId: r.appointment_id
      })
    })

    history.testOrders.forEach((t: any) => {
      timeline.push({
        id: t.id,
        date: new Date(t.created_at),
        kind: 'test',
        title: `Изследване: ${t.test_type}`,
        detail: t.notes || '',
        appointmentId: t.appointment_id
      })
    })

    history.recordings.forEach((r: any) => {
      timeline.push({
        id: r.id,
        date: new Date(r.created_at),
        kind: 'recording',
        title: r.name || 'Аудио запис',
        detail: `Продължителност: ${Math.round(r.duration || 0)}с`,
        appointmentId: r.appointment_id,
        recording: r
      })
    })
  }

  // Sort by date descending
  timeline.sort((a, b) => b.date.getTime() - a.date.getTime())

  const kindIcons: any = {
    visit: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
    diagnosis: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>,
    prescription: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="m10.5 20.5 10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7Z"/><path d="m8.5 8.5 7 7"/></svg>,
    referral: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M22 2L11 13"/><path d="m22 2-7 20-4-9-9-4Z"/></svg>,
    test: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="M15 2H9a1 1 0 0 0-1 1v2a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V3a1 1 0 0 0-1-1Z"/><path d="M12 11h4"/><path d="M12 16h4"/><path d="M8 11h.01"/><path d="M8 16h.01"/></svg>,
    recording: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v4m-4 0h8"/></svg>
  }

  const kindLabels: any = {
    visit: 'Преглед',
    diagnosis: 'Диагноза',
    prescription: 'Рецепта / Терапия',
    referral: 'Направление',
    test: 'Изследване',
    recording: 'Аудио запис'
  }

  const kindColors: any = {
    visit: 'bg-blue-50 text-blue-600 border-blue-100',
    diagnosis: 'bg-purple-50 text-purple-600 border-purple-100',
    prescription: 'bg-green-50 text-green-600 border-green-100',
    referral: 'bg-orange-50 text-orange-600 border-orange-100',
    test: 'bg-cyan-50 text-cyan-600 border-cyan-100',
    recording: 'bg-red-50 text-red-600 border-red-100'
  }

  return (
    <div className="mp-layout">
      <AppSidebar 
        user={user} 
        patientId={patientId} 
        patientName={`${patient?.first_name} ${patient?.last_name}`} 
        onLogout={() => doLogout().then(() => navigate({ to: '/login' }))} 
      />
      <main className="mp-main">
        <div style={{ maxWidth: 900 }}>
          {/* Header */}
          <div className="mb-10">
            <nav className="flex items-center gap-1.5 text-xs font-medium text-mp-text-muted mb-3">
              <Link to="/patients" className="hover:text-mp-green transition-colors text-decoration-none">Пациенти</Link>
              <span>›</span>
              <Link to={`/patients/${patientId}`} className="hover:text-mp-green transition-colors text-decoration-none">{patient?.first_name} {patient?.last_name}</Link>
              <span>›</span>
              <span className="text-mp-text font-semibold">История</span>
            </nav>
            <h1 className="text-4xl font-extrabold text-mp-text tracking-tight">Медицинска история</h1>
            <p className="text-mp-text-muted mt-2 text-lg">Хронологичен преглед на всички събития в досието на пациента.</p>
          </div>

          {/* Timeline */}
          <div className="relative">
            {/* Vertical Line */}
            <div className="absolute left-6 top-4 bottom-4 w-0.5 bg-mp-border/50"></div>

            <div className="space-y-8 relative">
              {timeline.map((item, idx) => (
                <div key={`${item.kind}-${item.id}-${idx}`} className="flex gap-6 group">
                  {/* Icon Node */}
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 z-10 border shadow-sm transition-all group-hover:scale-110 ${kindColors[item.kind]}`}>
                    {kindIcons[item.kind]}
                  </div>

                  {/* Content Card */}
                  <div className="mp-card p-6 flex-1 hover:shadow-md transition-shadow relative">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-mp-text-muted">
                        {kindLabels[item.kind]} · {item.date.toLocaleDateString('bg-BG')}
                      </span>
                      <div className="flex items-center gap-4">
                        {item.appointmentId && (
                          <Link 
                            to={`/session/${item.appointmentId}/anamnesis`} 
                            className="text-[10px] font-bold text-mp-green hover:underline uppercase tracking-wider"
                          >
                            КЪМ ПРЕГЛЕДА →
                          </Link>
                        )}
                        {item.kind !== 'visit' && (
                          <button 
                            onClick={() => handleDelete(item)}
                            className="text-[10px] font-bold text-mp-danger hover:underline uppercase tracking-wider bg-transparent border-none p-0 cursor-pointer"
                          >
                            ИЗТРИЙ
                          </button>
                        )}
                      </div>
                    </div>
                    <h3 className="text-lg font-bold text-mp-text mb-2">{item.title}</h3>
                    <p className="text-mp-text-muted text-sm leading-relaxed whitespace-pre-wrap">{item.detail}</p>
                  </div>
                </div>
              ))}

              {timeline.length === 0 && (
                <div className="mp-card p-20 text-center border-dashed ml-12">
                  <p className="text-mp-text-muted">Няма записани събития в историята на този пациент.</p>
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="h-20" />
      </main>
    </div>
  )
}
