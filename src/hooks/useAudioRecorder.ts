import * as React from 'react'

export type RecorderStatus = 'idle' | 'recording' | 'paused' | 'stopped'

export interface UseAudioRecorderResult {
  status: RecorderStatus
  durationSeconds: number
  audioBlob: Blob | null
  audioUrl: string | null
  start: () => Promise<void>
  stop: () => void
  pause: () => void
  resume: () => void
  reset: () => void
  error: string | null
}

export function useAudioRecorder(): UseAudioRecorderResult {
  const [status, setStatus] = React.useState<RecorderStatus>('idle')
  const [durationSeconds, setDuration] = React.useState(0)
  const [audioBlob, setAudioBlob] = React.useState<Blob | null>(null)
  const [audioUrl, setAudioUrl] = React.useState<string | null>(null)
  const [error, setError] = React.useState<string | null>(null)

  const mediaRecorderRef = React.useRef<MediaRecorder | null>(null)
  const chunksRef = React.useRef<Blob[]>([])
  const streamRef = React.useRef<MediaStream | null>(null)
  const timerRef = React.useRef<ReturnType<typeof setInterval> | null>(null)

  const stopTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
  }

  const start = React.useCallback(async () => {
    setError(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      chunksRef.current = []

      // Pick best supported mime type
      const mimeType = [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/ogg',
        'audio/mp4',
      ].find((m) => MediaRecorder.isTypeSupported(m)) ?? ''

      const mr = new MediaRecorder(stream, mimeType ? { mimeType } : {})
      mediaRecorderRef.current = mr

      mr.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }

      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, {
          type: mimeType || 'audio/webm',
        })
        const url = URL.createObjectURL(blob)
        setAudioBlob(blob)
        setAudioUrl(url)
        setStatus('stopped')
        stopTimer()
        // Stop microphone tracks
        streamRef.current?.getTracks().forEach((t) => t.stop())
      }

      mr.start(250) // collect data every 250ms
      setStatus('recording')
      setDuration(0)
      timerRef.current = setInterval(
        () => setDuration((d) => d + 1),
        1000,
      )
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : 'Could not access microphone'
      setError(msg)
    }
  }, [])

  const stop = React.useCallback(() => {
    mediaRecorderRef.current?.stop()
    stopTimer()
  }, [])

  const pause = React.useCallback(() => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.pause()
      setStatus('paused')
      stopTimer()
    }
  }, [])

  const resume = React.useCallback(() => {
    if (mediaRecorderRef.current?.state === 'paused') {
      mediaRecorderRef.current.resume()
      setStatus('recording')
      timerRef.current = setInterval(
        () => setDuration((d) => d + 1),
        1000,
      )
    }
  }, [])

  const reset = React.useCallback(() => {
    if (audioUrl) URL.revokeObjectURL(audioUrl)
    setAudioBlob(null)
    setAudioUrl(null)
    setStatus('idle')
    setDuration(0)
    setError(null)
    chunksRef.current = []
  }, [audioUrl])

  // Cleanup on unmount
  React.useEffect(() => {
    return () => {
      stopTimer()
      streamRef.current?.getTracks().forEach((t) => t.stop())
      if (audioUrl) URL.revokeObjectURL(audioUrl)
    }
  }, [audioUrl])

  return {
    status,
    durationSeconds,
    audioBlob,
    audioUrl,
    start,
    stop,
    pause,
    resume,
    reset,
    error,
  }
}
