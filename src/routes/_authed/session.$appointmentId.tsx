import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import * as React from 'react'
import { useAudioRecorder } from '../../hooks/useAudioRecorder'
import { getAppointmentFn } from '../../utils/appointments'
import { transcribeAudioFn, analyzeConsultationFn } from '../../utils/ai'

export const Route = createFileRoute('/_authed/session/$appointmentId')({
  component: SessionPage,
})

function formatDuration(s: number) {
  const m = Math.floor(s / 60)
  const sec = s % 60
  return `${m}:${String(sec).padStart(2, '0')}`
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      resolve(result.split(',')[1])
    }
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

function SessionPage() {
  const { appointmentId } = Route.useParams()
  const navigate = useNavigate()
  
  const doGetAppointment = useServerFn(getAppointmentFn)
  const doTranscribe = useServerFn(transcribeAudioFn)
  const doAnalyze = useServerFn(analyzeConsultationFn)

  const [appointment, setAppointment] = React.useState<any>(null)
  const [loading, setLoading] = React.useState(true)

  const { status, durationSeconds, audioBlob, start, stop, pause, resume, reset, error: recorderError } = useAudioRecorder()

  const [processingState, setProcessingState] = React.useState<'idle' | 'transcribing' | 'analyzing' | 'done'>('idle')
  const [processError, setProcessError] = React.useState<string | null>(null)

  const isRecording = status === 'recording'
  const isPaused = status === 'paused'
  const isDone = status === 'stopped'

  React.useEffect(() => {
    async function load() {
      const res = await doGetAppointment({ data: { appointmentId } })
      if (!res.error && res.appointment) {
        setAppointment(res.appointment)
      }
      setLoading(false)
    }
    load()
  }, [appointmentId, doGetAppointment])

  const handleFinishAndAnalyze = async () => {
    if (!audioBlob) return
    setProcessError(null)
    
    try {
      // 1. Transcribe
      setProcessingState('transcribing')
      const base64 = await blobToBase64(audioBlob)
      const transRes = await doTranscribe({
        data: { base64, mimeType: audioBlob.type }
      })

      if (transRes.error || !transRes.transcript) {
        throw new Error(transRes.message || 'Transcription failed')
      }

      // 2. Analyze
      setProcessingState('analyzing')
      const analyzeRes = await doAnalyze({
        data: {
          appointmentId,
          patientId: appointment.patient_id,
          transcript: transRes.transcript
        }
      })

      if (analyzeRes.error) {
        throw new Error(analyzeRes.message || 'Analysis failed')
      }

      setProcessingState('done')
      
      // Navigate back to patient profile to see results
      navigate({ to: '/patients/$patientId', params: { patientId: appointment.patient_id } })

    } catch (err: any) {
      console.error(err)
      setProcessError(err.message || 'An error occurred during processing')
      setProcessingState('idle')
    }
  }

  if (loading) {
    return (
      <div className="min-h-[calc(100dvh-3.5rem)] bg-gray-950 flex items-center justify-center">
        <svg className="animate-spin w-8 h-8 text-violet-400" fill="none" viewBox="0 0 24 24">
           <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
           <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
        </svg>
      </div>
    )
  }

  if (!appointment) {
    return (
      <div className="min-h-[calc(100dvh-3.5rem)] bg-gray-950 flex flex-col items-center justify-center">
        <h1 className="text-xl text-white">Appointment not found</h1>
      </div>
    )
  }

  return (
    <div className="min-h-[calc(100dvh-3.5rem)] bg-gray-950 relative py-10 px-4">
      {/* Ambient background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden -z-0">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-red-600/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-violet-600/5 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 max-w-2xl mx-auto">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold text-white tracking-tight">Active Consultation</h1>
          <p className="text-gray-400 mt-2">
            Patient: <span className="text-white font-medium">{appointment.patients.first_name} {appointment.patients.last_name}</span>
          </p>
        </div>

        <div className="bg-white/4 border border-white/8 rounded-3xl p-8 flex flex-col items-center backdrop-blur-sm">
          
          {processingState !== 'idle' ? (
            <div className="flex flex-col items-center justify-center py-12">
              <svg className="animate-spin w-12 h-12 text-violet-500 mb-6" fill="none" viewBox="0 0 24 24">
                 <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                 <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
              </svg>
              <h3 className="text-xl font-bold text-white mb-2">
                {processingState === 'transcribing' ? 'Transcribing Audio...' : 
                 processingState === 'analyzing' ? 'AI Analyzing Consultation...' : 'Finishing up...'}
              </h3>
              <p className="text-sm text-gray-400 text-center max-w-xs">
                Please wait while MediScribe extracts medical entities and generates recommendations.
              </p>
            </div>
          ) : (
            <>
              {/* Mic Button */}
              <div className="relative mb-6">
                {isRecording && (
                  <>
                    <span className="absolute inset-0 rounded-full bg-red-500/30 animate-ping" />
                    <span className="absolute inset-[-12px] rounded-full bg-red-500/10 animate-pulse" />
                  </>
                )}
                <button
                  onClick={async () => {
                    if (isDone) return
                    if (!isRecording && !isPaused) await start()
                    else if (isRecording) pause()
                    else if (isPaused) resume()
                  }}
                  disabled={isDone}
                  className={`relative w-28 h-28 rounded-full flex items-center justify-center transition-all duration-300 shadow-2xl active:scale-95 disabled:opacity-50 ${
                    isRecording
                      ? 'bg-red-500 hover:bg-red-400 shadow-red-500/40'
                      : isPaused
                      ? 'bg-amber-500 hover:bg-amber-400 shadow-amber-500/40'
                      : 'bg-gradient-to-br from-violet-600 to-cyan-600 hover:from-violet-500 hover:to-cyan-500 shadow-violet-500/30'
                  }`}
                >
                  {isRecording ? (
                    <svg className="w-10 h-10 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" /></svg>
                  ) : isPaused ? (
                    <svg className="w-10 h-10 text-white ml-1" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7L8 5z" /></svg>
                  ) : (
                    <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
                    </svg>
                  )}
                </button>
              </div>

              {/* Status */}
              <div className="h-8 flex items-center justify-center mb-8">
                {(isRecording || isPaused || isDone) ? (
                  <div className="flex items-center gap-3">
                    {isRecording && <span className="w-2.5 h-2.5 rounded-full bg-red-400 animate-pulse" />}
                    {isPaused && <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />}
                    <span className="text-2xl font-mono tabular-nums text-white font-light tracking-wider">
                      {formatDuration(durationSeconds)}
                    </span>
                  </div>
                ) : (
                  <p className="text-gray-500">Tap to start the consultation</p>
                )}
              </div>

              {recorderError && <p className="text-red-400 mb-4">{recorderError}</p>}
              {processError && <p className="text-red-400 mb-4 bg-red-500/10 p-3 rounded-xl border border-red-500/20">{processError}</p>}

              {/* Controls */}
              <div className="w-full max-w-sm flex flex-col gap-3">
                {!isDone && (isRecording || isPaused) && (
                  <button
                    onClick={stop}
                    className="w-full py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white border border-white/10 transition-colors font-medium"
                  >
                    End Consultation
                  </button>
                )}

                {isDone && (
                  <div className="flex gap-3">
                    <button
                      onClick={reset}
                      className="flex-1 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 border border-white/10 transition-colors font-medium"
                    >
                      Discard & Retry
                    </button>
                    <button
                      onClick={handleFinishAndAnalyze}
                      className="flex-[2] py-3 rounded-xl bg-gradient-to-r from-violet-600 to-cyan-600 hover:from-violet-500 hover:to-cyan-500 text-white font-bold transition-all shadow-lg shadow-violet-500/25"
                    >
                      Analyze Recording
                    </button>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
