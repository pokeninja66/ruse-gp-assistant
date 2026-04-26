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

export interface PatientExtendedInfo {
  id: string
  patient_id: string
  citizenship?: string
  address?: string
  insurance_status: 'insured' | 'uninsured' | 'unknown'
  gp_name?: string
  notes?: string
  updated_at: string
}

export const listPatientsFn = createServerFn({ method: 'GET' }).handler(
  async (): Promise<(Patient & { extended_info?: PatientExtendedInfo[] })[]> => {
    const supabase = getSupabaseServerClient()
    const { data, error } = await supabase
      .from('patients')
      .select('*, extended_info:patient_extended_info(*)')
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
  medications: PatientMedication[]
  appointments: any[]
  recordings: RecordingMeta[]
  extended_info?: PatientExtendedInfo
}

export const getPatientFn = createServerFn({ method: 'GET' })
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data }): Promise<{ error: boolean; message: string; patient?: PatientDetail }> => {
    const supabase = getSupabaseServerClient()
    
    // Get basic patient info
    const { data: patient, error } = await supabase
      .from('patients')
      .select(`
        *,
        medications:patient_medications(*),
        appointments:appointments(*),
        extended_info:patient_extended_info(*)
      `)
      .eq('id', data.id)
      .maybeSingle()

    if (error) {
      console.error('[patients] get error:', error)
      return { error: true, message: error.message }
    }

    if (!patient) {
      return { error: true, message: 'Patient not found' }
    }

    // Fetch recordings separately for reliability
    // 1. Direct patient_id match
    const { data: directRecordings } = await supabase
      .from('recordings')
      .select('*')
      .eq('patient_id', data.id)
    
    // 2. Also fetch recordings linked via appointments for this patient
    const appointmentIds = (patient.appointments || []).map((a: any) => a.id)
    let apptRecordings: any[] = []
    if (appointmentIds.length > 0) {
      const { data: apptRecs } = await supabase
        .from('recordings')
        .select('*')
        .in('appointment_id', appointmentIds)
      apptRecordings = apptRecs || []
    }

    // Merge and deduplicate
    const allRecordingsMap = new Map<string, any>()
    ;(directRecordings || []).forEach((r: any) => allRecordingsMap.set(r.id, r))
    apptRecordings.forEach((r: any) => allRecordingsMap.set(r.id, r))

    // Process recordings to add public URLs
    const admin = getSupabaseAdminClient()
    const enrichedRecordings = Array.from(allRecordingsMap.values()).map((rec: any) => ({
      ...rec,
      publicUrl: rec.storage_path 
        ? admin.storage.from('recordings').getPublicUrl(rec.storage_path).data.publicUrl 
        : undefined
    }))

    const enrichedPatient = {
      ...patient,
      recordings: enrichedRecordings,
      appointments: (patient.appointments || []).map((appt: any) => ({
        ...appt,
        recordings: enrichedRecordings.filter((rec: any) => rec.appointment_id === appt.id)
      }))
    }

    return { error: false, message: 'Success', patient: enrichedPatient as unknown as PatientDetail }
  })

