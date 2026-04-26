import { createFileRoute, useNavigate, Link } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import * as React from 'react'
import { useAudioRecorder } from '../../hooks/useAudioRecorder'
import {
  deleteLocalRecording,
  getLocalObjectUrl,
  listLocalRecordings,
  saveLocalRecording,
  type LocalRecording,
} from '../../utils/localRecordings'
import {
  deleteRecordingFn,
  listRecordingsFn,
  uploadRecordingFn,
  type RecordingMeta,
} from '../../utils/recordings'
import { listPatientsFn, type Patient } from '../../utils/patients'
import { createAppointmentFn } from '../../utils/appointments'
import { transcribeAudioFn, analyzeConsultationFn, retryAnalysisFn } from '../../utils/ai'
import { RecordingCard } from '../../components/RecordingCard'
import { blobToBase64, formatDuration } from '../../utils/audio'
import { AppSidebar } from '../../components/AppSidebar'
import { logoutFn } from '../logout'

export const Route = createFileRoute('/_authed/recordings')({
  component: RecordingsPage,
})

function RecorderWidget({
  patients,
  onSaved,
}: {
  patients: Patient[]
  onSaved: () => void
}) {
  const { status, durationSeconds, audioBlob, audioUrl, start, stop, pause, resume, reset, error } =
    useAudioRecorder()
  // navigate removed — we stay on this page after save
  const doUpload = useServerFn(uploadRecordingFn)
  const doCreateAppointment = useServerFn(createAppointmentFn)
  const doTranscribe = useServerFn(transcribeAudioFn)
  const doAnalyze = useServerFn(analyzeConsultationFn)

  const [saving, setSaving] = React.useState(false)
  const [processingState, setProcessingState] = React.useState<string | null>(null)
  const [saveError, setSaveError] = React.useState<string | null>(null)
  const [recordingName, setRecordingName] = React.useState('')
  const [selectedPatientId, setSelectedPatientId] = React.useState<string>('')

  const isRecording = status === 'recording'
  const isPaused = status === 'paused'
  const isDone = status === 'stopped'

  const [savedSessionId, setSavedSessionId] = React.useState<string | null>(null)

  const handleSave = async () => {
    if (!audioBlob) return
    setSaving(true)
    setSaveError(null)
    setSavedSessionId(null)
    const name = recordingName.trim() || `Запис ${new Date().toLocaleString('bg-BG')}`

    try {
      setProcessingState('Качване...')
      const base64 = await blobToBase64(audioBlob)
      
      let appointmentId: string | undefined = undefined

      if (selectedPatientId) {
        setProcessingState('Създаване на сесия...')
        const aptRes = await doCreateAppointment({ data: { patientId: selectedPatientId } })
        if (aptRes.error) throw new Error(aptRes.message)
        appointmentId = aptRes.appointmentId
      }

      const result = await doUpload({
        data: {
          base64,
          mimeType: audioBlob.type,
          name,
          duration: durationSeconds,
          size: audioBlob.size,
          appointmentId,
          patientId: selectedPatientId
        },
      })

      if (result.error) {
        console.error('[recordings] Upload failed:', result.message)
        await saveLocalRecording(audioBlob, name, durationSeconds)
        setSaveError(`Запазено локално (грешка: ${result.message})`)
        setSaving(false)
        setProcessingState(null)
        onSaved()
        return
      }

      // If a patient is selected, run the AI pipeline
      if (appointmentId && selectedPatientId) {
        setProcessingState('Транскрибиране...')
        const transRes = await doTranscribe({
          data: { base64, mimeType: audioBlob.type }
        })
        if (!transRes.error && transRes.transcript) {
          setProcessingState('Анализ...')
          await doAnalyze({
            data: {
              appointmentId,
              patientId: selectedPatientId,
              transcript: transRes.transcript
            }
          })
        }
        // Store the session ID so user can navigate manually
        setSavedSessionId(appointmentId)
      }

    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error'
      console.error('[recordings] Unexpected error:', err)
      try {
        await saveLocalRecording(audioBlob, name, durationSeconds)
        setSaveError(`Запазено локално (грешка: ${msg})`)
      } catch {
        setSaveError(`Грешка при записване: ${msg}`)
      }
      setSaving(false)
      setProcessingState(null)
      onSaved()
      return
    }

    setSaving(false)
    setProcessingState(null)
    reset()
    setRecordingName('')
    setSelectedPatientId('')
    onSaved()
  }

  return (
    <div className="mp-card p-8 mb-8 text-center flex flex-col items-center">
      {/* Mic / stop button */}
      <div className="flex flex-col items-center gap-4">
        <div className="relative">
          {isRecording && (
            <>
              <span className="absolute inset-0 rounded-full animate-ping" style={{ background: 'hsl(0 70% 45% / 0.2)' }} />
              <span className="absolute -inset-3 rounded-full animate-pulse" style={{ background: 'hsl(0 70% 45% / 0.08)' }} />
            </>
          )}
          <button
            type="button"
            onClick={isRecording ? stop : start}
            disabled={saving || processingState !== null}
            style={{
              position: 'relative',
              width: 110,
              height: 110,
              borderRadius: '2rem',
              border: '1.5px solid rgba(255,255,255,0.2)',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 4,
              transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
              ...(isRecording
                ? {
                    background: 'linear-gradient(135deg, hsl(0 70% 45%), hsl(0 70% 35%))',
                    color: '#fff',
                    boxShadow: '0 20px 40px -10px hsl(0 70% 45% / 0.4), inset 0 0 20px rgba(0,0,0,0.1)',
                    transform: 'scale(1.05)',
                  }
                : {
                    background: 'linear-gradient(135deg, hsl(142 72% 26%), hsl(142 72% 20%))',
                    color: '#fff',
                    boxShadow: '0 20px 40px -10px hsl(142 72% 26% / 0.4), inset 0 0 20px rgba(0,0,0,0.1)',
                  }),
              ...(saving || processingState ? { opacity: 0.5, cursor: 'not-allowed', filter: 'grayscale(0.5)' } : {}),
            }}
          >
            {isRecording ? (
              <svg width="36" height="36" viewBox="0 0 24 24" fill="currentColor">
                <rect x="6" y="6" width="12" height="12" rx="2" />
              </svg>
            ) : (
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
              </svg>
            )}
            <span style={{ fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.06em' }}>
              {isRecording ? 'СТОП' : 'ЗАПИС'}
            </span>
          </button>
        </div>
        
        {isRecording && (
          <span className="animate-pulse" style={{ fontSize: '0.75rem', fontWeight: 600, color: 'hsl(0 70% 45%)' }}>
            Слушам… ({durationSeconds}с)
          </span>
        )}

        <div style={{ fontSize: '1.5rem', fontWeight: 700, fontFamily: 'monospace', color: 'hsl(214 55% 12%)', letterSpacing: '0.05em' }}>
          {formatDuration(durationSeconds)}
        </div>

        {!isRecording && !isPaused && !isDone && !processingState && (
          <p style={{ fontSize: '0.8125rem', color: 'hsl(214 20% 42%)', margin: 0 }}>
            Натиснете бутона за да започнете запис
          </p>
        )}
        
        {isRecording && (
          <div className="flex gap-4 mt-1">
            <button onClick={pause} className="mp-btn-outline" style={{ height: 40, padding: '0 1.5rem', fontSize: '0.875rem', borderRadius: '2rem' }}>Пауза</button>
          </div>
        )}
        {isPaused && (
          <div className="flex gap-4 mt-1">
            <button onClick={resume} className="mp-btn-primary" style={{ height: 40, padding: '0 1.5rem', fontSize: '0.875rem', borderRadius: '2rem' }}>Продължи</button>
            <button onClick={stop} className="mp-btn-outline" style={{ height: 40, padding: '0 1.5rem', fontSize: '0.875rem', borderRadius: '2rem', borderColor: 'hsl(0 70% 45%)', color: 'hsl(0 70% 45%)' }}>Край</button>
          </div>
        )}
      </div>

      {error && <div className="mt-4 text-sm text-mp-danger font-medium">{error}</div>}
      {saveError && <div className="mt-4 text-sm text-mp-danger font-medium">{saveError}</div>}
      {processingState && <div className="mt-4 text-sm text-mp-green-dark font-bold animate-pulse">{processingState}</div>}

      {/* Success banner after save */}
      {savedSessionId && !isDone && (
        <div className="mt-6 w-full max-w-md mx-auto p-5 rounded-2xl bg-mp-green-light border border-mp-green/20">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-full bg-mp-green flex items-center justify-center text-white">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3}><path d="M20 6L9 17l-5-5"/></svg>
            </div>
            <p className="text-sm font-bold text-mp-green-dark">Записът е запазен успешно!</p>
          </div>
          <Link
            to="/session/$appointmentId/results"
            params={{ appointmentId: savedSessionId }}
            className="mp-btn-primary h-10 px-6 text-sm inline-flex items-center gap-2 text-decoration-none"
          >
            Виж анализа и обобщението →
          </Link>
        </div>
      )}

      {isDone && !saving && !processingState && (
        <div className="mt-8 w-full max-w-md mx-auto text-left flex flex-col gap-5">
          {audioUrl && (
            <div className="p-4 bg-mp-bg rounded-2xl border border-mp-border">
              <audio src={audioUrl} controls className="w-full" />
            </div>
          )}

          <div>
            <label className="mp-label mb-2 block">ИМЕ НА ЗАПИСА</label>
            <input
              className="mp-input w-full h-12"
              value={recordingName}
              onChange={(e) => setRecordingName(e.target.value)}
              placeholder="напр. Консултация с Иван..."
            />
          </div>

          <div>
            <label className="mp-label mb-2 block">СВЪРЖИ С ПАЦИЕНТ (ОПЦИОНАЛНО)</label>
            <select
              className="mp-input w-full h-12"
              value={selectedPatientId}
              onChange={(e) => setSelectedPatientId(e.target.value)}
            >
              <option value="">Без пациент</option>
              {patients.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.first_name} {p.last_name}
                </option>
              ))}
            </select>
            {selectedPatientId && (
              <p className="mt-2 text-xs text-mp-text-muted italic">Избирането на пациент автоматично ще създаде преглед и ще стартира AI анализ.</p>
            )}
          </div>

          <div className="flex gap-3 pt-2">
            <button onClick={handleSave} className="mp-btn-primary flex-1 h-12">
              ЗАПАЗИ
            </button>
            <button onClick={() => { reset(); setSavedSessionId(null) }} className="mp-btn-outline h-12 px-6">
              ИЗТРИЙ
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function RecordingsPage() {
  const { user } = Route.useRouteContext()
  const doLogout = useServerFn(logoutFn)
  const doListRecs = useServerFn(listRecordingsFn)
  const doDeleteRec = useServerFn(deleteRecordingFn)
  const doListPatients = useServerFn(listPatientsFn)
  const doRetry = useServerFn(retryAnalysisFn)
  const navigate = useNavigate()

  const [cloudRecordings, setCloudRecordings] = React.useState<RecordingMeta[]>([])
  const [localRecordings, setLocalRecordings] = React.useState<LocalRecording[]>([])
  const [patients, setPatients] = React.useState<Patient[]>([])
  const [loading, setLoading] = React.useState(true)
  const [retryingId, setRetryingId] = React.useState<string | null>(null)

  const loadAll = React.useCallback(async () => {
    setLoading(true)
    const [cRes, lRes, pRes] = await Promise.all([
      doListRecs().catch(() => [] as RecordingMeta[]),
      listLocalRecordings(),
      doListPatients().catch(() => [] as Patient[])
    ])
    setCloudRecordings(Array.isArray(cRes) ? cRes : [])
    setLocalRecordings(lRes)
    setPatients(Array.isArray(pRes) ? pRes : [])
    setLoading(false)
  }, [doListRecs, doListPatients])

  React.useEffect(() => {
    loadAll()
  }, [loadAll])

  const handleDeleteCloud = async (id: string, storagePath?: string) => {
    if (!window.confirm('Изтриване на записа?')) return
    const res = await doDeleteRec({ data: { id, storagePath } })
    if (res.error) alert(res.message)
    else loadAll()
  }

  const handleDeleteLocal = async (id: string) => {
    if (!window.confirm('Изтриване на локалния запис?')) return
    await deleteLocalRecording(id)
    loadAll()
  }

  const handleRetry = async (recordingId: string, appointmentId: string) => {
    setRetryingId(recordingId)
    try {
      const res = await doRetry({ data: { appointmentId } })
      if (res.error) {
        alert(`Анализът не бе успешен: ${res.message}`)
      }
    } catch (err: any) {
      alert(`Грешка: ${err.message}`)
    } finally {
      setRetryingId(null)
      loadAll()
    }
  }

  return (
    <div className="mp-layout">
      <AppSidebar user={user} onLogout={() => doLogout().then(() => navigate({ to: '/login' }))} />
      <main className="mp-main">
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          
          <div className="mb-8">
            <h1 className="text-4xl font-extrabold text-mp-text tracking-tight">Гласови записи</h1>
            <p className="text-mp-text-muted mt-2 text-lg">Записвайте консултации директно или преглеждайте предишни записи.</p>
          </div>

          <RecorderWidget patients={patients} onSaved={loadAll} />

          {loading ? (
            <div className="flex justify-center items-center py-20">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-mp-green"></div>
            </div>
          ) : (
            <div className="space-y-12">
              
              {/* Cloud Recordings */}
              <div>
                <h2 className="text-xl font-bold text-mp-text mb-6 flex items-center gap-2">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-mp-green"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
                  Облачни записи
                </h2>
                {cloudRecordings.length === 0 ? (
                  <div className="mp-card p-12 text-center border-dashed">
                    <p className="text-mp-text-subtle font-medium text-sm">Няма запазени облачни записи.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {cloudRecordings.map(rec => (
                      <RecordingCard
                        key={rec.id}
                        recording={rec}
                        onDelete={() => handleDeleteCloud(rec.id, rec.storage_path)}
                        onRetryAnalysis={handleRetry}
                        isRetrying={retryingId === rec.id}
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* Local Recordings */}
              {localRecordings.length > 0 && (
                <div>
                  <div className="flex items-center gap-3 mb-6">
                    <h2 className="text-xl font-bold text-mp-text flex items-center gap-2">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-mp-warn"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
                      Локални записи
                    </h2>
                    <span className="bg-mp-warn-bg text-mp-warn-dark text-[10px] font-extrabold px-2 py-0.5 rounded uppercase tracking-widest">Офлайн</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {localRecordings.map(lRec => (
                      <div key={lRec.id} className="mp-card p-6 border-mp-warn/20 bg-mp-warn-bg/30">
                        <div className="flex items-start justify-between mb-4">
                          <div>
                            <h3 className="font-bold text-mp-text">{lRec.name}</h3>
                            <p className="text-[11px] text-mp-text-subtle mt-1">{new Date(lRec.createdAt).toLocaleString('bg-BG')}</p>
                          </div>
                          <button
                            onClick={() => handleDeleteLocal(lRec.id)}
                            className="text-mp-text-subtle hover:text-mp-danger transition-colors"
                          >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                          </button>
                        </div>
                        <div className="bg-white/50 p-3 rounded-xl">
                          <audio src={getLocalObjectUrl(lRec)} controls className="w-full h-8" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>
          )}

        </div>
        <div className="h-20" />
      </main>
    </div>
  )
}
