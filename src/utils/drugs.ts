import { createServerFn } from '@tanstack/react-start'
import { getSupabaseServerClient } from './supabase'

export interface DrugCatalogueEntry {
  id: string
  product_name: string
  active_substance: string | null
  atc_code: string | null
  source: 'bda' | 'ema' | 'custom' | null
  authorised_bg: boolean
  authorised_eu: boolean
  prescription_status: string | null
  dosage_form: string | null
  created_at: string
}

export const searchDrugsFn = createServerFn({ method: 'GET' })
  .inputValidator((d: { query?: string; atc_prefix?: string }) => d)
  .handler(async ({ data }): Promise<DrugCatalogueEntry[]> => {
    const authClient = getSupabaseServerClient()
    const { data: userData } = await authClient.auth.getUser()
    if (!userData.user) return []

    let query = authClient
      .from('drug_catalogue')
      .select('*')
      .order('product_name', { ascending: true })

    if (data.query) {
      // Search product name or active substance
      query = query.or(`product_name.ilike.%${data.query}%,active_substance.ilike.%${data.query}%`)
    }
    
    if (data.atc_prefix) {
      query = query.ilike('atc_code', `${data.atc_prefix}%`)
    }

    const { data: drugs, error } = await query.limit(50)

    if (error) {
      console.error('[drugs] search error:', error)
      return []
    }

    return drugs as DrugCatalogueEntry[]
  })
