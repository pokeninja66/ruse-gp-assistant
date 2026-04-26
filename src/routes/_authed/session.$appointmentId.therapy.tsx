import { createFileRoute, useNavigate, Link } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import * as React from 'react'
import { AppSidebar } from '../../components/AppSidebar'
import { logoutFn } from '../logout'
import { saveTherapyPlanFn, getTherapyPlanFn } from '../../utils/clinical'
import { transcribeAudioFn, analyzeConsultationFn } from '../../utils/ai'
import { uploadRecordingFn } from '../../utils/recordings'
import { getAppointmentFn } from '../../utils/appointments'
import { useAudioRecorder } from '../../hooks/useAudioRecorder'
import { blobToBase64 } from '../../utils/audio'

export const Route = createFileRoute('/_authed/session/$appointmentId/therapy')({
  component: TherapyPage,
})

type SafetyStatus = 'ok' | 'warn'
interface SafetyCheck { id: string; label: string; status: SafetyStatus; detail: string }

function TherapyPage() {
  const { appointmentId } = Route.useParams()
  const { user } = Route.useRouteContext()
  const navigate = useNavigate()
  const doLogout = useServerFn(logoutFn)
  const doSave = useServerFn(saveTherapyPlanFn)
  const doGet = useServerFn(getTherapyPlanFn)
  const doGetAppointment = useServerFn(getAppointmentFn)
  const doUpload = useServerFn(uploadRecordingFn)
  const doTranscribe = useServerFn(transcribeAudioFn)
  const doAnalyze = useServerFn(analyzeConsultationFn)

  const { status, audioBlob, start, stop, reset, durationSeconds } = useAudioRecorder()

  const [doctorTherapy, setDoctorTherapy] = React.useState('')
  const [patientInstructions, setPatientInstructions] = React.useState('')
  const [confirmedPlan, setConfirmedPlan] = React.useState<{ text: string; source: string } | null>(null)
  const [editing, setEditing] = React.useState(false)
  const [isSaving, setIsSaving] = React.useState(false)
  const [saveMsg, setSaveMsg] = React.useState('')
  const [processingState, setProcessingState] = React.useState<string | null>(null)
  const [patientId, setPatientId] = React.useState<string | null>(null)
  const [patientName, setPatientName] = React.useState('')

  const isRecording = status === 'recording'

  // Mock safety checks
  const safetyChecks: SafetyCheck[] = [
    { id: 'allergy', label: 'Алергии', status: 'ok', detail: 'Не са регистрирани известни алергии.' },
    { id: 'age', label: 'Възраст', status: 'ok', detail: 'Без специфични корекции.' },
    { id: 'meds', label: 'Приемани лекарства', status: 'ok', detail: 'Проверете за взаимодействия при нови назначения.' },
  ]

  React.useEffect(() => {
    doGetAppointment({ data: { appointmentId } }).then(res => {
      if (res.appointment) {
        setPatientId(res.appointment.patient_id)
        setPatientName(`${res.appointment.patients.first_name} ${res.appointment.patients.last_name}`)
      }
    })

    doGet({ data: { appointmentId } }).then(res => {
      if (res.data) {
        setConfirmedPlan({ text: res.data.plan_text, source: res.data.source === 'ai_suggested' ? 'AI предложение' : 'Потвърдена от лекар' })
        setPatientInstructions(res.data.patient_instructions ?? '')
      }
    }).catch(() => {})
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
          name: `Терапия запис ${new Date().toLocaleString('bg-BG')}`,
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

      if (!analyzeRes.error && analyzeRes.analysis?.recommendation) {
        const rec = analyzeRes.analysis.recommendation
        const planText = `${rec.drug_name}${rec.dosage ? ` — ${rec.dosage}` : ''}${rec.frequency ? ` (${rec.frequency})` : ''}\n\n${rec.rationale || ''}`
        setConfirmedPlan({ text: planText, source: 'AI предложение' })
        setSaveMsg('Терапията е обновена от AI!')
        setTimeout(() => setSaveMsg(''), 5000)
      }
    } catch (err: any) {
      console.error('Audio processing failed:', err)
      setSaveMsg('Грешка: ' + err.message)
    } finally {
      setProcessingState(null)
      reset()
    }
  }

  const handleConfirm = () => {
    if (!doctorTherapy.trim()) return
    setConfirmedPlan({ text: doctorTherapy.trim(), source: 'Потвърдена от лекар' })
    setEditing(false)
  }

  const handleSave = async () => {
    if (!confirmedPlan) return
    setIsSaving(true)
    setSaveMsg('')
    try {
      await doSave({
        data: {
          appointment_id: appointmentId,
          plan_text: confirmedPlan.text,
          source: 'doctor_manual',
          patient_instructions: patientInstructions,
        }
      })
      setSaveMsg('Запазено успешно!')
      setTimeout(() => setSaveMsg(''), 3000)
    } finally {
      setIsSaving(false)
    }
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

        {/* Toast Notification */}
        {saveMsg && (
          <div style={{
            position: 'fixed',
            bottom: '2.5rem',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 100,
            animation: 'toastIn 0.3s ease-out'
          }}>
            <div style={{
              background: 'hsl(142 72% 26%)',
              color: '#fff',
              padding: '0.75rem 1.5rem',
              borderRadius: '1rem',
              boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              border: '1px solid rgba(255,255,255,0.1)'
            }}>
              <div style={{ width: 20, height: 20, borderRadius: '50%', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyCenter: 'center' }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3}><path d="M20 6L9 17l-5-5"/></svg>
              </div>
              <span style={{ fontSize: '0.875rem', fontWeight: 700, letterSpacing: '0.01em' }}>{saveMsg}</span>
            </div>
            <style>{`
              @keyframes toastIn {
                from { opacity: 0; transform: translate(-50%, 1rem); }
                to { opacity: 1; transform: translate(-50%, 0); }
              }
            `}</style>
          </div>
        )}

        <div style={{ maxWidth: 1100, paddingRight: '8rem' }}>
          <div className="mb-8">
            <nav className="flex items-center gap-1.5 text-xs font-medium text-mp-text-muted mb-3">
              <Link to="/patients" className="hover:text-mp-green transition-colors text-decoration-none">Пациенти</Link>
              <span>›</span>
              <span className="text-mp-text font-semibold">Терапия / Препоръки</span>
            </nav>
            <h1 className="text-4xl font-extrabold text-mp-text tracking-tight">Терапия / Препоръки</h1>
            <p className="text-mp-text-muted mt-2 text-lg">Потвърдете схемата на лечение и инструкциите за пациента.</p>
          </div>

          <div className="flex flex-col gap-8">
            {/* Safety checks */}
            <div className="mp-card p-8">
              <h2 className="text-xl font-bold text-mp-text mb-6">Проверки за безопасност</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {safetyChecks.map(check => (
                  <div key={check.id} className={`p-5 rounded-2xl border ${check.status === 'ok' ? 'bg-mp-green-light/20 border-mp-green/10' : 'bg-mp-warn-bg border-mp-warn/20'}`}>
                    <div className="flex items-center gap-2 mb-2">
                      <div className={`w-2 h-2 rounded-full ${check.status === 'ok' ? 'bg-mp-green' : 'bg-mp-warn'}`} />
                      <span className="text-xs font-extrabold uppercase tracking-widest text-mp-text-muted">{check.label}</span>
                    </div>
                    <p className="text-sm font-bold text-mp-text">{check.status === 'ok' ? 'БЕЗОПАСНО' : 'ВНИМАНИЕ'}</p>
                    <p className="text-xs text-mp-text-muted mt-1">{check.detail}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Therapy Plan */}
            <div className="mp-card p-8">
              <h2 className="text-xl font-bold text-mp-text mb-6">Терапевтичен план</h2>
              
              {confirmedPlan && !editing ? (
                <div className="p-8 rounded-2xl bg-mp-bg/50 border border-mp-border relative group">
                  <div className="absolute top-6 right-6">
                    <button onClick={() => { setDoctorTherapy(confirmedPlan.text); setEditing(true) }} className="mp-btn-ghost h-10 px-4 text-xs">
                      РЕДАКТИРАЙ
                    </button>
                  </div>
                  <div className="flex items-center gap-2 mb-4">
                    <span className="text-[10px] font-extrabold text-white bg-mp-green px-2 py-0.5 rounded uppercase tracking-widest">{confirmedPlan.source}</span>
                  </div>
                  <p className="text-lg font-bold text-mp-text whitespace-pre-wrap leading-relaxed">
                    {confirmedPlan.text}
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <label className="mp-label">ВЪВЕДЕТЕ ТЕРАПИЯ</label>
                  <textarea
                    value={doctorTherapy}
                    onChange={e => setDoctorTherapy(e.target.value)}
                    placeholder="напр. Amoxicillin 500mg, 3x1 за 7 дни..."
                    className="mp-input min-h-[150px] py-4 text-lg"
                  />
                  <div className="flex justify-end gap-3">
                    {confirmedPlan && <button onClick={() => setEditing(false)} className="mp-btn-ghost h-12 px-6">ОТКАЗ</button>}
                    <button onClick={handleConfirm} className="mp-btn-primary h-12 px-10">ПОТВЪРДИ ПЛАНА</button>
                  </div>
                </div>
              )}
            </div>

            {/* Patient Instructions */}
            <div className="mp-card p-8">
              <h2 className="text-xl font-bold text-mp-text mb-6">Инструкции за пациента</h2>
              <textarea
                value={patientInstructions}
                onChange={e => setPatientInstructions(e.target.value)}
                placeholder="напр. Пийте много течности, избягвайте физическо натоварване..."
                className="mp-input min-h-[120px] py-4"
              />
              <p className="text-xs text-mp-text-muted mt-3 italic">Тези инструкции ще бъдат включени в амбулаторния лист и документите.</p>
            </div>
          </div>

          <div className="mt-12 pt-8 border-t border-mp-border flex items-center justify-between flex-wrap gap-4">
            <Link to={`/session/${appointmentId}/diagnosis`} className="mp-btn-ghost h-14 px-8 text-decoration-none inline-flex items-center">
              ← НАЗАД КЪМ ДИАГНОЗА
            </Link>
            <div className="flex items-center gap-4">
              {saveMsg && <span className="text-sm font-bold text-mp-green-dark">{saveMsg}</span>}
              <button onClick={handleSave} disabled={isSaving || !confirmedPlan} className="mp-btn-outline h-14 px-10">
                {isSaving ? 'ЗАПИС...' : 'ЗАПАЗИ'}
              </button>
              <button 
                onClick={async () => { await handleSave(); navigate({ to: `/session/${appointmentId}/referral` }) }}
                disabled={!confirmedPlan}
                className="mp-btn-primary h-14 px-12 text-decoration-none inline-flex items-center shadow-lg shadow-mp-green/20"
              >
                ПРОДЪЛЖИ КЪМ НАПРАВЛЕНИЯ →
              </button>
            </div>
          </div>
        </div>

        <div className="h-20" />
      </main>
    </div>
  )
}
