import * as React from 'react'

import { formatDuration, formatSize, timeAgo } from '../utils/audio'

export interface RecordingCardProps {
  name: string
  duration: number
  size: number
  createdAt: string
  localOnly?: boolean
  publicUrl?: string
  audioUrl?: string
  appointmentId?: string
  patientName?: string
  isAnalyzing?: boolean
  onDelete?: () => void
  onRetry?: () => void
}

import { Link } from '@tanstack/react-router'

export function RecordingCard({
  name,
  duration,
  size,
  createdAt,
  localOnly,
  publicUrl,
  audioUrl,
  appointmentId,
  patientName,
  isAnalyzing,
  onDelete,
  onRetry,
}: RecordingCardProps) {
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

      {/* Play button or Loading */}
      {isAnalyzing ? (
        <div className="shrink-0 w-11 h-11 rounded-full flex items-center justify-center bg-violet-500/10 border border-violet-500/20">
          <svg className="animate-spin w-5 h-5 text-violet-400" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
        </div>
      ) : (
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
      )}

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
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium text-white truncate">{name}</p>
          {patientName && (
            <span className="shrink-0 text-[10px] px-2 py-0.5 rounded-md bg-violet-500/10 text-violet-400 border border-violet-500/20">
              Patient: {patientName}
            </span>
          )}
        </div>
        <p className="text-xs text-gray-500 mt-0.5">
          {timeAgo(createdAt)} · {formatDuration(duration)} · {formatSize(size)}
        </p>
      </div>

      {/* Badges + actions */}
      <div className="flex items-center gap-2 shrink-0">
        {isAnalyzing && (
          <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-violet-500/15 text-violet-400 border border-violet-500/20 flex items-center gap-1.5 animate-pulse">
            Analyzing...
          </span>
        )}
        
        {appointmentId && !isAnalyzing && onRetry && (
          <button
            onClick={onRetry}
            className="p-1.5 rounded-lg text-gray-500 hover:text-cyan-400 hover:bg-cyan-500/10 transition-all"
            title="Retry Analysis"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
            </svg>
          </button>
        )}

        {appointmentId && !isAnalyzing && (
          <Link
            to="/session/results/$appointmentId"
            params={{ appointmentId }}
            className="px-3 py-1.5 rounded-lg text-xs font-medium text-white bg-white/5 hover:bg-white/10 transition-colors border border-white/10"
          >
            View Notes
          </Link>
        )}
        {localOnly && (
          <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/20">
            Local
          </span>
        )}
        {onDelete && (
          <button
            onClick={onDelete}
            className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-all"
            title="Delete"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
            </svg>
          </button>
        )}
      </div>
    </div>
  )
}
