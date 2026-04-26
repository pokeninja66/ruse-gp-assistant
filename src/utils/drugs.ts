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

export const listDrugsFn = createServerFn({ method: 'GET' })
  .inputValidator((d: { page?: number; limit?: number }) => d)
  .handler(async ({ data }): Promise<{ drugs: DrugCatalogueEntry[]; total: number }> => {
    const supabase = getSupabaseServerClient()
    const page = data.page || 0
    const limit = data.limit || 50
    
    const { data: drugs, error, count } = await supabase
      .from('drug_catalogue')
      .select('*', { count: 'exact' })
      .order('product_name', { ascending: true })
      .range(page * limit, (page + 1) * limit - 1)

    if (error) {
      return { drugs: [], total: 0 }
    }
    return { drugs: drugs as DrugCatalogueEntry[], total: count || 0 }
  })

export const seedDrugsFn = createServerFn({ method: 'POST' })
  .handler(async () => {
    // We'll import the seeder logic directly here or call it
    // For now, let's just use the supabase client to insert some initial data
    // to verify it works, then the user can run the full script if they want.
    // Actually, I'll try to import it if I can.
    try {
      const { DRUG_CATALOGUE } = await import('../docs/seedDrugCatalogue')
      const supabase = getSupabaseServerClient()
      
      const { error } = await supabase
        .from('drug_catalogue')
        .upsert(DRUG_CATALOGUE, { onConflict: 'product_name,atc_code' })

      if (error) throw error
      return { error: false, message: 'Seeding successful' }
    } catch (err: any) {
      return { error: true, message: err.message }
    }
  })

