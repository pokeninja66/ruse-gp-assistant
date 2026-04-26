import { createServerFn } from '@tanstack/react-start'
import { getSupabaseServerClient } from './supabase'

// ── Referrals ──────────────────────────────────────────────────────────
export interface ReferralData {
  id?: string
  appointment_id: string
  specialist_type: string
  reason?: string
  urgency?: 'routine' | 'urgent' | 'emergency'
  notes?: string
  status?: 'draft' | 'issued'
}

export const createReferralFn = createServerFn({ method: 'POST' })
  .inputValidator((d: Omit<ReferralData, 'id'>) => d)
  .handler(async ({ data }): Promise<{ error: boolean; message: string; data?: ReferralData }> => {
    const supabase = getSupabaseServerClient()
    const { data: result, error } = await supabase
      .from('specialist_referrals')
      .insert(data)
      .select()
      .single()
    if (error) return { error: true, message: error.message }
    return { error: false, message: 'Created', data: result }
  })

export const listReferralsFn = createServerFn({ method: 'GET' })
  .inputValidator((d: { appointmentId: string }) => d)
  .handler(async ({ data }): Promise<{ error: boolean; message: string; data?: ReferralData[] }> => {
    const supabase = getSupabaseServerClient()
    const { data: result, error } = await supabase
      .from('specialist_referrals')
      .select('*')
      .eq('appointment_id', data.appointmentId)
      .order('created_at', { ascending: true })
    if (error) return { error: true, message: error.message }
    return { error: false, message: 'OK', data: result || [] }
  })

export const deleteReferralFn = createServerFn({ method: 'POST' })
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data }): Promise<{ error: boolean; message: string }> => {
    const supabase = getSupabaseServerClient()
    const { error } = await supabase.from('specialist_referrals').delete().eq('id', data.id)
    if (error) return { error: true, message: error.message }
    return { error: false, message: 'Deleted' }
  })

// ── Test Orders ────────────────────────────────────────────────────────
export interface TestOrderData {
  id?: string
  appointment_id: string
  test_name: string
  test_type?: 'blood' | 'urine' | 'imaging' | 'ecg' | 'microbiology' | 'other'
  notes?: string
  status?: 'ordered' | 'completed' | 'cancelled'
}

export const createTestOrderFn = createServerFn({ method: 'POST' })
  .inputValidator((d: Omit<TestOrderData, 'id'>) => d)
  .handler(async ({ data }): Promise<{ error: boolean; message: string; data?: TestOrderData }> => {
    const supabase = getSupabaseServerClient()
    const { data: result, error } = await supabase
      .from('test_orders')
      .insert(data)
      .select()
      .single()
    if (error) return { error: true, message: error.message }
    return { error: false, message: 'Created', data: result }
  })

export const listTestOrdersFn = createServerFn({ method: 'GET' })
  .inputValidator((d: { appointmentId: string }) => d)
  .handler(async ({ data }): Promise<{ error: boolean; message: string; data?: TestOrderData[] }> => {
    const supabase = getSupabaseServerClient()
    const { data: result, error } = await supabase
      .from('test_orders')
      .select('*')
      .eq('appointment_id', data.appointmentId)
      .order('created_at', { ascending: true })
    if (error) return { error: true, message: error.message }
    return { error: false, message: 'OK', data: result || [] }
  })

export const deleteTestOrderFn = createServerFn({ method: 'POST' })
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data }): Promise<{ error: boolean; message: string }> => {
    const supabase = getSupabaseServerClient()
    const { error } = await supabase.from('test_orders').delete().eq('id', data.id)
    if (error) return { error: true, message: error.message }
    return { error: false, message: 'Deleted' }
  })

// ── Test Results ───────────────────────────────────────────────────────
export interface TestResultData {
  id?: string
  appointment_id: string
  test_order_id?: string
  test_name: string
  result_text?: string
  result_value?: number
  unit?: string
  reference_range?: string
  is_abnormal?: boolean
  notes?: string
  result_date?: string
}

export const saveTestResultFn = createServerFn({ method: 'POST' })
  .inputValidator((d: Omit<TestResultData, 'id'>) => d)
  .handler(async ({ data }): Promise<{ error: boolean; message: string; data?: TestResultData }> => {
    const supabase = getSupabaseServerClient()
    const { data: result, error } = await supabase
      .from('test_results')
      .insert(data)
      .select()
      .single()
    if (error) return { error: true, message: error.message }
    return { error: false, message: 'Saved', data: result }
  })

export const listTestResultsFn = createServerFn({ method: 'GET' })
  .inputValidator((d: { appointmentId: string }) => d)
  .handler(async ({ data }): Promise<{ error: boolean; message: string; data?: TestResultData[] }> => {
    const supabase = getSupabaseServerClient()
    const { data: result, error } = await supabase
      .from('test_results')
      .select('*')
      .eq('appointment_id', data.appointmentId)
      .order('created_at', { ascending: false })
    if (error) return { error: true, message: error.message }
    return { error: false, message: 'OK', data: result || [] }
  })

