import pb from '@/lib/pocketbase/client'
import { Child, Guardian } from '@/types'

/**
 * Fotos de crianças e responsáveis seguem o MESMO padrão de arquivo da Festa de
 * Natal (natal_entregas.photo): a imagem é gravada como ARQUIVO no PocketBase e
 * servida por URL /api/files/.... O campo antigo photo_url (texto) permanece
 * apenas para leitura de registros ainda não migrados (Base64 residual).
 */

export interface PhotoCarrier {
  id: string
  collectionId?: string
  collectionName?: string
  photo?: string
  photo_url?: string
}

/** URL da foto de um registro: arquivo novo (padrão Natal) ou Base64 residual. */
export function photoDisplayUrl(record: PhotoCarrier, thumb?: string): string {
  if (record.photo) {
    return pb.files.getURL(record, record.photo, thumb ? { thumb } : undefined)
  }
  return record.photo_url || ''
}

/** true quando o valor de photo_url é uma data URL Base64 (precisa de backfill). */
export function isBase64DataUrl(value?: string | null): boolean {
  return typeof value === 'string' && value.startsWith('data:image/')
}

/** Extrai o binário da imagem de uma data URL Base64. */
export function dataUrlToBlob(dataUrl: string): Blob | null {
  const match = dataUrl.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/)
  if (!match) return null
  try {
    const mime = match[1]
    const binary = atob(match[2])
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
    return new Blob([bytes], { type: mime })
  } catch {
    return null
  }
}

/** Estimativa do tamanho (bytes) do payload Base64 de uma data URL. */
export function base64DataUrlByteLength(dataUrl: string): number {
  const idx = dataUrl.indexOf(';base64,')
  if (idx === -1) return 0
  const b64 = dataUrl.slice(idx + 8)
  const padding = b64.endsWith('==') ? 2 : b64.endsWith('=') ? 1 : 0
  return Math.floor((b64.length * 3) / 4) - padding
}

function fileNameFor(ext: string): string {
  const stamp = Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
  return `foto_${stamp}.${ext}`
}

async function dataUrlToFile(dataUrl: string): Promise<File | null> {
  const blob = dataUrlToBlob(dataUrl)
  if (!blob) return null
  const ext =
    blob.type === 'image/png'
      ? 'png'
      : blob.type === 'image/webp'
        ? 'webp'
        : blob.type === 'image/gif'
          ? 'gif'
          : 'jpg'
  return new File([blob], fileNameFor(ext), { type: blob.type })
}

interface MigratePhotoResult {
  migrated: boolean
  skipped?: 'invalid' | 'too_large'
}

/**
 * Converte a foto Base64 de um registro para o campo de arquivo `photo`.
 * Idempotente: registros sem Base64 em photo_url (ou já com arquivo) são
 * ignorados. Em caso de falha de rede o erro é propagado para retry.
 */
export async function migrateRecordPhoto<T extends PhotoCarrier>(
  collection: 'children' | 'guardians',
  record: T,
): Promise<MigratePhotoResult> {
  if (record.photo) return { migrated: false }
  if (!isBase64DataUrl(record.photo_url)) return { migrated: false }

  const dataUrl = record.photo_url as string
  if (base64DataUrlByteLength(dataUrl) > 5 * 1024 * 1024) {
    return { migrated: false, skipped: 'too_large' }
  }

  const file = await dataUrlToFile(dataUrl)
  if (!file) return { migrated: false, skipped: 'invalid' }

  const body = new FormData()
  body.append('photo', file)
  body.append('photo_url', '')
  await pb.collection(collection).update(record.id, body)

  return { migrated: true }
}

/** Backfill client-side: converte todas as fotos Base64 existentes para arquivo. */
export async function migrateAllPhotos(): Promise<{
  scanned: number
  migrated: number
  invalid: number
  tooLarge: number
  failed: number
}> {
  const [children, guardians] = await Promise.all([
    pb.collection('children').getFullList<Child>(),
    pb.collection('guardians').getFullList<Guardian>(),
  ])

  const result = {
    scanned: children.length + guardians.length,
    migrated: 0,
    invalid: 0,
    tooLarge: 0,
    failed: 0,
  }

  for (const child of children) {
    try {
      const r = await migrateRecordPhoto('children', child)
      if (r.migrated) result.migrated++
      else if (r.skipped === 'invalid') result.invalid++
      else if (r.skipped === 'too_large') result.tooLarge++
    } catch (e) {
      result.failed++
      console.warn('Falha ao migrar foto da criança', child.id, e)
    }
  }

  for (const guardian of guardians) {
    try {
      const r = await migrateRecordPhoto('guardians', guardian)
      if (r.migrated) result.migrated++
      else if (r.skipped === 'invalid') result.invalid++
      else if (r.skipped === 'too_large') result.tooLarge++
    } catch (e) {
      result.failed++
      console.warn('Falha ao migrar foto do responsável', guardian.id, e)
    }
  }

  return result
}
