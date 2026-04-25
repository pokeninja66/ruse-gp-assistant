import { createFileRoute, Link, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/')({
  beforeLoad: ({ context }) => {
    if (!context.user) {
      throw redirect({ to: '/login' })
    }
  },
  component: Dashboard,
})

function Dashboard() {
  return (
    <div className="min-h-[calc(100dvh-3.5rem)] bg-gray-950 p-6 sm:p-10">
      <div className="max-w-5xl mx-auto space-y-10">
        
        {/* Welcome Section */}
        <div>
          <h1 className="text-4xl font-bold text-white tracking-tight">Welcome to GP Assistant</h1>
          <p className="text-gray-400 mt-2 max-w-2xl text-lg">
            Manage your patients, record consultation sessions, and prescribe medications all from one centralized hub.
          </p>
        </div>

        {/* Quick Actions Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          <Link
            to="/recordings"
            className="group relative bg-white/5 border border-white/10 rounded-3xl p-6 overflow-hidden hover:bg-white/10 transition-all hover:scale-[1.02]"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-violet-500/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="relative z-10">
              <div className="w-12 h-12 rounded-2xl bg-violet-500/20 text-violet-400 flex items-center justify-center mb-6">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-white mb-2">Recordings</h2>
              <p className="text-gray-400 text-sm">
                Record new patient consultations and let the AI transcribe and extract medical entities automatically.
              </p>
            </div>
          </Link>

          <Link
            to="/patients"
            className="group relative bg-white/5 border border-white/10 rounded-3xl p-6 overflow-hidden hover:bg-white/10 transition-all hover:scale-[1.02]"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="relative z-10">
              <div className="w-12 h-12 rounded-2xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center mb-6">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-white mb-2">Patients</h2>
              <p className="text-gray-400 text-sm">
                Manage your patient roster, view full medical histories, past sessions, and current medications.
              </p>
            </div>
          </Link>

          <Link
            to="/drugs"
            className="group relative bg-white/5 border border-white/10 rounded-3xl p-6 overflow-hidden hover:bg-white/10 transition-all hover:scale-[1.02]"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="relative z-10">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center mb-6">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-white mb-2">Drug Catalogue</h2>
              <p className="text-gray-400 text-sm">
                Browse the national drug catalogue, check ATC codes, and prescribe medications directly.
              </p>
            </div>
          </Link>

        </div>

      </div>
    </div>
  )
}
