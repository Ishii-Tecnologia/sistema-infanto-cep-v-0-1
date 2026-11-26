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

/** true quando o erro é de sessão expirada / não autenticado (401). */
export function isAuthExpiredError(error: unknown): boolean {
  return error instanceof ClientResponseError && error.status === 401
}

/** Mensagem amigável para falhas de exclusão (com tratamento de 401/sessão expirada). */
export function getFriendlyDeleteErrorMessage(error: unknown): string {
  if (isAuthExpiredError(error)) {
    return 'Sua sessão expirou. Faça login novamente para concluir a exclusão.'
  }
  const msg = getErrorMessage(error)
  return msg || 'Não foi possível concluir a exclusão. Tente novamente.'
}

export function getErrorMessage(error: unknown): string {
  if (!(error instanceof ClientResponseError)) {
    return error instanceof Error ? error.message : 'An unexpected error occurred.'
  }
  const msgs = Object.values(extractFieldErrors(error))
  return msgs.length > 0 ? msgs.join(' ') : error.message || 'An unexpected error occurred.'
}
