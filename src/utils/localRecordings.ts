// IndexedDB helpers for local-only recording fallback

export interface LocalRecording {
  id: string
  name: string
  blob: Blob
  mimeType: string
  duration: number
  size: number
  createdAt: string
}

const DB_NAME = 'gp-recordings'
const STORE = 'recordings'
const VERSION = 1

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, VERSION)
    req.onupgradeneeded = () => {
      req.result.createObjectStore(STORE, { keyPath: 'id' })
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

export async function saveLocalRecording(
  blob: Blob,
  name: string,
  duration: number,
): Promise<LocalRecording> {
  const db = await openDB()
  const record: LocalRecording = {
    id: crypto.randomUUID(),
    name,
    blob,
    mimeType: blob.type,
    duration,
    size: blob.size,
    createdAt: new Date().toISOString(),
  }
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    tx.objectStore(STORE).put(record)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
  return record
}

export async function listLocalRecordings(): Promise<LocalRecording[]> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly')
    const req = tx.objectStore(STORE).getAll()
    req.onsuccess = () =>
      resolve(
        (req.result as LocalRecording[]).sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        ),
      )
    req.onerror = () => reject(req.error)
  })
}

export async function deleteLocalRecording(id: string): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    tx.objectStore(STORE).delete(id)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

export function getLocalObjectUrl(rec: LocalRecording): string {
  return URL.createObjectURL(rec.blob)
}
