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

export const Route = createFileRoute('/_authed/recordings')({
  component: RecordingsPage,
})

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatDuration(s: number) {
  const m = Math.floor(s / 60)
  const sec = s % 60
  return `${m}:${String(sec).padStart(2, '0')}`
}

function formatSize(bytes: number) {
  if (bytes < 1_000_000) return `${(bytes / 1000).toFixed(0)} KB`
  return `${(bytes / 1_000_000).toFixed(1)} MB`
}

function timeAgo(dateStr: string) {
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000
  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

// Convert Blob to base64 string
function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      // Strip the data URL prefix
      resolve(result.split(',')[1])
    }
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

// ── Recording card ────────────────────────────────────────────────────────────

function RecordingCard({
  name,
  duration,
  size,
  createdAt,
  localOnly,
  publicUrl,
  audioUrl,
  onDelete,
}: {
  name: string
  duration: number
  size: number
  createdAt: string
  localOnly?: boolean
  publicUrl?: string
  audioUrl?: string
  onDelete: () => void
}) {
  const [playing, setPlaying] = React.useState(false)
  const audioRef = React.useRef<HTMLAudioElement | null>(null)
  const src = publicUrl ?? audioUrl

  const togglePlay = () => {
    if (!audioRef.current || !src) return
    if (playing) {
      audioRef.current.pause()
      setPlaying(false)
    } else {
      audioRef.current.src = src
      audioRef.current.play()
      setPlaying(true)
    }
  }

  return (
    <div className="group relative flex items-center gap-4 p-4 rounded-2xl bg-white/4 border border-white/8 hover:bg-white/6 hover:border-white/14 transition-all duration-200">
      {src && (
        <audio
          ref={audioRef}
          onEnded={() => setPlaying(false)}
          className="hidden"
        />
      )}

      {/* Play button */}
      <button
        onClick={togglePlay}
        disabled={!src}
        className="shrink-0 w-11 h-11 rounded-full flex items-center justify-center bg-gradient-to-br from-violet-600/80 to-cyan-600/80 hover:from-violet-500 hover:to-cyan-500 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-lg shadow-violet-500/20 hover:shadow-violet-500/40 hover:scale-105 active:scale-95"
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

      {/* Static waveform */}
      <div className="shrink-0 flex items-end gap-px h-8">
        {Array.from({ length: 24 }).map((_, i) => {
          const seed = name.charCodeAt(i % name.length) ?? 64
          const h = 4 + ((seed * (i + 1) * 7) % 28)
          return (
            <div
              key={i}
              className={`w-0.5 rounded-full transition-colors ${playing ? 'bg-violet-400' : 'bg-white/20'}`}
              style={{ height: `${h}px` }}
            />
          )
        })}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-white truncate">{name}</p>
        <p className="text-xs text-gray-500 mt-0.5">
          {timeAgo(createdAt)} · {formatDuration(duration)} · {formatSize(size)}
        </p>
      </div>

      {/* Badges + delete */}
      <div className="flex items-center gap-2 shrink-0">
        {localOnly && (
          <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/20">
            Local
          </span>
        )}
        <button
          onClick={onDelete}
          className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-all"
          title="Delete"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
          </svg>
        </button>
      </div>
    </div>
  )
}

// ── Recorder widget ───────────────────────────────────────────────────────────

function RecorderWidget({
  onSaved,
}: {
  onSaved: () => void
}) {
  const { status, durationSeconds, audioBlob, audioUrl, start, stop, pause, resume, reset, error } =
    useAudioRecorder()
  const doUpload = useServerFn(uploadRecordingFn)

  const [saving, setSaving] = React.useState(false)
  const [saveError, setSaveError] = React.useState<string | null>(null)
  const [recordingName, setRecordingName] = React.useState('')

  const isRecording = status === 'recording'
  const isPaused = status === 'paused'
  const isDone = status === 'stopped'

  const handleSave = async () => {
    if (!audioBlob) return
    setSaving(true)
    setSaveError(null)
    const name = recordingName.trim() || `Recording ${new Date().toLocaleString()}`

    try {
      const base64 = await blobToBase64(audioBlob)
      const result = await doUpload({
        data: {
          base64,
          mimeType: audioBlob.type,
          name,
          duration: durationSeconds,
          size: audioBlob.size,
        },
      })

      if (result.error) {
        // Show the actual Supabase error and fall back to local storage
        console.error('[recordings] Upload failed:', result.message)
        await saveLocalRecording(audioBlob, name, durationSeconds)
        setSaveError(`Saved locally (cloud error: ${result.message})`)
        setSaving(false)
        onSaved()
        return
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error'
      console.error('[recordings] Unexpected error:', err)
      try {
        await saveLocalRecording(audioBlob, name, durationSeconds)
        setSaveError(`Saved locally (error: ${msg})`)
        setSaving(false)
        onSaved()
      } catch {
        setSaveError(`Could not save recording: ${msg}`)
        setSaving(false)
      }
      return
    }

    setSaving(false)
    reset()
    setRecordingName('')
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
                <input
                  type="text"
                  placeholder="Name this recording…"
                  value={recordingName}
                  onChange={(e) => setRecordingName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-gray-800 border border-white/10 text-white placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/60 transition"
                />
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
                    className="flex-1 py-2 rounded-xl bg-gradient-to-r from-violet-600 to-cyan-600 hover:from-violet-500 hover:to-cyan-500 text-white text-sm font-medium transition-all disabled:opacity-50"
                  >
                    {saving ? 'Saving…' : 'Save'}
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
  const doDelete = useServerFn(deleteRecordingFn)

  const [cloudRecs, setCloudRecs] = React.useState<RecordingMeta[]>([])
  const [localRecs, setLocalRecs] = React.useState<LocalRecording[]>([])
  const [localUrls, setLocalUrls] = React.useState<Record<string, string>>({})
  const [loading, setLoading] = React.useState(true)

  const loadAll = React.useCallback(async () => {
    setLoading(true)
    const [cloud, local] = await Promise.all([
      doList().catch(() => [] as RecordingMeta[]),
      listLocalRecordings().catch(() => [] as LocalRecording[]),
    ])
    setCloudRecs(cloud)
    setLocalRecs(local)

    // Create object URLs for local blobs
    const urls: Record<string, string> = {}
    local.forEach((r) => {
      urls[r.id] = getLocalObjectUrl(r)
    })
    setLocalUrls(urls)
    setLoading(false)
  }, [doList])

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
        <RecorderWidget onSaved={loadAll} />

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
                  onDelete={() => handleDeleteCloud(rec.id, rec.storage_path)}
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
