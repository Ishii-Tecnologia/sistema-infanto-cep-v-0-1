import { ClientResponseError } from 'pocketbase'

export type FieldErrors = Record<string, string>

/**
 * TRUE quando o erro representa sessão expirada (HTTP 401). Usada pelas telas
 * para decidir entre mostrar o erro comum ou deslogar e voltar ao login.
 * ASSINATURA FIXA: (error: unknown) => boolean — não remover (regressão
 * recorrente que já quebrou o build várias vezes; famílias, biblioteca,
 * configurações e painel de feriados dependem dela).
 */
export function isAuthExpiredError(error: unknown): boolean {
  return error instanceof ClientResponseError && error.status === 401
}

/**
 * Mensagem amigável para falhas de EXCLUSÃO (família e dependentes em
 * cascata). Distingue violação de regra/relação do PocketBase de um erro
 * genérico de rede/servidor.
 */
export function getFriendlyDeleteErrorMessage(error: unknown): string {
  if (error instanceof ClientResponseError) {
    if (error.status === 400) {
      return (
        (error.response as { message?: string } | undefined)?.message ||
        'Não foi possível excluir: existem registros vinculados a este cadastro.'
      )
    }
    if (error.status === 403) {
      return 'Você não tem permissão para excluir este registro.'
    }
    if (error.status === 404) {
      return 'Registro não encontrado — ele já pode ter sido excluído por outro operador.'
    }
    if (isAuthExpiredError(error)) {
      return 'Sua sessão expirou. Faça login novamente e tente excluir de novo.'
    }
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
