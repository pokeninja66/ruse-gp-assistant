import * as React from 'react'
import { Link } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import { listRecordingsFn, deleteRecordingFn, type RecordingMeta } from '../utils/recordings'
import { analyzeRecordingIdFn } from '../utils/ai'
import { formatDuration, formatSize, timeAgo } from '../utils/audio'

interface SessionRecordingsProps {
  appointmentId?: string | null
  patientId?: string | null
  onAnalysisComplete?: (analysis: any) => void
}

export function SessionRecordings({ appointmentId, patientId, onAnalysisComplete }: SessionRecordingsProps) {
  const doListRecs = useServerFn(listRecordingsFn)
  const doDeleteRec = useServerFn(deleteRecordingFn)
  const doAnalyzeRec = useServerFn(analyzeRecordingIdFn)
  const [recordings, setRecordings] = React.useState<RecordingMeta[]>([])
  const [loading, setLoading] = React.useState(true)
  const [expanded, setExpanded] = React.useState(false)
  const [playingId, setPlayingId] = React.useState<string | null>(null)
  const [analyzingId, setAnalyzingId] = React.useState<string | null>(null)
  const audioRef = React.useRef<HTMLAudioElement | null>(null)

  React.useEffect(() => {
    doListRecs().then(res => {
      const all = Array.isArray(res) ? res : []
      // Filter to recordings for this appointment OR this patient
      const filtered = all.filter(r => 
        (appointmentId && r.appointment_id === appointmentId) ||
        (patientId && (r as any).patient_id === patientId)
      )
      setRecordings(filtered)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [appointmentId, patientId])

  const togglePlay = (rec: RecordingMeta) => {
    if (!rec.publicUrl) return
    if (playingId === rec.id) {
      audioRef.current?.pause()
      setPlayingId(null)
    } else {
      if (audioRef.current) {
        audioRef.current.src = rec.publicUrl
        audioRef.current.play()
        setPlayingId(rec.id)
      }
    }
  }

  const handleDelete = async (rec: RecordingMeta) => {
    if (!window.confirm('Наистина ли искате да изтриете този запис?')) return
    
    try {
      const res = await doDeleteRec({ data: { id: rec.id, storagePath: rec.storage_path } })
      if (res.error) {
        alert('Грешка при изтриване: ' + res.message)
      } else {
        setRecordings(prev => prev.filter(r => r.id !== rec.id))
      }
    } catch (err) {
      alert('Грешка при комуникация със сървъра')
    }
  }

  const handleAnalyze = async (rec: RecordingMeta) => {
    setAnalyzingId(rec.id)
    try {
      const res = await doAnalyzeRec({ data: { recordingId: rec.id } })
      if (!res.error && res.analysis) {
        onAnalysisComplete?.(res.analysis)
      } else {
        alert('Грешка при анализ: ' + res.message)
      }
    } catch (err) {
      alert('Грешка при комуникация със сървъра')
    } finally {
      setAnalyzingId(null)
    }
  }

  if (loading || recordings.length === 0) return null

  return (
    <div style={{
      margin: '1.5rem 0',
      background: 'hsl(78 40% 90%)',
      border: '1px solid hsl(78 30% 74%)',
      borderRadius: '0.75rem',
      overflow: 'hidden',
    }}>
      <audio ref={audioRef} onEnded={() => setPlayingId(null)} className="hidden" />

      {/* Header - clickable to expand */}
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          width: '100%',
          padding: '0.875rem 1.25rem',
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          color: 'hsl(214 50% 18%)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.25}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
          </svg>
          <span style={{ fontSize: '0.8125rem', fontWeight: 700 }}>
            Записи на пациента
          </span>
          <span style={{
            fontSize: '0.6875rem',
            fontWeight: 800,
            background: 'hsl(142 72% 26%)',
            color: '#fff',
            padding: '0.125rem 0.5rem',
            borderRadius: '1rem',
          }}>
            {recordings.length}
          </span>
        </div>
        <svg
          width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}
          style={{ transition: 'transform 0.2s', transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)' }}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Recordings list */}
      {expanded && (
        <div style={{
          padding: '0 1.25rem 1rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.5rem',
        }}>
          {recordings.map(rec => (
            <div
              key={rec.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '0.75rem 1rem',
                background: '#fff',
                borderRadius: '0.625rem',
                border: '1px solid hsl(140 10% 86%)',
              }}
            >
              {/* Play button */}
              <button
                onClick={() => togglePlay(rec)}
                disabled={!rec.publicUrl}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: '0.5rem',
                  border: '1.5px solid hsl(142 72% 26% / 0.25)',
                  background: playingId === rec.id ? 'hsl(142 72% 26%)' : 'hsl(142 72% 94%)',
                  color: playingId === rec.id ? '#fff' : 'hsl(142 72% 26%)',
                  cursor: rec.publicUrl ? 'pointer' : 'not-allowed',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  transition: 'all 0.15s',
                  opacity: rec.publicUrl ? 1 : 0.4,
                }}
              >
                {playingId === rec.id ? (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" /></svg>
                ) : (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7L8 5z" /></svg>
                )}
              </button>

              {/* Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'hsl(214 55% 12%)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {rec.name}
                </p>
                <p style={{ fontSize: '0.6875rem', fontWeight: 500, color: 'hsl(214 20% 42%)', margin: '0.125rem 0 0' }}>
                  {timeAgo(rec.created_at)} · {formatDuration(rec.duration)} · {formatSize(rec.size)}
                </p>
              </div>

              {/* Waveform mini */}
              <div style={{ display: 'flex', alignItems: 'end', gap: 1, height: 16 }}>
                {Array.from({ length: 12 }).map((_, i) => {
                  const seed = rec.name.charCodeAt(i % rec.name.length) ?? 64
                  const h = 2 + ((seed * (i + 1) * 7) % 12)
                  return (
                    <div
                      key={i}
                      style={{
                        width: 2,
                        height: h,
                        borderRadius: 1,
                        background: playingId === rec.id ? 'hsl(142 72% 26%)' : 'hsl(140 12% 80%)',
                        transition: 'background 0.15s',
                      }}
                    />
                  )
                })}
              </div>
              
              {/* Analyze button */}
              {onAnalysisComplete && (
                <button
                  onClick={() => handleAnalyze(rec)}
                  disabled={analyzingId === rec.id}
                  title="Автоматично попълване от този запис"
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: '0.375rem',
                    border: 'none',
                    background: analyzingId === rec.id ? 'hsl(142 72% 94%)' : 'transparent',
                    color: analyzingId === rec.id ? 'hsl(142 72% 26%)' : 'hsl(214 20% 42%)',
                    cursor: analyzingId === rec.id ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.15s',
                  }}
                  onMouseEnter={(e) => { if (analyzingId !== rec.id) { e.currentTarget.style.background = 'hsl(142 72% 94%)'; e.currentTarget.style.color = 'hsl(142 72% 26%)' } }}
                  onMouseLeave={(e) => { if (analyzingId !== rec.id) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'hsl(214 20% 42%)' } }}
                >
                  {analyzingId === rec.id ? (
                    <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" style={{ opacity: 0.25 }} /><path fill="currentColor" d="M4 12a8 8 0 018-8v8z" /></svg>
                  ) : (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.25}><path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" /></svg>
                  )}
                </button>
              )}

              {/* Delete button */}
              <button
                onClick={() => handleDelete(rec)}
                title="Изтрий записа"
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: '0.375rem',
                  border: 'none',
                  background: 'transparent',
                  color: 'hsl(0 70% 45% / 0.4)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.15s',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'hsl(0 70% 96%)'; e.currentTarget.style.color = 'hsl(0 70% 45%)' }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'hsl(0 70% 45% / 0.4)' }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.25}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
