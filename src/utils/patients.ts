import { createServerFn } from '@tanstack/react-start'
import { getSupabaseServerClient } from './supabase'
import { getSupabaseAdminClient } from './supabaseAdmin'
import type { RecordingMeta } from './recordings'

export interface Patient {
  id: string
  created_by: string
  first_name: string
  last_name: string
  dob: string
  gender: 'male' | 'female' | 'other'
  phone?: string
  email?: string
  created_at: string
}

export const listPatientsFn = createServerFn({ method: 'GET' }).handler(
  async (): Promise<Patient[]> => {
    const supabase = getSupabaseServerClient()
    const { data, error } = await supabase
      .from('patients')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('[patients] list error:', error)
      return []
    }
    return data || []
  }
)

export const createPatientFn = createServerFn({ method: 'POST' })
  .inputValidator(
    (d: {
      first_name: string
      last_name: string
      dob: string
      gender: 'male' | 'female' | 'other'
      phone?: string
      email?: string
    }) => d
  )
  .handler(async ({ data }): Promise<{ error: boolean; message: string; patient?: Patient }> => {
    const supabase = getSupabaseServerClient()
    
    // Get the user ID
    const { data: userData, error: userError } = await supabase.auth.getUser()
    if (userError || !userData.user) {
      return { error: true, message: 'Unauthorized' }
    }

    // Fix FK constraint by ensuring profile exists
    await supabase.from('profiles').upsert({
      id: userData.user.id,
      email: userData.user.email,
      role: 'doctor'
    })

    const { data: newPatient, error } = await supabase
      .from('patients')
      .insert({
        created_by: userData.user.id,
        first_name: data.first_name,
        last_name: data.last_name,
        dob: data.dob,
        gender: data.gender,
        phone: data.phone,
        email: data.email,
      })
      .select('*')
      .single()

    if (error) {
      console.error('[patients] create error:', error)
      return { error: true, message: error.message }
    }

    return { error: false, message: 'Patient created', patient: newPatient }
  })

export const updatePatientFn = createServerFn({ method: 'POST' })
  .inputValidator(
    (d: {
      id: string
      first_name: string
      last_name: string
      dob: string
      gender: 'male' | 'female' | 'other'
      phone?: string
      email?: string
    }) => d
  )
  .handler(async ({ data }): Promise<{ error: boolean; message: string }> => {
    const supabase = getSupabaseServerClient()
    
    const { error } = await supabase
      .from('patients')
      .update({
        first_name: data.first_name,
        last_name: data.last_name,
        dob: data.dob,
        gender: data.gender,
        phone: data.phone,
        email: data.email,
      })
      .eq('id', data.id)

    if (error) {
      console.error('[patients] update error:', error)
      return { error: true, message: error.message }
    }

    return { error: false, message: 'Patient updated' }
  })

export const deletePatientFn = createServerFn({ method: 'POST' })
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data }): Promise<{ error: boolean; message: string }> => {
    const supabase = getSupabaseServerClient()
    
    const { error } = await supabase
      .from('patients')
      .delete()
      .eq('id', data.id)

    if (error) {
      console.error('[patients] delete error:', error)
      return { error: true, message: error.message }
    }

    return { error: false, message: 'Patient deleted' }
  })

// --- Patient Details Flow ---

export interface PatientAllergy {
  id: string
  substance: string
  severity: 'mild' | 'moderate' | 'severe' | 'unknown'
  certainty: 'suspected' | 'confirmed'
  created_at: string
}

export interface PatientCondition {
  id: string
  condition_name: string
  status: 'active' | 'resolved' | 'historical'
  diagnosed_date?: string
  created_at: string
}

export interface PatientMedication {
  id: string
  drug_name: string
  dosage?: string
  frequency?: string
  status: 'active' | 'discontinued'
  created_at: string
}

export interface PatientAppointment {
  id: string
  status: 'pending' | 'transcribed' | 'entities_extracted' | 'completed' | 'cancelled'
  scheduled_at?: string
  started_at?: string
  ended_at?: string
  created_at: string
  recordings?: RecordingMeta[]
}

export interface PatientDetail extends Patient {
  patient_allergies: PatientAllergy[]
  patient_conditions: PatientCondition[]
  patient_medications: PatientMedication[]
  appointments: PatientAppointment[]
}

export const getPatientFn = createServerFn({ method: 'GET' })
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data }): Promise<{ error: boolean; message: string; patient?: PatientDetail }> => {
    const supabase = getSupabaseServerClient()

    const { data: patient, error: patientError } = await supabase
      .from('patients')
      .select(`
        *,
        patient_allergies (*),
        patient_conditions (*),
        patient_medications (*),
        appointments (*)
      `)
      .eq('id', data.id)
      .single()

    if (patientError) {
      console.error('[patients] get error:', patientError)
      return { error: true, message: patientError.message }
    }

    // Fetch recordings for these appointments separately to avoid PostgREST relationship errors
    const admin = getSupabaseAdminClient()
    const apptIds = (patient.appointments || []).map((a: any) => a.id)
    
    let allRecordings: any[] = []
    if (apptIds.length > 0) {
      // @ts-ignore
      const { data: recs } = await (admin as any)
        .from('recordings')
        .select('*')
        .in('appointment_id', apptIds)
      
      allRecordings = recs || []
    }

    const enrichedPatient = {
      ...patient,
      appointments: (patient.appointments || []).map((appt: any) => ({
        ...appt,
        recordings: allRecordings
          .filter(rec => rec.appointment_id === appt.id)
          .map(rec => ({
            ...rec,
            publicUrl: admin.storage.from('recordings').getPublicUrl(rec.storage_path).data.publicUrl
          }))
      }))
    }

    return { error: false, message: 'Success', patient: enrichedPatient }
  })

