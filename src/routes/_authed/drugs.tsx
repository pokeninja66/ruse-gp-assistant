import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import * as React from 'react'
import { listDrugsFn, searchDrugsFn, seedDrugsFn, type DrugCatalogueEntry } from '../../utils/drugs'
import { AppSidebar } from '../../components/AppSidebar'
import { logoutFn } from '../logout'

export const Route = createFileRoute('/_authed/drugs')({
  component: DrugsPage,
})

function DrugsPage() {
  const { user } = Route.useRouteContext()
  const doLogout = useServerFn(logoutFn)
  const doList = useServerFn(listDrugsFn)
  const doSearch = useServerFn(searchDrugsFn)
  const doSeed = useServerFn(seedDrugsFn)
  const navigate = useNavigate()

  const [drugs, setDrugs] = React.useState<DrugCatalogueEntry[]>([])
  const [loading, setLoading] = React.useState(true)
  const [query, setQuery] = React.useState('')
  const [total, setTotal] = React.useState(0)
  const [isSeeding, setIsSeeding] = React.useState(false)

  const load = React.useCallback(async (q?: string) => {
    setLoading(true)
    if (q) {
      const res = await doSearch({ data: { query: q } })
      setDrugs(res)
      setTotal(res.length)
    } else {
      const res = await doList({ data: { limit: 100 } })
      setDrugs(res.drugs)
      setTotal(res.total)
    }
    setLoading(false)
  }, [doList, doSearch])

  React.useEffect(() => {
    load()
  }, [load])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    load(query)
  }

  const handleSeed = async () => {
    if (!confirm('Наистина ли искате да импортирате каталога с лекарства?')) return
    setIsSeeding(true)
    const res = await doSeed()
    setIsSeeding(false)
    if (res.error) alert(res.message)
    else {
      alert('Каталогът е импортиран успешно!')
      load()
    }
  }

  return (
    <div className="mp-layout">
      <AppSidebar user={user} onLogout={() => doLogout().then(() => navigate({ to: '/login' }))} />
      <main className="mp-main">
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          
          <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
            <div>
              <h1 className="text-3xl font-extrabold text-mp-text tracking-tight">Каталог на лекарствата</h1>
              <p className="text-mp-text-muted mt-1">Търсете лекарства, ATC кодове и фармацевтични форми.</p>
            </div>
            <div className="flex gap-3">
              {total === 0 && (
                <button 
                  onClick={handleSeed} 
                  disabled={isSeeding}
                  className="mp-btn-outline h-12 px-6 flex items-center gap-2"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>
                  {isSeeding ? 'Импортиране...' : 'Импортирай каталог'}
                </button>
              )}
            </div>
          </div>

          <form onSubmit={handleSearch} className="mb-8">
            <div className="relative">
              <input 
                value={query} 
                onChange={e => setQuery(e.target.value)}
                placeholder="Търсене по име, активно вещество или ATC код..." 
                className="mp-input h-16 pl-14 pr-40 text-lg shadow-sm"
              />
              <svg className="absolute left-5 top-1/2 -translate-y-1/2 text-mp-text-subtle" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
              <button type="submit" className="absolute right-3 top-3 bottom-3 mp-btn-primary px-8 text-sm font-bold">ТЪРСИ</button>
            </div>
          </form>

          <div className="mp-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-mp-bg border-b border-mp-border">
                  <tr>
                    <th className="p-4 text-[10px] font-bold text-mp-text-muted uppercase tracking-wider">Име на продукта</th>
                    <th className="p-4 text-[10px] font-bold text-mp-text-muted uppercase tracking-wider">Активно вещество</th>
                    <th className="p-4 text-[10px] font-bold text-mp-text-muted uppercase tracking-wider">ATC Код</th>
                    <th className="p-4 text-[10px] font-bold text-mp-text-muted uppercase tracking-wider">Форма</th>
                    <th className="p-4 text-[10px] font-bold text-mp-text-muted uppercase tracking-wider">Режим</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-mp-border">
                  {loading ? (
                    <tr>
                      <td colSpan={5} className="p-12 text-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-mp-green mx-auto"></div>
                      </td>
                    </tr>
                  ) : drugs.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-12 text-center text-mp-text-subtle font-medium">
                        Няма намерени лекарства. {total === 0 && 'Моля, импортирайте каталога.'}
                      </td>
                    </tr>
                  ) : (
                    drugs.map(drug => (
                      <tr key={drug.id} className="hover:bg-mp-bg/50 transition-colors group">
                        <td className="p-4">
                          <p className="font-bold text-mp-text group-hover:text-mp-green transition-colors">{drug.product_name}</p>
                        </td>
                        <td className="p-4">
                          <p className="text-sm text-mp-text-muted">{drug.active_substance}</p>
                        </td>
                        <td className="p-4">
                          <span className="text-[11px] font-bold bg-mp-bg px-2 py-1 rounded border border-mp-border text-mp-text-muted">{drug.atc_code}</span>
                        </td>
                        <td className="p-4">
                          <p className="text-xs text-mp-text-muted truncate max-w-[200px]">{drug.dosage_form}</p>
                        </td>
                        <td className="p-4">
                          {drug.prescription_status === 'prescription_only' ? (
                            <span className="text-[10px] font-bold text-mp-danger bg-mp-danger-bg px-2 py-1 rounded uppercase tracking-tighter">Рецепта</span>
                          ) : drug.prescription_status === 'otc' ? (
                            <span className="text-[10px] font-bold text-mp-green-dark bg-mp-green-light px-2 py-1 rounded uppercase tracking-tighter">Свободно</span>
                          ) : (
                            <span className="text-[10px] font-bold text-mp-text-subtle bg-mp-bg px-2 py-1 rounded uppercase tracking-tighter">{drug.prescription_status}</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            {total > 0 && !loading && (
              <div className="p-4 bg-mp-bg/30 border-t border-mp-border text-center">
                <p className="text-xs text-mp-text-muted">Показани са {drugs.length} от общо {total} лекарства</p>
              </div>
            )}
          </div>
        </div>
        <div style={{ height: '4rem' }} />
      </main>
    </div>
  )
}
