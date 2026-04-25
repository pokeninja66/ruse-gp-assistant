import { createFileRoute, Link } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import * as React from 'react'
import {
  listPatientsFn,
  createPatientFn,
  updatePatientFn,
  deletePatientFn,
  quickAddDevPatientFn,
  type Patient,
} from '../../utils/patients'

export const Route = createFileRoute('/_authed/patients')({
  component: PatientsPage,
})

function PatientsPage() {
  const doList = useServerFn(listPatientsFn)
  const doCreate = useServerFn(createPatientFn)
  const doUpdate = useServerFn(updatePatientFn)
  const doDelete = useServerFn(deletePatientFn)
  const doQuickAdd = useServerFn(quickAddDevPatientFn)

  const [patients, setPatients] = React.useState<Patient[]>([])
  const [loading, setLoading] = React.useState(true)
  const [addingDev, setAddingDev] = React.useState(false)

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
        if (!error) {
          await loadPatients()
          closeModal()
        }
      } else {
        const { error } = await doCreate({
          data: { first_name: firstName, last_name: lastName, dob, gender, phone, email },
        })
        if (!error) {
          await loadPatients()
          closeModal()
        }
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this patient?')) return
    await doDelete({ data: { id } })
    setPatients((prev) => prev.filter((p) => p.id !== id))
  }

  return (
    <div className="min-h-[calc(100dvh-3.5rem)] bg-gray-950 relative">
      {/* Ambient background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden -z-0">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-violet-600/8 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-cyan-600/6 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 max-w-5xl mx-auto px-4 py-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Patients</h1>
            <p className="text-sm text-gray-500 mt-1">
              Manage your patient records securely
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleQuickAdd}
              disabled={addingDev}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 text-sm font-medium transition-all border border-white/10 disabled:opacity-50"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              {addingDev ? 'Adding...' : 'Dev: Quick Add'}
            </button>
            <button
              onClick={openNewModal}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-violet-600 to-cyan-600 hover:from-violet-500 hover:to-cyan-500 text-white text-sm font-medium transition-all shadow-lg shadow-violet-500/20"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              Add Patient
            </button>
          </div>
        </div>

        {/* List */}
        <div className="bg-white/4 border border-white/8 rounded-2xl overflow-hidden">
          {loading ? (
            <div className="flex justify-center items-center py-16">
              <svg className="animate-spin w-6 h-6 text-violet-400" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
              </svg>
            </div>
          ) : patients.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-14 h-14 rounded-2xl bg-white/4 border border-white/8 flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
                </svg>
              </div>
              <p className="text-gray-500 text-sm">No patients found</p>
              <p className="text-gray-600 text-xs mt-1">Add your first patient to get started</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-white/10 bg-white/5 text-xs text-gray-400 uppercase tracking-wider">
                    <th className="px-6 py-4 font-medium">Name</th>
                    <th className="px-6 py-4 font-medium">DOB</th>
                    <th className="px-6 py-4 font-medium">Gender</th>
                    <th className="px-6 py-4 font-medium">Contact</th>
                    <th className="px-6 py-4 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {patients.map((patient) => (
                    <tr key={patient.id} className="group hover:bg-white/5 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-600/50 to-cyan-600/50 flex items-center justify-center text-xs font-bold text-white uppercase border border-white/10">
                            {patient.first_name[0]}{patient.last_name[0]}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-white">{patient.first_name} {patient.last_name}</p>
                            <p className="text-xs text-gray-500">ID: {patient.id.slice(0, 8)}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-300">
                        {new Date(patient.dob).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-white/10 text-gray-300 capitalize">
                          {patient.gender}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-400">
                        <div className="flex flex-col gap-1">
                          {patient.email && <span>{patient.email}</span>}
                          {patient.phone && <span>{patient.phone}</span>}
                          {!patient.email && !patient.phone && <span className="text-gray-600 italic">None</span>}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Link
                            to="/patients/$patientId"
                            params={{ patientId: patient.id }}
                            className="p-1.5 rounded-lg text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/10 transition-colors"
                            title="View Profile"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                          </Link>
                          <button
                            onClick={() => openEditModal(patient)}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
                            title="Edit"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleDelete(patient.id)}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                            title="Delete"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md bg-gray-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-white/10 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">
                {editingPatient ? 'Edit Patient' : 'Add New Patient'}
              </h2>
              <button
                onClick={closeModal}
                className="p-1 rounded-lg text-gray-500 hover:text-white hover:bg-white/10 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-gray-400">First Name</label>
                    <input
                      required
                      type="text"
                      value={firstName}
                      onChange={e => setFirstName(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-gray-800 border border-white/10 text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/50"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-gray-400">Last Name</label>
                    <input
                      required
                      type="text"
                      value={lastName}
                      onChange={e => setLastName(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-gray-800 border border-white/10 text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/50"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-gray-400">Date of Birth</label>
                    <input
                      required
                      type="date"
                      value={dob}
                      onChange={e => setDob(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-gray-800 border border-white/10 text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/50 [color-scheme:dark]"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-gray-400">Gender</label>
                    <select
                      required
                      value={gender}
                      onChange={e => setGender(e.target.value as any)}
                      className="w-full px-3 py-2 rounded-xl bg-gray-800 border border-white/10 text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/50 appearance-none"
                    >
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-gray-400">Email Address (Optional)</label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-gray-800 border border-white/10 text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/50"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-gray-400">Phone Number (Optional)</label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-gray-800 border border-white/10 text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/50"
                  />
                </div>
              </div>

              <div className="mt-8 flex gap-3">
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-sm font-medium text-gray-300 transition-colors border border-white/10"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-cyan-600 hover:from-violet-500 hover:to-cyan-500 text-white text-sm font-medium transition-all shadow-lg shadow-violet-500/25 disabled:opacity-50"
                >
                  {isSubmitting ? 'Saving...' : 'Save Patient'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
