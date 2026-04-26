import { createServerFn } from '@tanstack/react-start'
import { getSupabaseServerClient } from './supabase'

export interface VitalsData {
  appointment_id: string
  blood_pressure?: string
  pulse?: number
  temperature?: number
  spo2?: number
  weight?: number
  blood_glucose?: number
  urine_findings?: string
  other_quick_tests?: string
}

export interface PhysicalExamData {
  appointment_id: string
  general_condition?: string
  local_status?: Record<string, string>
  objective_status?: string
  doctor_observations?: string
  exam_summary?: string
}

export const saveVitalsFn = createServerFn({ method: 'POST' })
  .inputValidator((d: VitalsData) => d)
  .handler(async ({ data }): Promise<{ error: boolean; message: string }> => {
    const supabase = getSupabaseServerClient()
    const { data: user } = await supabase.auth.getUser()
    if (!user.user) return { error: true, message: 'Unauthorized' }

    // Upsert: delete existing and insert fresh (simpler than UPSERT on non-primary key)
    await supabase.from('appointment_vitals').delete().eq('appointment_id', data.appointment_id)
    const { error } = await supabase.from('appointment_vitals').insert(data)
    if (error) return { error: true, message: error.message }
    return { error: false, message: 'Saved' }
  })

export const getVitalsFn = createServerFn({ method: 'GET' })
  .inputValidator((d: { appointmentId: string }) => d)
  .handler(async ({ data }): Promise<{ error: boolean; message: string; data?: VitalsData }> => {
    const supabase = getSupabaseServerClient()
    const { data: result, error } = await supabase
      .from('appointment_vitals')
      .select('*')
      .eq('appointment_id', data.appointmentId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) return { error: true, message: error.message }
    return { error: false, message: 'OK', data: result || undefined }
  })

export const savePhysicalExamFn = createServerFn({ method: 'POST' })
  .inputValidator((d: PhysicalExamData) => d)
  .handler(async ({ data }): Promise<{ error: boolean; message: string }> => {
    const supabase = getSupabaseServerClient()
    const { data: user } = await supabase.auth.getUser()
    if (!user.user) return { error: true, message: 'Unauthorized' }

    const { data: existing } = await supabase
      .from('appointment_physical_exam')
      .select('id')
      .eq('appointment_id', data.appointment_id)
      .maybeSingle()

    if (existing?.id) {
      const { error } = await supabase.from('appointment_physical_exam')
        .update({ ...data, updated_at: new Date().toISOString() })
        .eq('id', existing.id)
      if (error) return { error: true, message: error.message }
    } else {
      const { error } = await supabase.from('appointment_physical_exam').insert(data)
      if (error) return { error: true, message: error.message }
    }
    return { error: false, message: 'Saved' }
  })

export const getPhysicalExamFn = createServerFn({ method: 'GET' })
  .inputValidator((d: { appointmentId: string }) => d)
  .handler(async ({ data }): Promise<{ error: boolean; message: string; data?: PhysicalExamData }> => {
    const supabase = getSupabaseServerClient()
    const { data: result, error } = await supabase
      .from('appointment_physical_exam')
      .select('*')
      .eq('appointment_id', data.appointmentId)
      .maybeSingle()

    if (error) return { error: true, message: error.message }
    return { error: false, message: 'OK', data: result || undefined }
  })
