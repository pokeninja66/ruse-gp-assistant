import { createFileRoute, useNavigate, Link } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import * as React from 'react'
import { AppSidebar } from '../../components/AppSidebar'
import { logoutFn } from '../logout'
import { saveVitalsFn, getVitalsFn, savePhysicalExamFn, getPhysicalExamFn } from '../../utils/vitals'
import { transcribeAudioFn, analyzeConsultationFn } from '../../utils/ai'
import { uploadRecordingFn } from '../../utils/recordings'
import { getAppointmentFn } from '../../utils/appointments'
import { useAudioRecorder } from '../../hooks/useAudioRecorder'
import { blobToBase64 } from '../../utils/audio'
import { SessionRecordings } from '../../components/SessionRecordings'

export const Route = createFileRoute('/_authed/session/$appointmentId/status')({
  component: StatusPage,
})

const VITALS_FIELDS = [
  { id: 'blood_pressure', label: 'Кръвно налягане', placeholder: 'напр. 120/80 mmHg', type: 'text' as const },
  { id: 'pulse', label: 'Пулс (уд./мин)', placeholder: 'напр. 72', type: 'number' as const },
  { id: 'temperature', label: 'Температура (°C)', placeholder: 'напр. 36.8', type: 'number' as const },
  { id: 'spo2', label: 'Сатурация (% SpO₂)', placeholder: 'напр. 98', type: 'number' as const },
  { id: 'weight', label: 'Тегло (кг)', placeholder: 'напр. 75', type: 'number' as const },
]

const QUICK_TEST_FIELDS = [
  { id: 'blood_glucose', label: 'Кръвна захар (ммол/л)', placeholder: 'напр. 5.6', type: 'number' as const },
  { id: 'urine_findings', label: 'Урина', placeholder: 'Находки от изследване…', type: 'text' as const },
  { id: 'other_quick_tests', label: 'Други бързи изследвания', placeholder: 'напр. бърз тест за грип…', type: 'text' as const },
]

const LOCAL_STATUS_FIELDS = [
  { id: 'zone', label: 'Засегната област', placeholder: 'напр. дясна подбедрица' },
  { id: 'pain', label: 'Болка', placeholder: 'интензитет / характер' },
  { id: 'edema', label: 'Оток', placeholder: 'наличие / степен' },
  { id: 'redness', label: 'Зачервяване', placeholder: 'наличие / разпространение' },
  { id: 'mobility', label: 'Подвижност', placeholder: 'запазена / ограничена' },
]

