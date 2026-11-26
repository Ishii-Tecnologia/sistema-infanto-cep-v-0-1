import { ClientResponseError } from 'pocketbase'

/**
 * Indica erro de sessão expirada / não autenticado (401).
 * Usado por Families.tsx, Library.tsx, Settings.tsx e outros — NÃO remover.
 */
export function isAuthExpiredError(error: unknown): boolean {
  return error instanceof ClientResponseError && error.status === 401
}

/**
 * Mensagem amigável para falhas de exclusão (ex.: registro ainda referenciado
 * por outro cadastro, 400 do PocketBase). Usada nos toasts de exclusão.
 */
export function getFriendlyDeleteErrorMessage(error: unknown): string {
  if (!(error instanceof ClientResponseError)) {
    return error instanceof Error
      ? `Não foi possível excluir: ${error.message}`
      : 'Não foi possível excluir o registro. Tente novamente.'
  }
  if (error.status === 401) {
    return 'Sua sessão expirou. Faça login novamente e tente excluir outra vez.'
  }
  if (error.status === 403) {
    return 'Você não tem permissão para excluir este registro.'
  }
  const fieldMsgs = Object.values(extractFieldErrors(error)).join(' ')
  if (fieldMsgs) {
    return `Não foi possível excluir: ${fieldMsgs}`
  }
  if (error.status === 400) {
    return 'Não foi possível excluir: este registro ainda está vinculado a outros cadastros (família, empréstimos ou lançamentos). Remova os vínculos primeiro.'
  }
  return error.message || 'Não foi possível excluir o registro. Tente novamente.'
}

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
