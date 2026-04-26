import { createFileRoute, useNavigate, Link } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import * as React from 'react'
import { AppSidebar } from '../../components/AppSidebar'
import { logoutFn } from '../logout'
import { createReferralFn, listReferralsFn, deleteReferralFn, ReferralData } from '../../utils/clinical'
import { transcribeAudioFn, analyzeConsultationFn } from '../../utils/ai'
import { uploadRecordingFn } from '../../utils/recordings'
import { getAppointmentFn } from '../../utils/appointments'
import { useAudioRecorder } from '../../hooks/useAudioRecorder'
import { blobToBase64 } from '../../utils/audio'

export const Route = createFileRoute('/_authed/session/$appointmentId/referral')({
  component: ReferralPage,
})

const URGENCY_LABELS = { routine: 'Планово', urgent: 'Спешно', emergency: 'Незабавно' }
const SPECIALISTS = ['Кардиолог', 'Невролог', 'Ортопед', 'Дерматолог', 'Уролог', 'Гинеколог', 'Офталмолог', 'ОУШ', 'Ендокринолог', 'Пулмолог', 'Гастроентеролог', 'Психиатър', 'Онколог', 'Друг']

function ReferralPage() {
  const { appointmentId } = Route.useParams()
  const { user } = Route.useRouteContext()
  const navigate = useNavigate()
  const doLogout = useServerFn(logoutFn)
  const doCreate = useServerFn(createReferralFn)
  const doList = useServerFn(listReferralsFn)
  const doDelete = useServerFn(deleteReferralFn)
  const doGetAppointment = useServerFn(getAppointmentFn)
  const doUpload = useServerFn(uploadRecordingFn)
  const doTranscribe = useServerFn(transcribeAudioFn)
  const doAnalyze = useServerFn(analyzeConsultationFn)

  const { status, audioBlob, start, stop, reset, durationSeconds } = useAudioRecorder()

  const [referrals, setReferrals] = React.useState<ReferralData[]>([])
  const [specialist, setSpecialist] = React.useState('')
  const [customSpecialist, setCustomSpecialist] = React.useState('')
  const [reason, setReason] = React.useState('')
  const [urgency, setUrgency] = React.useState<'routine' | 'urgent' | 'emergency'>('routine')
  const [notes, setNotes] = React.useState('')
  const [isAdding, setIsAdding] = React.useState(false)
  const [processingState, setProcessingState] = React.useState<string | null>(null)
  const [patientId, setPatientId] = React.useState<string | null>(null)
  const [patientName, setPatientName] = React.useState('')
  const [saveMsg, setSaveMsg] = React.useState('')

  const isRecording = status === 'recording'

  React.useEffect(() => {
    doGetAppointment({ data: { appointmentId } }).then(res => {
      if (res.appointment) {
        setPatientId(res.appointment.patient_id)
        setPatientName(`${res.appointment.patients.first_name} ${res.appointment.patients.last_name}`)
      }
    })
    doList({ data: { appointmentId } }).then(res => setReferrals(res.data ?? [])).catch(() => {})
  }, [appointmentId])

  // Handle Recording End & AI Pipeline
  React.useEffect(() => {
    if (status === 'stopped' && audioBlob && patientId) {
      handleAudioProcess(audioBlob)
    }
  }, [status, audioBlob, patientId])

  const handleAudioProcess = async (blob: Blob) => {
    setProcessingState('Качване...')
    try {
      const base64 = await blobToBase64(blob)
      
      await doUpload({
        data: {
          base64,
          mimeType: blob.type,
          name: `Направление запис ${new Date().toLocaleString('bg-BG')}`,
          duration: durationSeconds,
          size: blob.size,
          appointmentId,
          patientId: patientId!
        }
      })

      setProcessingState('Анализ...')
      const transRes = await doTranscribe({ data: { base64, mimeType: blob.type } })
      if (transRes.error || !transRes.transcript) throw new Error(transRes.message)

      const analyzeRes = await doAnalyze({
        data: {
          appointmentId,
          patientId: patientId!,
          transcript: transRes.transcript
        }
      })

      if (!analyzeRes.error && analyzeRes.analysis?.entities) {
        const refs = analyzeRes.analysis.entities.filter((e: any) => e.entity_type === 'referral')
        if (refs.length > 0) {
          const first = refs[0]
          setSpecialist('Друг')
          setCustomSpecialist(first.value)
          setReason(first.attributes?.reason || '')
          setUrgency(first.attributes?.urgency || 'routine')
          setSaveMsg('AI попълни данните за направление!')
          setTimeout(() => setSaveMsg(''), 5000)
        }
      }
    } catch (err: any) {
      console.error('Audio processing failed:', err)
      setSaveMsg('Грешка: ' + err.message)
    } finally {
      setProcessingState(null)
      reset()
    }
  }

  const handleAdd = async () => {
    const name = specialist === 'Друг' ? customSpecialist : specialist
    if (!name.trim()) return
    setIsAdding(true)
    try {
      const res = await doCreate({
        data: { appointment_id: appointmentId, specialist_type: name, reason, urgency, notes, status: 'draft' }
      })
      if (res.data) setReferrals(prev => [...prev, res.data!])
      setSpecialist(''); setCustomSpecialist(''); setReason(''); setNotes(''); setUrgency('routine')
    } finally {
      setIsAdding(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!window.confirm('Наистина ли искате да изтриете това направление?')) return
    await doDelete({ data: { id } })
    setReferrals(prev => prev.filter(r => r.id !== id))
  }

  return (
    <div className="mp-layout">
      <AppSidebar user={user} appointmentId={appointmentId} patientId={patientId || undefined} patientName={patientName} onLogout={() => doLogout().then(() => navigate({ to: '/login' }))} />
      <main className="mp-main" style={{ position: 'relative' }}>
        
        {/* Floating voice button */}
        <div style={{ position: 'absolute', top: '2.5rem', right: '2rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', zIndex: 10 }}>
          <button
            type="button"
            onClick={() => isRecording ? stop() : start()}
            className={`mp-voice-btn ${isRecording ? 'recording' : ''}`}
          >
            {isRecording ? (
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                <rect x="6" y="6" width="12" height="12" rx="2" fill="currentColor" />
              </svg>
            ) : (
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.25}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
              </svg>
            )}
            <span>{isRecording ? 'СТОП' : 'ЗАПИС'}</span>
          </button>
          {isRecording && <span className="animate-pulse text-mp-danger text-xs font-bold">Слушам… ({durationSeconds}с)</span>}
          {processingState && <span className="text-mp-green-dark text-xs font-bold">{processingState}</span>}
        </div>

        <div style={{ maxWidth: 1100, paddingRight: '8rem' }}>
          <div className="mb-8">
            <nav className="flex items-center gap-1.5 text-xs font-medium text-mp-text-muted mb-3">
              <Link to="/patients" className="hover:text-mp-green transition-colors text-decoration-none">Пациенти</Link>
              <span>›</span>
              <span className="text-mp-text font-semibold">Направления</span>
            </nav>
            <h1 className="text-4xl font-extrabold text-mp-text tracking-tight">Направление към специалист</h1>
            <p className="text-mp-text-muted mt-2 text-lg">Издайте направление за консултация или специализирано изследване.</p>
          </div>

          <div className="flex flex-col gap-8">
            {/* Add referral form */}
            <div className="mp-card p-8">
              <h2 className="text-xl font-bold text-mp-text mb-6 flex items-center gap-2">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="text-mp-green"><path d="M12 4v16m8-8H4"/></svg>
                Добави ново направление
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="flex flex-col gap-2">
                  <label className="mp-label">СПЕЦИАЛИСТ</label>
                  <select 
                    value={specialist} 
                    onChange={e => setSpecialist(e.target.value)} 
                    className="mp-input h-14"
                  >
                    <option value="">Изберете специалист…</option>
                    {SPECIALISTS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                {specialist === 'Друг' && (
                  <div className="flex flex-col gap-2">
                    <label className="mp-label">СПЕЦИАЛНОСТ (РЪЧНО)</label>
                    <input value={customSpecialist} onChange={e => setCustomSpecialist(e.target.value)} placeholder="напр. Педиатър..." className="mp-input h-14" />
                  </div>
                )}
                <div className="flex flex-col gap-2">
                  <label className="mp-label">СПЕШНОСТ</label>
                  <select 
                    value={urgency} 
                    onChange={e => setUrgency(e.target.value as any)} 
                    className="mp-input h-14"
                  >
                    {Object.entries(URGENCY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
              </div>
              <div className="mt-6 flex flex-col gap-2">
                <label className="mp-label">ПРИЧИНА ЗА НАПРАВЛЕНИЕТО</label>
                <textarea value={reason} onChange={e => setReason(e.target.value)} placeholder="напр. Консултация за уточняване на..." className="mp-input min-h-[80px] py-4" />
              </div>
              <div className="mt-6 flex flex-col gap-2">
                <label className="mp-label">БЕЛЕЖКИ / ДОПЪЛНИТЕЛНА ИНФОРМАЦИЯ</label>
                <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Допълнителни указания..." className="mp-input min-h-[80px] py-4" />
              </div>
              <div className="mt-8 flex justify-end gap-3">
                {saveMsg && <span className="text-sm font-bold text-mp-green-dark self-center mr-4">{saveMsg}</span>}
                <button onClick={handleAdd} disabled={isAdding || (!specialist && !customSpecialist)} className="mp-btn-primary h-14 px-12">
                  {isAdding ? 'ДОБАВЯНЕ...' : 'ДОБАВИ НАПРАВЛЕНИЕ'}
                </button>
              </div>
            </div>

            {/* Existing referrals */}
            {referrals.length > 0 && (
              <div className="space-y-4">
                <h2 className="text-xl font-bold text-mp-text">Издадени направления ({referrals.length})</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {referrals.map(ref => (
                    <div key={ref.id} className="mp-card p-6 flex flex-col justify-between border-mp-green/20 bg-mp-green-light/10">
                      <div>
                        <div className="flex items-start justify-between gap-4 mb-3">
                          <div>
                            <h3 className="text-lg font-bold text-mp-text">{ref.specialist_type}</h3>
                            <span className={`text-[9px] font-extrabold uppercase tracking-widest px-2 py-0.5 rounded border ${
                              ref.urgency === 'routine' ? 'text-mp-green border-mp-green/20' : 
                              ref.urgency === 'urgent' ? 'text-mp-warn-dark border-mp-warn/20' : 
                              'text-mp-danger border-mp-danger/20'
                            }`}>
                              {URGENCY_LABELS[ref.urgency || 'routine']}
                            </span>
                          </div>
                          <button onClick={() => handleDelete(ref.id!)} className="p-2 text-mp-text-subtle hover:text-mp-danger hover:bg-mp-danger-bg rounded-lg transition-colors">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M3 6h18m-2 0v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6m3 0V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                          </button>
                        </div>
                        {ref.reason && <p className="text-sm text-mp-text-muted leading-relaxed line-clamp-2 mb-2">{ref.reason}</p>}
                      </div>
                      <div className="pt-4 border-t border-mp-border/50 flex justify-between items-center mt-auto">
                        <span className="text-[10px] font-bold text-mp-text-muted uppercase tracking-widest">№ {ref.id?.slice(0, 8)}</span>
                        <button className="mp-btn-ghost h-8 px-3 text-[10px] font-bold">ПЕЧАТ</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="mt-12 pt-8 border-t border-mp-border flex items-center justify-between flex-wrap gap-4">
            <Link to={`/session/${appointmentId}/therapy`} className="mp-btn-ghost h-14 px-8 text-decoration-none inline-flex items-center">
              ← НАЗАД КЪМ ТЕРАПИЯ
            </Link>
            <button 
              onClick={() => navigate({ to: `/session/${appointmentId}/test-orders` })}
              className="mp-btn-primary h-14 px-12 text-decoration-none inline-flex items-center shadow-lg shadow-mp-green/20"
            >
              ПРОДЪЛЖИ КЪМ ИЗСЛЕДВАНИЯ →
            </button>
          </div>
        </div>

        <div className="h-20" />
      </main>
    </div>
  )
}