export const quickAddDevPatientFn = createServerFn({ method: 'POST' })
  .handler(async (): Promise<{ error: boolean; message: string }> => {
    const supabase = getSupabaseServerClient()
    const { data: userData, error: userError } = await supabase.auth.getUser()
    
    if (userError || !userData.user) {
      return { error: true, message: 'Unauthorized' }
    }

    // Fix FK constraint by ensuring profile exists
    await supabase.from('profiles').upsert({
      id: userData.user.id,
      email: userData.user.email,
      role: 'doctor'
    })

    const firstNames = ['John', 'Jane', 'Alex', 'Sarah', 'Michael', 'Emily']
    const lastNames = ['Doe', 'Smith', 'Johnson', 'Williams', 'Brown', 'Jones']
    
    const randomItem = <T>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)]
    
    const dob = new Date(Date.now() - Math.floor(Math.random() * 50 * 365 * 24 * 60 * 60 * 1000)).toISOString().split('T')[0]

    // 1. Create Patient
    const { data: patient, error: patientError } = await supabase
      .from('patients')
      .insert({
        created_by: userData.user.id,
        first_name: randomItem(firstNames),
        last_name: randomItem(lastNames),
        dob,
        gender: randomItem(['male', 'female', 'other']),
        phone: '555-01' + Math.floor(Math.random() * 100),
        email: `devtest${Math.floor(Math.random() * 10000)}@example.com`,
      })
      .select('*')
      .single()

    if (patientError || !patient) return { error: true, message: patientError?.message || 'Failed to create patient' }

    // 2. Add Allergies
    const allergies = [
      { substance: 'Penicillin', severity: 'severe', certainty: 'confirmed' },
      { substance: 'Peanuts', severity: 'mild', certainty: 'suspected' },
      { substance: 'Latex', severity: 'moderate', certainty: 'confirmed' }
    ]
    const numAllergies = Math.floor(Math.random() * 3)
    if (numAllergies > 0) {
      await supabase.from('patient_allergies').insert(
        allergies.slice(0, numAllergies).map(a => ({ patient_id: patient.id, ...a }))
      )
    }

    // 3. Add Conditions
    const conditions = [
      { condition_name: 'Type 2 Diabetes', status: 'active', diagnosed_date: '2020-05-15' },
      { condition_name: 'Hypertension', status: 'active', diagnosed_date: '2019-11-20' },
      { condition_name: 'Asthma', status: 'resolved', diagnosed_date: '2010-01-01' }
    ]
    const numCond = Math.floor(Math.random() * 3) + 1 // Always at least 1
    await supabase.from('patient_conditions').insert(
      conditions.slice(0, numCond).map(c => ({ patient_id: patient.id, ...c }))
    )

    // 4. Add Medications
    const medications = [
      { drug_name: 'Metformin', dosage: '500mg', frequency: 'twice daily', status: 'active' },
      { drug_name: 'Lisinopril', dosage: '10mg', frequency: 'once daily', status: 'active' },
      { drug_name: 'Albuterol Inhaler', dosage: '2 puffs', frequency: 'as needed', status: 'discontinued' }
    ]
    const numMeds = Math.floor(Math.random() * 3)
    if (numMeds > 0) {
      await supabase.from('patient_medications').insert(
        medications.slice(0, numMeds).map(m => ({ patient_id: patient.id, ...m }))
      )
    }

    // 5. Add Appointments
    const pastDate = new Date(Date.now() - Math.floor(Math.random() * 30 * 24 * 60 * 60 * 1000)).toISOString()
    await supabase.from('appointments').insert([
      {
        patient_id: patient.id,
        doctor_id: userData.user.id,
        status: 'completed',
        started_at: pastDate,
        ended_at: new Date(new Date(pastDate).getTime() + 30 * 60000).toISOString(), // +30 mins
      },
      {
        patient_id: patient.id,
        doctor_id: userData.user.id,
        status: 'pending',
        scheduled_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // next week
      }
    ])

    return { error: false, message: 'Dev patient created successfully' }
  })

export const addMedicationFn = createServerFn({ method: 'POST' })
  .inputValidator(
    (d: { patientId: string; drugName: string; atcCode?: string; dosage?: string; frequency?: string }) => d,
  )
  .handler(async ({ data }) => {
    const admin = getSupabaseAdminClient()
    const { error } = await (admin as any).from('patient_medications').insert({
      patient_id: data.patientId,
      drug_name: data.drugName,
      atc_code: data.atcCode || null,
      dosage: data.dosage || null,
      frequency: data.frequency || null,
      status: 'active',
    })

    if (error) {
      console.error('[patients] add medication error:', error)
      return { error: true, message: error.message }
    }
    return { error: false, message: 'Success' }
  })
