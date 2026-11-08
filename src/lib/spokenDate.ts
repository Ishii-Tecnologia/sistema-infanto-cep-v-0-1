const MONTHS: Record<string, number> = {
  janeiro: 1,
  fevereiro: 2,
  março: 3,
  marco: 3,
  abril: 4,
  maio: 5,
  junho: 6,
  julho: 7,
  agosto: 8,
  setembro: 9,
  outubro: 10,
  novembro: 11,
  dezembro: 12,
}

function toIso(day: number, month: number, year: number): string | null {
  if (year < 1900 || year > 2100) return null
  if (month < 1 || month > 12) return null
  const daysInMonth = new Date(year, month, 0).getDate()
  if (day < 1 || day > daysInMonth) return null
  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

/**
 * Interpreta uma data ditada em português, nos formatos:
 * "10/03/1990", "10 03 1990" ou "dez de março de 1990".
 * Retorna YYYY-MM-DD ou null quando não reconhece uma data completa.
 */
export function parseSpokenDate(spoken: string): string | null {
  const text = spoken.trim().toLowerCase()
  if (!text) return null

  const numeric = text.match(/(\d{1,2})\D+(\d{1,2})\D+(\d{4})/)
  if (numeric) {
    return toIso(parseInt(numeric[1], 10), parseInt(numeric[2], 10), parseInt(numeric[3], 10))
  }

  const monthNames = Object.keys(MONTHS).join('|')
  const named = text.match(
    new RegExp(`(\\d{1,2})\\s*(?:de\\s+)?(${monthNames})\\s*(?:de\\s+)?(\\d{4})`),
  )
  if (named) {
    return toIso(parseInt(named[1], 10), MONTHS[named[2]], parseInt(named[3], 10))
  }

  return null
}
