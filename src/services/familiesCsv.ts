/**
 * Exportação/Importação de CSV — Famílias, Responsáveis e Crianças
 * (tela /familias).
 *
 * Formato do arquivo (compartilhado por export, import e template):
 * - Texto UTF-8 com BOM, separador ";" (padrão Excel brasileiro), quebras \r\n.
 * - Uma linha por CRIANÇA. As colunas de família e responsáveis repetem em
 *   cada linha da mesma família.
 * - Colunas de responsáveis são fixas: os 2 primeiros responsáveis têm colunas
 *   próprias (Responsável 1..2); a partir do 3º, os extras vão na coluna
 *   "Responsáveis Extras" como blocos "Nome | Parentesco | Nascimento |
 *   Telefone" separados por " // " (apenas no export/informativo —
 *   na importação eles não são gravados).
 * - Datas: dd/mm/aaaa (vazio quando não informado).
 * - Booleanos: "Sim" / "Não" (Autorização de Imagem).
 *
 * Chaves de identificação usadas na importação (cria OU atualiza):
 * - Família: Nome de Referência da Família (case-insensitive, sem espaços
 *   extras). Se não existir, a família é criada.
 * - Criança: Nome da Criança + Data de Nascimento dentro da família
 *   (case-insensitive); se não houver, o mesmo Nome dentro da família.
 *   Se não existir, é criada. Linha sem nome de criança atualiza apenas os
 *   dados da família/responsáveis.
 * - Responsável: Nome + Parentesco dentro da família (case-insensitive); se
 *   não houver, o mesmo Nome dentro da família. Se não existir, é criado.
 * - E-mail não existe mais (nem da família nem dos responsáveis): a coluna foi
 *   removida do sistema e do banco (migração 0029). CSVs antigos com a coluna
 *   "Responsável N - E-mail" ainda importam: a coluna extra é simplesmente
 *   ignorada (a importação valida apenas que as colunas esperadas existem).
 * - A coluna "Sala" NÃO é lida na importação: a sala é calculada pela data de
 *   nascimento (mesmo critério do cadastro individual). Ela existe apenas na
 *   exportação.
 * - A importação NUNCA apaga registros que não estão no CSV.
 * - Uma linha sem Nome da Criança atualiza apenas os dados da família/responsáveis.
 */

import pb from '@/lib/pocketbase/client'
import { Family, Guardian, Child, ClassroomId } from '@/types'
import { toBirthDatePayload, normalizeBirthDateIso } from '@/services/families'
import { normalizeSearchText } from '@/lib/familySearch'

export const CSV_HEADERS = [
  'Nome de Referência da Família',
  'Telefone Principal',
  'Endereço',
  'Bairro',
  'Observações da Família',
  'Responsável 1 - Nome',
  'Responsável 1 - Parentesco',
  'Responsável 1 - Nascimento',
  'Responsável 1 - Telefone',
  'Responsável 2 - Nome',
  'Responsável 2 - Parentesco',
  'Responsável 2 - Nascimento',
  'Responsável 2 - Telefone',
  'Responsáveis Extras (informativo)',
  'Nome da Criança',
  'Data de Nascimento da Criança',
  'Sala',
  'Alergias',
  'Observações Médicas',
  'Autorização de Imagem',
] as const

/** Cabeçalho aceito na importação: igual ao da exportação, sem a coluna "Sala". */
export const CSV_IMPORT_HEADERS: string[] = CSV_HEADERS.filter((h) => h !== 'Sala')

const SEP = ';'

// ---------- helpers de CSV ----------

function csvCell(value: unknown): string {
  const raw = value === null || value === undefined ? '' : String(value)
  // Aspas somente quando necessário (contém ;, quebra de linha ou aspas)
  if (/[;\r\n"]/.test(raw)) {
    return `"${raw.replace(/"/g, '""')}"`
  }
  return raw
}

/** Faz o parse de uma linha CSV respeitando aspas e o separador ";". */
function parseCsvLine(line: string): string[] {
  const cells: string[] = []
  let current = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          current += '"'
          i++
        } else {
          inQuotes = false
        }
      } else {
        current += ch
      }
    } else if (ch === '"') {
      inQuotes = true
    } else if (ch === ';') {
      cells.push(current)
      current = ''
    } else {
      current += ch
    }
  }
  cells.push(current)
  return cells
}

