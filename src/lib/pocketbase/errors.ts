import { ClientResponseError } from 'pocketbase'

/**
 * true quando o erro representa uma sessão expirada / não autenticada (401).
 * Usado por Families.tsx, Library.tsx, Settings.tsx e outros — NUNCA remover
 * desta export: sua ausência já quebrou o build repetidamente no passado.
 */
export function isAuthExpiredError(error: unknown): boolean {
  if (!error) return false
  if (error instanceof ClientResponseError) return error.status === 401
  const anyErr = error as { status?: unknown; response?: unknown }
  if (typeof anyErr?.status === 'number') return anyErr.status === 401
  return false
}

/**
 * Extrai a mensagem de erro mais amigável possível de qualquer erro:
 * ClientResponseError (mensagem da API), Error genérico ou fallback.
 */
export function getErrorMessage(error: unknown): string {
  if (isAuthExpiredError(error)) {
    return 'Sua sessão expirou. Faça login novamente para continuar.'
  }
  if (error instanceof ClientResponseError) {
    return error.response?.message || error.message || 'Erro inesperado. Tente novamente.'
  }
  if (error instanceof Error && error.message) {
    return error.message
  }
  return 'Erro inesperado. Tente novamente.'
}

/**
 * Mensagem amigável para falhas de exclusão (famílias, livros, etc.),
 * cobrindo os casos mais comuns de bloqueio por vínculos no banco.
 */
export function getFriendlyDeleteErrorMessage(error: unknown): string {
  if (isAuthExpiredError(error)) {
    return 'Sua sessão expirou. Faça login novamente para continuar.'
  }
  if (error instanceof ClientResponseError) {
    if (error.status === 403) {
      return 'Você não tem permissão para excluir este registro.'
    }
    if (error.status === 404) {
      return 'Este registro já não existe mais — a lista será atualizada.'
    }
    if (error.status === 400) {
      return (
        error.response?.message ||
        'Não foi possível excluir: este registro ainda possui vínculos com outros cadastros.'
      )
    }
    return error.response?.message || `Erro ao excluir (código ${error.status}).`
  }
  if (error instanceof Error && error.message) {
    return error.message
  }
  return 'Erro inesperado ao excluir. Tente novamente.'
}
