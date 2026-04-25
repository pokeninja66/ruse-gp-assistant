import { createFileRoute } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import * as React from 'react'
import { searchDrugsFn, type DrugCatalogueEntry } from '../../utils/drugs'

export const Route = createFileRoute('/_authed/drugs')({
  component: DrugsPage,
})

function DrugsPage() {
  const doSearch = useServerFn(searchDrugsFn)
  
  const [drugs, setDrugs] = React.useState<DrugCatalogueEntry[]>([])
  const [query, setQuery] = React.useState('')
  const [loading, setLoading] = React.useState(true)

  const load = React.useCallback(async (q: string) => {
    setLoading(true)
    const res = await doSearch({ data: { query: q } })
    setDrugs(res)
    setLoading(false)
  }, [doSearch])

  // Initial load
  React.useEffect(() => {
    load('')
  }, [load])

  // Debounced search
  React.useEffect(() => {
    const timer = setTimeout(() => {
      load(query)
    }, 300)
    return () => clearTimeout(timer)
  }, [query, load])

  return (
    <div className="min-h-[calc(100dvh-3.5rem)] bg-gray-950 p-4 sm:p-8">
      <div className="max-w-5xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white tracking-tight">Drug Catalogue</h1>
            <p className="text-gray-400 mt-2 text-sm max-w-xl">
              Search and browse the national drug catalogue. Filter by product name or active substance.
            </p>
          </div>
          
          <div className="relative w-full md:w-80 shrink-0">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search medications..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-gray-900 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-all"
            />
          </div>
        </div>

        {loading && drugs.length === 0 ? (
          <div className="flex justify-center py-20">
            <svg className="animate-spin h-8 w-8 text-violet-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </div>
        ) : drugs.length === 0 ? (
          <div className="py-20 text-center border-2 border-dashed border-white/5 rounded-2xl bg-white/[0.02]">
            <p className="text-gray-400">No drugs found matching "{query}"</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {drugs.map(drug => (
              <div key={drug.id} className="bg-white/4 border border-white/8 rounded-2xl p-5 hover:bg-white/6 transition-colors group flex flex-col h-full">
                <div className="flex justify-between items-start mb-3">
                  <h3 className="text-lg font-semibold text-white group-hover:text-violet-400 transition-colors line-clamp-2 leading-tight">
                    {drug.product_name}
                  </h3>
                  {drug.prescription_status === 'otc' ? (
                    <span className="shrink-0 ml-2 px-2 py-1 text-[10px] font-bold uppercase tracking-wider rounded bg-green-500/20 text-green-400 border border-green-500/30">
                      OTC
                    </span>
                  ) : drug.prescription_status === 'prescription_only' ? (
                    <span className="shrink-0 ml-2 px-2 py-1 text-[10px] font-bold uppercase tracking-wider rounded bg-blue-500/20 text-blue-400 border border-blue-500/30">
                      Rx
                    </span>
                  ) : (
                    <span className="shrink-0 ml-2 px-2 py-1 text-[10px] font-bold uppercase tracking-wider rounded bg-amber-500/20 text-amber-400 border border-amber-500/30">
                      Hosp
                    </span>
                  )}
                </div>
                
                <div className="text-sm text-gray-400 mb-4 flex-1">
                  <span className="font-medium text-gray-300">Active:</span> {drug.active_substance || 'N/A'}
                </div>

                <div className="flex flex-wrap items-center gap-2 mt-auto pt-4 border-t border-white/5">
                  <span className="text-xs px-2 py-1 rounded-md bg-white/5 text-gray-300 border border-white/5" title="ATC Code">
                    {drug.atc_code || 'Unknown ATC'}
                  </span>
                  <span className="text-xs px-2 py-1 rounded-md bg-white/5 text-gray-300 border border-white/5" title="Dosage Form">
                    {drug.dosage_form || 'Unknown form'}
                  </span>
                  
                  <div className="ml-auto flex gap-1">
                    {drug.authorised_eu && (
                      <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-900/40 text-blue-300 border border-blue-500/30 text-[10px] font-bold" title="EU Authorised">
                        EU
                      </span>
                    )}
                    {drug.authorised_bg && (
                      <span className="flex items-center justify-center w-6 h-6 rounded-full bg-green-900/40 text-green-300 border border-green-500/30 text-[10px] font-bold" title="BG Authorised">
                        BG
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
