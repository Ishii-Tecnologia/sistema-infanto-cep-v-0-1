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

// ----------------------------------------------------------------------------
// NÃO REMOVER: exportação isAuthExpiredError (6ª restauração). Sumiu deste
// arquivo repetidamente quebrando o build — é usada por Families.tsx,
// Library.tsx, Settings.tsx, AttendanceReports.tsx e Calendar.tsx.
// ----------------------------------------------------------------------------
export function isAuthExpiredError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false
  const isClientResponseError =
    error instanceof ClientResponseError ||
    (typeof (error as { name?: unknown }).name === 'string' &&
      (error as { name: string }).name === 'ClientResponseError')
  if (!isClientResponseError) return false
  return (
    (error as { status?: unknown }).status === 401 || (error as { status?: unknown }).status === 403
  )
}

export function getErrorMessage(error: unknown): string {
  if (!(error instanceof ClientResponseError)) {
    return error instanceof Error ? error.message : 'An unexpected error occurred.'
  }
  const msgs = Object.values(extractFieldErrors(error))
  return msgs.length > 0 ? msgs.join(' ') : error.message || 'An unexpected error occurred.'
}
