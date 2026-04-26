import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import * as React from 'react'
import { AppSidebar } from '../../components/AppSidebar'
import { logoutFn } from '../logout'
import { getAppointmentResultsFn, getAppointmentFn } from '../../utils/appointments'
import { saveDiagnosisFn, listDiagnosesFn, saveTherapyPlanFn, deleteDiagnosisFn, AppointmentDiagnosisData } from '../../utils/clinical'
import { transcribeAudioFn, analyzeConsultationFn } from '../../utils/ai'
import { uploadRecordingFn } from '../../utils/recordings'
import { useAudioRecorder } from '../../hooks/useAudioRecorder'
import { blobToBase64 } from '../../utils/audio'
import { SessionRecordings } from '../../components/SessionRecordings'

export const Route = createFileRoute('/_authed/session/$appointmentId/diagnosis')({
  component: DiagnosisPage,
})

function DiagnosisPage() {
  const { appointmentId } = Route.useParams()
  const { user } = Route.useRouteContext()
  const navigate = useNavigate()
  const doLogout = useServerFn(logoutFn)
  const doGetResults = useServerFn(getAppointmentResultsFn)
  const doSaveDiagnosis = useServerFn(saveDiagnosisFn)
  const doListDiagnoses = useServerFn(listDiagnosesFn)
  const doSaveTherapy = useServerFn(saveTherapyPlanFn)
  const doDeleteDiagnosis = useServerFn(deleteDiagnosisFn)
  const doGetAppointment = useServerFn(getAppointmentFn)
  const doUpload = useServerFn(uploadRecordingFn)
  const doTranscribe = useServerFn(transcribeAudioFn)
  const doAnalyze = useServerFn(analyzeConsultationFn)

  const { status, audioBlob, start, stop, reset, durationSeconds } = useAudioRecorder()

  const [data, setData] = React.useState<any>(null)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [confirmedDiagnoses, setConfirmedDiagnoses] = React.useState<AppointmentDiagnosisData[]>([])
  const [customDiagnosis, setCustomDiagnosis] = React.useState('')
  const [isSaving, setIsSaving] = React.useState(false)
  const [saveMsg, setSaveMsg] = React.useState('')
  const [processingState, setProcessingState] = React.useState<string | null>(null)
  const [patientId, setPatientId] = React.useState<string | null>(null)
  const [rerunning, setRerunning] = React.useState(false)

  const isRecording = status === 'recording'

  const loadData = React.useCallback(async () => {
    try {
      const [appt, results, diagnoses] = await Promise.all([
        doGetAppointment({ data: { appointmentId } }),
        doGetResults({ data: { appointmentId } }),
        doListDiagnoses({ data: { appointmentId } }),
      ])
      
      if (appt.appointment) setPatientId(appt.appointment.patient_id)
      if (results.error) setError(results.message)
      else setData(results.data)
      setConfirmedDiagnoses(diagnoses.data ?? [])
    } catch (e) {
      setError(String(e))
    } finally {
      setLoading(false)
    }
  }, [appointmentId])

  React.useEffect(() => {
    loadData()
  }, [loadData])

  // Handle Recording End & AI Pipeline
  React.useEffect(() => {
    if (status === 'stopped' && audioBlob && patientId) {
      handleAudioProcess(audioBlob)
    }
  }, [status, audioBlob, patientId])

  const applyAnalysis = (analysis: any) => {
    if (!analysis) return
    setData(analysis)
    setSaveMsg('AI хипотезите са обновени!')
    setTimeout(() => setSaveMsg(''), 5000)
  }

  const handleAudioProcess = async (blob: Blob) => {
    setProcessingState('Качване...')
    try {
      const base64 = await blobToBase64(blob)
      
      await doUpload({
        data: {
          base64,
          mimeType: blob.type,
          name: `Диагноза запис ${new Date().toLocaleString('bg-BG')}`,
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

      if (!analyzeRes.error && analyzeRes.analysis) {
        applyAnalysis(analyzeRes.analysis)
      }
    } catch (err: any) {
      console.error('Audio processing failed:', err)
      setSaveMsg('Грешка: ' + err.message)
    } finally {
      setProcessingState(null)
      reset()
    }
  }

  const handleConfirmAiDiagnosis = async (diagnosis: string, isGuess?: boolean) => {
    setIsSaving(true)
    try {
      const res = await doSaveDiagnosis({
        data: {
          appointment_id: appointmentId,
          diagnosis_name: diagnosis,
          source: isGuess ? 'ai_guess' : 'doctor_confirmed',
          is_final: false,
        }
      })
      if (res.data) setConfirmedDiagnoses(prev => [...prev, res.data!])
      setSaveMsg('Диагнозата е потвърдена!')
      setTimeout(() => setSaveMsg(''), 2500)
    } finally {
      setIsSaving(false)
    }
  }

  const handleAddCustom = async () => {
    if (!customDiagnosis.trim()) return
    await handleConfirmAiDiagnosis(customDiagnosis.trim())
    setCustomDiagnosis('')
  }

  const handleSetFinal = async (id: string) => {
    // In real app, we'd update this via server fn. For now, UI feedback
    setConfirmedDiagnoses(prev => prev.map(d => ({ ...d, is_final: d.id === id })))
    setSaveMsg('Окончателната диагноза е зададена.')
    setTimeout(() => setSaveMsg(''), 2500)
  }

  const handleDeleteDiagnosis = async (id: string) => {
    if (!window.confirm('Наистина ли искате да изтриете тази диагноза?')) return
    const res = await doDeleteDiagnosis({ data: { id } })
    if (!res.error) {
      setConfirmedDiagnoses(prev => prev.filter(d => d.id !== id))
    }
  }

  const handleProceedToTherapy = async () => {
    if (data?.recommendation) {
      await doSaveTherapy({
        data: {
          appointment_id: appointmentId,
          plan_text: `${data.recommendation.drug_name}${data.recommendation.dosage ? ` — ${data.recommendation.dosage}` : ''}${data.recommendation.frequency ? ` (${data.recommendation.frequency})` : ''}\n\n${data.recommendation.rationale || ''}`,
          source: 'ai_suggested',
        }
      })
    }
    navigate({ to: '/session/$appointmentId/therapy', params: { appointmentId } })
  }

  const handleRerun = async () => {
    setRerunning(true)
    await loadData()
    setRerunning(false)
  }

  if (loading) return <div className="mp-layout flex items-center justify-center"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-mp-green"></div></div>

  const appointment = data?.appointment || {}
  const entities = data?.entities || []
  const recommendation = data?.recommendation || null
  const hypotheses = entities.filter((e: any) => e.entity_type === 'diagnosis')

  return (
    <div className="mp-layout">
      <AppSidebar 
        user={user} 
        appointmentId={appointmentId} 
        patientId={patientId || undefined} 
        patientName={appointment?.patients ? `${appointment.patients.first_name} ${appointment.patients.last_name}` : undefined}
        onLogout={() => doLogout().then(() => navigate({ to: '/login' }))} 
      />
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
              <div style={{ width: 20, height: 20, borderRadius: '50%', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
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
              <span className="text-mp-text font-semibold">Диагноза</span>
            </nav>
            <div className="flex items-center justify-between gap-4">
              <h1 className="text-4xl font-extrabold text-mp-text tracking-tight">Работна диагноза</h1>
              <button onClick={handleRerun} disabled={rerunning} className="mp-btn-ghost text-xs h-10 px-4">
                {rerunning ? 'Обновяване...' : '↺ ПОВТОРИ АНАЛИЗА'}
              </button>
            </div>
            <p className="text-mp-text-muted mt-2 text-lg">Прегледайте предложенията на AI или въведете Вашата диагноза.</p>
          </div>

          {/* Recordings from this session */}
          <SessionRecordings appointmentId={appointmentId} patientId={patientId} onAnalysisComplete={applyAnalysis} />

          {error && <div className="p-4 bg-mp-danger-bg text-mp-danger border border-mp-danger/20 rounded-xl mb-8">{error}</div>}

          {/* AI Recommendation Banner */}
          {recommendation && (
            <div className="mp-card p-8 mb-8 bg-mp-green-light/30 border-mp-green/20">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 rounded-2xl bg-mp-green text-white flex items-center justify-center">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></svg>
                </div>
                <div>
                  <p className="text-[10px] font-extrabold text-mp-green-dark uppercase tracking-widest">AI Препоръка за терапия</p>
                  <h3 className="text-xl font-bold text-mp-text">{recommendation.drug_name} {recommendation.dosage}</h3>
                </div>
              </div>
              <p className="text-sm text-mp-text-muted leading-relaxed bg-white/50 p-4 rounded-xl border border-mp-green/10">
                {recommendation.rationale}
              </p>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* AI Hypotheses */}
            <div className="space-y-6">
              <h2 className="text-xl font-bold text-mp-text flex items-center gap-2">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="text-mp-green"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>
                AI Хипотези
              </h2>
              
              {hypotheses.length === 0 ? (
                <div className="mp-card p-12 border-dashed flex flex-col items-center text-center bg-mp-bg/50">
                  <p className="text-sm text-mp-text-muted italic">AI не е генерирал хипотези за този преглед.</p>
                </div>
              ) : (
                hypotheses.map((h: any, idx: number) => (
                  <div key={idx} className="mp-card p-6 hover:border-mp-green/30 transition-all group">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-lg font-bold text-mp-text group-hover:text-mp-green transition-colors">{h.value}</h3>
                          {h.attributes?.is_guess && <span className="text-[9px] font-bold text-mp-warn-dark bg-mp-warn-bg px-2 py-0.5 rounded border border-mp-warn/20 uppercase tracking-widest">Guess</span>}
                        </div>
                        <p className="text-xs text-mp-text-muted leading-relaxed">
                          {h.attributes?.severity ? `Степен: ${h.attributes.severity}. ` : ''}
                          {h.attributes?.duration ? `Продължителност: ${h.attributes.duration}.` : ''}
                        </p>
                      </div>
                      <button 
                        onClick={() => handleConfirmAiDiagnosis(h.value, h.attributes?.is_guess)}
                        className="mp-btn-outline h-10 px-4 text-[11px] font-bold"
                      >
                        ПОТВЪРДИ
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Confirmed Diagnoses */}
            <div className="space-y-6">
              <h2 className="text-xl font-bold text-mp-text flex items-center gap-2">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="text-mp-green"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="m9 11 3 3L22 4"/></svg>
                Потвърдени диагнози
              </h2>

              <div className="mp-card p-8">
                <div className="space-y-3 mb-8">
                  {confirmedDiagnoses.map((d) => (
                    <div key={d.id} className={`p-4 rounded-xl border flex items-center justify-between gap-4 ${d.is_final ? 'border-mp-green bg-mp-green-light shadow-sm' : 'border-mp-border bg-mp-bg/30'}`}>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-mp-text truncate">{d.diagnosis_name}</span>
                          {d.is_final && <span className="text-[10px] font-extrabold text-white bg-mp-green px-1.5 py-0.5 rounded uppercase tracking-tighter">Финална</span>}
                        </div>
                        <p className="text-[10px] text-mp-text-muted mt-0.5 uppercase tracking-wider font-bold">{d.source === 'ai_guess' ? 'AI хипотеза' : 'Лекар'}</p>
                      </div>
                      <div className="flex items-center gap-1">
                        {!d.is_final && (
                          <button onClick={() => handleSetFinal(d.id!)} className="p-2 rounded-lg text-mp-text-subtle hover:text-mp-green hover:bg-mp-green/10 transition-colors" title="Задай като окончателна">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><path d="m9 11 3 3L22 4"/><path d="M22 12a10 10 0 1 1-5.93-9.14"/></svg>
                          </button>
                        )}
                        <button onClick={() => handleDeleteDiagnosis(d.id!)} className="p-2 rounded-lg text-mp-text-subtle hover:text-mp-danger hover:bg-mp-danger-bg transition-colors">
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M3 6h18m-2 0v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6m3 0V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                        </button>
                      </div>
                    </div>
                  ))}

                  {confirmedDiagnoses.length === 0 && (
                    <div className="py-8 text-center border-2 border-dashed border-mp-border rounded-2xl bg-mp-bg/20">
                      <p className="text-sm text-mp-text-muted italic">Няма потвърдени диагнози.</p>
                    </div>
                  )}
                </div>

                <div className="pt-6 border-t border-mp-border">
                  <label className="mp-label mb-2 uppercase tracking-widest text-[11px]">Добави ръчно</label>
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      value={customDiagnosis}
                      onChange={e => setCustomDiagnosis(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleAddCustom()}
                      placeholder="Име или МКБ код..." 
                      className="mp-input flex-1 h-12"
                    />
                    <button onClick={handleAddCustom} className="mp-btn-primary h-12 px-6">ДОБАВИ</button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-12 pt-8 border-t border-mp-border flex items-center justify-between flex-wrap gap-4">
            <Link to="/session/$appointmentId/status" params={{ appointmentId }} className="mp-btn-ghost h-14 px-8 text-decoration-none inline-flex items-center">
              ← НАЗАД КЪМ ПРЕГЛЕД
            </Link>
            <div className="flex items-center gap-4">
              {saveMsg && <span className="text-sm font-bold text-mp-green-dark">{saveMsg}</span>}
              <button 
                onClick={handleProceedToTherapy}
                className="mp-btn-primary h-14 px-12 text-decoration-none inline-flex items-center shadow-lg shadow-mp-green/20"
              >
                ПРОДЪЛЖИ КЪМ ТЕРАПИЯ →
              </button>
            </div>
          </div>
        </div>

        <div className="h-20" />
      </main>
    </div>
  )
}
