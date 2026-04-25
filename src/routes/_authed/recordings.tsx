import { createFileRoute } from '@tanstack/react-router'
import * as React from 'react'

export const Route = createFileRoute('/_authed/recordings')({
  component: RecordingsPage,
})

// ── Placeholder recording data (will be replaced by real data later) ──
const PLACEHOLDER_RECORDINGS = [
  {
    id: '1',
    name: 'Morning standup notes',
    duration: 187,
    size: 2_400_000,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2),
    localOnly: false,
  },
  {
    id: '2',
    name: 'Patient interview – session 3',
    duration: 643,
    size: 8_200_000,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 26),
    localOnly: false,
  },
  {
    id: '3',
    name: 'Quick voice memo',
    duration: 34,
    size: 440_000,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 50),
    localOnly: true,
  },
]

function formatDuration(seconds: number) {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

function formatSize(bytes: number) {
  if (bytes < 1_000_000) return `${(bytes / 1000).toFixed(0)} KB`
  return `${(bytes / 1_000_000).toFixed(1)} MB`
}

function timeAgo(date: Date) {
  const diff = (Date.now() - date.getTime()) / 1000
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

function RecordingCard({
  rec,
}: {
  rec: (typeof PLACEHOLDER_RECORDINGS)[number]
}) {
  const [playing, setPlaying] = React.useState(false)

  return (
    <div className="group relative flex items-center gap-4 p-4 rounded-2xl bg-white/4 border border-white/8 hover:bg-white/6 hover:border-white/14 transition-all duration-200">
      {/* Play button */}
      <button
        onClick={() => setPlaying((p) => !p)}
        className="shrink-0 w-11 h-11 rounded-full flex items-center justify-center bg-gradient-to-br from-violet-600/80 to-cyan-600/80 hover:from-violet-500 hover:to-cyan-500 transition-all shadow-lg shadow-violet-500/20 hover:shadow-violet-500/40 hover:scale-105 active:scale-95"
      >
        {playing ? (
          <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
            <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
          </svg>
        ) : (
          <svg className="w-4 h-4 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M8 5v14l11-7L8 5z" />
          </svg>
        )}
      </button>

      {/* Waveform placeholder */}
      <div className="shrink-0 flex items-center gap-px h-8">
        {Array.from({ length: 28 }).map((_, i) => {
          const h = 20 + Math.sin((i * 1.8) + parseInt(rec.id)) * 14 + Math.cos(i * 0.9) * 8
          return (
            <div
              key={i}
              className={`w-0.5 rounded-full transition-colors ${
                playing ? 'bg-violet-400' : 'bg-white/25'
              }`}
              style={{ height: `${Math.max(4, Math.min(32, h))}px` }}
            />
          )
        })}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-white truncate">{rec.name}</p>
        <p className="text-xs text-gray-500 mt-0.5">
          {timeAgo(rec.createdAt)} · {formatDuration(rec.duration)} · {formatSize(rec.size)}
        </p>
      </div>

      {/* Badges + actions */}
      <div className="flex items-center gap-2 shrink-0">
        {rec.localOnly && (
          <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/20">
            Local
          </span>
        )}
        <button className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-all">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
          </svg>
        </button>
      </div>
    </div>
  )
}

function RecordingsPage() {
  const { user } = Route.useRouteContext()
  const [isRecording, setIsRecording] = React.useState(false)
  const [recordingTime, setRecordingTime] = React.useState(0)
  const timerRef = React.useRef<ReturnType<typeof setInterval> | null>(null)

  const startRecording = () => {
    setIsRecording(true)
    setRecordingTime(0)
    timerRef.current = setInterval(() => setRecordingTime((t) => t + 1), 1000)
  }

  const stopRecording = () => {
    setIsRecording(false)
    if (timerRef.current) clearInterval(timerRef.current)
    timerRef.current = null
    setRecordingTime(0)
  }

  React.useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [])

  return (
    <div className="min-h-[calc(100dvh-3.5rem)] bg-gray-950">
      {/* Ambient background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden -z-0">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-violet-600/8 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-cyan-600/6 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 max-w-3xl mx-auto px-4 py-10">
        {/* Page header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white tracking-tight">Recordings</h1>
          <p className="text-sm text-gray-500 mt-1">
            {user?.email} · {PLACEHOLDER_RECORDINGS.length} recordings
          </p>
        </div>

        {/* Recorder card */}
        <div className="mb-8 p-6 rounded-2xl bg-white/4 border border-white/8 flex flex-col items-center gap-5">
          {/* Animated mic button */}
          <div className="relative">
            {isRecording && (
              <>
                <span className="absolute inset-0 rounded-full bg-red-500/30 animate-ping" />
                <span className="absolute inset-[-8px] rounded-full bg-red-500/10 animate-pulse" />
              </>
            )}
            <button
              id="record-btn"
              onClick={isRecording ? stopRecording : startRecording}
              className={`relative w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300 shadow-2xl active:scale-95 ${
                isRecording
                  ? 'bg-red-500 hover:bg-red-400 shadow-red-500/40'
                  : 'bg-gradient-to-br from-violet-600 to-cyan-600 hover:from-violet-500 hover:to-cyan-500 shadow-violet-500/30 hover:shadow-violet-500/50'
              }`}
            >
              {isRecording ? (
                <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <rect x="6" y="6" width="12" height="12" rx="2" />
                </svg>
              ) : (
                <svg
                  className="w-7 h-7 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z"
                  />
                </svg>
              )}
            </button>
          </div>

          {/* Status text */}
          {isRecording ? (
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />
              <span className="text-sm font-mono text-red-400 tabular-nums">
                {formatDuration(recordingTime)}
              </span>
              <span className="text-sm text-gray-500">Recording…</span>
            </div>
          ) : (
            <p className="text-sm text-gray-500">Tap to start recording</p>
          )}
        </div>

        {/* Recordings list */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-medium text-gray-400 uppercase tracking-wider">
              Saved recordings
            </h2>
            <span className="text-xs text-gray-600">{PLACEHOLDER_RECORDINGS.length} total</span>
          </div>

          {PLACEHOLDER_RECORDINGS.length === 0 ? (
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
              {PLACEHOLDER_RECORDINGS.map((rec) => (
                <RecordingCard key={rec.id} rec={rec} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
