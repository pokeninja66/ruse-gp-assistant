import { createServerFn } from '@tanstack/react-start'
import { getSupabaseServerClient } from './supabase'

export interface AnamnesisData {
  id?: string
  appointment_id: string
  symptoms: { name: string; severity?: string; duration?: string }[]
  free_text: string
  onset_description: string
  comorbidities: string
  risk_factors: string
  current_meds_text: string
  allergies_text: string
  ai_summary?: string
  ai_generated_at?: string
}

export const saveAnamnesisFn = createServerFn({ method: 'POST' })
  .inputValidator((d: Omit<AnamnesisData, 'id'>) => d)
  .handler(async ({ data }): Promise<{ error: boolean; message: string; data?: AnamnesisData }> => {
    const supabase = getSupabaseServerClient()
    const { data: user } = await supabase.auth.getUser()
    if (!user.user) return { error: true, message: 'Unauthorized' }

    console.log('[anamnesis] saving for appointment:', data.appointment_id)
    
    // Check if appointment exists and belongs to doctor
    const { data: appointment, error: appError } = await supabase
      .from('appointments')
      .select('doctor_id')
      .eq('id', data.appointment_id)
      .single()
    
    if (appError || !appointment) {
      console.error('[anamnesis] appointment check failed:', appError)
      return { error: true, message: 'Appointment not found' }
    }

    if (appointment.doctor_id !== user.user.id) {
      console.error('[anamnesis] unauthorized access attempt')
      return { error: true, message: 'Unauthorized' }
    }

    // Manual Upsert
    const { data: existing } = await supabase
      .from('patient_anamnesis')
      .select('id')
      .eq('appointment_id', data.appointment_id)
      .maybeSingle()

    let result: any
    if (existing?.id) {
      const { data: updated, error: updateError } = await supabase
        .from('patient_anamnesis')
        .update({ ...data, updated_at: new Date().toISOString() })
        .eq('id', existing.id)
        .select()
        .single()
      if (updateError) {
        console.error('[anamnesis] update error:', updateError)
        return { error: true, message: updateError.message }
      }
      result = updated
    } else {
      const { data: inserted, error: insertError } = await supabase
        .from('patient_anamnesis')
        .insert(data)
        .select()
        .single()
      if (insertError) {
        console.error('[anamnesis] insert error:', insertError)
        return { error: true, message: insertError.message }
      }
      result = inserted
    }

    console.log('[anamnesis] saved successfully:', result.id)
    return { error: false, message: 'Saved', data: result }
  })

export const getAnamnesisFn = createServerFn({ method: 'GET' })
  .inputValidator((d: { appointmentId: string }) => d)
  .handler(async ({ data }): Promise<{ error: boolean; message: string; data?: AnamnesisData }> => {
    const supabase = getSupabaseServerClient()
    const { data: result, error } = await supabase
      .from('patient_anamnesis')
      .select('*')
      .eq('appointment_id', data.appointmentId)
      .maybeSingle()

    if (error) return { error: true, message: error.message }
    return { error: false, message: 'OK', data: result || undefined }
  })
