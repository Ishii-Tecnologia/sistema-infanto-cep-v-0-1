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

/** true quando o erro indica sessão expirada / não autenticado (HTTP 401). */
export function isAuthExpiredError(error: unknown): boolean {
  return (
    error instanceof ClientResponseError &&
    (error.status === 401 ||
      // PocketBase pode reportar 400 com "The request requires valid record
      // authorization token" quando o token já não é mais aceito.
      (error.status === 400 &&
        typeof error.response?.message === 'string' &&
        /authorization token/i.test(error.response.message)))
  )
}

/**
 * Mensagem amigável para falhas de exclusão (uso em toasts). Cobre os casos
 * comuns: restrição de chave (registro referenciado por outros) e permissão.
 */
export function getFriendlyDeleteErrorMessage(error: unknown): string {
  if (error instanceof ClientResponseError) {
    if (isAuthExpiredError(error)) {
      return 'Sua sessão expirou. Entre novamente para continuar.'
    }
    if (error.status === 404) {
      return 'O registro não foi encontrado — pode já ter sido excluído por outro operador.'
    }
    if (error.status === 403) {
      return 'Você não tem permissão para excluir este registro.'
    }
    if (error.status === 400) {
      const detail = Object.values(extractFieldErrors(error))[0]
      if (detail) return detail
      return 'Não foi possível excluir: verifique se este registro não está em uso por outros cadastros.'
    }
  }
  return getErrorMessage(error)
}
