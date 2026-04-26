import { createFileRoute, useNavigate, Link } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import * as React from 'react'
import { AppSidebar } from '../../components/AppSidebar'
import { logoutFn } from '../logout'
import { saveAnamnesisFn, getAnamnesisFn } from '../../utils/anamnesis'
import { transcribeAudioFn, analyzeConsultationFn } from '../../utils/ai'
import { uploadRecordingFn } from '../../utils/recordings'
import { getAppointmentFn } from '../../utils/appointments'
import { useAudioRecorder } from '../../hooks/useAudioRecorder'
import { blobToBase64 } from '../../utils/audio'
import { SessionRecordings } from '../../components/SessionRecordings'

export const Route = createFileRoute('/_authed/session/$appointmentId/anamnesis')({
  component: AnamnesisPage,
})

function AnamnesisPage() {
  const { appointmentId } = Route.useParams()
  const { user } = Route.useRouteContext()
  const navigate = useNavigate()
  const doLogout = useServerFn(logoutFn)
  const doSave = useServerFn(saveAnamnesisFn)
  const doGet = useServerFn(getAnamnesisFn)
  const doGetAppointment = useServerFn(getAppointmentFn)
  const doUpload = useServerFn(uploadRecordingFn)
  const doTranscribe = useServerFn(transcribeAudioFn)
  const doAnalyze = useServerFn(analyzeConsultationFn)

  const { status, audioBlob, start, stop, reset, durationSeconds } = useAudioRecorder()

  const [symptoms, setSymptoms] = React.useState<string[]>(['', '', ''])
  const [freeText, setFreeText] = React.useState('')
  const [onset, setOnset] = React.useState('')
  const [comorbidities, setComorbidities] = React.useState('')
  const [riskFactors, setRiskFactors] = React.useState('')
  const [currentMeds, setCurrentMeds] = React.useState('')
  const [allergiesText, setAllergiesText] = React.useState('')
  const [aiSummary, setAiSummary] = React.useState('')
  const [isSaving, setIsSaving] = React.useState(false)
  const [isGenerating, setIsGenerating] = React.useState(false)
  const [saveMsg, setSaveMsg] = React.useState('')
  const [processingState, setProcessingState] = React.useState<string | null>(null)
  const [patientId, setPatientId] = React.useState<string | null>(null)

  const isRecording = status === 'recording'

  // Load existing anamnesis
  React.useEffect(() => {
    doGetAppointment({ data: { appointmentId } }).then(res => {
      if (res.appointment) setPatientId(res.appointment.patient_id)
    })

    doGet({ data: { appointmentId } }).then(res => {
      if (res.data) {
        const d = res.data
        setSymptoms(d.symptoms?.map((s: any) => s.name || s) ?? ['', '', ''])
        setFreeText(d.free_text ?? '')
        setOnset(d.onset_description ?? '')
        setComorbidities(d.comorbidities ?? '')
        setRiskFactors(d.risk_factors ?? '')
        setCurrentMeds(d.current_meds_text ?? '')
        setAllergiesText(d.allergies_text ?? '')
        setAiSummary(d.ai_summary ?? '')
      }
    }).catch(() => {})
  }, [appointmentId])

  // Handle Recording End & AI Pipeline
  React.useEffect(() => {
    if (status === 'stopped' && audioBlob && patientId) {
      handleAudioProcess(audioBlob)
    }
  }, [status, audioBlob, patientId])

  const applyAnalysis = (analysis: any) => {
    if (!analysis) return

    // Autofill Logic
    if (analysis.entities) {
      const newSymptoms = analysis.entities
        .filter((e: any) => e.entity_type === 'symptom' && !e.negated)
        .map((e: any) => e.value)
      
      if (newSymptoms.length > 0) {
        setSymptoms(prev => {
          const combined = [...prev.filter(Boolean), ...newSymptoms]
          return Array.from(new Set(combined))
        })
      }

      const newAllergies = analysis.entities
        .filter((e: any) => e.entity_type === 'allergy' && !e.negated)
        .map((e: any) => e.value)
      if (newAllergies.length > 0) setAllergiesText(prev => prev ? prev + ', ' + newAllergies.join(', ') : newAllergies.join(', '))

      const newMeds = analysis.entities
        .filter((e: any) => e.entity_type === 'medication' && !e.negated)
        .map((e: any) => e.value)
      if (newMeds.length > 0) setCurrentMeds(prev => prev ? prev + ', ' + newMeds.join(', ') : newMeds.join(', '))

      const newConditions = analysis.entities
        .filter((e: any) => (e.entity_type === 'condition' || e.entity_type === 'diagnosis') && !e.negated)
        .map((e: any) => e.value)
      if (newConditions.length > 0) setComorbidities(prev => prev ? prev + ', ' + newConditions.join(', ') : newConditions.join(', '))

      const newRiskFactors = analysis.entities
        .filter((e: any) => e.entity_type === 'risk_factor' && !e.negated)
        .map((e: any) => e.value)
      if (newRiskFactors.length > 0) setRiskFactors(prev => prev ? prev + ', ' + newRiskFactors.join(', ') : newRiskFactors.join(', '))
    }

    if (analysis.anamnesis_info) {
      const info = analysis.anamnesis_info
      if (info.onset_description) setOnset(prev => prev ? prev + '\n' + info.onset_description : info.onset_description)
      if (info.risk_factors) setRiskFactors(prev => prev ? prev + ', ' + info.risk_factors : info.risk_factors)
      if (info.ai_summary) setAiSummary(info.ai_summary)
    }
    
    setSaveMsg('Полетата са попълнени автоматично!')
    setTimeout(() => setSaveMsg(''), 5000)
  }

  const handleAudioProcess = async (blob: Blob) => {
    setProcessingState('Качване...')
    try {
      const base64 = await blobToBase64(blob)
      
      // 1. Upload
      const uploadRes = await doUpload({
        data: {
          base64,
          mimeType: blob.type,
          name: `Запис от ${new Date().toLocaleString('bg-BG')}`,
          duration: durationSeconds,
          size: blob.size,
          appointmentId,
          patientId: patientId!
        }
      })

      if (uploadRes.error) throw new Error(uploadRes.message)

      // 2. Transcribe
      setProcessingState('Транскрибиране...')
      const transRes = await doTranscribe({ data: { base64, mimeType: blob.type } })
      if (transRes.error || !transRes.transcript) throw new Error(transRes.message)

      setFreeText(prev => prev ? prev + '\n' + transRes.transcript : transRes.transcript!)

      // 3. Analyze
      setProcessingState('AI Анализ...')
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
      setSaveMsg('Грешка при AI обработка: ' + err.message)
    } finally {
      setProcessingState(null)
      reset()
    }
  }

  const addSymptom = () => setSymptoms(s => [...s, ''])
  const updateSymptom = (i: number, v: string) => setSymptoms(arr => arr.map((s, idx) => idx === i ? v : s))

  const handleSave = async () => {
    setIsSaving(true)
    setSaveMsg('')
    try {
      const res = await doSave({
        data: {
          appointment_id: appointmentId,
          symptoms: symptoms.filter(Boolean).map(name => ({ name })),
          free_text: freeText,
          onset_description: onset,
          comorbidities,
          risk_factors: riskFactors,
          current_meds_text: currentMeds,
          allergies_text: allergiesText,
          ai_summary: aiSummary,
        }
      })
      setSaveMsg(res.error ? res.message : 'Запазено успешно!')
      setTimeout(() => setSaveMsg(''), 4000)
    } finally {
      setIsSaving(false)
    }
  }

  const handleGenerateAI = async () => {
    setIsGenerating(true)
    try {
      const ctx = [
        symptoms.filter(Boolean).length ? `Симптоми: ${symptoms.filter(Boolean).join(', ')}` : '',
        freeText ? `Пациентът казва: ${freeText}` : '',
        onset ? `Начало: ${onset}` : '',
        comorbidities ? `Минали заболявания: ${comorbidities}` : '',
        riskFactors ? `Рискови фактори: ${riskFactors}` : '',
        currentMeds ? `Лекарства: ${currentMeds}` : '',
        allergiesText ? `Алергии: ${allergiesText}` : '',
      ].filter(Boolean).join('\n')

      if (!ctx) {
        alert('Моля, въведете поне симптоми или описание.')
        return
      }

      const response = await fetch('/api/ai-summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: ctx, type: 'anamnesis' }),
      }).catch(() => null)

      if (response?.ok) {
        const json = await response.json()
        setAiSummary(json.summary || '')
      } else {
        const summary = [
          `Пациентът съобщава за следните оплаквания: ${symptoms.filter(Boolean).join(', ') || 'не са уточнени'}.`,
          freeText ? `\n\nПациентът описва: ${freeText}` : '',
          onset ? `\n\nНачало и развитие: ${onset}` : '',
          comorbidities ? `\n\nМинали заболявания: ${comorbidities}` : '',
          allergiesText ? `\n\nАлергии: ${allergiesText}` : '',
          riskFactors ? `\n\nРискови фактори: ${riskFactors}` : '',
          currentMeds ? `\n\nПриемани лекарства: ${currentMeds}` : '',
        ].filter(Boolean).join('')
        setAiSummary(summary)
      }

      await doSave({
        data: {
          appointment_id: appointmentId,
          symptoms: symptoms.filter(Boolean).map(name => ({ name })),
          free_text: freeText,
          onset_description: onset,
          comorbidities,
          risk_factors: riskFactors,
          current_meds_text: currentMeds,
          allergies_text: allergiesText,
          ai_summary: aiSummary,
          ai_generated_at: new Date().toISOString(),
        }
      })
    } finally {
      setIsGenerating(false)
    }
  }

  const sectionTitle = (title: string) => (
    <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'hsl(var(--mp-text))', letterSpacing: '-0.02em', margin: 0 }}>{title}</h2>
  )

  const inputClass = 'mp-input'
  const inputStyle: React.CSSProperties = { height: 54, fontSize: '0.9375rem', fontWeight: 500 }

  return (
    <div className="mp-layout">
      <AppSidebar
        user={user}
        appointmentId={appointmentId}
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
          {isRecording && <span className="animate-pulse" style={{ fontSize: '0.75rem', fontWeight: 600, color: 'hsl(var(--mp-danger))' }}>Слушам… ({durationSeconds}с)</span>}
          {processingState && <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'hsl(var(--mp-green-dark))' }}>{processingState}</span>}
          {!isRecording && !processingState && <span style={{ fontSize: '0.6875rem', fontWeight: 500, color: 'hsl(var(--mp-text-muted))' }}>Контекст: Анамнеза</span>}
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
              <div style={{ width: 20, height: 20, borderRadius: '50%', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyCenter: 'center' }}>
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

        {/* Header */}
        <div style={{ maxWidth: 1100, paddingRight: '8rem', marginBottom: '2rem' }}>
          <nav style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.8125rem', fontWeight: 500, color: 'hsl(var(--mp-text-muted))', marginBottom: '0.75rem' }}>
            <Link to="/patients" style={{ color: 'inherit', textDecoration: 'none' }}>Пациенти</Link>
            <span>›</span>
            <span style={{ color: 'hsl(var(--mp-text))', fontWeight: 600 }}>Анамнеза</span>
          </nav>
          <h1 style={{ fontSize: '2.125rem', fontWeight: 800, color: 'hsl(var(--mp-text))', letterSpacing: '-0.03em', margin: 0 }}>Анамнеза</h1>
          <p style={{ marginTop: '0.5rem', fontSize: '0.9375rem', color: 'hsl(var(--mp-text-muted))' }}>
            Запишете оплакванията и развитието на състоянието. Използвайте гласовия запис за автоматично попълване.
          </p>
        </div>

        {/* Recordings from this session */}
        <SessionRecordings appointmentId={appointmentId} patientId={patientId} onAnalysisComplete={applyAnalysis} />

        {/* Content */}
        <div className="mp-card" style={{ maxWidth: 1100, padding: '2.5rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>

            {/* Section 1 — Main symptoms */}
            <section style={{ paddingBottom: '2.5rem', borderBottom: '1px solid hsl(var(--mp-border))' }}>
              {sectionTitle('Основни оплаквания')}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '1.25rem', marginTop: '1.25rem' }}>
                {symptoms.map((value, i) => (
                  <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                    <label htmlFor={`sym-${i}`} className="mp-label">Симптом {i + 1}</label>
                    <input
                      id={`sym-${i}`}
                      value={value}
                      onChange={e => updateSymptom(i, e.target.value)}
                      placeholder="напр. главоболие"
                      className={inputClass}
                      style={inputStyle}
                    />
                  </div>
                ))}
              </div>
              <button type="button" className="mp-btn-outline" onClick={addSymptom} style={{ marginTop: '1rem', height: 44, padding: '0 1.25rem', fontSize: '0.875rem', display: 'inline-flex', alignItems: 'center', gap: '0.375rem' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
                Добави симптом
              </button>
              <div style={{ marginTop: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                <label className="mp-label">Свободен текст от разговора</label>
                <textarea
                  value={freeText}
                  onChange={e => setFreeText(e.target.value)}
                  placeholder="Пациентът съобщава за…"
                  className={inputClass}
                  style={{ height: 120, padding: '0.875rem 1rem', resize: 'vertical', fontWeight: 400 }}
                />
              </div>
            </section>

            {/* Section 2 — Onset */}
            <section style={{ paddingBottom: '2.5rem', borderBottom: '1px solid hsl(var(--mp-border))' }}>
              {sectionTitle('Начало и развитие')}
              <textarea
                value={onset}
                onChange={e => setOnset(e.target.value)}
                placeholder="От кога са симптомите, как се развиват, има ли влошаване или подобрение…"
                className={inputClass}
                style={{ marginTop: '1.25rem', height: 120, padding: '0.875rem 1rem', resize: 'vertical', fontWeight: 400, width: '100%' }}
              />
            </section>

            {/* Section 3 — Comorbidities */}
            <section style={{ paddingBottom: '2.5rem', borderBottom: '1px solid hsl(var(--mp-border))' }}>
              {sectionTitle('Минали заболявания')}
              <textarea
                value={comorbidities}
                onChange={e => setComorbidities(e.target.value)}
                placeholder="Хронични заболявания, операции, предишни диагнози…"
                className={inputClass}
                style={{ marginTop: '1.25rem', height: 120, padding: '0.875rem 1rem', resize: 'vertical', fontWeight: 400, width: '100%' }}
              />
            </section>

            {/* Section 4 — Allergies & Risk */}
            <section style={{ paddingBottom: '2.5rem', borderBottom: '1px solid hsl(var(--mp-border))' }}>
              {sectionTitle('Алергии и рискови фактори')}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '1.25rem', marginTop: '1.25rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                  <label className="mp-label">Алергии</label>
                  <input value={allergiesText} onChange={e => setAllergiesText(e.target.value)} placeholder="напр. пеницилин" className={inputClass} style={inputStyle} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                  <label className="mp-label">Приемани лекарства</label>
                  <input value={currentMeds} onChange={e => setCurrentMeds(e.target.value)} placeholder="напр. метформин 500mg" className={inputClass} style={inputStyle} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                  <label className="mp-label">Рискови фактори</label>
                  <input value={riskFactors} onChange={e => setRiskFactors(e.target.value)} placeholder="напр. тютюнопушене" className={inputClass} style={inputStyle} />
                </div>
              </div>
            </section>

            {/* Section 5 — AI Summary */}
            <section>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
                {sectionTitle('Резюме на анамнезата')}
                <button
                  type="button"
                  className="mp-btn-primary"
                  onClick={handleGenerateAI}
                  disabled={isGenerating}
                  style={{ height: 44, padding: '0 1.25rem', fontSize: '0.875rem', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
                >
                  {isGenerating ? (
                    <>
                      <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" style={{ opacity: 0.25 }} /><path fill="currentColor" d="M4 12a8 8 0 018-8v8z" style={{ opacity: 0.75 }} /></svg>
                      Генериране…
                    </>
                  ) : (
                    <>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" /></svg>
                      Структурирай с AI
                    </>
                  )}
                </button>
              </div>
              <textarea
                value={aiSummary}
                onChange={e => setAiSummary(e.target.value)}
                placeholder="Кратко структурирано обобщение… (генерирайте с AI или напишете сами)"
                className={inputClass}
                style={{ marginTop: '1rem', height: 160, padding: '0.875rem 1rem', resize: 'vertical', fontWeight: 400, width: '100%' }}
              />
              {aiSummary && (
                <div className="mp-info-box" style={{ marginTop: '0.75rem' }}>
                  Резюмето е генерирано от AI. Прегледайте и коригирайте преди запазване.
                </div>
              )}
            </section>
          </div>

          {/* Bottom actions */}
          <div style={{ marginTop: '2.5rem', paddingTop: '1.5rem', borderTop: '1px solid hsl(var(--mp-border))', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
            <Link to={`/patients/${patientId}`} className="mp-btn-ghost" style={{ height: 52, padding: '0 1.25rem', fontSize: '0.875rem', display: 'inline-flex', alignItems: 'center', textDecoration: 'none' }}>
              ← Назад към профил
            </Link>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
              {saveMsg && (
                <span style={{ fontSize: '0.875rem', color: 'hsl(var(--mp-green-dark))', fontWeight: 600 }}>
                  {saveMsg}
                </span>
              )}
              <button type="button" className="mp-btn-outline" onClick={handleSave} disabled={isSaving} style={{ height: 52, padding: '0 1.5rem', fontSize: '0.875rem', display: 'inline-flex', alignItems: 'center' }}>
                {isSaving ? 'Запис...' : 'ЗАПАЗИ'}
              </button>
              <button
                type="button"
                className="mp-btn-primary"
                onClick={async () => { await handleSave(); navigate({ to: `/session/${appointmentId}/status` }) }}
                style={{ height: 52, padding: '0 1.5rem', fontSize: '0.875rem', display: 'inline-flex', alignItems: 'center' }}
              >
                ПРОДЪЛЖИ КЪМ СТАТУС →
              </button>
            </div>
          </div>
        </div>

        <div style={{ height: '3rem' }} />
      </main>
    </div>
  )
}
