import { createServerFn } from '@tanstack/react-start'
import { getSupabaseServerClient } from './supabase'
import OpenAI from 'openai'

// Initialize OpenAI client inside the handlers or here if we have env
// We'll create it dynamically so we can guarantee access to process.env
function getOpenAIClient() {
  // Use process.env for server-side secrets. 
  // Avoid import.meta.env.VITE_* as it may be inlined by the bundler.
  // Cloudflare Pages/Workers might not have process.env available unless nodejs_compat is on.
  const apiKey = 
    process.env?.OPENAI_API_KEY ||
    process.env?.VITE_OPENAI_API_KEY || 
    // @ts-ignore
    globalThis?.process?.env?.OPENAI_API_KEY ||
    // @ts-ignore
    globalThis?.process?.env?.VITE_OPENAI_API_KEY ||
    // @ts-ignore
    globalThis?.OPENAI_API_KEY ||
    // @ts-ignore
    import.meta.env?.VITE_OPENAI_API_KEY

  if (!apiKey) {
    throw new Error('Missing OpenAI API Key in environment variables. Please set OPENAI_API_KEY in your dashboard.')
  }
  return new OpenAI({ apiKey, dangerouslyAllowBrowser: false })
}

export const transcribeAudioFn = createServerFn({ method: 'POST' })
  .inputValidator((d: { base64: string; mimeType: string }) => d)
  .handler(async ({ data }): Promise<{ error: boolean; message: string; transcript?: string }> => {
    try {
      const openai = getOpenAIClient()
      
      // Convert base64 to File object
      const buffer = Buffer.from(data.base64, 'base64')
      
      // Provide a generic file name since it's required. Extension maps to mimeType.
      const extension = data.mimeType.includes('mp4') ? 'mp4' : 
                        data.mimeType.includes('mpeg') ? 'mp3' :
                        data.mimeType.includes('webm') ? 'webm' : 'wav'
      
      const file = new File([buffer], `audio.${extension}`, { type: data.mimeType })

      const response = await openai.audio.transcriptions.create({
        file,
        model: 'whisper-1',
        language: 'bg', // Assuming Bulgarian based on DB schema defaults, but Whisper can auto-detect
      })

      return { error: false, message: 'Transcription successful', transcript: response.text }
    } catch (err: any) {
      console.error('[ai] transcribe error:', err)
      return { error: true, message: err.message || 'Transcription failed' }
    }
  })

