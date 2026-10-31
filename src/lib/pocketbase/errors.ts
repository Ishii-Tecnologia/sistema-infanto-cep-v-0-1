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
    if (error.status === 401) return true
    if (
      error.status === 403 &&
      (error.message?.toLowerCase().includes('authenticate') ||
        error.message?.toLowerCase().includes('token') ||
        error.message?.toLowerCase().includes('unauthorized'))
    ) {
      return true
    }
  }
  if (error instanceof Error) {
    const msg = error.message.toLowerCase()
    if (
      msg.includes('token expired') ||
      msg.includes('jwt expired') ||
      msg.includes('sessão expirada') ||
      msg.includes('unauthorized')
    ) {
      return true
    }
  }
  return false
}

export function getErrorMessage(error: unknown): string {
  if (!(error instanceof ClientResponseError)) {
    return error instanceof Error ? error.message : 'Ocorreu um erro inesperado.'
  }

  // Erros de autenticação / token expirado
  if (error.status === 401) {
    return 'Sua sessão expirou ou não está mais autenticada. Faça login novamente no Sistema Infanto-CEP.'
  }

  if (error.status === 403) {
    return (
      error.message || 'Acesso não autorizado ou perfil sem permissão para realizar esta operação.'
    )
  }

  const fieldErrors = extractFieldErrors(error)
  const fieldList = Object.entries(fieldErrors)
  if (fieldList.length > 0) {
    return fieldList.map(([field, msg]) => `${field}: ${msg}`).join(' | ')
  }

  // Se a mensagem do PocketBase for genérica ("Failed to create record." ou "Failed to update record.")
  if (error.message === 'Failed to create record.' || error.message === 'Failed to create record') {
    return 'Falha ao criar o registro no banco de dados. Verifique os campos obrigatórios e suas permissões.'
  }

  if (error.message === 'Failed to update record.' || error.message === 'Failed to update record') {
    return 'Falha ao atualizar o registro no banco de dados. Verifique os dados informados.'
  }

  return error.message || 'Ocorreu um erro inesperado no servidor.'
}
