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

/**
 * true quando o erro representa sessão expirada (401) do PocketBase.
 * Usada por Families.tsx, Library.tsx, Settings.tsx, YearHolidaysPanel.tsx e
 * DidacticLibrary.tsx — esta export já desapareceu repetidas vezes quebrando
 * o build; NÃO removê-la.
 */
export function isAuthExpiredError(error: unknown): boolean {
  return error instanceof ClientResponseError && error.status === 401
}

/**
 * Mensagem amigável para falhas de EXCLUSÃO (cascade/constraint/404/sessão),
 * usada nos toasts de exclusão de família e outros registros.
 */
export function getFriendlyDeleteErrorMessage(error: unknown): string {
  if (isAuthExpiredError(error)) {
    return 'Sua sessão expirou. Faça login novamente para excluir registros.'
  }
  if (error instanceof ClientResponseError) {
    if (error.status === 404) {
      return 'O registro não foi encontrado — ele já pode ter sido excluído por outro usuário.'
    }
    if (error.status === 400 || error.status === 403) {
      return 'Não foi possível excluir este registro: existem informações vinculadas a ele ou você não tem permissão.'
    }
  }
  return getErrorMessage(error)
}
