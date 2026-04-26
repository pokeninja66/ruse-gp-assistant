import { createFileRoute, useNavigate, Link } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import * as React from 'react'
import { AppSidebar } from '../../components/AppSidebar'
import { logoutFn } from '../logout'
import { createTestOrderFn, listTestOrdersFn, deleteTestOrderFn, TestOrderData } from '../../utils/clinical'
import { transcribeAudioFn, analyzeConsultationFn } from '../../utils/ai'
import { uploadRecordingFn } from '../../utils/recordings'
import { getAppointmentFn } from '../../utils/appointments'
import { useAudioRecorder } from '../../hooks/useAudioRecorder'
import { blobToBase64 } from '../../utils/audio'

export const Route = createFileRoute('/_authed/session/$appointmentId/test-orders')({
  component: TestOrdersPage,
})

const PRESET_TESTS = [
  { name: 'ПКК (Пълна кръвна картина)', type: 'blood' as const },
  { name: 'Кръвна захар', type: 'blood' as const },
  { name: 'Липиден профил', type: 'blood' as const },
  { name: 'Чернодробни ензими (ASAT, ALAT)', type: 'blood' as const },
  { name: 'Бъбречни показатели', type: 'blood' as const },
  { name: 'Урина (ОАМ)', type: 'urine' as const },
  { name: 'ЕКГ', type: 'ecg' as const },
  { name: 'Рентгенова снимка на гръден кош', type: 'imaging' as const },
  { name: 'Ехография на корем', type: 'imaging' as const },
  { name: 'Гърлен секрет', type: 'microbiology' as const },
]

const TYPE_LABELS = { blood: 'Кръв', urine: 'Урина', imaging: 'Образна', ecg: 'ЕКГ', microbiology: 'Микробиол.', other: 'Друго' }

