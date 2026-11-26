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

/** true quando o erro é 401 / sessão expirada (ClientResponseError.status === 401). */
export function isAuthExpiredError(error: unknown): boolean {
  return error instanceof ClientResponseError && error.status === 401
}

/**
 * Mensagem amigável para falhas de exclusão: distingue violação de
 * restrição/relação (403/400 com "related") de outros erros.
 */
export function getFriendlyDeleteErrorMessage(error: unknown, entityLabel = 'registro'): string {
  if (error instanceof ClientResponseError) {
    const raw = `${error.message} ${JSON.stringify(error.response?.data ?? {})}`.toLowerCase()
    if (error.status === 403 || raw.includes('related') || raw.includes('cascade')) {
      return `Este ${entityLabel} possui registros vinculados e não pode ser excluído. Exclua primeiro os registros dependentes.`
    }
    if (error.status === 404) {
      return `Este ${entityLabel} não foi encontrado — ele pode já ter sido excluído. Atualize a lista.`
    }
    if (isAuthExpiredError(error)) {
      return 'Sua sessão expirou. Faça login novamente para continuar.'
    }
    return getErrorMessage(error)
  }
  return error instanceof Error ? error.message : `Não foi possível excluir o ${entityLabel}.`
}
