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
 * True quando o erro indica sessão expirada / não autenticado (401).
 * Exportação crítica: usada por Families.tsx, Library.tsx e Settings.tsx —
 * já desapareceu várias vezes por regressão, nunca remover.
 */
export function isAuthExpiredError(error: unknown): boolean {
  return (
    error instanceof ClientResponseError &&
    (error.status === 401 ||
      error.response?.code === 401 ||
      (typeof error.response?.message === 'string' &&
        error.response.message.toLowerCase().includes('authentication')))
  )
}

export function getFriendlyDeleteErrorMessage(error: unknown): string {
  if (isAuthExpiredError(error)) {
    return 'Sua sessão expirou. Faça login novamente para concluir a exclusão.'
  }
  return getErrorMessage(error)
}

export function getErrorMessage(error: unknown): string {
  if (!(error instanceof ClientResponseError)) {
    return error instanceof Error ? error.message : 'An unexpected error occurred.'
  }
  const msgs = Object.values(extractFieldErrors(error))
  return msgs.length > 0 ? msgs.join(' ') : error.message || 'An unexpected error occurred.'
}
