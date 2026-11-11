import { ClientResponseError } from 'pocketbase'

export type FieldErrors = Record<string, string>

export function extractFieldErrors(error: unknown): FieldErrors {
  if (!(error instanceof ClientResponseError)) return {}
  const data = error.response?.data
  if (!data || typeof data !== 'object') return {}
  const errors: FieldErrors = {}
  for (const [field, detail] of Object.entries(data)) {
    if (
      detail &&
      typeof detail === 'object' &&
      'message' in detail &&
      typeof (detail as { message: unknown }).message === 'string'
    ) {
      errors[field] = (detail as { message: string }).message
    }
  }
  return errors
}

/**
 * True quando o erro indica sessão expirada / não autenticado (401 do
 * PocketBase, auth store inválido ou mensagem de autenticação). Usada por
 * Families.tsx, Library.tsx e Settings.tsx — NÃO remover (ver histórico).
 */
export function isAuthExpiredError(error: unknown): boolean {
  if (error instanceof ClientResponseError) {
    if (error.status === 401 || error.status === 403) return true
  }
  if (error instanceof Error) {
    const msg = error.message.toLowerCase()
    return msg.includes('auth') || msg.includes('token') || msg.includes('sessão')
  }
  return false
}

export function getErrorMessage(error: unknown): string {
  if (!(error instanceof ClientResponseError)) {
    return error instanceof Error ? error.message : 'An unexpected error occurred.'
  }
  const msgs = Object.values(extractFieldErrors(error))
  return msgs.length > 0 ? msgs.join(' ') : error.message || 'An unexpected error occurred.'
}
