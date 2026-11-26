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
 * true quando o erro representa sessão expirada / não autenticado (HTTP 401).
 * Regressão recorrente: esta exportação já foi removida várias vezes quebrando
 * o build — NÃO removê-la (usada por Families.tsx, Library.tsx, Settings.tsx,
 * YearHolidaysPanel.tsx, DidacticLibrary.tsx).
 */
export function isAuthExpiredError(error: unknown): boolean {
  if (!(error instanceof ClientResponseError)) return false
  return error.status === 401
}

/**
 * Mensagem amigável para falha de exclusão em cascata, considerando o motivo
 * devolvido pelo hook cascade_delete_family (403 = sem permissão de papel,
 * 404 = família inexistente, 400/outras = mensagem genérica).
 */
export function getFriendlyDeleteErrorMessage(error: unknown): string {
  if (isAuthExpiredError(error)) {
    return 'Sua sessão expirou. Faça login novamente para concluir a exclusão.'
  }
  if (error instanceof ClientResponseError) {
    if (error.status === 403) {
      return 'Você não tem permissão para excluir registros. Solicite acesso a um administrador.'
    }
    if (error.status === 404) {
      return 'O registro não foi encontrado — ele pode já ter sido excluído por outro usuário.'
    }
  }
  return 'Não foi possível concluir a exclusão. Verifique sua conexão e tente novamente.'
}

export function getErrorMessage(error: unknown): string {
  if (!(error instanceof ClientResponseError)) {
    return error instanceof Error ? error.message : 'An unexpected error occurred.'
  }
  const msgs = Object.values(extractFieldErrors(error))
  return msgs.length > 0 ? msgs.join(' ') : error.message || 'An unexpected error occurred.'
}