/** Converte o conteúdo completo de um CSV (com BOM opcional) em linhas de células. */
function parseCsv(raw: string): string[][] {
  const text = raw.charCodeAt(0) === 0xfeff ? raw.slice(1) : raw
  return text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n').map(parseCsvLine)
}

function boolToSimNao(value?: boolean): string {
  return value ? 'Sim' : 'Não'
}

function parseSimNao(value: string | undefined): boolean | undefined {
  if (value === undefined) return undefined
  const v = value.trim().toLowerCase()
  if (!v) return undefined
  return v === 'sim' || v === 's' || v === 'true' || v === '1' || v === 'x'
}

/** Aceita dd/mm/aaaa (com ano de 2 ou 4 dígitos) e ISO; retorna ISO ou ''. */
export function csvDateToIso(value: string | undefined): string {
  const clean = (value || '').trim()
  if (!clean) return ''
  const iso = normalizeBirthDateIso(clean)
  return iso || ''
}

function classroomToLabel(classroom?: string): string {
  return classroom ? `Sala ${classroom}` : ''
}

function normalizeKey(value: string | undefined): string {
  return (value || '').trim().toLowerCase().replace(/\s+/g, ' ')
}

function isoToBrDate(iso?: string): string {
  if (!iso) return ''
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (m) return `${m[3]}/${m[2]}/${m[1]}`
  return ''
}

function formatRow(
  family: Family,
  guardian: Guardian | undefined,
  child: Child | undefined,
): string[] {
  const g1 = family.guardians?.[0]
  const g2 = family.guardians?.[1]
  const extras = (family.guardians || []).slice(2)
  const extrasText = extras
    .map(
      (g) =>
        `${g.name || '(sem nome)'} | ${g.relationship || ''} | ${isoToBrDate(g.birth_date)} | ${
          g.phone || ''
        }`,
    )
    .join(' // ')

  const base = [
    family.reference_name || '',
    family.primary_phone || '',
    family.address || '',
    family.bairro || '',
    family.notes || '',
    g1?.name || '',
    g1?.relationship || '',
    isoToBrDate(g1?.birth_date),
    g1?.phone || '',
    g2?.name || '',
    g2?.relationship || '',
    isoToBrDate(g2?.birth_date),
    g2?.phone || '',
    extrasText,
  ]

  const childCols = child
    ? [
        child.name || '',
        isoToBrDate(child.birth_date),
        classroomToLabel(child.classroom),
        child.allergies || '',
        child.medical_notes || '',
        boolToSimNao(child.image_authorized),
      ]
    : ['', '', '', '', '', '']

  return [...base, ...childCols]
}

// ---------- Exportar ----------

export function buildFamiliesCsv(families: Family[], includeClassroom = true): string {
  const keep = (row: string[]) =>
    includeClassroom ? row : row.filter((_, i) => CSV_HEADERS[i] !== 'Sala')
  const rows: string[][] = [keep([...CSV_HEADERS])]
  for (const family of families) {
    const children = family.children && family.children.length > 0 ? family.children : [undefined]
    for (const child of children) {
      rows.push(keep(formatRow(family, undefined, child)))
    }
  }
  return rows.map((r) => r.map(csvCell).join(SEP)).join('\r\n')
}

