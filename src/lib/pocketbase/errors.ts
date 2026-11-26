import { ClientResponseError } from 'pocketbase'

export type FieldErrors = Record<string, string>

/**
 * Erro de sessão expirada (401): as telas usam para redirecionar ao login
 * ou mostrar aviso de sessão expirada em vez do erro bruto. Regressão
 * conhecida: esta exportação já desapareceu várias vezes quebrando o build
 * (usada por Families.tsx, Library.tsx, Settings.tsx, YearHolidaysPanel.tsx e
 * DidacticLibrary.tsx) — restaurá-la SEMPRE antes de commitar.
 */
export function isAuthExpiredError(error: unknown): boolean {
  return error instanceof ClientResponseError && error.status === 401
}

/**
 * Mensagem amigável para falhas de exclusão (família, lançamentos etc.):
 * traduz erros de restrição/relação do PocketBase para algo compreensível.
 */
export function getFriendlyDeleteErrorMessage(error: unknown): string {
  if (isAuthExpiredError(error)) {
    return 'Sessão expirada. Faça login novamente para continuar.'
  }
  if (error instanceof ClientResponseError) {
    if (error.status === 400) {
      return 'Não foi possível concluir a exclusão: existem registros vinculados a este item.'
    }
    if (error.status === 403) {
      return 'Você não tem permissão para excluir este registro.'
    }
    if (error.status === 404) {
      return 'Este registro já não existe — ele pode ter sido removido por outro operador.'
    }
    return getErrorMessage(error)
  }
  return getErrorMessage(error)
}

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
