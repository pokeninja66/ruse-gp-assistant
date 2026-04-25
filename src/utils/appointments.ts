import { createServerFn } from '@tanstack/react-start'
import { getSupabaseServerClient } from './supabase'

export const createAppointmentFn = createServerFn({ method: 'POST' })
  .inputValidator((d: { patientId: string }) => d)
  .handler(async ({ data }): Promise<{ error: boolean; message: string; appointmentId?: string }> => {
    const supabase = getSupabaseServerClient()
    const { data: userData, error: userError } = await supabase.auth.getUser()
    if (userError || !userData.user) return { error: true, message: 'Unauthorized' }

    const { data: appointment, error } = await supabase
      .from('appointments')
      .insert({
        patient_id: data.patientId,
        doctor_id: userData.user.id,
        status: 'pending',
        started_at: new Date().toISOString()
      })
      .select('id')
      .single()

    if (error) {
      console.error('[appointments] create error:', error)
      return { error: true, message: error.message }
    }

    return { error: false, message: 'Appointment created', appointmentId: appointment.id }
  })

export const getAppointmentFn = createServerFn({ method: 'GET' })
  .inputValidator((d: { appointmentId: string }) => d)
  .handler(async ({ data }): Promise<{ error: boolean; message: string; appointment?: any }> => {
    const supabase = getSupabaseServerClient()
    const { data: appointment, error } = await supabase
      .from('appointments')
      .select('*, patients(*)')
      .eq('id', data.appointmentId)
      .single()

    if (error) {
      return { error: true, message: error.message }
    }

    return { error: false, message: 'Success', appointment }
  })

export const getAppointmentResultsFn = createServerFn({ method: 'GET' })
  .inputValidator((d: { appointmentId: string }) => d)
  .handler(async ({ data }): Promise<{ error: boolean; message: string; data?: any }> => {
    const supabase = getSupabaseServerClient()
    
    // 1. Get the appointment
    const { data: appointment, error: aptError } = await supabase
      .from('appointments')
      .select('*, patients(*)')
      .eq('id', data.appointmentId)
      .single()

    if (aptError) return { error: true, message: aptError.message }

    // 2. Get the transcript
    const { data: transcripts } = await supabase
      .from('transcripts')
      .select('*')
      .eq('appointment_id', data.appointmentId)
      .order('created_at', { ascending: false })
      .limit(1)

    // 3. Get the extracted entities
    const { data: entities } = await supabase
      .from('extracted_entities')
      .select('*')
      .eq('appointment_id', data.appointmentId)

    // 4. Get the recommendations
    const { data: recommendations } = await supabase
      .from('recommendations')
      .select('*')
      .eq('appointment_id', data.appointmentId)
      .order('created_at', { ascending: false })
      .limit(1)

    return { 
      error: false, 
      message: 'Success', 
      data: {
        appointment,
        transcript: transcripts?.[0] || null,
        entities: entities || [],
        recommendation: recommendations?.[0] || null
      }
    }
  })

export const deleteAppointmentFn = createServerFn({ method: 'POST' })
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data }): Promise<{ error: boolean; message: string }> => {
    const supabase = getSupabaseServerClient()
    const { data: userData, error: userError } = await supabase.auth.getUser()
    if (userError || !userData.user) return { error: true, message: 'Unauthorized' }

    const { error } = await supabase
      .from('appointments')
      .delete()
      .eq('id', data.id)
      .eq('doctor_id', userData.user.id)

    if (error) {
      return { error: true, message: error.message }
    }

    return { error: false, message: 'Appointment deleted' }
  })

