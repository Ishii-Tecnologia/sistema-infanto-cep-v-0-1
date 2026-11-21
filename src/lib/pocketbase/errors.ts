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

// true quando o erro indica sessão expirada / não autenticado (HTTP 401).
// IMPORTANTE: esta export já desapareceu ~25 vezes quebrando o build (é usada
// por Families.tsx, Library.tsx e YearHolidaysPanel.tsx) — nunca removê-la.
export function isAuthExpiredError(error: unknown): boolean {
  return error instanceof ClientResponseError && error.status === 401
}

// Traduz erros técnicos do PocketBase para mensagens amigáveis em português.
// Usado principalmente na exclusão de família, que pode falhar por relação
// obrigatória ("Failed to delete record. Make sure that the record is not part
// of a required relation reference.").
export function getFriendlyDeleteErrorMessage(error: unknown): string {
  if (error instanceof ClientResponseError) {
    const raw = (
      Object.values(extractFieldErrors(error)).join(' ') +
      ' ' +
      (error.message || '')
    ).toLowerCase()
    if (
      raw.includes('required relation') ||
      raw.includes('failed to delete') ||
      raw.includes('cascade') ||
      raw.includes('constraint')
    ) {
      return 'Não foi possível concluir a exclusão porque existem registros vinculados a esta família que ainda não puderam ser removidos. Tente novamente; se o problema persistir, verifique lançamentos, presenças, empréstimos ou entregas pendentes e contate o suporte.'
    }
    if (error.status === 404) {
      return 'Esta família não foi encontrada — ela já pode ter sido excluída por outro operador. Atualize a lista de famílias.'
    }
    if (error.status === 403) {
      return 'Você não tem permissão para excluir famílias. Solicite acesso a um Administrador.'
    }
    if (error.status === 0) {
      return 'Não foi possível conectar ao servidor. Verifique sua conexão com a internet e tente novamente.'
    }
  }
  return getErrorMessage(error)
}