export const analyzeConsultationFn = createServerFn({ method: 'POST' })
  .inputValidator((d: { appointmentId: string; patientId: string; transcript: string }) => d)
  .handler(async ({ data }): Promise<{ error: boolean; message: string; analysis?: any }> => {
    const supabase = getSupabaseServerClient()
    const { data: userData, error: userError } = await supabase.auth.getUser()
    if (userError || !userData.user) return { error: true, message: 'Unauthorized' }

    // 1. Fetch Patient History
    const { data: patient } = await supabase
      .from('patients')
      .select('*, patient_allergies(*), patient_conditions(*), patient_medications(*)')
      .eq('id', data.patientId)
      .single()

    if (!patient) return { error: true, message: 'Patient not found' }

    // 2. Call OpenAI
    const openai = getOpenAIClient()
    
    const systemPrompt = `You are an expert medical AI assistant.
Analyze the following consultation transcript for a patient.
Patient Info: Name: ${patient.first_name} ${patient.last_name}, Age: ${new Date().getFullYear() - new Date(patient.dob).getFullYear()}, Gender: ${patient.gender}.
Known Allergies: ${patient.patient_allergies.map((a: any) => a.substance).join(', ') || 'None'}
Known Conditions: ${patient.patient_conditions.map((c: any) => c.condition_name).join(', ') || 'None'}
Current Medications: ${patient.patient_medications.map((m: any) => m.drug_name).join(', ') || 'None'}

Extract medical entities (symptoms, diagnoses, drug suggestions, vitals, physical findings, risk factors, medical history) and provide a primary recommendation.

ANAMNESIS EXTRACTION:
- Extract "onset_description" (when and how the symptoms started).
- Extract "risk_factors" (smoking, obesity, family history, etc.).
- Extract "ai_summary" (a 1-2 sentence summary of the patient's state).

DIAGNOSIS POLICY: You MUST ALWAYS provide at least one diagnosis. If a specific diagnosis is mentioned in the transcript, extract it. If NO clear diagnosis is provided, you MUST use your medical knowledge to provide the most likely "guess diagnosis" based on the described symptoms.
IMPORTANT: If the diagnosis is a guess/provisional (not explicitly stated by a doctor in the transcript), you MUST prefix the "value" with "[GUESS] " and set an attribute "is_guess": true. Never leave the diagnosis list empty if symptoms are present.

VITALS: If you hear vitals (blood pressure, heart rate, temperature, SpO2, weight), extract them as entity_type "vital". The "value" should be the number/reading, and "attributes" should contain the "type" (e.g. "blood_pressure").

Output your analysis EXACTLY matching the following JSON schema:
{
  "entities": [
    {
      "entity_type": "symptom" | "allergy" | "medication" | "condition" | "diagnosis" | "drug_suggestion" | "vital" | "physical_finding" | "risk_factor",
      "value": "Name of the entity",
      "negated": false,
      "attributes": { "severity": "mild/moderate/severe", "duration": "e.g. 2 days", "type": "blood_pressure/pulse/temp/etc" }
    }
  ],
  "anamnesis_info": {
    "onset_description": "text",
    "risk_factors": "text",
    "ai_summary": "text"
  },
  "recommendation": {
    "drug_name": "Name of drug if applicable, or None",
    "dosage": "e.g. 500mg",
    "frequency": "e.g. twice daily",
    "route": "e.g. oral",
    "rationale": "Why this recommendation is made",
    "confidence": "high/medium/low"
  }
}
`

    try {
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Consultation Transcript:\n"${data.transcript}"` }
        ]
      })

      const content = completion.choices[0].message.content
      if (!content) throw new Error('No response from AI')
      
      const analysis = JSON.parse(content)

      // 3. Save Transcript to DB (if appointment exists)
      if (data.appointmentId) {
        const { error: transError } = await supabase.from('transcripts').insert({
          appointment_id: data.appointmentId,
          raw_text: data.transcript,
          language: 'bg'
        })
        if (transError) console.warn('[ai] transcript save warning:', transError.message)
      }

      // 4. Save Entities (if appointment exists)
      if (data.appointmentId && analysis.entities && analysis.entities.length > 0) {
        const entitiesToInsert = analysis.entities.map((ent: any) => ({
          appointment_id: data.appointmentId,
          entity_type: ent.entity_type,
          value: ent.value,
          negated: ent.negated || false,
          attributes: ent.attributes || {},
          confirmed: false
        }))
        await supabase.from('extracted_entities').insert(entitiesToInsert)
      }

      // 5. Save Recommendation
      if (analysis.recommendation) {
        await supabase.from('recommendations').insert({
          appointment_id: data.appointmentId,
          drug_name: analysis.recommendation.drug_name || 'General Advice',
          dosage: analysis.recommendation.dosage,
          frequency: analysis.recommendation.frequency,
          route: analysis.recommendation.route,
          rationale: analysis.recommendation.rationale,
          confidence: analysis.recommendation.confidence,
          status: 'pending_approval'
        })
      }

      // 6. Update appointment status to entities_extracted
      await supabase.from('appointments')
        .update({ status: 'entities_extracted', ended_at: new Date().toISOString() })
        .eq('id', data.appointmentId)

      // 7. Auto-populate Anamnesis for the clinical wizard
      try {
        const symptoms = analysis.entities
          .filter((e: any) => e.entity_type === 'symptom' && !e.negated)
          .map((e: any) => ({ name: e.value, severity: e.attributes?.severity, duration: e.attributes?.duration }))
        
        const allergies = analysis.entities
          .filter((e: any) => e.entity_type === 'allergy' && !e.negated)
          .map((e: any) => e.value).join(', ')
        
        const meds = analysis.entities
          .filter((e: any) => e.entity_type === 'medication' && !e.negated)
          .map((e: any) => e.value).join(', ')
        
        const conditions = analysis.entities
          .filter((e: any) => (e.entity_type === 'condition' || e.entity_type === 'diagnosis') && !e.negated)
          .map((e: any) => e.value).join(', ')

        const anamnesisData = {
          appointment_id: data.appointmentId,
          symptoms: symptoms,
          free_text: data.transcript,
          onset_description: analysis.anamnesis_info?.onset_description || '',
          comorbidities: conditions,
          risk_factors: analysis.anamnesis_info?.risk_factors || '',
          current_meds_text: meds,
          allergies_text: allergies,
          ai_summary: analysis.anamnesis_info?.ai_summary || '',
          ai_generated_at: new Date().toISOString()
        }

        // Check if anamnesis exists
        const { data: existingAnamnesis } = await supabase
          .from('patient_anamnesis')
          .select('id')
          .eq('appointment_id', data.appointmentId)
          .maybeSingle()

        if (existingAnamnesis) {
          await supabase.from('patient_anamnesis')
            .update(anamnesisData)
            .eq('id', existingAnamnesis.id)
        } else {
          await supabase.from('patient_anamnesis').insert(anamnesisData)
        }
      } catch (anamnesisErr) {
        console.error('[ai] failed to auto-populate anamnesis:', anamnesisErr)
        // Don't fail the whole analysis if anamnesis populate fails
      }

      return { error: false, message: 'Analysis complete', analysis }
    } catch (err: any) {
      console.error('[ai] analyze error:', err)
      return { error: true, message: err.message || 'Analysis failed' }
    }
  })

export const retryAnalysisFn = createServerFn({ method: 'POST' })
  .inputValidator((d: { appointmentId: string }) => d)
  .handler(async ({ data }): Promise<{ error: boolean; message: string }> => {
    const supabase = getSupabaseServerClient()
    const { data: userData } = await supabase.auth.getUser()
    if (!userData.user) return { error: true, message: 'Unauthorized' }

    // 1. Get appointment and linked patient
    const { data: appointment, error: aptError } = await supabase
      .from('appointments')
      .select('*, patients(*)')
      .eq('id', data.appointmentId)
      .single()

    if (aptError || !appointment) return { error: true, message: 'Appointment not found' }

    // 2. Try to find existing transcript
    const { data: transcriptData } = await supabase
      .from('transcripts')
      .select('raw_text')
      .eq('appointment_id', data.appointmentId)
      .limit(1)
      .maybeSingle()

    if (transcriptData?.raw_text) {
      // Just re-run analysis
      return analyzeConsultationFn({ data: { 
        appointmentId: data.appointmentId, 
        patientId: appointment.patient_id, 
        transcript: transcriptData.raw_text 
      }})
    }

    // 3. No transcript? Try to find recording and re-transcribe
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: recording } = await (supabase as any)
      .from('recordings')
      .select('*')
      .eq('appointment_id', data.appointmentId)
      .limit(1)
      .maybeSingle()

    if (!recording) return { error: true, message: 'No transcript or recording found to re-analyze' }

    try {
      const admin = (await import('./supabaseAdmin')).getSupabaseAdminClient()
      const { data: fileData, error: downloadError } = await admin.storage
        .from('recordings')
        .download(recording.storage_path)

      if (downloadError || !fileData) {
        return { error: true, message: `Failed to download audio: ${downloadError?.message}` }
      }

      // Convert Blob to Buffer for OpenAI
      const arrayBuffer = await fileData.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)
      
      const openai = getOpenAIClient()
      const extension = recording.storage_path.split('.').pop() || 'webm'
      const file = new File([buffer], `audio.${extension}`, { type: `audio/${extension}` })

      const transResponse = await openai.audio.transcriptions.create({
        file,
        model: 'whisper-1',
      })

      const transcript = transResponse.text

      // Now analyze
      return analyzeConsultationFn({ data: { 
        appointmentId: data.appointmentId, 
        patientId: appointment.patient_id, 
        transcript 
      }})

    } catch (err: any) {
      console.error('[ai] retry error:', err)
      return { error: true, message: err.message || 'Retry failed' }
    }
  })

export const analyzeRecordingIdFn = createServerFn({ method: 'POST' })
  .inputValidator((d: { recordingId: string }) => d)
  .handler(async ({ data }): Promise<{ error: boolean; message: string; analysis?: any }> => {
    const supabase = getSupabaseServerClient()
    const { data: userData } = await supabase.auth.getUser()
    if (!userData.user) return { error: true, message: 'Unauthorized' }

    // 1. Get recording using admin client to bypass RLS issues
    const admin = (await import('./supabaseAdmin')).getSupabaseAdminClient()
    console.log('[ai] analyzing recording:', data.recordingId, 'for user:', userData.user.id)

    const { data: recording, error: recError } = await (admin as any)
      .from('recordings')
      .select('*')
      .eq('id', data.recordingId)
      .single()

    if (recError || !recording) {
      console.error('[ai] recording fetch error:', recError, 'id:', data.recordingId)
      return { error: true, message: 'Recording not found' }
    }

    // 1.5 Get linked appointment manually (bypass join relationship issues)
    let appointment: any = null
    if (recording.appointment_id) {
      const { data: appt } = await (admin as any)
        .from('appointments')
        .select('*')
        .eq('id', recording.appointment_id)
        .single()
      appointment = appt
    }

    console.log('[ai] recording found:', recording.name, 'owner:', recording.user_id)

    // Verify ownership manually
    if (recording.user_id !== userData.user.id) {
       // Check if doctor is linked via appointment
       const isApptDoctor = appointment?.doctor_id === userData.user.id
       if (!isApptDoctor) {
         return { error: true, message: 'Unauthorized access to recording' }
       }
    }

    try {
      const admin = (await import('./supabaseAdmin')).getSupabaseAdminClient()
      const { data: fileData, error: downloadError } = await admin.storage
        .from('recordings')
        .download(recording.storage_path)

      if (downloadError || !fileData) {
        return { error: true, message: `Failed to download audio: ${downloadError?.message}` }
      }

      const arrayBuffer = await fileData.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)
      
      const openai = getOpenAIClient()
      const extension = recording.storage_path.split('.').pop() || 'webm'
      const file = new File([buffer], `audio.${extension}`, { type: `audio/${extension}` })

      const transResponse = await openai.audio.transcriptions.create({
        file,
        model: 'whisper-1',
      })

      const transcript = transResponse.text

      // Now analyze
      return analyzeConsultationFn({ data: { 
        appointmentId: recording.appointment_id, 
        patientId: recording.patient_id || appointment?.patient_id, 
        transcript 
      }})

    } catch (err: any) {
      console.error('[ai] analyze recording error:', err)
      return { error: true, message: err.message || 'Analysis failed' }
    }
  })

