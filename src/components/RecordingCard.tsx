import * as React from 'react'
import { Link } from '@tanstack/react-router'
import { formatDuration, formatSize, timeAgo } from '../utils/audio'
import type { RecordingMeta } from '../utils/recordings'

export interface RecordingCardProps {
  recording: RecordingMeta
  onDelete?: () => void
  onRetryAnalysis?: (recordingId: string, appointmentId: string) => void
  isRetrying?: boolean
}

export function RecordingCard({
  recording,
  onDelete,
  onRetryAnalysis,
  isRetrying,
}: RecordingCardProps) {
  const [playing, setPlaying] = React.useState(false)
  const audioRef = React.useRef<HTMLAudioElement | null>(null)
  const src = recording.publicUrl

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
    <div className="mp-card p-5 group hover:shadow-lg hover:border-mp-green/20 transition-all">
      {src && (
        <audio
          ref={audioRef}
          onEnded={() => setPlaying(false)}
          className="hidden"
        />
      )}

      <div className="flex items-start gap-4">
        {/* Play button */}
        {isRetrying ? (
          <div className="shrink-0 w-12 h-12 rounded-xl flex items-center justify-center bg-mp-green-light border border-mp-green/20">
            <svg className="animate-spin w-5 h-5 text-mp-green" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          </div>
        ) : (
          <button
            onClick={togglePlay}
            disabled={!src}
            className={`shrink-0 w-12 h-12 rounded-xl flex items-center justify-center border-2 transition-all ${
              playing
                ? 'bg-mp-green text-white border-mp-green shadow-lg shadow-mp-green/25'
                : 'bg-mp-green-light text-mp-green border-mp-green/20 hover:bg-mp-green hover:text-white hover:border-mp-green hover:shadow-lg hover:shadow-mp-green/25'
            } disabled:opacity-40 disabled:cursor-not-allowed`}
          >
            {playing ? (
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
              </svg>
            ) : (
              <svg className="w-5 h-5 ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7L8 5z" />
              </svg>
            )}
          </button>
        )}

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-bold text-mp-text truncate">{recording.name}</p>
            {recording.patient_name && (
              <span className="shrink-0 text-[9px] font-extrabold uppercase tracking-widest px-2 py-0.5 rounded-md bg-mp-green-light text-mp-green-dark border border-mp-green/15">
                {recording.patient_name}
              </span>
            )}
          </div>
          <p className="text-[11px] text-mp-text-muted mt-1 font-medium">
            {timeAgo(recording.created_at)} · {formatDuration(recording.duration)} · {formatSize(recording.size)}
          </p>

          {/* Waveform visualizer */}
          <div className="flex items-end gap-px h-5 mt-3">
            {Array.from({ length: 32 }).map((_, i) => {
              const seed = recording.name.charCodeAt(i % recording.name.length) ?? 64
              const h = 3 + ((seed * (i + 1) * 7) % 17)
              return (
                <div
                  key={i}
                  className={`w-[3px] rounded-full transition-colors ${playing ? 'bg-mp-green' : 'bg-mp-border'}`}
                  style={{ height: `${h}px` }}
                />
              )
            })}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1.5 shrink-0">
          {isRetrying && (
            <span className="text-[9px] font-extrabold text-mp-green uppercase tracking-widest animate-pulse">
              Анализ...
            </span>
          )}
          
          {recording.appointment_id && !isRetrying && onRetryAnalysis && (
            <button
              onClick={() => onRetryAnalysis(recording.id, recording.appointment_id!)}
              className="p-2 rounded-lg text-mp-text-subtle hover:text-mp-green hover:bg-mp-green-light transition-all"
              title="Повтори анализ"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
              </svg>
            </button>
          )}

          {recording.appointment_id && !isRetrying && (
            <Link
              to="/session/$appointmentId/results"
              params={{ appointmentId: recording.appointment_id }}
              className="p-2 rounded-lg text-mp-text-subtle hover:text-mp-green hover:bg-mp-green-light transition-all"
              title="Към прегледа"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
              </svg>
            </Link>
          )}

          {onDelete && (
            <button
              onClick={onDelete}
              className="p-2 rounded-lg text-mp-text-subtle hover:text-mp-danger hover:bg-mp-danger-bg transition-all opacity-0 group-hover:opacity-100"
              title="Изтрий"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
              </svg>
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