export const saveExtendedInfoFn = createServerFn({ method: 'POST' })
  .inputValidator((d: { patientId: string; info: Partial<Omit<PatientExtendedInfo, 'id' | 'patient_id'>> }) => d)
  .handler(async ({ data }): Promise<{ error: boolean; message: string }> => {
    const supabase = getSupabaseServerClient()
    const { error } = await supabase
      .from('patient_extended_info')
      .upsert({
        patient_id: data.patientId,
        ...data.info,
        updated_at: new Date().toISOString()
      }, { onConflict: 'patient_id' })

    if (error) {
      return { error: true, message: error.message }
    }
    return { error: false, message: 'Saved' }
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

    const firstNames = ['Иван', 'Мария', 'Георги', 'Елена', 'Димитър', 'Николай', 'Петър', 'Йордан', 'Анна', 'Борис']
    const lastNames = ['Иванов(а)', 'Петров(а)', 'Георгиев(а)', 'Димитров(а)', 'Николов(а)', 'Стоянов(а)', 'Йорданов(а)']
    
    const randomItem = <T>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)]
    
    const dob = new Date(Date.now() - Math.floor(Math.random() * 50 * 365 * 24 * 60 * 60 * 1000)).toISOString().split('T')[0]
    const firstName = randomItem(firstNames)
    const rawLastName = randomItem(lastNames)
    const gender = firstName.endsWith('а') || firstName === 'Мария' || firstName === 'Анна' || firstName === 'Елена' ? 'female' : 'male'
    const lastName = rawLastName.replace('(а)', gender === 'female' ? 'а' : '')

    // 1. Create Patient
    const { data: patient, error: patientError } = await supabase
      .from('patients')
      .insert({
        created_by: userData.user.id,
        first_name: firstName,
        last_name: lastName,
        dob,
        gender,
        phone: '088' + Math.floor(1000000 + Math.random() * 9000000),
        email: `patient_${Math.floor(Math.random() * 10000)}@medportal.bg`,
      })
      .select('*')
      .single()

    if (patientError || !patient) return { error: true, message: patientError?.message || 'Failed to create patient' }

    // 1.5 Add Extended Info
    await supabase.from('patient_extended_info').insert({
      patient_id: patient.id,
      address: 'Ул. Тестова 123, София',
      citizenship: 'Българско',
      gp_name: 'Д-р Иванов',
      insurance_status: randomItem(['insured', 'uninsured', 'unknown'])
    })

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
export const getPatientFullHistoryFn = createServerFn({ method: 'GET' })
  .inputValidator((d: { patientId: string }) => d)
  .handler(async ({ data }): Promise<{ error: boolean; message: string; history?: any }> => {
    const supabase = getSupabaseServerClient()
    
    // 1. Get Patient
    const { data: patient } = await supabase.from('patients').select('*').eq('id', data.patientId).single()
    if (!patient) return { error: true, message: 'Patient not found' }

    // 2. Get Appointments
    const { data: appts } = await supabase.from('appointments').select('*').eq('patient_id', data.patientId).order('created_at', { ascending: false })

    // 3. Get Diagnoses
    const { data: diagnoses } = await supabase.from('appointment_diagnoses').select('*, appointments(patient_id)').eq('appointments.patient_id', data.patientId)
    // Filter because join might return all if not careful with PostgREST
    const filteredDiagnoses = (diagnoses || []).filter((d: any) => d.appointments?.patient_id === data.patientId)

    // 4. Get Therapy
    const { data: therapy } = await supabase.from('therapy_plans').select('*, appointments(patient_id)').eq('appointments.patient_id', data.patientId)
    const filteredTherapy = (therapy || []).filter((t: any) => t.appointments?.patient_id === data.patientId)

    // 5. Get Referrals
    const { data: referrals } = await supabase.from('referrals').select('*, appointments(patient_id)').eq('appointments.patient_id', data.patientId)
    const filteredReferrals = (referrals || []).filter((r: any) => r.appointments?.patient_id === data.patientId)

    // 6. Get Test Orders
    const { data: tests } = await supabase.from('test_orders').select('*, appointments(patient_id)').eq('appointments.patient_id', data.patientId)
    const filteredTests = (tests || []).filter((t: any) => t.appointments?.patient_id === data.patientId)

    // 7. Get Recordings
    const { data: recordings } = await supabase.from('recordings').select('*').eq('patient_id', data.patientId)

    return {
      error: false,
      message: 'Success',
      history: {
        patient,
        appointments: appts || [],
        diagnoses: filteredDiagnoses,
        therapy: filteredTherapy,
        referrals: filteredReferrals,
        testOrders: filteredTests,
        recordings: recordings || []
      }
    }
  })
