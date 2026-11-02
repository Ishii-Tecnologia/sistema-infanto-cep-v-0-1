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
  if (!(error instanceof ClientResponseError)) {
    if (typeof error === 'object' && error !== null) {
      const err = error as {
        status?: number
        data?: { code?: number; message?: string }
        message?: string
      }
      return (
        err.status === 401 ||
        err.data?.code === 401 ||
        (typeof err.message === 'string' &&
          (err.message.includes('401') ||
            err.message.toLowerCase().includes('token') ||
            err.message.toLowerCase().includes('auth') ||
            err.message.toLowerCase().includes('sessão')))
      )
    }
    return false
  }
  return (
    error.status === 401 ||
    error.response?.code === 401 ||
    error.message.toLowerCase().includes('token') ||
    error.message.toLowerCase().includes('auth')
  )
}

export function getErrorMessage(error: unknown): string {
  if (!(error instanceof ClientResponseError)) {
    return error instanceof Error ? error.message : 'An unexpected error occurred.'
  }
  const msgs = Object.values(extractFieldErrors(error))
  return msgs.length > 0 ? msgs.join(' ') : error.message || 'An unexpected error occurred.'
}
