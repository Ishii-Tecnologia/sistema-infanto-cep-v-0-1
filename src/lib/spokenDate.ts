// Meses em português, sem acento (o texto é normalizado antes da comparação)
const MONTHS: Record<string, number> = {
  janeiro: 1,
  fevereiro: 2,
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

type WordCategory = 'unit' | 'teen' | 'tens' | 'hundred' | 'thousand'

// Palavras numéricas em português, sem acento
const NUMBER_WORDS: Record<string, { cat: WordCategory; value: number }> = {
  zero: { cat: 'unit', value: 0 },
  um: { cat: 'unit', value: 1 },
  uma: { cat: 'unit', value: 1 },
  primeiro: { cat: 'unit', value: 1 },
  primeira: { cat: 'unit', value: 1 },
  dois: { cat: 'unit', value: 2 },
  duas: { cat: 'unit', value: 2 },
  tres: { cat: 'unit', value: 3 },
  quatro: { cat: 'unit', value: 4 },
  cinco: { cat: 'unit', value: 5 },
  seis: { cat: 'unit', value: 6 },
  sete: { cat: 'unit', value: 7 },
  oito: { cat: 'unit', value: 8 },
  nove: { cat: 'unit', value: 9 },
  dez: { cat: 'teen', value: 10 },
  onze: { cat: 'teen', value: 11 },
  doze: { cat: 'teen', value: 12 },
  treze: { cat: 'teen', value: 13 },
  catorze: { cat: 'teen', value: 14 },
  quatorze: { cat: 'teen', value: 14 },
  quinze: { cat: 'teen', value: 15 },
  dezesseis: { cat: 'teen', value: 16 },
  dezessete: { cat: 'teen', value: 17 },
  dezoito: { cat: 'teen', value: 18 },
  dezenove: { cat: 'teen', value: 19 },
  vinte: { cat: 'tens', value: 20 },
  trinta: { cat: 'tens', value: 30 },
  quarenta: { cat: 'tens', value: 40 },
  cinquenta: { cat: 'tens', value: 50 },
  sessenta: { cat: 'tens', value: 60 },
  setenta: { cat: 'tens', value: 70 },
  oitenta: { cat: 'tens', value: 80 },
  noventa: { cat: 'tens', value: 90 },
  cem: { cat: 'hundred', value: 100 },
  cento: { cat: 'hundred', value: 100 },
  duzentos: { cat: 'hundred', value: 200 },
  duzentas: { cat: 'hundred', value: 200 },
  trezentos: { cat: 'hundred', value: 300 },
  trezentas: { cat: 'hundred', value: 300 },
  quatrocentos: { cat: 'hundred', value: 400 },
  quatrocentas: { cat: 'hundred', value: 400 },
  quinhentos: { cat: 'hundred', value: 500 },
  quinhentas: { cat: 'hundred', value: 500 },
  seiscentos: { cat: 'hundred', value: 600 },
  seiscentas: { cat: 'hundred', value: 600 },
  setecentos: { cat: 'hundred', value: 700 },
  setecentas: { cat: 'hundred', value: 700 },
  oitocentos: { cat: 'hundred', value: 800 },
  oitocentas: { cat: 'hundred', value: 800 },
  novecentos: { cat: 'hundred', value: 900 },
  novecentas: { cat: 'hundred', value: 900 },
  mil: { cat: 'thousand', value: 1000 },
}

// Quais categorias podem vir logo depois de cada uma dentro do mesmo número falado
const NEXT_ALLOWED: Record<WordCategory, WordCategory[]> = {
  unit: ['thousand'],
  teen: [],
  tens: ['unit'],
  hundred: ['tens', 'teen', 'unit'],
  thousand: ['hundred', 'tens', 'teen', 'unit'],
}

interface NumItem {
  kind: 'num'
  value: number
  /** Quantidade de dígitos quando veio em algarismos (0 quando veio por extenso). */
  digits: number
}
type SpokenItem = NumItem | { kind: 'month'; value: number }

/** Remove acentos e põe em minúsculas: "Março" -> "marco". */
function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

/** Soma uma sequência de palavras numéricas (ex.: "dois mil e dezenove" -> 2019). */
function evaluateWords(words: string[]): number {
  let total = 0
  let current = 0
  for (const w of words) {
    const info = NUMBER_WORDS[w]
    if (info.cat === 'thousand') {
      current = (current || 1) * 1000
      total += current
      current = 0
    } else {
      current += info.value
    }
  }
  return total + current
}

/**
 * Converte o texto falado em itens: números (dígitos ou por extenso), meses.
 * Palavras numéricas coladas são unidas só quando a gramática permite
 * ("dois mil e dezenove" = um número; "doze três" = dois números).
 */
function tokenize(text: string): SpokenItem[] {
  const tokens = normalize(text)
    .replace(/[/\-.,]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
  const items: SpokenItem[] = []

  let i = 0
  while (i < tokens.length) {
    const t = tokens[i]
    if (/^\d+$/.test(t)) {
      items.push({ kind: 'num', value: parseInt(t, 10), digits: t.length })
      i++
      continue
    }
    if (t in MONTHS) {
      items.push({ kind: 'month', value: MONTHS[t] })
      i++
      continue
    }
    if (!(t in NUMBER_WORDS)) {
      // "de", "barra", "do", etc.: separadores sem valor
      i++
      continue
    }

    // Junta palavras numéricas enquanto a gramática permitir
    const run: string[] = [t]
    let j = i + 1
    while (j < tokens.length) {
      const next = tokens[j]
      const last = NUMBER_WORDS[run[run.length - 1]].cat
      if (next === 'e') {
        // "e" só entra se seguido de palavra numérica compatível ("noventa e nove")
        const after = tokens[j + 1]
        if (
          after &&
          after in NUMBER_WORDS &&
          NEXT_ALLOWED[last].includes(NUMBER_WORDS[after].cat)
        ) {
          j++
          continue
        }
        break
      }
      if (!(next in NUMBER_WORDS)) break
      if (!NEXT_ALLOWED[last].includes(NUMBER_WORDS[next].cat)) break
      run.push(next)
      j++
    }
    items.push({ kind: 'num', value: evaluateWords(run), digits: 0 })
    i = j
  }
  return items
}

/** Dígito isolado (falado ou digitado): "dois", "0", "9". */
function isSingleDigit(item: NumItem): boolean {
  return item.value >= 0 && item.value < 10 && item.digits <= 1
}

/** Ano falado: "dois mil e dezenove" = 2019; "noventa e nove" = 1999; "dois" não é ano. */
function normalizeYear(value: number): number | null {
  if (value >= 1000) return value
  if (value < 10) return null
  return value >= 30 ? 1900 + value : 2000 + value
}

/**
 * Lê o ano a partir de `start`. Aceita "dois mil e dezenove", "1999", "noventa e nove"
 * e o ano dígito a dígito que o celular costuma transcrever ("dois zero um nove" / "2 0 1 9").
 */
function takeYear(nums: NumItem[], start: number): number | null {
  const first = nums[start]
  if (!first) return null
  if (!isSingleDigit(first)) return normalizeYear(first.value)
  let digitsStr = ''
  let k = start
  while (k < nums.length && digitsStr.length < 4 && isSingleDigit(nums[k])) {
    digitsStr += String(nums[k].value)
    k++
  }
  if (digitsStr.length !== 4) return null
  return parseInt(digitsStr, 10)
}

function toIso(day: number, month: number, year: number): string | null {
  if (year < 1900 || year > 2100) return null
  if (month < 1 || month > 12) return null
  const daysInMonth = new Date(year, month, 0).getDate()
  if (day < 1 || day > daysInMonth) return null
  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

/**
 * Interpreta uma data ditada em português. Aceita, entre outros:
 * "10/03/1990", "10 03 1990", "dez barra três barra noventa", "dez de março de mil novecentos e noventa",
 * "doze de março de dois mil e dezenove", "doze três dois mil dezenove", "doze três dois zero um nove",
 * "12 3 2 0 1 9", "12031999".
 * Retorna YYYY-MM-DD ou null quando não reconhece uma data completa.
 */
export function parseSpokenDate(spoken: string): string | null {
  if (!spoken || !spoken.trim()) return null
  const items = tokenize(spoken)

  const nums = items.filter((it): it is NumItem => it.kind === 'num')

  // Caso especial: 8 dígitos colados (ddmmyyyy) ou 8 dígitos falados um a um
  const packed = nums.find((it) => it.digits === 8)
  if (packed) {
    const s = String(packed.value).padStart(8, '0')
    return toIso(parseInt(s.slice(0, 2), 10), parseInt(s.slice(2, 4), 10), parseInt(s.slice(4), 10))
  }
  if (nums.length === 8 && nums.every(isSingleDigit) && !items.some((it) => it.kind === 'month')) {
    const s = nums.map((n) => String(n.value)).join('')
    return toIso(parseInt(s.slice(0, 2), 10), parseInt(s.slice(2, 4), 10), parseInt(s.slice(4), 10))
  }

  const monthIdx = items.findIndex((it) => it.kind === 'month')
  if (monthIdx >= 0) {
    const month = (items[monthIdx] as { value: number }).value
    const before = items.slice(0, monthIdx).filter((it): it is NumItem => it.kind === 'num')
    const after = items.slice(monthIdx + 1).filter((it): it is NumItem => it.kind === 'num')
    // Dia: o número logo antes do mês; se não houver, o primeiro depois dele
    let dayItem: NumItem | undefined
    let yearRest: NumItem[]
    if (before.length > 0) {
      dayItem = before[before.length - 1]
      yearRest = after
    } else {
      dayItem = after[0]
      yearRest = after.slice(1)
    }
    if (!dayItem) return null
    const year = takeYear(yearRest, 0)
    if (year === null) return null
    return toIso(dayItem.value, month, year)
  }

  if (nums.length < 3) return null
  const year = takeYear(nums, 2)
  if (year === null) return null
  return toIso(nums[0].value, nums[1].value, year)
}
