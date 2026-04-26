import { createServerFn } from '@tanstack/react-start'
import { getSupabaseAdminClient } from './supabaseAdmin'
import { getSupabaseServerClient } from './supabase'

const BUCKET = 'recordings'

export interface RecordingMeta {
  id: string
  name: string
  size: number
  duration: number
  storage_path: string
  local_only: boolean
  created_at: string
  publicUrl?: string
  appointment_id?: string
  patient_name?: string
}

type DbRow = {
  id: string
  name: string
  size: number
  duration: number
  storage_path: string
  local_only: boolean
  created_at: string
  user_id: string
  appointment_id?: string
  appointments?: {
    patient_id: string
    patients: {
      first_name: string
      last_name: string
    }
  }
}

function getPublicUrl(path: string): string {
  const admin = getSupabaseAdminClient()
  const { data } = admin.storage.from(BUCKET).getPublicUrl(path)
  return data.publicUrl
}

// ── Upload ────────────────────────────────────────────────────────────────────

export const uploadRecordingFn = createServerFn({ method: 'POST' })
  .inputValidator(
    (d: {
      base64: string
      mimeType: string
      name: string
      duration: number
      size: number
      appointmentId?: string
      patientId?: string
    }) => d,
  )
  .handler(
    async ({
      data,
    }): Promise<{ error: boolean; message?: string; recording?: RecordingMeta }> => {
      // Identify user via cookie-based SSR client
      const authClient = getSupabaseServerClient()
      const { data: userData } = await authClient.auth.getUser()
      if (!userData.user) return { error: true, message: 'Not authenticated' }

      const userId = userData.user.id
      const admin = getSupabaseAdminClient()

      const ext = data.mimeType.includes('ogg')
        ? 'ogg'
        : data.mimeType.includes('mp4')
          ? 'mp4'
          : 'webm'
      const storagePath = `${userId}/${Date.now()}.${ext}`

      // Decode base64 → Buffer (Node.js server, reliable)
      const bytes = Buffer.from(data.base64, 'base64')

      const { error: uploadError } = await admin.storage
        .from(BUCKET)
        .upload(storagePath, bytes, { contentType: data.mimeType, upsert: false })

      if (uploadError) {
        return { error: true, message: `Storage: ${uploadError.message}` }
      }

      const insertPayload: any = {
        user_id: userId,
        name: data.name,
        size: data.size,
        duration: data.duration,
        storage_path: storagePath,
        local_only: false,
      }
      
      if (data.appointmentId) {
        insertPayload.appointment_id = data.appointmentId
      }
      if (data.patientId) {
        insertPayload.patient_id = data.patientId
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: dbError, data: row } = await (admin as any)
        .from('recordings')
        .insert(insertPayload)
        .select()
        .single()

      if (dbError) {
        await admin.storage.from(BUCKET).remove([storagePath])
        return { error: true, message: `Database: ${dbError.message}` }
      }

      const typedRow = row as DbRow
      return {
        error: false,
        recording: { ...typedRow, publicUrl: getPublicUrl(storagePath) },
      }
    },
  )

// ── List ──────────────────────────────────────────────────────────────────────

export const listRecordingsFn = createServerFn({ method: 'GET' }).handler(
  async (): Promise<RecordingMeta[]> => {
    const authClient = getSupabaseServerClient()
    const { data: userData } = await authClient.auth.getUser()
    if (!userData.user) return []

    const admin = getSupabaseAdminClient()

    const { data: rows, error } = await (admin as any)
      .from('recordings')
      .select('*')
      .eq('user_id', userData.user.id)
      .order('created_at', { ascending: false })

    if (error || !rows) {
      console.error('[recordings] list error:', error)
      return []
    }

    const typedRows = rows as any[]
    
    // Manually fetch appointments and patients to bypass PostgREST relationship cache issues
    const appointmentIds = typedRows.map(r => r.appointment_id).filter(Boolean)
    let appointmentsLookup: Record<string, any> = {}
    
    if (appointmentIds.length > 0) {
      const { data: appts } = await (admin as any)
        .from('appointments')
        .select('id, patient_id, patients(first_name, last_name)')
        .in('id', appointmentIds)
        
      if (appts) {
        appointmentsLookup = appts.reduce((acc: any, appt: any) => {
          acc[appt.id] = appt
          return acc
        }, {})
      }
    }

    return typedRows.map((row) => {
      const appt = row.appointment_id ? appointmentsLookup[row.appointment_id] : null
      const patientName = appt?.patients ? `${appt.patients.first_name} ${appt.patients.last_name}` : undefined
      
      return {
        ...row,
        publicUrl: row.storage_path ? getPublicUrl(row.storage_path) : undefined,
        patient_name: patientName
      }
    })
  },
)

// ── Delete ────────────────────────────────────────────────────────────────────

export const deleteRecordingFn = createServerFn({ method: 'POST' })
  .inputValidator((d: { id: string; storagePath?: string }) => d)
  .handler(
    async ({ data }): Promise<{ error: boolean; message?: string }> => {
      const authClient = getSupabaseServerClient()
      const { data: userData } = await authClient.auth.getUser()
      if (!userData.user) return { error: true, message: 'Not authenticated' }

      const admin = getSupabaseAdminClient()

      if (data.storagePath) {
        await admin.storage.from(BUCKET).remove([data.storagePath])
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (admin as any)
        .from('recordings')
        .delete()
        .eq('id', data.id)
        .eq('user_id', userData.user.id) // only delete own rows

      if (error) return { error: true, message: error.message }
      return { error: false }
    },
  )
