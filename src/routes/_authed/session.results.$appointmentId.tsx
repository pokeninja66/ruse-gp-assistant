import { createFileRoute, Link } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import * as React from 'react'
import { getAppointmentResultsFn } from '../../utils/appointments'

export const Route = createFileRoute('/_authed/session/results/$appointmentId')({
  component: SessionResultsPage,
})

function SessionResultsPage() {
  const { appointmentId } = Route.useParams()
  const doGetResults = useServerFn(getAppointmentResultsFn)
  
  const [data, setData] = React.useState<any>(null)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    async function load() {
      setLoading(true)
      const res = await doGetResults({ data: { appointmentId } })
      if (res.error) {
        setError(res.message)
      } else {
        setData(res.data)
      }
      setLoading(false)
    }
    load()
  }, [appointmentId, doGetResults])

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

  if (error || !data || !data.appointment) {
    return (
      <div className="min-h-[calc(100dvh-3.5rem)] bg-gray-950 flex flex-col items-center justify-center">
        <h1 className="text-xl text-white">Error loading results</h1>
        <p className="text-gray-400">{error}</p>
        <Link to="/patients" className="mt-4 px-4 py-2 bg-white/10 rounded-lg text-white">Back</Link>
      </div>
    )
  }

  const { appointment, transcript, entities, recommendation } = data

  const symptoms = entities.filter((e: any) => e.entity_type === 'symptom')
  const diagnoses = entities.filter((e: any) => e.entity_type === 'diagnosis')

  return (
    <div className="min-h-[calc(100dvh-3.5rem)] bg-gray-950 relative py-10 px-4">
      {/* Ambient background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden -z-0">
        <div className="absolute top-0 right-1/4 w-[500px] h-[500px] bg-cyan-600/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 left-1/4 w-[600px] h-[600px] bg-violet-600/5 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 max-w-5xl mx-auto">
        {/* Header */}
        <Link to="/patients/$patientId" params={{ patientId: appointment.patient_id }} className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors mb-6 group">
          <svg className="w-4 h-4 transition-transform group-hover:-translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
          </svg>
          Back to Patient Profile
        </Link>

        <div className="bg-white/4 border border-white/8 rounded-2xl p-6 md:p-8 mb-8 backdrop-blur-sm">
          <div className="flex justify-between items-start mb-2">
            <h1 className="text-3xl font-bold text-white tracking-tight">Session Results</h1>
            <span className="text-sm px-3 py-1 bg-green-500/10 text-green-400 border border-green-500/20 rounded-full font-medium">
              {appointment.status}
            </span>
          </div>
          <p className="text-gray-400">
            Consultation with <span className="text-white">{appointment.patients.first_name} {appointment.patients.last_name}</span> on {new Date(appointment.created_at).toLocaleString()}
          </p>
        </div>

        {/* AI Recommendation Hero */}
        {recommendation && (
          <div className="mb-8 p-6 rounded-2xl bg-gradient-to-br from-violet-600/20 to-cyan-600/20 border border-violet-500/20 backdrop-blur-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-50">
               <svg className="w-24 h-24 text-cyan-400/20" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
            </div>
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <svg className="w-6 h-6 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
              AI Recommendation
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10">
              <div>
                <p className="text-sm text-violet-200/70 mb-1 uppercase tracking-wider font-semibold">Suggested Action / Drug</p>
                <p className="text-xl text-white font-medium">{recommendation.drug_name}</p>
              </div>
              {recommendation.dosage && (
                <div>
                  <p className="text-sm text-violet-200/70 mb-1 uppercase tracking-wider font-semibold">Dosage & Frequency</p>
                  <p className="text-lg text-white">{recommendation.dosage} - {recommendation.frequency}</p>
                </div>
              )}
              <div className="md:col-span-2">
                <p className="text-sm text-violet-200/70 mb-1 uppercase tracking-wider font-semibold">Rationale</p>
                <p className="text-gray-300 leading-relaxed bg-black/20 p-4 rounded-xl border border-white/5">{recommendation.rationale}</p>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Transcript */}
          <div className="lg:col-span-2">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
              Transcript
            </h2>
            <div className="bg-white/4 border border-white/8 rounded-2xl p-6 h-[400px] overflow-y-auto custom-scrollbar text-gray-300 leading-relaxed text-sm whitespace-pre-wrap">
              {transcript ? transcript.raw_text : <span className="text-gray-600 italic">No transcript available.</span>}
            </div>
          </div>

          {/* Extracted Entities */}
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <svg className="w-5 h-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                Symptoms
              </h2>
              {symptoms.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {symptoms.map((s: any) => (
                    <span key={s.id} className="px-3 py-1.5 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20 text-sm flex items-center gap-1.5">
                      {s.value}
                      {s.attributes?.duration && <span className="opacity-60 text-xs">({s.attributes.duration})</span>}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500 italic">None detected</p>
              )}
            </div>

            <div>
              <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <svg className="w-5 h-5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75" /></svg>
                Diagnoses
              </h2>
              {diagnoses.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {diagnoses.map((d: any) => (
                    <span key={d.id} className="px-3 py-1.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20 text-sm">
                      {d.value}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500 italic">None detected</p>
              )}
            </div>
            
            {/* Other entities */}
            {entities.filter((e:any) => e.entity_type !== 'symptom' && e.entity_type !== 'diagnosis').length > 0 && (
               <div>
                  <h2 className="text-lg font-bold text-white mb-3 mt-6">Other Entities</h2>
                  <div className="flex flex-wrap gap-2">
                    {entities.filter((e:any) => e.entity_type !== 'symptom' && e.entity_type !== 'diagnosis').map((e: any) => (
                      <span key={e.id} className="px-3 py-1.5 rounded-lg bg-white/10 text-gray-300 border border-white/10 text-sm">
                        {e.value} <span className="opacity-50 text-xs uppercase ml-1">({e.entity_type})</span>
                      </span>
                    ))}
                  </div>
               </div>
            )}
          </div>
        </div>

      </div>
    </div>
  )
}