// ── Therapy Plans ──────────────────────────────────────────────────────
export interface TherapyPlanData {
  id?: string
  appointment_id: string
  plan_text: string
  source?: 'ai_suggested' | 'doctor_manual'
  patient_instructions?: string
  duration_days?: number
}

export const saveTherapyPlanFn = createServerFn({ method: 'POST' })
  .inputValidator((d: Omit<TherapyPlanData, 'id'>) => d)
  .handler(async ({ data }): Promise<{ error: boolean; message: string; data?: TherapyPlanData }> => {
    const supabase = getSupabaseServerClient()
    console.log('[clinical] saving therapy for appt:', data.appointment_id)
    // Replace existing plan
    const { error: delError } = await supabase.from('therapy_plans').delete().eq('appointment_id', data.appointment_id)
    if (delError) console.warn('[clinical] therapy delete error:', delError)

    const { data: result, error } = await supabase
      .from('therapy_plans')
      .insert(data)
      .select()
      .single()
    if (error) {
      console.error('[clinical] therapy save error:', error)
      return { error: true, message: error.message }
    }
    console.log('[clinical] therapy saved:', result.id)
    return { error: false, message: 'Saved', data: result }
  })

export const getTherapyPlanFn = createServerFn({ method: 'GET' })
  .inputValidator((d: { appointmentId: string }) => d)
  .handler(async ({ data }): Promise<{ error: boolean; message: string; data?: TherapyPlanData }> => {
    const supabase = getSupabaseServerClient()
    const { data: result, error } = await supabase
      .from('therapy_plans')
      .select('*')
      .eq('appointment_id', data.appointmentId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (error) return { error: true, message: error.message }
    return { error: false, message: 'OK', data: result || undefined }
  })

// ── Diagnoses ──────────────────────────────────────────────────────────
export interface AppointmentDiagnosisData {
  id?: string
  appointment_id: string
  diagnosis_name: string
  icd10_code?: string
  source?: 'ai_suggested' | 'doctor_confirmed' | 'doctor_manual' | 'ai_guess'
  confidence?: number
  notes?: string
  is_final?: boolean
}

export const saveDiagnosisFn = createServerFn({ method: 'POST' })
  .inputValidator((d: Omit<AppointmentDiagnosisData, 'id'>) => d)
  .handler(async ({ data }): Promise<{ error: boolean; message: string; data?: AppointmentDiagnosisData }> => {
    const supabase = getSupabaseServerClient()
    console.log('[clinical] saving diagnosis for appt:', data.appointment_id, data.diagnosis_name)
    // Mark all others as non-final if this is marked final
    if (data.is_final) {
      await supabase.from('appointment_diagnoses').update({ is_final: false }).eq('appointment_id', data.appointment_id)
    }
    const { data: result, error } = await supabase
      .from('appointment_diagnoses')
      .insert(data)
      .select()
      .single()
    if (error) {
      console.error('[clinical] diagnosis save error:', error)
      return { error: true, message: error.message }
    }
    console.log('[clinical] diagnosis saved:', result.id)
    return { error: false, message: 'Saved', data: result }
  })

export const listDiagnosesFn = createServerFn({ method: 'GET' })
  .inputValidator((d: { appointmentId: string }) => d)
  .handler(async ({ data }): Promise<{ error: boolean; message: string; data?: AppointmentDiagnosisData[] }> => {
    const supabase = getSupabaseServerClient()
    const { data: result, error } = await supabase
      .from('appointment_diagnoses')
      .select('*')
      .eq('appointment_id', data.appointmentId)
      .order('created_at', { ascending: false })
    if (error) return { error: true, message: error.message }
    return { error: false, message: 'OK', data: result || [] }
  })

export const deleteDiagnosisFn = createServerFn({ method: 'POST' })
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data }): Promise<{ error: boolean; message: string }> => {
    const supabase = getSupabaseServerClient()
    const { error } = await supabase.from('appointment_diagnoses').delete().eq('id', data.id)
    if (error) return { error: true, message: error.message }
    return { error: false, message: 'Deleted' }
  })

export const deleteTherapyPlanFn = createServerFn({ method: 'POST' })
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data }): Promise<{ error: boolean; message: string }> => {
    const supabase = getSupabaseServerClient()
    const { error } = await supabase.from('therapy_plans').delete().eq('id', data.id)
    if (error) return { error: true, message: error.message }
    return { error: false, message: 'Deleted' }
  })

export const deleteTestResultFn = createServerFn({ method: 'POST' })
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data }): Promise<{ error: boolean; message: string }> => {
    const supabase = getSupabaseServerClient()
    const { error } = await supabase.from('test_results').delete().eq('id', data.id)
    if (error) return { error: true, message: error.message }
    return { error: false, message: 'Deleted' }
  })

