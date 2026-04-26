import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import * as React from 'react'
import {
  listPatientsFn,
  createPatientFn,
  updatePatientFn,
  deletePatientFn,
  quickAddDevPatientFn,
  type Patient,
  type PatientExtendedInfo,
} from '../../utils/patients'
import { AppSidebar } from '../../components/AppSidebar'
import { logoutFn } from '../logout'

export const Route = createFileRoute('/_authed/patients/')({
  component: PatientsPage,
})

function PatientsPage() {
  const { user } = Route.useRouteContext()
  const doLogout = useServerFn(logoutFn)
  const doList = useServerFn(listPatientsFn)
  const doCreate = useServerFn(createPatientFn)
  const doUpdate = useServerFn(updatePatientFn)
  const doDelete = useServerFn(deletePatientFn)
  const doQuickAdd = useServerFn(quickAddDevPatientFn)
  const navigate = useNavigate()

  const [patients, setPatients] = React.useState<(Patient & { extended_info?: PatientExtendedInfo[] })[]>([])
  const [loading, setLoading] = React.useState(true)
  const [addingDev, setAddingDev] = React.useState(false)
  const [searchQuery, setSearchQuery] = React.useState('')

  // Modal state
  const [isModalOpen, setIsModalOpen] = React.useState(false)
  const [editingPatient, setEditingPatient] = React.useState<Patient | null>(null)
  
  // Form state
  const [firstName, setFirstName] = React.useState('')
  const [lastName, setLastName] = React.useState('')
  const [dob, setDob] = React.useState('')
  const [gender, setGender] = React.useState<'male' | 'female' | 'other'>('male')
  const [phone, setPhone] = React.useState('')
  const [email, setEmail] = React.useState('')
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  const loadPatients = React.useCallback(async () => {
    setLoading(true)
    const data = await doList().catch(() => [])
    setPatients(data)
    setLoading(false)
  }, [doList])

  React.useEffect(() => {
    loadPatients()
  }, [loadPatients])

  const handleQuickAdd = async () => {
    setAddingDev(true)
    await doQuickAdd()
    await loadPatients()
    setAddingDev(false)
  }

  const openNewModal = () => {
    setEditingPatient(null)
    setFirstName('')
    setLastName('')
    setDob('')
    setGender('male')
    setPhone('')
    setEmail('')
    setIsModalOpen(true)
  }

  const openEditModal = (patient: Patient) => {
    setEditingPatient(patient)
    setFirstName(patient.first_name)
    setLastName(patient.last_name)
    setDob(patient.dob)
    setGender(patient.gender)
    setPhone(patient.phone || '')
    setEmail(patient.email || '')
    setIsModalOpen(true)
  }

  const closeModal = () => {
    setIsModalOpen(false)
    setEditingPatient(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      if (editingPatient) {
        const { error } = await doUpdate({
          data: { id: editingPatient.id, first_name: firstName, last_name: lastName, dob, gender, phone, email },
        })
        if (!error) closeModal()
      } else {
        const { error } = await doCreate({
          data: { first_name: firstName, last_name: lastName, dob, gender, phone, email },
        })
        if (!error) closeModal()
      }
      await loadPatients()
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!window.confirm('Наистина ли искате да изтриете този пациент?')) return
    await doDelete({ data: { id } })
    setPatients((prev) => prev.filter((p) => p.id !== id))
  }

  const filteredPatients = patients.filter(p => 
    `${p.first_name} ${p.last_name}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.phone?.includes(searchQuery) ||
    p.email?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const calculateAge = (dobString: string) => {
    const birthday = new Date(dobString)
    const ageDifMs = Date.now() - birthday.getTime()
    const ageDate = new Date(ageDifMs)
    return Math.abs(ageDate.getUTCFullYear() - 1970)
  }

  return (
    <div className="mp-layout">
      <AppSidebar user={user} onLogout={() => doLogout().then(() => navigate({ to: '/login' }))} />
      <main className="mp-main">
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
            <div>
              <h1 className="text-4xl font-extrabold text-mp-text tracking-tight">Пациенти</h1>
              <p className="text-mp-text-muted mt-2 text-lg font-medium">Търсете и управлявайте електронните досиета на Вашите пациенти.</p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handleQuickAdd}
                disabled={addingDev}
                className="mp-btn-ghost h-12 px-5 text-sm"
              >
                {addingDev ? 'Добавяне...' : 'Dev: Бързо добавяне'}
              </button>
              <button
                onClick={openNewModal}
                className="mp-btn-primary h-12 px-6 shadow-lg shadow-mp-green/20"
              >
                + НОВ ПАЦИЕНТ
              </button>
            </div>
          </div>

          {/* Search Bar */}
          <div className="mp-card p-4 mb-8 flex items-center gap-4">
            <div className="relative flex-1">
              <svg className="absolute left-4 top-1/2 -translate-y-1/2 text-mp-text-subtle" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
              <input 
                type="text" 
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Търсене по име, телефон или имейл..." 
                className="mp-input pl-12 h-12 text-base"
              />
            </div>
          </div>

          {/* List */}
          {loading ? (
            <div className="flex justify-center items-center py-24">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-mp-green"></div>
            </div>
          ) : filteredPatients.length === 0 ? (
            <div className="mp-card p-20 text-center border-dashed">
              <div className="w-16 h-16 rounded-full bg-mp-bg flex items-center justify-center mx-auto mb-4 text-mp-text-subtle">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}><path d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" /></svg>
              </div>
              <h3 className="text-xl font-bold text-mp-text">Няма намерени пациенти</h3>
              <p className="text-mp-text-muted mt-2">Добавете нов пациент или коригирайте критериите за търсене.</p>
              <button onClick={openNewModal} className="mp-btn-primary mt-6 px-8">ДОБАВИ ПЪРВИ ПАЦИЕНТ</button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredPatients.map((patient) => (
                <div 
                  key={patient.id} 
                  className="mp-card p-6 hover:shadow-xl hover:border-mp-green/30 transition-all cursor-pointer group flex flex-col justify-between"
                  onClick={() => navigate({ to: '/patients/$patientId', params: { patientId: patient.id } })}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 rounded-2xl bg-mp-green-light text-mp-green flex items-center justify-center text-xl font-bold">
                        {patient.first_name[0]}{patient.last_name[0]}
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-mp-text group-hover:text-mp-green transition-colors leading-tight">
                          {patient.first_name} {patient.last_name}
                        </h3>
                        <p className="text-sm text-mp-text-muted mt-0.5">{calculateAge(patient.dob)} г. · {patient.gender === 'male' ? 'Мъж' : 'Жена'}</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-2.5 mb-6">
                    <div className="flex items-center gap-2.5 text-mp-text-subtle">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                      <span className="text-xs font-semibold">{patient.phone || 'Няма телефон'}</span>
                    </div>
                    <div className="flex items-center gap-2.5 text-mp-text-subtle">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><path d="m22 6-10 7L2 6"/></svg>
                      <span className="text-xs font-semibold truncate">{patient.email || 'Няма имейл'}</span>
                    </div>
                    {patient.extended_info && patient.extended_info.length > 0 && (
                      <div className="flex items-center gap-2.5 text-mp-text-subtle">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
                        <span className="text-xs font-semibold truncate text-mp-green-dark">
                          {patient.extended_info[0].address || 'Няма адрес'}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-mp-border/50">
                    <div className="flex items-center gap-2 relative z-10">
                      <button
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); openEditModal(patient) }}
                        className="w-10 h-10 flex items-center justify-center rounded-xl text-mp-text-subtle hover:text-mp-green hover:bg-mp-green-light transition-all active:scale-90"
                        title="Редактиране"
                      >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                      </button>
                      <button
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleDelete(patient.id) }}
                        className="w-10 h-10 flex items-center justify-center rounded-xl text-mp-text-subtle hover:text-mp-danger hover:bg-mp-danger-bg transition-all active:scale-90"
                        title="Изтриване"
                      >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M3 6h18m-2 0v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6m3 0V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                      </button>
                    </div>
                    <Link 
                      to="/patients/$patientId" 
                      params={{ patientId: patient.id }}
                      onClick={(e) => e.stopPropagation()}
                      className="text-xs font-bold text-mp-green tracking-wide hover:underline relative z-10"
                    >
                      ПЪЛНО ДОСИЕ →
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-mp-text/40 backdrop-blur-sm">
            <div className="w-full max-w-lg mp-card p-0 shadow-2xl animate-in zoom-in duration-200">
              <div className="p-6 border-b border-mp-border flex items-center justify-between bg-mp-bg/50">
                <h2 className="text-xl font-bold text-mp-text">
                  {editingPatient ? 'Редактиране на пациент' : 'Нов пациент'}
                </h2>
                <button onClick={closeModal} className="p-2 rounded-lg text-mp-text-subtle hover:text-mp-text hover:bg-mp-bg transition-colors">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M18 6L6 18M6 6l12 12"/></svg>
                </button>
              </div>
              
              <form onSubmit={handleSubmit} className="p-8">
                <div className="grid grid-cols-2 gap-6 mb-6">
                  <div className="space-y-1.5">
                    <label className="mp-label">ИМЕ</label>
                    <input required value={firstName} onChange={e => setFirstName(e.target.value)} className="mp-input h-12" placeholder="напр. Иван" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="mp-label">ФАМИЛИЯ</label>
                    <input required value={lastName} onChange={e => setLastName(e.target.value)} className="mp-input h-12" placeholder="напр. Иванов" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6 mb-6">
                  <div className="space-y-1.5">
                    <label className="mp-label">ДАТА НА РАЖДАНЕ</label>
                    <input required type="date" value={dob} onChange={e => setDob(e.target.value)} className="mp-input h-12" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="mp-label">ПОЛ</label>
                    <select required value={gender} onChange={e => setGender(e.target.value as any)} className="mp-input h-12">
                      <option value="male">Мъж</option>
                      <option value="female">Жена</option>
                      <option value="other">Друг</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1.5 mb-6">
                  <label className="mp-label">ИМЕЙЛ (ПО ИЗБОР)</label>
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="mp-input h-12" placeholder="example@mail.com" />
                </div>

                <div className="space-y-1.5 mb-8">
                  <label className="mp-label">ТЕЛЕФОН (ПО ИЗБОР)</label>
                  <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} className="mp-input h-12" placeholder="+359..." />
                </div>

                <div className="flex gap-4">
                  <button type="button" onClick={closeModal} className="mp-btn-ghost flex-1 h-12">ОТКАЗ</button>
                  <button type="submit" disabled={isSubmitting} className="mp-btn-primary flex-1 h-12">
                    {isSubmitting ? 'ЗАПИС...' : 'ЗАПАЗИ'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