export function downloadCsvFile(filename: string, content: string): void {
  const blob = new Blob(['\uFEFF' + content], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export function exportFamiliesCsv(families: Family[], includeClassroom = true): void {
  const now = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  const stamp = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
  downloadCsvFile(`familias_${stamp}.csv`, buildFamiliesCsv(families, includeClassroom))
}

// ---------- Modelo (template) ----------

export function downloadFamiliesCsvTemplate(): void {
  const sample: Family = {
    id: 'exemplo',
    reference_name: 'Familia Maria Silva',
    primary_phone: '(11) 98888-7777',
    address: 'Rua das Flores, 123',
    bairro: 'Centro',
    notes: 'Chegam juntos, preferem contato por WhatsApp.',
    guardians: [
      {
        id: 'g1',
        family_id: 'exemplo',
        name: 'Maria Silva',
        relationship: 'Mãe',
        birth_date: '1985-03-10T00:00:00.000Z',
        phone: '(11) 98888-7777',
        is_emergency_contact: true,
      },
      {
        id: 'g2',
        family_id: 'exemplo',
        name: 'João Silva',
        relationship: 'Pai',
        birth_date: '1983-07-22T00:00:00.000Z',
        phone: '(11) 97777-6666',
        is_emergency_contact: false,
      },
    ],
    children: [
      {
        id: 'c1',
        family_id: 'exemplo',
        name: 'Ana Silva',
        birth_date: '2017-05-14T00:00:00.000Z',
        classroom: 'B',
        allergies: 'Nenhuma conhecida',
        medical_notes: '',
        image_authorized: true,
      },
    ],
  }
  exportFamiliesCsv([sample], false)
}

// ---------- Importar ----------

export interface CsvImportError {
  line: number // linha do arquivo (1-based, incluindo cabeçalho)
  reason: string
}

export interface CsvImportResult {
  familiesCreated: number
  familiesUpdated: number
  guardiansCreated: number
  guardiansUpdated: number
  childrenCreated: number
  childrenUpdated: number
  errors: CsvImportError[]
}

export interface CsvSearchFilterResult {
  rows: ParsedRow[]
  /** Famílias (grupos de linhas do mesmo Nome de Referência) descartadas. */
  ignoredFamilies: number
  /** Linhas do arquivo que pertenciam às famílias descartadas. */
  ignoredLines: number
}

/**
 * Quando a busca da tela /familias está preenchida no momento da importação,
 * mantém SOMENTE as famílias cujo conteúdo casa com o filtro; as demais linhas
 * do CSV são ignoradas (nada é criado nem atualizado). O critério é o mesmo da
 * busca da tela (normalizeSearchText: ignora acentos e maiúsculas), testado
 * contra o Nome de Referência da família e os nomes de responsáveis/crianças
 * presentes nas linhas dela no CSV.
 */
export function filterRowsBySearchText(rows: ParsedRow[], query: string): CsvSearchFilterResult {
  const tokens = normalizeSearchText(query).split(/\s+/).filter(Boolean)
  if (tokens.length === 0) return { rows, ignoredFamilies: 0, ignoredLines: 0 }

  // Agrupa as linhas por família (chave = Nome de Referência normalizado),
  // preservando a ordem do arquivo — assim a decisão é por FAMÍLIA, e não por
  // linha (os responsáveis podem estar só na primeira linha da família).
  const groups = new Map<string, ParsedRow[]>()
  const order: string[] = []
  for (const row of rows) {
    const key = normalizeKey(row.family.reference_name)
    let group = groups.get(key)
    if (!group) {
      group = []
      groups.set(key, group)
      order.push(key)
    }
    group.push(row)
  }

  const kept: ParsedRow[] = []
  let ignoredFamilies = 0
  let ignoredLines = 0
  for (const key of order) {
    const group = groups.get(key)!
    const haystack = normalizeSearchText(
      [
        group[0].family.reference_name,
        ...group.flatMap((r) => r.guardians.map((g) => g.name)),
        ...group.flatMap((r) => (r.child ? [r.child.name] : [])),
      ]
        .filter(Boolean)
        .join(' '),
    )
    if (tokens.every((t) => haystack.includes(t))) {
      kept.push(...group)
    } else {
      ignoredFamilies++
      ignoredLines += group.length
    }
  }
  return { rows: kept, ignoredFamilies, ignoredLines }
}

interface ParsedRow {
  lineNumber: number
  family: {
    reference_name: string
    primary_phone: string
    address: string
    bairro: string
    notes: string
  }
  guardians: Array<{
    name: string
    relationship: string
    birth_date: string
    phone: string
  }>
  child: {
    name: string
    birth_date: string
    classroom: ClassroomId | ''
    allergies: string
    medical_notes: string
    image_authorized?: boolean
  } | null
}

/**
 * Valida e agrupa as linhas do CSV por família (Nome de Referência).
 * Lança Error com mensagem amigável quando o arquivo em si é inválido
 * (cabeçalho errado, nenhuma linha de dados, etc.).
 */
export function parseFamiliesCsv(
  raw: string,
  classifyByBirthDate: (birthIso: string) => ClassroomId,
): ParsedRow[] {
  const matrix = parseCsv(raw)
  if (matrix.length === 0) {
    throw new Error('O arquivo está vazio.')
  }

  const header = matrix[0].map((h) => h.trim())
  const expected = CSV_IMPORT_HEADERS
  const missing = expected.filter((h) => !header.includes(h))
  if (missing.length > 0) {
    throw new Error(
      `Cabeçalho inválido. Coluna(s) ausente(s): ${missing.join(', ')}. Baixe o modelo para conferir o formato.`,
    )
  }
  const col = (name: string) => header.indexOf(name)

  const idx = {
    familyName: col('Nome de Referência da Família'),
    familyPhone: col('Telefone Principal'),
    familyAddress: col('Endereço'),
    familyBairro: col('Bairro'),
    familyNotes: col('Observações da Família'),
    g1Name: col('Responsável 1 - Nome'),
    g1Rel: col('Responsável 1 - Parentesco'),
    g1Birth: col('Responsável 1 - Nascimento'),
    g1Phone: col('Responsável 1 - Telefone'),
    g2Name: col('Responsável 2 - Nome'),
    g2Rel: col('Responsável 2 - Parentesco'),
    g2Birth: col('Responsável 2 - Nascimento'),
    g2Phone: col('Responsável 2 - Telefone'),
    childName: col('Nome da Criança'),
    childBirth: col('Data de Nascimento da Criança'),

    childAllergies: col('Alergias'),
    childMedical: col('Observações Médicas'),
    childImage: col('Autorização de Imagem'),
  }

  const rows: ParsedRow[] = []
  for (let i = 1; i < matrix.length; i++) {
    const cells = matrix[i]
    if (cells.every((c) => !c || !c.trim())) continue // linha em branco: ignorada

    const at = (index: number) =>
      index >= 0 && index < cells.length ? (cells[index] || '').trim() : ''

    const referenceName = at(idx.familyName)
    if (!referenceName) {
      throw new Error(
        `Linha ${i + 1}: a coluna "Nome de Referência da Família" é obrigatória em todas as linhas.`,
      )
    }

    const g1 = {
      name: at(idx.g1Name),
      relationship: at(idx.g1Rel),
      birth_date: csvDateToIso(at(idx.g1Birth)),
      phone: at(idx.g1Phone),
    }
    const g2 = {
      name: at(idx.g2Name),
      relationship: at(idx.g2Rel),
      birth_date: csvDateToIso(at(idx.g2Birth)),
      phone: at(idx.g2Phone),
    }

    const childName = at(idx.childName)
    let child: ParsedRow['child'] = null
    if (childName) {
      const birthRaw = at(idx.childBirth)
      const birthIso = csvDateToIso(birthRaw)
      if (!birthIso) {
        throw new Error(
          `Linha ${i + 1}: criança "${childName}" sem data de nascimento válida (use dd/mm/aaaa).`,
        )
      }
      child = {
        name: childName,
        birth_date: birthIso,
        // Sala calculada pela idade na data de corte (mesmo critério do cadastro)
        classroom: classifyByBirthDate(birthIso),
        allergies: at(idx.childAllergies),
        medical_notes: at(idx.childMedical),
        image_authorized: parseSimNao(at(idx.childImage)),
      }
    }

    rows.push({
      lineNumber: i + 1,
      family: {
        reference_name: referenceName,
        primary_phone: at(idx.familyPhone),
        address: at(idx.familyAddress),
        bairro: at(idx.familyBairro),
        notes: at(idx.familyNotes),
      },
      guardians: [g1, g2].filter((g) => g.name !== ''),
      child,
    })
  }

  if (rows.length === 0) {
    throw new Error('Nenhuma linha de dados encontrada no arquivo.')
  }
  return rows
}

/**
 * Aplica as linhas validadas ao PocketBase: cria ou atualiza famílias,
 * responsáveis e crianças. NUNCA apaga registros que não estão no CSV.
 */
export async function applyFamiliesCsv(
  rows: ParsedRow[],
  existingFamilies: Family[],
): Promise<CsvImportResult> {
  const result: CsvImportResult = {
    familiesCreated: 0,
    familiesUpdated: 0,
    guardiansCreated: 0,
    guardiansUpdated: 0,
    childrenCreated: 0,
    childrenUpdated: 0,
    errors: [],
  }

  // Índice local de famílias por nome de referência normalizado
  const familyByKey = new Map<string, Family>()
  for (const f of existingFamilies) {
    familyByKey.set(normalizeKey(f.reference_name), f)
  }

  for (const row of rows) {
    const key = normalizeKey(row.family.reference_name)
    try {
      let family = familyByKey.get(key)
      let familyCreated = false

      if (!family) {
        family = await pb.collection('families').create<Family>({
          reference_name: row.family.reference_name,
          primary_phone: row.family.primary_phone,
          address: row.family.address,
          bairro: row.family.bairro,
          notes: row.family.notes,
        })
        familyByKey.set(key, family)
        familyCreated = true
        result.familiesCreated++
      } else {
        await pb.collection('families').update(family.id, {
          primary_phone: row.family.primary_phone,
          address: row.family.address,
          bairro: row.family.bairro,
          notes: row.family.notes,
        })
        result.familiesUpdated++
      }

      const familyId = family.id
      const existingGuardians =
        (family.guardians as Guardian[] | undefined) ??
        (await pb
          .collection('guardians')
          .getFullList<Guardian>({ filter: `family_id = "${familyId}"` }))
      const existingChildren =
        (family.children as Child[] | undefined) ??
        (await pb
          .collection('children')
          .getFullList<Child>({ filter: `family_id = "${familyId}"` }))

      // Responsáveis: casa por Nome + Parentesco; se não houver, pelo Nome sozinho
      // dentro da família (sem reaproveitar o mesmo registro duas vezes na linha).
      // Cria os que não existem.
      const usedGuardianIds = new Set<string>()
      for (const g of row.guardians) {
        const sameName = (e: Guardian) =>
          !usedGuardianIds.has(e.id) && normalizeKey(e.name) === normalizeKey(g.name)
        const match =
          existingGuardians.find(
            (e) =>
              sameName(e) && normalizeKey(e.relationship || '') === normalizeKey(g.relationship),
          ) ?? existingGuardians.find(sameName)
        if (match) usedGuardianIds.add(match.id)
        const payload = {
          name: g.name,
          relationship: g.relationship,
          birth_date: toBirthDatePayload(g.birth_date),
          phone: g.phone,
        }
        if (match) {
          await pb.collection('guardians').update(match.id, payload)
          result.guardiansUpdated++
        } else {
          await pb.collection('guardians').create({ ...payload, family_id: familyId })
          result.guardiansCreated++
        }
      }

      // Crianças: casa por Nome + Data de Nascimento
      if (row.child) {
        // Casa por Nome + Nascimento; se não houver, pelo Nome sozinho dentro da família
        const childName = normalizeKey(row.child.name)
        const childBirth = row.child.birth_date.slice(0, 10)
        const sameChildName = (e: Child) => normalizeKey(e.name) === childName
        const match =
          existingChildren.find(
            (e) => sameChildName(e) && (e.birth_date || '').slice(0, 10) === childBirth,
          ) ?? existingChildren.find(sameChildName)
        const payload = {
          name: row.child.name,
          birth_date: toBirthDatePayload(row.child.birth_date),
          classroom: row.child.classroom,
          allergies: row.child.allergies,
          medical_notes: row.child.medical_notes,
          ...(row.child.image_authorized !== undefined
            ? { image_authorized: row.child.image_authorized }
            : {}),
        }
        if (match) {
          await pb.collection('children').update(match.id, payload)
          result.childrenUpdated++
        } else {
          await pb.collection('children').create({
            ...payload,
            family_id: familyId,
            active: true,
            dimdim_balance: 0,
          })
          result.childrenCreated++
        }
      }

      // Recarrega as listas da família no índice local (agora com os registros
      // gravados nesta linha), para que a próxima linha da mesma família
      // encontre o estado atual do banco — sem isso, duas linhas seguidas da
      // mesma família duplicariam responsáveis/crianças.
      const [freshGuardians, freshChildren] = await Promise.all([
        pb.collection('guardians').getFullList<Guardian>({ filter: `family_id = "${familyId}"` }),
        pb.collection('children').getFullList<Child>({ filter: `family_id = "${familyId}"` }),
      ])
      familyByKey.set(key, {
        ...family,
        guardians: freshGuardians,
        children: freshChildren,
      })
    } catch (err) {
      result.errors.push({
        line: row.lineNumber,
        reason: err instanceof Error ? err.message : 'Erro desconhecido ao gravar o registro.',
      })
    }
  }

  return result
}
