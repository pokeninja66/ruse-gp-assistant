import { createFileRoute, Link, useParams } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import * as React from 'react'
import { getPatientFn, type PatientDetail } from '../../utils/patients'

export const Route = createFileRoute('/_authed/patients/$patientId')({
  component: PatientDetailPage,
})

function PatientDetailPage() {
  const { patientId } = Route.useParams()
  const doGetPatient = useServerFn(getPatientFn)
  
  const [patient, setPatient] = React.useState<PatientDetail | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    async function load() {
      setLoading(true)
      const res = await doGetPatient({ data: { id: patientId } })
      if (res.error) {
        setError(res.message)
      } else if (res.patient) {
        setPatient(res.patient)
      }
      setLoading(false)
    }
    load()
  }, [patientId, doGetPatient])

  if (loading) {
    return (
      <div className="min-h-[calc(100dvh-3.5rem)] bg-gray-950 flex items-center justify-center">
        <svg className="animate-spin w-8 h-8 text-violet-400" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
        </svg>
      </div>
    )
  }

  if (error || !patient) {
    return (
      <div className="min-h-[calc(100dvh-3.5rem)] bg-gray-950 flex flex-col items-center justify-center text-center p-6">
        <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mb-4">
          <svg className="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h1 className="text-xl font-bold text-white mb-2">Failed to load patient</h1>
        <p className="text-gray-400 mb-6">{error || 'Patient not found'}</p>
        <Link to="/patients" className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white text-sm font-medium transition-colors">
          Back to Patients
        </Link>
      </div>
    )
  }

  return (
    <div className="min-h-[calc(100dvh-3.5rem)] bg-gray-950 relative">
      {/* Ambient background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden -z-0">
        <div className="absolute top-0 right-1/4 w-[500px] h-[500px] bg-cyan-600/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 left-1/4 w-[600px] h-[600px] bg-violet-600/5 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 max-w-5xl mx-auto px-4 py-10">
        {/* Breadcrumb / Back button */}
        <Link to="/patients" className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors mb-6 group">
          <svg className="w-4 h-4 transition-transform group-hover:-translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
          </svg>
          Back to Patients
        </Link>

        {/* Header Profile Card */}
        <div className="bg-white/4 border border-white/8 rounded-2xl p-6 md:p-8 mb-8 backdrop-blur-sm flex flex-col md:flex-row md:items-center gap-6">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-violet-600 to-cyan-600 flex items-center justify-center text-2xl font-bold text-white uppercase shadow-lg shadow-violet-500/20 shrink-0">
            {patient.first_name[0]}{patient.last_name[0]}
          </div>
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-white tracking-tight">
              {patient.first_name} {patient.last_name}
            </h1>
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 mt-2 text-sm text-gray-400">
              <span className="flex items-center gap-1.5">
                <svg className="w-4 h-4 opacity-70" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                {new Date(patient.dob).toLocaleDateString()}
              </span>
              <span className="flex items-center gap-1.5 capitalize">
                <svg className="w-4 h-4 opacity-70" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                {patient.gender}
              </span>
              {(patient.email || patient.phone) && (
                <span className="flex items-center gap-1.5">
                  <svg className="w-4 h-4 opacity-70" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  {patient.email} {patient.email && patient.phone && '·'} {patient.phone}
                </span>
              )}
            </div>
          </div>
          <div className="shrink-0 flex gap-3">
             <button className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white text-sm font-medium transition-colors border border-white/10">
               Edit Patient
             </button>
             <button className="px-4 py-2 rounded-xl bg-gradient-to-r from-violet-600 to-cyan-600 hover:from-violet-500 hover:to-cyan-500 text-white text-sm font-medium transition-all shadow-lg shadow-violet-500/20">
               Start Session
             </button>
          </div>
        </div>

        {/* 3-Column Grid for Data */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Allergies */}
          <div className="bg-white/4 border border-white/8 rounded-2xl p-6 flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <svg className="w-5 h-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                Allergies
              </h2>
              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-white/10 text-gray-300">
                {patient.patient_allergies.length}
              </span>
            </div>
            {patient.patient_allergies.length === 0 ? (
              <p className="text-sm text-gray-500 italic mt-2">No known allergies recorded.</p>
            ) : (
              <ul className="space-y-3 mt-2 flex-1">
                {patient.patient_allergies.map(allergy => (
                  <li key={allergy.id} className="p-3 rounded-xl bg-white/5 border border-white/5 flex flex-col gap-1.5">
                    <div className="flex justify-between items-start">
                      <span className="font-medium text-gray-200">{allergy.substance}</span>
                      <span className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded flex-shrink-0 ${
                        allergy.severity === 'severe' ? 'bg-red-500/20 text-red-400' : 
                        allergy.severity === 'moderate' ? 'bg-amber-500/20 text-amber-400' : 'bg-gray-500/20 text-gray-400'
                      }`}>
                        {allergy.severity}
                      </span>
                    </div>
                    <div className="text-xs text-gray-500 flex items-center gap-1.5">
                       {allergy.certainty === 'confirmed' ? (
                          <svg className="w-3.5 h-3.5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                       ) : (
                          <svg className="w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                       )}
                       {allergy.certainty}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Conditions */}
          <div className="bg-white/4 border border-white/8 rounded-2xl p-6 flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <svg className="w-5 h-5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75" />
                </svg>
                Conditions
              </h2>
              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-white/10 text-gray-300">
                {patient.patient_conditions.length}
              </span>
            </div>
            {patient.patient_conditions.length === 0 ? (
              <p className="text-sm text-gray-500 italic mt-2">No underlying conditions recorded.</p>
            ) : (
              <ul className="space-y-3 mt-2 flex-1">
                {patient.patient_conditions.map(condition => (
                  <li key={condition.id} className="p-3 rounded-xl bg-white/5 border border-white/5 flex flex-col gap-1.5">
                    <div className="flex justify-between items-start">
                      <span className="font-medium text-gray-200">{condition.condition_name}</span>
                      <span className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded flex-shrink-0 ${
                        condition.status === 'active' ? 'bg-amber-500/20 text-amber-400' : 'bg-gray-500/20 text-gray-400'
                      }`}>
                        {condition.status}
                      </span>
                    </div>
                    {condition.diagnosed_date && (
                      <div className="text-xs text-gray-500">
                        Diagnosed: {new Date(condition.diagnosed_date).toLocaleDateString()}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Medications */}
          <div className="bg-white/4 border border-white/8 rounded-2xl p-6 flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <svg className="w-5 h-5 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                </svg>
                Medications
              </h2>
              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-white/10 text-gray-300">
                {patient.patient_medications.length}
              </span>
            </div>
            {patient.patient_medications.length === 0 ? (
              <p className="text-sm text-gray-500 italic mt-2">No current medications recorded.</p>
            ) : (
              <ul className="space-y-3 mt-2 flex-1">
                {patient.patient_medications.map(med => (
                  <li key={med.id} className="p-3 rounded-xl bg-white/5 border border-white/5 flex flex-col gap-1.5">
                    <div className="flex justify-between items-start">
                      <span className="font-medium text-gray-200">{med.drug_name}</span>
                      <span className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded flex-shrink-0 ${
                        med.status === 'active' ? 'bg-cyan-500/20 text-cyan-400' : 'bg-gray-500/20 text-gray-400'
                      }`}>
                        {med.status}
                      </span>
                    </div>
                    <div className="text-xs text-gray-500 flex flex-col">
                      {med.dosage && <span>Dose: {med.dosage}</span>}
                      {med.frequency && <span>Freq: {med.frequency}</span>}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

        </div>

        {/* Medical History (Appointments) */}
        <div className="mt-8 bg-white/4 border border-white/8 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-white flex items-center gap-2">
              <svg className="w-5 h-5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Medical History
            </h2>
            <button className="text-sm font-medium text-cyan-400 hover:text-cyan-300 transition-colors">
              View All
            </button>
          </div>
          
          {!patient.appointments || patient.appointments.length === 0 ? (
            <div className="py-8 text-center border-2 border-dashed border-white/5 rounded-xl">
              <p className="text-gray-500 text-sm">No past appointments found.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Sort by newest first */}
              {patient.appointments.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).map(appt => (
                <div key={appt.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 transition-colors gap-4">
                  <div className="flex items-start gap-4">
                    <div className={`mt-1 w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                      appt.status === 'completed' ? 'bg-green-500/10 text-green-400' :
                      appt.status === 'pending' ? 'bg-blue-500/10 text-blue-400' : 'bg-gray-500/10 text-gray-400'
                    }`}>
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-white font-medium">
                        {appt.status === 'completed' ? 'Completed Session' : 
                         appt.status === 'pending' ? 'Upcoming Appointment' : 'Session'}
                      </h3>
                      <p className="text-sm text-gray-400 mt-0.5">
                        {appt.started_at || appt.scheduled_at ? new Date(appt.started_at || appt.scheduled_at!).toLocaleString() : 'No date set'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md ${
                      appt.status === 'completed' ? 'bg-green-500/20 text-green-400' :
                      appt.status === 'pending' ? 'bg-blue-500/20 text-blue-400' : 'bg-gray-500/20 text-gray-400'
                    }`}>
                      {appt.status}
                    </span>
                    <button className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-xs font-medium text-white transition-colors border border-white/10">
                      Details
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
