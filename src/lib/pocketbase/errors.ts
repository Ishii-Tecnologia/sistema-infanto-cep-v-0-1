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

export function getErrorMessage(error: unknown): string {
  if (!(error instanceof ClientResponseError)) {
    return error instanceof Error ? error.message : 'An unexpected error occurred.'
  }
  const msgs = Object.values(extractFieldErrors(error))
  return msgs.length > 0 ? msgs.join(' ') : error.message || 'An unexpected error occurred.'
}

/** true quando o erro indica sessão expirada / não autenticada (HTTP 401). */
export function isAuthExpiredError(error: unknown): boolean {
  return error instanceof ClientResponseError && error.status === 401
}

/** Mensagem amigável para falhas de exclusão (sessão, permissão ou vínculos). */
export function getFriendlyDeleteErrorMessage(error: unknown): string {
  if (error instanceof ClientResponseError) {
    if (error.status === 401) return 'Sua sessão expirou. Entre novamente para excluir.'
    if (error.status === 403) return 'Você não tem permissão para excluir este registro.'
    if (error.status === 400)
      return 'Não foi possível excluir: este registro ainda possui dados vinculados (alunos, responsáveis, empréstimos ou entregas). Remova ou atualize esses vínculos antes de excluir.'
  }
  return getErrorMessage(error)
}
