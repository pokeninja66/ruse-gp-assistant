import { createFileRoute } from '@tanstack/react-router'
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

export const Route = createFileRoute('/_authed/recordings')({
  component: RecordingsPage,
})

// Removed local RecordingCard and helpers in favor of src/components/RecordingCard.tsx

// ── Recorder widget ───────────────────────────────────────────────────────────

function RecorderWidget({
  patients,
  onSaved,
}: {
  patients: Patient[]
  onSaved: () => void
}) {
  const { status, durationSeconds, audioBlob, audioUrl, start, stop, pause, resume, reset, error } =
    useAudioRecorder()
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

  const handleSave = async () => {
    if (!audioBlob) return
    setSaving(true)
    setSaveError(null)
    const name = recordingName.trim() || `Recording ${new Date().toLocaleString()}`

    try {
      setProcessingState('Uploading...')
      const base64 = await blobToBase64(audioBlob)
      
      let appointmentId: string | undefined = undefined

      if (selectedPatientId) {
        setProcessingState('Creating Session...')
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
          appointmentId
        },
      })

      if (result.error) {
        console.error('[recordings] Upload failed:', result.message)
        await saveLocalRecording(audioBlob, name, durationSeconds)
        setSaveError(`Saved locally (cloud error: ${result.message})`)
        setSaving(false)
        setProcessingState(null)
        onSaved()
        return
      }

      // If a patient is selected, run the AI pipeline
      if (appointmentId && selectedPatientId) {
        setProcessingState('Transcribing Audio...')
        const transRes = await doTranscribe({
          data: { base64, mimeType: audioBlob.type }
        })
        if (!transRes.error && transRes.transcript) {
          setProcessingState('AI Analyzing...')
          await doAnalyze({
            data: {
              appointmentId,
              patientId: selectedPatientId,
              transcript: transRes.transcript
            }
          })
        }
      }

    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error'
      console.error('[recordings] Unexpected error:', err)
      try {
        await saveLocalRecording(audioBlob, name, durationSeconds)
        setSaveError(`Saved locally (error: ${msg})`)
      } catch {
        setSaveError(`Could not save recording: ${msg}`)
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
    <div className="mb-8 p-6 rounded-2xl bg-white/4 border border-white/8">
      {/* Mic / stop button */}
      <div className="flex flex-col items-center gap-4">
        <div className="relative">
          {isRecording && (
            <>
              <span className="absolute inset-0 rounded-full bg-red-500/30 animate-ping" />
              <span className="absolute inset-[-8px] rounded-full bg-red-500/10 animate-pulse" />
            </>
          )}
          <button
            id="record-btn"
            onClick={async () => {
              if (isDone) return
              if (!isRecording && !isPaused) await start()
              else if (isRecording) pause()
              else if (isPaused) resume()
            }}
            disabled={isDone || saving}
            className={`relative w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300 shadow-2xl active:scale-95 disabled:opacity-50 ${
              isRecording
                ? 'bg-red-500 hover:bg-red-400 shadow-red-500/40'
                : isPaused
                ? 'bg-amber-500 hover:bg-amber-400 shadow-amber-500/40'
                : 'bg-gradient-to-br from-violet-600 to-cyan-600 hover:from-violet-500 hover:to-cyan-500 shadow-violet-500/30'
            }`}
          >
            {isRecording ? (
              // Pause icon
              <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
              </svg>
            ) : isPaused ? (
              // Resume icon
              <svg className="w-7 h-7 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7L8 5z" />
              </svg>
            ) : (
              // Mic icon
              <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
              </svg>
            )}
          </button>
        </div>

        {/* Status line */}
        {(isRecording || isPaused) && (
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${isRecording ? 'bg-red-400 animate-pulse' : 'bg-amber-400'}`} />
            <span className="text-sm font-mono tabular-nums text-gray-300">
              {formatDuration(durationSeconds)}
            </span>
            <span className="text-sm text-gray-500">
              {isRecording ? 'Recording…' : 'Paused'}
            </span>
          </div>
        )}

        {!isRecording && !isPaused && !isDone && (
          <p className="text-sm text-gray-500">Tap to start recording</p>
        )}

        {error && (
          <p className="text-sm text-red-400">{error}</p>
        )}

        {/* Stop + Save controls */}
        {(isRecording || isPaused || isDone) && (
          <div className="w-full flex flex-col gap-3 mt-2">
            {/* Stop button (only while recording/paused) */}
            {!isDone && (
              <button
                onClick={stop}
                className="w-full py-2 rounded-xl bg-white/8 hover:bg-white/12 text-sm text-gray-300 border border-white/10 transition-all"
              >
                Stop recording
              </button>
            )}

            {/* Save flow */}
            {isDone && (
              <>
                {/* Preview */}
                {audioUrl && (
                  <audio controls src={audioUrl} className="w-full h-9 rounded-lg" />
                )}
                <div className="flex flex-col gap-2">
                  <input
                    type="text"
                    placeholder="Name this recording…"
                    value={recordingName}
                    onChange={(e) => setRecordingName(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-gray-800 border border-white/10 text-white placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/60 transition"
                  />
                  <select
                    value={selectedPatientId}
                    onChange={(e) => setSelectedPatientId(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-gray-800 border border-white/10 text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/60 transition appearance-none"
                  >
                    <option value="">Unassigned Recording (Standalone)</option>
                    {patients.map(p => (
                      <option key={p.id} value={p.id}>{p.first_name} {p.last_name}</option>
                    ))}
                  </select>
                </div>
                {saveError && <p className="text-sm text-red-400">{saveError}</p>}
                <div className="flex gap-2">
                  <button
                    onClick={reset}
                    className="flex-1 py-2 rounded-xl bg-white/6 hover:bg-white/10 text-sm text-gray-400 border border-white/10 transition-all"
                  >
                    Discard
                  </button>
                  <button
                    id="save-recording-btn"
                    onClick={handleSave}
                    disabled={saving}
                    className="flex-1 py-2 rounded-xl bg-gradient-to-r from-violet-600 to-cyan-600 hover:from-violet-500 hover:to-cyan-500 text-white text-sm font-medium transition-all shadow-lg shadow-violet-500/20 disabled:opacity-50"
                  >
                    {saving ? (processingState || 'Saving…') : (selectedPatientId ? 'Save & Analyze' : 'Save')}
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

function RecordingsPage() {
  const { user } = Route.useRouteContext()
  const doList = useServerFn(listRecordingsFn)
  const doListPatients = useServerFn(listPatientsFn)
  const doDelete = useServerFn(deleteRecordingFn)
  const doRetry = useServerFn(retryAnalysisFn)

  const [cloudRecs, setCloudRecs] = React.useState<RecordingMeta[]>([])
  const [localRecs, setLocalRecs] = React.useState<LocalRecording[]>([])
  const [localUrls, setLocalUrls] = React.useState<Record<string, string>>({})
  const [patients, setPatients] = React.useState<Patient[]>([])
  const [loading, setLoading] = React.useState(true)
  const [retryingId, setRetryingId] = React.useState<string | null>(null)

  const loadAll = React.useCallback(async () => {
    setLoading(true)
    const [cloud, local, pats] = await Promise.all([
      doList().catch(() => [] as RecordingMeta[]),
      listLocalRecordings().catch(() => [] as LocalRecording[]),
      doListPatients().catch(() => [] as Patient[]),
    ])
    setCloudRecs(cloud)
    setLocalRecs(local)
    setPatients(pats)

    // Create object URLs for local blobs
    const urls: Record<string, string> = {}
    local.forEach((r) => {
      urls[r.id] = getLocalObjectUrl(r)
    })
    setLocalUrls(urls)
    setLoading(false)
  }, [doList, doListPatients])

  React.useEffect(() => {
    loadAll()
    return () => {
      // Clean up object URLs
      Object.values(localUrls).forEach((u) => URL.revokeObjectURL(u))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleDeleteCloud = async (id: string, storagePath?: string) => {
    await doDelete({ data: { id, storagePath } })
    setCloudRecs((prev) => prev.filter((r) => r.id !== id))
  }

  const handleDeleteLocal = async (id: string) => {
    if (localUrls[id]) URL.revokeObjectURL(localUrls[id])
    await deleteLocalRecording(id)
    setLocalRecs((prev) => prev.filter((r) => r.id !== id))
    setLocalUrls((prev) => {
      const next = { ...prev }
      delete next[id]
      return next
    })
  }

  const handleRetry = async (recordingId: string, appointmentId: string) => {
    setRetryingId(recordingId)
    try {
      const res = await doRetry({ data: { appointmentId } })
      if (res.error) {
        alert(`Analysis failed: ${res.message}`)
      } else {
        alert('Analysis complete!')
      }
    } catch (err: any) {
      alert(`Error: ${err.message}`)
    } finally {
      setRetryingId(null)
      loadAll()
    }
  }

  const totalCount = cloudRecs.length + localRecs.length

  return (
    <div className="min-h-[calc(100dvh-3.5rem)] bg-gray-950">
      {/* Ambient */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden -z-0">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-violet-600/8 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-cyan-600/6 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 max-w-3xl mx-auto px-4 py-10">
        {/* Page header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white tracking-tight">Recordings</h1>
          <p className="text-sm text-gray-500 mt-1">
            {user?.email} · {totalCount} recording{totalCount !== 1 ? 's' : ''}
          </p>
        </div>

        {/* Recorder */}
        <RecorderWidget patients={patients} onSaved={loadAll} />

        {/* List */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Saved recordings
            </h2>
            <span className="text-xs text-gray-600">{totalCount} total</span>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16">
              <svg className="animate-spin w-6 h-6 text-violet-400" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
              </svg>
            </div>
          ) : totalCount === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-14 h-14 rounded-2xl bg-white/4 border border-white/8 flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
                </svg>
              </div>
              <p className="text-gray-500 text-sm">No recordings yet</p>
              <p className="text-gray-600 text-xs mt-1">Tap the mic above to get started</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {cloudRecs.map((rec) => (
                <RecordingCard
                  key={rec.id}
                  name={rec.name}
                  duration={rec.duration}
                  size={rec.size}
                  createdAt={rec.created_at}
                  localOnly={false}
                  publicUrl={rec.publicUrl}
                  appointmentId={rec.appointment_id}
                  patientName={rec.patient_name}
                  onDelete={() => handleDeleteCloud(rec.id, rec.storage_path)}
                  onRetry={rec.appointment_id ? () => handleRetry(rec.id, rec.appointment_id!) : undefined}
                />
              ))}
              {localRecs.map((rec) => (
                <RecordingCard
                  key={rec.id}
                  name={rec.name}
                  duration={rec.duration}
                  size={rec.size}
                  createdAt={rec.createdAt}
                  localOnly
                  audioUrl={localUrls[rec.id]}
                  onDelete={() => handleDeleteLocal(rec.id)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