function StatusPage() {
  const { appointmentId } = Route.useParams()
  const { user } = Route.useRouteContext()
  const navigate = useNavigate()
  const doLogout = useServerFn(logoutFn)
  const doSaveVitals = useServerFn(saveVitalsFn)
  const doGetVitals = useServerFn(getVitalsFn)
  const doSaveExam = useServerFn(savePhysicalExamFn)
  const doGetExam = useServerFn(getPhysicalExamFn)
  const doGetAppointment = useServerFn(getAppointmentFn)
  const doUpload = useServerFn(uploadRecordingFn)
  const doTranscribe = useServerFn(transcribeAudioFn)
  const doAnalyze = useServerFn(analyzeConsultationFn)

  const { status, audioBlob, start, stop, reset, durationSeconds } = useAudioRecorder()

  const [vitals, setVitals] = React.useState<Record<string, string>>({})
  const [localStatus, setLocalStatus] = React.useState<Record<string, string>>({})
  const [generalCondition, setGeneralCondition] = React.useState('')
  const [objectiveStatus, setObjectiveStatus] = React.useState('')
  const [doctorObservations, setDoctorObservations] = React.useState('')
  const [examSummary, setExamSummary] = React.useState('')
  const [isSaving, setIsSaving] = React.useState(false)
  const [saveMsg, setSaveMsg] = React.useState('')
  const [processingState, setProcessingState] = React.useState<string | null>(null)
  const [patientId, setPatientId] = React.useState<string | null>(null)

  const isRecording = status === 'recording'

  React.useEffect(() => {
    doGetAppointment({ data: { appointmentId } }).then(res => {
      if (res.appointment) setPatientId(res.appointment.patient_id)
    })

    doGetVitals({ data: { appointmentId } }).then(res => {
      if (res.data) {
        const d = res.data as any
        const v: Record<string, string> = {}
        VITALS_FIELDS.forEach(f => { if (d[f.id] != null) v[f.id] = String(d[f.id]) })
        QUICK_TEST_FIELDS.forEach(f => { if (d[f.id] != null) v[f.id] = String(d[f.id]) })
        setVitals(v)
      }
    }).catch(() => {})

    doGetExam({ data: { appointmentId } }).then(res => {
      if (res.data) {
        const d = res.data as any
        setLocalStatus(d.local_status ?? {})
        setGeneralCondition(d.general_condition ?? '')
        setObjectiveStatus(d.objective_status ?? '')
        setDoctorObservations(d.doctor_observations ?? '')
        setExamSummary(d.exam_summary ?? '')
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
    
    // Autofill Vitals
    const newVitals = { ...vitals }
    analysis.entities?.forEach((e: any) => {
      if (e.entity_type === 'vital' && e.attributes?.type) {
        const type = e.attributes.type
        if (type === 'blood_pressure') newVitals['blood_pressure'] = e.value
        if (type === 'pulse' || type === 'heart_rate') newVitals['pulse'] = e.value
        if (type === 'temperature' || type === 'temp') newVitals['temperature'] = e.value
        if (type === 'spo2') newVitals['spo2'] = e.value
        if (type === 'weight') newVitals['weight'] = e.value
      }
    })
    setVitals(newVitals)

    // Autofill Physical Findings
    const findings = analysis.entities?.filter((e: any) => e.entity_type === 'physical_finding').map((e: any) => e.value).join(', ')
    if (findings) setObjectiveStatus(prev => prev ? prev + '\n' + findings : findings)
    
    setSaveMsg('Данните са попълнени автоматично!')
    setTimeout(() => setSaveMsg(''), 5000)
  }

  const handleAudioProcess = async (blob: Blob) => {
    setProcessingState('Качване...')
    try {
      const base64 = await blobToBase64(blob)
      
      const uploadRes = await doUpload({
        data: {
          base64,
          mimeType: blob.type,
          name: `Статус запис ${new Date().toLocaleString('bg-BG')}`,
          duration: durationSeconds,
          size: blob.size,
          appointmentId,
          patientId: patientId!
        }
      })

      if (uploadRes.error) throw new Error(uploadRes.message)

      setProcessingState('Анализ...')
      const transRes = await doTranscribe({ data: { base64, mimeType: blob.type } })
      if (transRes.error || !transRes.transcript) throw new Error(transRes.message)

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
      setSaveMsg('Грешка: ' + err.message)
    } finally {
      setProcessingState(null)
      reset()
    }
  }

  const handleSave = async () => {
    setIsSaving(true)
    setSaveMsg('')
    try {
      await doSaveVitals({
        data: {
          appointment_id: appointmentId,
          blood_pressure: vitals['blood_pressure'] || undefined,
          pulse: vitals['pulse'] ? Number(vitals['pulse']) : undefined,
          temperature: vitals['temperature'] ? Number(vitals['temperature']) : undefined,
          spo2: vitals['spo2'] ? Number(vitals['spo2']) : undefined,
          weight: vitals['weight'] ? Number(vitals['weight']) : undefined,
          blood_glucose: vitals['blood_glucose'] ? Number(vitals['blood_glucose']) : undefined,
          urine_findings: vitals['urine_findings'] || undefined,
          other_quick_tests: vitals['other_quick_tests'] || undefined,
        }
      })
      await doSaveExam({
        data: {
          appointment_id: appointmentId,
          general_condition: generalCondition,
          local_status: localStatus,
          objective_status: objectiveStatus,
          doctor_observations: doctorObservations,
          exam_summary: examSummary,
        }
      })
      setSaveMsg('Запазено успешно!')
      setTimeout(() => setSaveMsg(''), 3000)
    } finally {
      setIsSaving(false)
    }
  }

  const updateVital = (id: string, val: string) => setVitals(prev => ({ ...prev, [id]: val }))
  const updateLocal = (id: string, val: string) => setLocalStatus(prev => ({ ...prev, [id]: val }))

  return (
    <div className="mp-layout">
      <AppSidebar user={user} appointmentId={appointmentId} onLogout={() => doLogout().then(() => navigate({ to: '/login' }))} />
      <main className="mp-main" style={{ position: 'relative' }}>
        
        {/* Floating voice button */}
        <div className="fixed top-10 right-10 flex flex-col items-center gap-2 z-50">
          <button type="button" onClick={() => isRecording ? stop() : start()} className={`mp-voice-btn ${isRecording ? 'recording' : ''}`}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.25}><path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" /></svg>
            <span>{isRecording ? 'СТОП' : 'ЗАПИС'}</span>
          </button>
          {isRecording && <span className="text-[10px] font-bold text-mp-danger animate-pulse">СЛУШАМ…</span>}
        </div>

        <div style={{ maxWidth: 1100 }}>
          {/* Header */}
          <div className="mb-8">
            <nav className="flex items-center gap-1.5 text-xs font-medium text-mp-text-muted mb-3">
              <Link to="/patients" className="hover:text-mp-green transition-colors text-decoration-none">Пациенти</Link>
              <span>›</span>
              <span className="text-mp-text font-semibold">Обективен Статус</span>
            </nav>
            <h1 className="text-4xl font-extrabold text-mp-text tracking-tight">Обективен Статус</h1>
            <p className="text-mp-text-muted mt-2 text-lg">Запишете жизнените показатели и клиничния преглед на пациента.</p>
          </div>

          <SessionRecordings appointmentId={appointmentId} patientId={patientId} onAnalysisComplete={applyAnalysis} />

          <div className="flex flex-col gap-8">
            {/* Vitals Card */}
            <div className="mp-card p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-mp-green-light flex items-center justify-center text-mp-green">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
                </div>
                <h2 className="text-xl font-bold text-mp-text">Витални показатели</h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
                {VITALS_FIELDS.map(f => (
                  <div key={f.id} className="flex flex-col gap-2">
                    <label htmlFor={f.id} className="mp-label">{f.label}</label>
                    <input
                      id={f.id}
                      type={f.type}
                      value={vitals[f.id] || ''}
                      onChange={e => setVitals(v => ({ ...v, [f.id]: e.target.value }))}
                      placeholder={f.placeholder}
                      className="mp-input h-12"
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* General Condition */}
              <div className="mp-card p-8">
                <h2 className="text-xl font-bold text-mp-text mb-6">Общо състояние</h2>
                <textarea
                  value={generalCondition}
                  onChange={e => setGeneralCondition(e.target.value)}
                  placeholder="Общо състояние, съзнание, ориентация, кожа, поведение…"
                  className="mp-input min-h-[160px] py-4 leading-relaxed"
                />
              </div>

              {/* Local Status */}
              <div className="mp-card p-8">
                <h2 className="text-xl font-bold text-mp-text mb-6">Локален статус</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {LOCAL_STATUS_FIELDS.map(f => (
                    <div key={f.id} className="flex flex-col gap-2">
                      <label htmlFor={`ls-${f.id}`} className="mp-label">{f.label}</label>
                      <input
                        id={`ls-${f.id}`}
                        value={localStatus[f.id] || ''}
                        onChange={e => setLocalStatus(v => ({ ...v, [f.id]: e.target.value }))}
                        placeholder={f.placeholder}
                        className="mp-input h-11"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Objective status */}
            <div className="mp-card p-8">
              <h2 className="text-xl font-bold text-mp-text mb-6">Обективен статус / Клинични находки</h2>
              <textarea
                value={objectiveStatus}
                onChange={e => setObjectiveStatus(e.target.value)}
                placeholder="Основно клинично описание на обективното състояние по системи…"
                className="mp-input min-h-[160px] py-4 leading-relaxed"
              />
            </div>

            {/* Quick tests & Observations */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
               <div className="mp-card p-8">
                  <h2 className="text-xl font-bold text-mp-text mb-6">Бързи изследвания</h2>
                  <div className="flex flex-col gap-5">
                    {QUICK_TEST_FIELDS.map(f => (
                      <div key={f.id} className="flex flex-col gap-2">
                        <label htmlFor={f.id} className="mp-label">{f.label}</label>
                        <input
                          id={f.id}
                          type={f.type}
                          value={vitals[f.id] || ''}
                          onChange={e => setVitals(v => ({ ...v, [f.id]: e.target.value }))}
                          placeholder={f.placeholder}
                          className="mp-input h-12"
                        />
                      </div>
                    ))}
                  </div>
               </div>
               <div className="mp-card p-8">
                  <h2 className="text-xl font-bold text-mp-text mb-6">Наблюдения и заключение</h2>
                  <div className="flex flex-col gap-6">
                    <div className="flex flex-col gap-2">
                      <label className="mp-label">КЛИНИЧНИ ВПЕЧАТЛЕНИЯ</label>
                      <textarea
                        value={doctorObservations}
                        onChange={e => setDoctorObservations(e.target.value)}
                        placeholder="Вашите бележки…"
                        className="mp-input min-h-[100px] py-3"
                      />
                    </div>
                    <div className="flex flex-col gap-2">
                      <label className="mp-label">ОБОБЩЕНИЕ НА ПРЕГЛЕДА</label>
                      <textarea
                        value={examSummary}
                        onChange={e => setExamSummary(e.target.value)}
                        placeholder="Кратко резюме за амбулаторния лист…"
                        className="mp-input min-h-[100px] py-3"
                      />
                    </div>
                  </div>
               </div>
            </div>
          </div>

          {/* Bottom actions */}
          <div className="mt-12 pt-8 border-t border-mp-border flex items-center justify-between flex-wrap gap-4">
            <Link 
              to="/session/$appointmentId/anamnesis" 
              params={{ appointmentId }}
              className="mp-btn-ghost h-14 px-8 text-decoration-none inline-flex items-center"
            >
              ← НАЗАД КЪМ АНАМНЕЗА
            </Link>
            <div className="flex items-center gap-4">
              {saveMsg && <span className="text-sm font-bold text-mp-green animate-in fade-in slide-in-from-right-4">{saveMsg}</span>}
              <button 
                type="button" 
                className="mp-btn-outline h-14 px-8" 
                onClick={handleSave} 
                disabled={isSaving}
              >
                {isSaving ? 'ЗАПАЗВАНЕ…' : 'ЗАПАЗИ'}
              </button>
              <button
                type="button"
                className="mp-btn-primary h-14 px-10 shadow-lg shadow-mp-green/20"
                onClick={async () => { await handleSave(); navigate({ to: '/session/$appointmentId/diagnosis', params: { appointmentId } }) }}
              >
                ПРОДЪЛЖИ КЪМ ДИАГНОЗА →
              </button>
            </div>
          </div>
        </div>

        <div className="h-20" />
      </main>
    </div>
  )
}