function TestOrdersPage() {
  const { appointmentId } = Route.useParams()
  const { user } = Route.useRouteContext()
  const navigate = useNavigate()
  const doLogout = useServerFn(logoutFn)
  const doCreate = useServerFn(createTestOrderFn)
  const doList = useServerFn(listTestOrdersFn)
  const doDelete = useServerFn(deleteTestOrderFn)
  const doGetAppointment = useServerFn(getAppointmentFn)
  const doUpload = useServerFn(uploadRecordingFn)
  const doTranscribe = useServerFn(transcribeAudioFn)
  const doAnalyze = useServerFn(analyzeConsultationFn)

  const { status, audioBlob, start, stop, reset, durationSeconds } = useAudioRecorder()

  const [orders, setOrders] = React.useState<TestOrderData[]>([])
  const [customTest, setCustomTest] = React.useState('')
  const [customType, setCustomType] = React.useState<TestOrderData['test_type']>('other')
  const [isAdding, setIsAdding] = React.useState(false)
  const [processingState, setProcessingState] = React.useState<string | null>(null)
  const [patientId, setPatientId] = React.useState<string | null>(null)
  const [patientName, setPatientName] = React.useState('')
  const [saveMsg, setSaveMsg] = React.useState('')

  const isRecording = status === 'recording'

  React.useEffect(() => {
    doGetAppointment({ data: { appointmentId } }).then(res => {
      if (res.appointment) {
        setPatientId(res.appointment.patient_id)
        setPatientName(`${res.appointment.patients.first_name} ${res.appointment.patients.last_name}`)
      }
    })
    doList({ data: { appointmentId } }).then(res => setOrders(res.data ?? [])).catch(() => {})
  }, [appointmentId])

  // Handle Recording End & AI Pipeline
  React.useEffect(() => {
    if (status === 'stopped' && audioBlob && patientId) {
      handleAudioProcess(audioBlob)
    }
  }, [status, audioBlob, patientId])

  const handleAudioProcess = async (blob: Blob) => {
    setProcessingState('Качване...')
    try {
      const base64 = await blobToBase64(blob)
      
      await doUpload({
        data: {
          base64,
          mimeType: blob.type,
          name: `Изследвания запис ${new Date().toLocaleString('bg-BG')}`,
          duration: durationSeconds,
          size: blob.size,
          appointmentId,
          patientId: patientId!
        }
      })

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

      if (!analyzeRes.error && analyzeRes.analysis?.entities) {
        const tests = analyzeRes.analysis.entities.filter((e: any) => e.entity_type === 'test_order')
        for (const t of tests) {
          if (!orders.some(o => o.test_name === t.value)) {
            await addOrder(t.value, t.attributes?.type || 'other', t.attributes?.notes)
          }
        }
        setSaveMsg('AI добави нови изследвания!')
        setTimeout(() => setSaveMsg(''), 5000)
      }
    } catch (err: any) {
      console.error('Audio processing failed:', err)
      setSaveMsg('Грешка: ' + err.message)
    } finally {
      setProcessingState(null)
      reset()
    }
  }

  const addOrder = async (name: string, type: TestOrderData['test_type'] = 'other', notes?: string) => {
    setIsAdding(true)
    try {
      const res = await doCreate({ data: { appointment_id: appointmentId, test_name: name, test_type: type, notes } })
      if (res.data) setOrders(prev => [...prev, res.data!])
    } finally {
      setIsAdding(false)
    }
  }

  const handleDeleteOrder = async (id: string) => {
    if (!window.confirm('Наистина ли искате да изтриете това изследване?')) return
    await doDelete({ data: { id } })
    setOrders(prev => prev.filter(o => o.id !== id))
  }

  const alreadyOrdered = (name: string) => orders.some(o => o.test_name === name)

  return (
    <div className="mp-layout">
      <AppSidebar user={user} appointmentId={appointmentId} patientId={patientId || undefined} patientName={patientName} onLogout={() => doLogout().then(() => navigate({ to: '/login' }))} />
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
          {isRecording && <span className="animate-pulse text-mp-danger text-xs font-bold">Слушам… ({durationSeconds}с)</span>}
          {processingState && <span className="text-mp-green-dark text-xs font-bold">{processingState}</span>}
        </div>

        <div style={{ maxWidth: 1100, paddingRight: '8rem' }}>
          <div className="mb-8">
            <nav className="flex items-center gap-1.5 text-xs font-medium text-mp-text-muted mb-3">
              <Link to="/patients" className="hover:text-mp-green transition-colors text-decoration-none">Пациенти</Link>
              <span>›</span>
              <span className="text-mp-text font-semibold">Изследвания</span>
            </nav>
            <h1 className="text-4xl font-extrabold text-mp-text tracking-tight">Назначаване на изследвания</h1>
            <p className="text-mp-text-muted mt-2 text-lg">Изберете от стандартни изследвания или добавете специфични такива.</p>
          </div>

          <div className="flex flex-col gap-8">
            {/* Quick Pick */}
            <div className="mp-card p-8">
              <h2 className="text-xl font-bold text-mp-text mb-6 flex items-center gap-2">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="text-mp-green"><path d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
                Бърз избор (Често използвани)
              </h2>
              <div className="flex flex-wrap gap-3">
                {PRESET_TESTS.map(t => {
                  const done = alreadyOrdered(t.name)
                  return (
                    <button
                      key={t.name}
                      type="button"
                      onClick={() => !done && addOrder(t.name, t.type)}
                      disabled={done || isAdding}
                      className={`h-12 px-5 rounded-xl text-sm font-bold border-2 transition-all flex items-center gap-2 ${
                        done ? 'bg-mp-green/10 border-mp-green/30 text-mp-green' : 'bg-white border-mp-border hover:border-mp-green text-mp-text-subtle hover:text-mp-green'
                      }`}
                    >
                      {done && <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3}><path d="M20 6L9 17l-5-5"/></svg>}
                      {t.name}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Custom add */}
            <div className="mp-card p-8">
              <h2 className="text-xl font-bold text-mp-text mb-6 flex items-center gap-2">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="text-mp-green"><path d="M12 4v16m8-8H4"/></svg>
                Друго изследване
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="md:col-span-2">
                  <label className="mp-label mb-2">ИМЕ НА ИЗСЛЕДВАНЕТО</label>
                  <input value={customTest} onChange={e => setCustomTest(e.target.value)} placeholder="напр. Витамин D..." className="mp-input h-14" />
                </div>
                <div>
                  <label className="mp-label mb-2">ТИП</label>
                  <select value={customType} onChange={e => setCustomType(e.target.value as any)} className="mp-input h-14">
                    {Object.entries(TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
                <div className="flex items-end">
                  <button onClick={() => { addOrder(customTest, customType); setCustomTest('') }} disabled={!customTest.trim() || isAdding} className="mp-btn-primary w-full h-14">ДОБАВИ</button>
                </div>
              </div>
            </div>

            {/* List of ordered */}
            {orders.length > 0 && (
              <div className="space-y-4">
                <h2 className="text-xl font-bold text-mp-text">Назначени изследвания ({orders.length})</h2>
                <div className="mp-card overflow-hidden">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-mp-bg border-b border-mp-border">
                      <tr>
                        <th className="px-6 py-4 text-[10px] font-extrabold text-mp-text-muted uppercase tracking-widest">Име</th>
                        <th className="px-6 py-4 text-[10px] font-extrabold text-mp-text-muted uppercase tracking-widest text-center">Тип</th>
                        <th className="px-6 py-4 text-[10px] font-extrabold text-mp-text-muted uppercase tracking-widest">Бележки</th>
                        <th className="px-6 py-4"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-mp-border">
                      {orders.map(o => (
                        <tr key={o.id} className="hover:bg-mp-bg/50 transition-colors group">
                          <td className="px-6 py-4 font-bold text-mp-text">{o.test_name}</td>
                          <td className="px-6 py-4 text-center">
                            <span className="text-[10px] font-extrabold text-mp-text-subtle bg-mp-bg px-2 py-1 rounded-md border border-mp-border uppercase">
                              {TYPE_LABELS[o.test_type || 'other']}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-mp-text-muted italic">{o.notes || '—'}</td>
                          <td className="px-6 py-4 text-right">
                            <button onClick={() => handleDeleteOrder(o.id!)} className="p-2 text-mp-text-subtle hover:text-mp-danger hover:bg-mp-danger-bg rounded-lg transition-colors">
                               <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M3 6h18m-2 0v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6m3 0V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          <div className="mt-12 pt-8 border-t border-mp-border flex items-center justify-between flex-wrap gap-4">
            <Link to={`/session/${appointmentId}/referral`} className="mp-btn-ghost h-14 px-8 text-decoration-none inline-flex items-center">
              ← НАЗАД КЪМ НАПРАВЛЕНИЯ
            </Link>
            <div className="flex items-center gap-4">
              {saveMsg && <span className="text-sm font-bold text-mp-green-dark">{saveMsg}</span>}
              <button 
                onClick={() => navigate({ to: `/session/${appointmentId}/documents` })}
                className="mp-btn-primary h-14 px-12 text-decoration-none inline-flex items-center shadow-lg shadow-mp-green/20"
              >
                ПРОДЪЛЖИ КЪМ ДОКУМЕНТИ →
              </button>
            </div>
          </div>
        </div>

        <div className="h-20" />
      </main>
    </div>
  )
}
