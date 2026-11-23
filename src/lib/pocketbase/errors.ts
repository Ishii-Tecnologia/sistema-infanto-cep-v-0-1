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

export function isAuthExpiredError(error: unknown): boolean {
  return (
    error instanceof ClientResponseError && (error.status === 401 || error.response?.code === 401)
  )
}

export function getFriendlyDeleteErrorMessage(error: unknown): string {
  if (!(error instanceof ClientResponseError)) {
    return error instanceof Error ? error.message : 'Erro desconhecido ao excluir o registro.'
  }
  if (error.status === 400) {
    // Típico de exclusão bloqueada por vínculos: regra ON DELETE ou
    // integridade referencial impedindo a remoção do registro.
    return 'Não foi possível excluir: este registro ainda possui dependências vinculadas (alunos, lançamentos ou outros dados relacionados). Remova ou ajuste as dependências antes de tentar novamente.'
  }
  if (error.status === 403) {
    return 'Você não tem permissão para excluir este registro.'
  }
  if (error.status === 404) {
    return 'Registro não encontrado — ele já pode ter sido excluído por outro usuário.'
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
