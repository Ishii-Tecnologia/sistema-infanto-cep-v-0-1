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
    error instanceof ClientResponseError &&
    (error.status === 401 || (error as { response?: { code?: number } }).response?.code === 401)
  )
}

export function getFriendlyDeleteErrorMessage(error: unknown): string {
  if (error instanceof ClientResponseError) {
    const raw = `${error.response?.message || ''} ${error.message || ''}`.toLowerCase()
    if (
      error.status === 400 &&
      (raw.includes('failed to delete record') || raw.includes('required relation reference'))
    ) {
      return 'Não foi possível excluir: este registro ainda possui registros vinculados (alunos, lançamentos ou empréstimos). Exclua os registros dependentes antes de tentar novamente.'
    }
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
