import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import * as React from 'react'
import { getPatientFn, addMedicationFn, saveExtendedInfoFn, type PatientDetail } from '../../utils/patients'
import { createAppointmentFn, deleteAppointmentFn } from '../../utils/appointments'
import { deleteRecordingFn } from '../../utils/recordings'
import { RecordingCard } from '../../components/RecordingCard'
import { AppSidebar } from '../../components/AppSidebar'
import { SessionRecordings } from '../../components/SessionRecordings'
import { logoutFn } from '../logout'
import { searchDrugsFn, type DrugCatalogueEntry } from '../../utils/drugs'

export const Route = createFileRoute('/_authed/patients/$patientId')({
  component: PatientDetailPage,
})

function PatientDetailPage() {
  const { patientId } = Route.useParams()
  const { user } = Route.useRouteContext()
  const navigate = useNavigate()
  const doGetPatient = useServerFn(getPatientFn)
  const doCreateAppointment = useServerFn(createAppointmentFn)
  const doSaveExtended = useServerFn(saveExtendedInfoFn)
  const doLogout = useServerFn(logoutFn)
  const doDeleteAppt = useServerFn(deleteAppointmentFn)
  const doDeleteRec = useServerFn(deleteRecordingFn)
  const doAddMed = useServerFn(addMedicationFn)
  const doSearchDrugs = useServerFn(searchDrugsFn)

  const [patient, setPatient] = React.useState<PatientDetail | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [startingSession, setStartingSession] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  // Med Modal
  const [showMedModal, setShowMedModal] = React.useState(false)
  const [medQuery, setMedQuery] = React.useState('')
  const [medResults, setMedResults] = React.useState<DrugCatalogueEntry[]>([])
  const [selectedDrug, setSelectedDrug] = React.useState<DrugCatalogueEntry | null>(null)
  const [dosage, setDosage] = React.useState('')
  const [frequency, setFrequency] = React.useState('')
  const [savingMed, setSavingMed] = React.useState(false)

  // Extended Info Edit
  const [isEditingExtended, setIsEditingExtended] = React.useState(false)
  const [extAddress, setExtAddress] = React.useState('')
  const [extCitizenship, setExtCitizenship] = React.useState('')
  const [extGP, setExtGP] = React.useState('')
  const [extInsurance, setExtInsurance] = React.useState<'insured' | 'uninsured' | 'unknown'>('unknown')
  const [isSavingExt, setIsSavingExt] = React.useState(false)

  const load = React.useCallback(async () => {
    setLoading(true)
    const res = await doGetPatient({ data: { id: patientId } })
    if (res.error) {
      setError(res.message)
    } else if (res.patient) {
      setPatient(res.patient)
      if (res.patient.extended_info) {
        setExtAddress(res.patient.extended_info.address || '')
        setExtCitizenship(res.patient.extended_info.citizenship || '')
        setExtGP(res.patient.extended_info.gp_name || '')
        setExtInsurance(res.patient.extended_info.insurance_status || 'unknown')
      }
    }
    setLoading(false)
  }, [patientId, doGetPatient])

  React.useEffect(() => {
    load()
  }, [load])

  // Med Search
  React.useEffect(() => {
    if (!medQuery) { setMedResults([]); return }
    const t = setTimeout(async () => {
      const res = await doSearchDrugs({ data: { query: medQuery } })
      setMedResults(res)
    }, 300)
    return () => clearTimeout(t)
  }, [medQuery, doSearchDrugs])

  const handleStartSession = async () => {
    setStartingSession(true)
    const res = await doCreateAppointment({ data: { patientId } })
    if (res.error) {
      alert(res.message)
      setStartingSession(false)
    } else if (res.appointmentId) {
      navigate({
        to: '/session/$appointmentId/anamnesis',
        params: { appointmentId: res.appointmentId }
      })
    }
  }

  const handleSaveExtended = async () => {
    setIsSavingExt(true)
    await doSaveExtended({
      data: {
        patientId,
        info: {
          address: extAddress,
          citizenship: extCitizenship,
          gp_name: extGP,
          insurance_status: extInsurance
        }
      }
    })
    setIsSavingExt(false)
    setIsEditingExtended(false)
    load()
  }

  const handleDeleteRecording = async (id: string, storagePath?: string) => {
    if (!window.confirm('Наистина ли искате да изтриете този запис?')) return
    const res = await doDeleteRec({ data: { id, storagePath } })
    if (res.error) alert(res.message)
    else load()
  }

  const handleDeleteAppointment = async (id: string) => {
    if (!window.confirm('Наистина ли искате да изтриете този медицински запис? Това ще изтрие и всички свързани записи и анализи.')) return
    const res = await doDeleteAppt({ data: { id } })
    if (res.error) alert(res.message)
    else load()
  }

  const handlePrescribe = async () => {
    if (!selectedDrug) return
    setSavingMed(true)
    const res = await doAddMed({
      data: {
        patientId,
        drugName: selectedDrug.product_name,
        atcCode: selectedDrug.atc_code || undefined,
        dosage: dosage || undefined,
        frequency: frequency || undefined,
      }
    })
    setSavingMed(false)
    if (res.error) alert(res.message)
    else { setShowMedModal(false); load() }
  }

  if (loading) {
    return (
      <div className="mp-layout">
        <AppSidebar user={user} onLogout={() => doLogout().then(() => navigate({ to: '/login' }))} />
        <main className="mp-main flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-mp-green"></div>
        </main>
      </div>
    )
  }

  if (!patient) {
    return (
      <div className="mp-layout">
        <AppSidebar user={user} onLogout={() => doLogout().then(() => navigate({ to: '/login' }))} />
        <main className="mp-main">
          <div className="mp-card p-8 text-center">
            <h1 className="text-xl font-bold text-mp-text">Пациентът не е намерен</h1>
            <Link to="/patients" className="mp-btn-ghost mt-4 inline-flex">Обратно към списъка</Link>
          </div>
        </main>
      </div>
    )
  }

  const calculateAge = (dob: string) => {
    const birthday = new Date(dob)
    const ageDifMs = Date.now() - birthday.getTime()
    const ageDate = new Date(ageDifMs)
    return Math.abs(ageDate.getUTCFullYear() - 1970)
  }

  return (
    <div className="mp-layout">
      <AppSidebar
        user={user}
        patientId={patientId}
        patientName={`${patient?.first_name} ${patient?.last_name}`}
        onLogout={() => doLogout().then(() => navigate({ to: '/login' }))}
      />
      <main className="mp-main">
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>

          {/* Breadcrumbs & Header */}
          <div className="mb-8">
            <nav className="flex items-center gap-1.5 text-sm font-medium text-mp-text-muted mb-4">
              <Link to="/patients" className="hover:text-mp-green transition-colors text-decoration-none">Пациенти</Link>
              <span>›</span>
              <span className="text-mp-text">Профил на пациент</span>
            </nav>

            <div className="flex items-start justify-between flex-wrap gap-4">
              <div className="flex items-center gap-5">
                <div className="w-20 h-20 rounded-2xl bg-mp-green-light flex items-center justify-center text-mp-green text-3xl font-bold">
                  {patient.first_name[0]}{patient.last_name[0]}
                </div>
                <div>
                  <h1 className="text-3xl font-extrabold text-mp-text tracking-tight leading-tight">
                    {patient.first_name} {patient.last_name}
                  </h1>
                  <div className="flex items-center gap-3 mt-1.5 text-mp-text-muted font-medium">
                    <span>{patient.gender === 'male' ? 'Мъж' : patient.gender === 'female' ? 'Жена' : 'Друг'}</span>
                    <span className="w-1 h-1 rounded-full bg-mp-border"></span>
                    <span>{calculateAge(patient.dob)} г. ({new Date(patient.dob).toLocaleDateString('bg-BG')})</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={handleStartSession}
                  disabled={startingSession}
                  className="mp-btn-primary h-14 px-8 text-base shadow-lg shadow-mp-green/20"
                >
                  {startingSession ? 'Стартиране...' : 'СТАРТИРАЙ ПРЕГЛЕД'}
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

            {/* Sidebar Column: Info & Meds */}
            <div className="lg:col-span-5 flex flex-col gap-8">

              {/* Contact Info Card */}
              <div className="mp-card p-6">
                <h3 className="text-xs font-bold text-mp-text-muted uppercase tracking-wider mb-4">Контактна информация</h3>
                <div className="flex flex-col gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-mp-bg flex items-center justify-center text-mp-text-muted">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" /></svg>
                    </div>
                    <span className="font-semibold text-mp-text">{patient.phone || 'Няма телефон'}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-mp-bg flex items-center justify-center text-mp-text-muted">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><path d="m22 6-10 7L2 6" /></svg>
                    </div>
                    <span className="font-semibold text-mp-text truncate">{patient.email || 'Няма имейл'}</span>
                  </div>
                </div>
              </div>

              <div className="mp-card p-6 relative">
                <div className="flex items-center justify-between gap-4 mb-4">
                  <h3 className="text-xs font-bold text-mp-text-muted uppercase tracking-wider">Допълнителни данни</h3>
                  {!isEditingExtended && (
                    <button onClick={() => setIsEditingExtended(true)} className="text-mp-green font-bold text-[10px] hover:underline shrink-0">РЕДАКТИРАЙ</button>
                  )}
                </div>

                {isEditingExtended ? (
                  <div className="flex flex-col gap-3">
                    <div>
                      <label className="mp-label text-[10px]">ГРАЖДАНСТВО</label>
                      <input value={extCitizenship} onChange={e => setExtCitizenship(e.target.value)} className="mp-input h-10 text-sm" placeholder="напр. Българско" />
                    </div>
                    <div>
                      <label className="mp-label text-[10px]">АДРЕС</label>
                      <input value={extAddress} onChange={e => setExtAddress(e.target.value)} className="mp-input h-10 text-sm" placeholder="Град, улица..." />
                    </div>
                    <div>
                      <label className="mp-label text-[10px]">ЛИЧЕН ЛЕКАР</label>
                      <input value={extGP} onChange={e => setExtGP(e.target.value)} className="mp-input h-10 text-sm" placeholder="Име на лекар" />
                    </div>
                    <div>
                      <label className="mp-label text-[10px]">ОСИГУРИТЕЛЕН СТАТУС</label>
                      <select value={extInsurance} onChange={e => setExtInsurance(e.target.value as any)} className="mp-input h-10 text-sm">
                        <option value="insured">Осигурен</option>
                        <option value="uninsured">Неосигурен</option>
                        <option value="unknown">Неизвестно</option>
                      </select>
                    </div>
                    <div className="flex gap-2 mt-2">
                      <button onClick={handleSaveExtended} disabled={isSavingExt} className="mp-btn-primary flex-1 h-10 text-xs">{isSavingExt ? 'Запис...' : 'ЗАПАЗИ'}</button>
                      <button onClick={() => setIsEditingExtended(false)} className="mp-btn-ghost flex-1 h-10 text-xs">ОТКАЗ</button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col gap-4">
                    <div>
                      <p className="text-[10px] font-bold text-mp-text-muted uppercase">Адрес</p>
                      <p className="text-sm font-semibold text-mp-text mt-0.5">{extAddress || 'Не е посочен'}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-[10px] font-bold text-mp-text-muted uppercase">Гражданство</p>
                        <p className="text-sm font-semibold text-mp-text mt-0.5">{extCitizenship || '—'}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-mp-text-muted uppercase">Осигурен</p>
                        <div className="mt-1">
                          {extInsurance === 'insured' ? <span className="mp-badge-ok">ДА</span> : extInsurance === 'uninsured' ? <span className="mp-badge-danger">НЕ</span> : <span className="text-mp-text-subtle text-xs">Неизвестно</span>}
                        </div>
                      </div>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-mp-text-muted uppercase">Личен Лекар</p>
                      <p className="text-sm font-semibold text-mp-text mt-0.5">{extGP || '—'}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Medications Card */}
              <div className="mp-card p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xs font-bold text-mp-text-muted uppercase tracking-wider">Текуща Терапия</h3>
                  <button onClick={() => setShowMedModal(true)} className="w-8 h-8 rounded-lg bg-mp-green/10 text-mp-green flex items-center justify-center hover:bg-mp-green/20 transition-colors">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><path d="M12 5v14M5 12h14" /></svg>
                  </button>
                </div>

                {patient.medications && patient.medications.length > 0 ? (
                  <div className="flex flex-col gap-3">
                    {patient.medications.filter(m => m.status === 'active').map(med => (
                      <div key={med.id} className="p-3 rounded-xl bg-mp-bg border border-mp-border/50">
                        <p className="text-sm font-bold text-mp-text">{med.drug_name}</p>
                        <div className="flex items-center gap-2 mt-1 text-xs text-mp-text-muted">
                          <span className="font-medium text-mp-green-dark bg-mp-green-light px-1.5 py-0.5 rounded uppercase tracking-wider">Активно</span>
                          {med.dosage && <span>{med.dosage}</span>}
                          {med.frequency && <span>· {med.frequency}</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-4 text-center border-2 border-dashed border-mp-border rounded-xl">
                    <p className="text-xs text-mp-text-subtle font-medium">Няма назначени лекарства</p>
                  </div>
                )}
              </div>

              {/* Recordings Card */}
              {/* <div className="mp-card p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xs font-bold text-mp-text-muted uppercase tracking-wider">Всички записи</h3>
                  <span className="bg-mp-bg px-2 py-0.5 rounded-full text-[10px] text-mp-text-muted font-bold">{patient.recordings?.length || 0}</span>
                </div>

                <div className="flex flex-col gap-3 max-h-[400px] overflow-y-auto pr-1">
                  {patient.recordings && patient.recordings.length > 0 ? (
                    patient.recordings.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).map(rec => (
                      <RecordingCard
                        key={rec.id}
                        recording={rec}
                        onDelete={() => handleDeleteRecording(rec.id, rec.storage_path)}
                      />
                    ))
                  ) : (
                    <div className="py-6 text-center border-2 border-dashed border-mp-border rounded-xl">
                      <p className="text-[11px] text-mp-text-subtle font-medium">Няма открити записи</p>
                    </div>
                  )}
                </div>
              </div> */}
            </div>

            {/* Main Column: Timeline / History */}
            <div className="lg:col-span-7">
              <h3 className="text-xs font-bold text-mp-text-muted uppercase tracking-wider mb-6 flex items-center gap-2">
                История на посещенията
                <span className="bg-mp-bg px-2 py-0.5 rounded-full text-[10px]">{patient.appointments?.length || 0}</span>
              </h3>

              {!patient.appointments || patient.appointments.length === 0 ? (
                <div className="mp-card p-12 text-center bg-mp-card-2 border-dashed">
                  <div className="w-16 h-16 rounded-full bg-mp-bg flex items-center justify-center mx-auto mb-4 text-mp-text-subtle">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}><path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  </div>
                  <h4 className="text-lg font-bold text-mp-text mb-1">Няма предишни прегледи</h4>
                  <p className="text-sm text-mp-text-muted max-w-xs mx-auto">Стартирайте първата си консултация с този пациент днес.</p>
                </div>
              ) : (
                <div className="relative pl-8 before:content-[''] before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-[2px] before:bg-mp-border">
                  {patient.appointments.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).map((appt, idx) => {
                    const date = new Date(appt.created_at)
                    return (
                      <div key={appt.id} className="relative mb-8 last:mb-0">
                        {/* Dot */}
                        <div className={`absolute -left-[27px] top-1.5 w-[12px] h-[12px] rounded-full border-2 border-white ${idx === 0 ? 'bg-mp-green ring-4 ring-mp-green/10' : 'bg-mp-border'}`}></div>

                        <div className="mp-card p-5 hover:shadow-md transition-shadow group">
                          <div className="flex items-start justify-between">
                            <div>
                              <p className="text-[10px] font-bold text-mp-green-dark uppercase tracking-wide">
                                {date.toLocaleDateString('bg-BG', { day: 'numeric', month: 'long', year: 'numeric' })}
                              </p>
                              <h4 className="text-base font-bold text-mp-text mt-1">Амбулаторен лист №{appt.id.slice(0, 6).toUpperCase()}</h4>
                            </div>
                            <div className="flex items-center gap-2">
                              {appt.recordings?.length > 0 && (
                                <span className="flex items-center gap-1 text-[10px] font-bold text-mp-danger bg-mp-danger-bg px-2 py-1 rounded">
                                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3}><path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" /><path d="M19 10v2a7 7 0 01-14 0v-2M12 19v4m-4 0h8" /></svg>
                                  {appt.recordings.length} ЗАПИСА
                                </span>
                              )}
                              <Link
                                to="/session/$appointmentId/results"
                                params={{ appointmentId: appt.id }}
                                className="mp-btn-outline h-9 px-4 text-xs group-hover:bg-mp-green group-hover:text-white group-hover:border-mp-green transition-all no-underline inline-flex items-center"
                              >
                                ПРЕГЛЕД
                              </Link>
                            </div>
                          </div>

                          {/* Quick status chips */}
                          <div className="flex flex-wrap gap-2 mt-4">
                            <span className="text-[11px] font-semibold text-mp-text-muted bg-mp-bg px-2 py-0.5 rounded border border-mp-border/50">Преглед</span>
                            {appt.status === 'completed' && <span className="text-[11px] font-semibold text-mp-green-dark bg-mp-green-light px-2 py-0.5 rounded">Завършен</span>}
                            {appt.status === 'pending' && <span className="text-[11px] font-semibold text-mp-warn bg-mp-warn-bg px-2 py-0.5 rounded">В процес</span>}
                          </div>

                          {/* Recordings List */}
                          {appt.recordings?.length > 0 && (
                            <div className="mt-4 pt-4 border-t border-mp-border/50 flex flex-col gap-2">
                              {appt.recordings.map((rec: any) => (
                                <div key={rec.id} className="flex items-center justify-between p-2 rounded-lg bg-mp-bg/50">
                                  <div className="flex items-center gap-2 overflow-hidden">
                                    <svg className="text-mp-danger shrink-0" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" /><path d="M19 10v2a7 7 0 01-14 0v-2M12 19v4m-4 0h8" /></svg>
                                    <span className="text-xs font-medium text-mp-text truncate">{rec.name}</span>
                                  </div>
                                  <div className="flex items-center gap-3">
                                    <span className="text-[10px] text-mp-text-subtle">{Math.round(rec.duration || 0)}s</span>
                                    <button
                                      onClick={() => handleDeleteRecording(rec.id, rec.storage_path)}
                                      className="text-mp-text-subtle hover:text-mp-danger transition-colors"
                                    >
                                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

              {/* Recordings Section */}
              <div className="mp-card p-8 mt-8">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-mp-danger/10 text-mp-danger flex items-center justify-center">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" /><path d="M19 10v2a7 7 0 01-14 0v-2M12 19v4m-4 0h8" /></svg>
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-mp-text">Аудио записи</h2>
                    <p className="text-sm text-mp-text-muted mt-0.5">Всички записи от консултации с този пациент.</p>
                  </div>
                </div>
                <SessionRecordings patientId={patientId} />
              </div>
            </div>
          </div>
        </div>

        {/* Medication Modal */}
        {showMedModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-mp-text/40 backdrop-blur-sm">
            <div className="mp-card w-full max-w-xl p-0 overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200">
              <div className="p-6 border-b border-mp-border bg-mp-bg/50 flex items-center justify-between">
                <h2 className="text-xl font-bold text-mp-text">Предписване на лекарство</h2>
                <button onClick={() => setShowMedModal(false)} className="text-mp-text-subtle hover:text-mp-text"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M18 6L6 18M6 6l12 12" /></svg></button>
              </div>
              <div className="p-6 flex flex-col gap-5">
                <div className="relative">
                  <label className="mp-label mb-1.5">ПОТЪРСЕТЕ В КАТАЛОГА</label>
                  <div className="relative">
                    <input
                      value={medQuery}
                      onChange={e => setMedQuery(e.target.value)}
                      placeholder="Име на лекарство или ATC код..."
                      className="mp-input h-14 pl-12"
                    />
                    <svg className="absolute left-4 top-1/2 -translate-y-1/2 text-mp-text-subtle" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>
                  </div>

                  {medResults.length > 0 && (
                    <div className="absolute top-[100%] left-0 right-0 mt-2 bg-white border border-mp-border rounded-xl shadow-xl z-10 max-h-64 overflow-y-auto">
                      {medResults.map(drug => (
                        <button
                          key={drug.id}
                          onClick={() => { setSelectedDrug(drug); setMedResults([]) }}
                          className="w-full text-left p-4 hover:bg-mp-bg border-b last:border-0 border-mp-border flex items-center justify-between"
                        >
                          <div>
                            <p className="font-bold text-mp-text">{drug.product_name}</p>
                            <p className="text-xs text-mp-text-muted mt-0.5">{drug.active_substance} · {drug.atc_code}</p>
                          </div>
                          <span className="text-[10px] font-bold text-mp-green-dark bg-mp-green-light px-2 py-1 rounded">ИЗБЕРИ</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {selectedDrug && (
                  <div className="p-4 rounded-xl bg-mp-green-light border border-mp-green/20 animate-in slide-in-from-top-2 duration-200">
                    <p className="text-xs font-bold text-mp-green-dark uppercase mb-1">ИЗБРАНО ЛЕКАРСТВО</p>
                    <p className="text-lg font-bold text-mp-text leading-tight">{selectedDrug.product_name}</p>
                    <p className="text-sm text-mp-text-muted mt-1">{selectedDrug.dosage_form}</p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="mp-label mb-1.5">ДОЗИРОВКА</label>
                    <input value={dosage} onChange={e => setDosage(e.target.value)} placeholder="напр. 500 мг" className="mp-input h-12" />
                  </div>
                  <div>
                    <label className="mp-label mb-1.5">ЧЕСТОТА</label>
                    <input value={frequency} onChange={e => setFrequency(e.target.value)} placeholder="напр. 2 пъти на ден" className="mp-input h-12" />
                  </div>
                </div>
              </div>
              <div className="p-6 border-t border-mp-border bg-mp-bg/30 flex gap-3">
                <button
                  onClick={handlePrescribe}
                  disabled={!selectedDrug || savingMed}
                  className="mp-btn-primary flex-1 h-12 text-sm font-bold"
                >
                  {savingMed ? 'ЗАПИСВАНЕ...' : 'ДОБАВИ КЪМ ТЕРАПИЯ'}
                </button>
                <button onClick={() => setShowMedModal(false)} className="mp-btn-ghost h-12 px-6 text-sm">ОТКАЗ</button>
              </div>
            </div>
          </div>
        )}

        <div style={{ height: '4rem' }} />
      </main>
    </div>
  )
}
