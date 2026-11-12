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
 * Retorna true quando o erro indica sessão expirada / não autenticado (401).
 * Restrito ao status 401: status 0 (falha de rede) NÃO derruba a sessão.
 * NOTA: esta exportação já foi removida acidentalmente várias vezes e quebra
 * o build (usada por YearHolidaysPanel.tsx, Families.tsx, Library.tsx e Settings.tsx).
 */
export function isAuthExpiredError(error: unknown): boolean {
  return error instanceof ClientResponseError && error.status === 401
}

export function getErrorMessage(error: unknown): string {
  if (!(error instanceof ClientResponseError)) {
    return error instanceof Error ? error.message : 'An unexpected error occurred.'
  }
  const msgs = Object.values(extractFieldErrors(error))
  return msgs.length > 0 ? msgs.join(' ') : error.message || 'An unexpected error occurred.'
}
