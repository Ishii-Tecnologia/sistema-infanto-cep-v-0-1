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
  if (error instanceof ClientResponseError) {
    return error.status === 401 || error.status === 403
  }
  if (error && typeof error === 'object' && 'status' in error) {
    const status = (error as { status: unknown }).status
    if (status === 401 || status === 403) return true
  }
  const msg = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase()
  return (
    msg.includes('token') ||
    msg.includes('sessão expirada') ||
    msg.includes('unauthorized') ||
    msg.includes('forbidden') ||
    msg.includes('authenticated')
  )
}

export function getErrorMessage(error: unknown): string {
  if (!(error instanceof ClientResponseError)) {
    return error instanceof Error
      ? error.message
      : 'Ocorreu um erro inesperado no Sistema Infanto-CEP.'
  }
  if (error.status === 401 || error.status === 403) {
    return 'Sua sessão expirou ou você não tem permissão para esta operação no Sistema Infanto-CEP.'
  }
  const fieldErrors = extractFieldErrors(error)
  const msgs = Object.values(fieldErrors)
  if (msgs.length > 0) {
    return msgs.join(' ')
  }
  if (
    error.message &&
    error.message !== 'Failed to update record.' &&
    error.message !== 'Failed to create record.'
  ) {
    return error.message
  }
  return 'Não foi possível salvar os dados. Verifique os campos informados e tente novamente.'
}
