// Máscara de telefone brasileiro (nn) nnnnn-nnnn: aceita apenas dígitos e
// formata ao digitar e ao ditar por voz. Usada por todos os campos de telefone
// do cadastro de famílias (Families.tsx).

/** Deixa só os dígitos, limitados a 11 (DDD + 9 dígitos). */
export function onlyDigits(value: string): string {
  return value.replace(/\D/g, '').slice(0, 11)
}

/**
 * Aplica a máscara (nn) nnnnn-nnnn. Não é destrutiva com texto já formatado:
 * extraia os dígitos antes com `onlyDigits` quando o valor vier da voz.
 */
export function formatPhoneBR(value: string): string {
  const digits = onlyDigits(value)
  const len = digits.length
  if (len === 0) return ''
  if (len <= 2) return `(${digits}`
  if (len <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`
  if (len <= 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`
  }
  // 11 dígitos: DDD + celular com 9
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`
}
