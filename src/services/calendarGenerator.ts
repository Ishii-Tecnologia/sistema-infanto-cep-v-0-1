import pb from '@/lib/pocketbase/client'
import { Lesson, LessonPlan, ClassroomId } from '@/types'
import { SchoolYearConfig, RecessSaturday } from '@/contexts/AcademicContext'

export const DEFAULT_THEMES_30 = [
  { num: 1, block: 'Deus e a Criação', theme: 'Deus, Pai e Criador de Todas as Coisas' },
  { num: 2, block: 'Deus e a Criação', theme: 'A Natureza e a Bondade Divina' },
  { num: 3, block: 'Deus e a Criação', theme: 'Cuidando do Nosso Planeta e dos Seres Vivos' },
  { num: 4, block: 'Jesus e Seus Ensinos', theme: 'Quem é Jesus: Nosso Mestre e Amigo' },
  { num: 5, block: 'Jesus e Seus Ensinos', theme: 'A Parábola do Bom Samaritano: Amor ao Próximo' },
  {
    num: 6,
    block: 'Jesus e Seus Ensinos',
    theme: 'O Sermão da Montanha: Bem-Aventurados os Mansos',
  },
  {
    num: 7,
    block: 'Família e Convivência',
    theme: 'A Importância da Família e o Respeito aos Pais',
  },
  { num: 8, block: 'Família e Convivência', theme: 'Paciência e Compreensão no Lar' },
  {
    num: 9,
    block: 'Família e Convivência',
    theme: 'Fraternidade e Amizade entre Irmãos e Colegas',
  },
  {
    num: 10,
    block: 'Mundo Espiritual e Prece',
    theme: 'A Alma e os Espíritos Protetores (Anjo Guardião)',
  },
  { num: 11, block: 'Mundo Espiritual e Prece', theme: 'O Poder da Prece Sincera: Falar com Deus' },
  {
    num: 12,
    block: 'Mundo Espiritual e Prece',
    theme: 'Pensamentos, Sentimentos e Boas Vibrações',
  },
  {
    num: 13,
    block: 'Mundo Espiritual e Prece',
    theme: 'A Lei de Reencarnação: Novas Oportunidades de Aprender',
  },
  {
    num: 14,
    block: 'Mundo Espiritual e Prece',
    theme: 'Alegria e Gratidão pelo Semestre de Aprendizado',
  },
  {
    num: 15,
    block: 'A Lei do Trabalho e Progresso',
    theme: 'Retorno e Acolhimento: O Valor do Esforço e Dedicação',
  },
  { num: 16, block: 'A Lei do Trabalho e Progresso', theme: 'O Trabalho no Bem e a Cooperação' },
  { num: 17, block: 'Virtudes e Sentimentos', theme: 'A Humildade e a Sinceridade de Coração' },
  { num: 18, block: 'Virtudes e Sentimentos', theme: 'O Perdão: Limpando o Coração da Mágua' },
  {
    num: 19,
    block: 'Virtudes e Sentimentos',
    theme: 'A Verdade e a Honestidade nas Pequenas Ações',
  },
  {
    num: 20,
    block: 'Virtudes e Sentimentos',
    theme: 'A Coragem Moral: Fazer o Bem Mesmo Quando Difícil',
  },
  { num: 21, block: 'Caridade em Ação', theme: 'Fora da Caridade Não Há Salvação' },
  { num: 22, block: 'Caridade em Ação', theme: 'A Caridade Moral: Ouvir, Acolher e Não Julgar' },
  { num: 23, block: 'Caridade em Ação', theme: 'A Prática do Desapego e Partilha' },
  {
    num: 24,
    block: 'A Lei de Causa e Efeito',
    theme: 'A Semeadura é Livre, a Colheita Obrigatória',
  },
  { num: 25, block: 'A Lei de Causa e Efeito', theme: 'Responsabilidade pelas Nossas Escolhas' },
  { num: 26, block: 'A Lei de Causa e Efeito', theme: 'O Autoaperfeiçoamento Diário' },
  { num: 27, block: 'Espiritismo e Evangelho', theme: 'Allan Kardec e as Obras Básicas' },
  { num: 28, block: 'Espiritismo e Evangelho', theme: 'Chico Xavier: Exemplo de Amor e Humildade' },
  {
    num: 29,
    block: 'Encerramento e Confraternização',
    theme: 'Celebrando os Dons da Luz e da Amizade',
  },
  {
    num: 30,
    block: 'Encerramento e Confraternização',
    theme: 'Festa de Encerramento e Apresentação Pedagógica',
  },
]

// Helper para normalizar qualquer representação de data (ISO YYYY-MM-DD ou BR DD/MM/AAAA)
export function toIsoDateOnly(dateStr?: string): string {
  if (!dateStr) return ''
  const trimmed = dateStr.trim().split('T')[0].split(' ')[0]
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed
  }
  const matchBR = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (matchBR) {
    const [, d, m, y] = matchBR
    const padD = d.padStart(2, '0')
    const padM = m.padStart(2, '0')
    return `${y}-${padM}-${padD}`
  }
  return trimmed
}

// Pequena pausa para evitar estourar o rate limit de requisições por segundo
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

// Executa operação com retry automático para erros transitórios (ex: 429 Too Many Requests)
async function withRetry<T>(fn: () => Promise<T>, maxRetries = 5, baseDelay = 400): Promise<T> {
  let attempt = 0
  while (true) {
    try {
      return await fn()
    } catch (err: any) {
      attempt++
      const status = err?.status || err?.statusCode || err?.data?.code
      const isRateLimit = status === 429 || String(err?.message || '').includes('Too Many Requests')
      if (attempt <= maxRetries && isRateLimit) {
        const delay = baseDelay * Math.pow(2, attempt - 1) + Math.random() * 150
        await sleep(delay)
        continue
      }
      throw err
    }
  }
}

export interface SaturdayEntry {
  date: string
  tipo: 'letivo' | 'feriado' | 'recesso' | 'evento'
  nome?: string
  recess?: RecessSaturday
}

/**
 * Percorre TODOS os sábados entre startDate e endDate (inclusive).
 * Se endDateStr for fornecido, percorre até a data de encerramento configurada.
 * Se endDateStr não for fornecido, gera até atingir `fallbackCount` sábados letivos (padrão 30).
 */
export function generateAllSaturdaysBetween(
  startDateStr: string,
  endDateStr?: string,
  recessSaturdays: RecessSaturday[] = [],
  fallbackCount = 30,
): SaturdayEntry[] {
  const cleanStart = toIsoDateOnly(startDateStr)
  if (!cleanStart) {
    throw new Error('Data de início do ano letivo não informada ou inválida.')
  }

  const cleanEnd = toIsoDateOnly(endDateStr)

  const [startYear, startMonth, startDay] = cleanStart.split('-').map(Number)
  if (!startYear || !startMonth || !startDay) {
    throw new Error(
      `Data de início inválida: "${startDateStr}". Utilize o formato dd/mm/aaaa ou aaaa-mm-dd.`,
    )
  }

  // Mapa de recessos / feriados / eventos por data YYYY-MM-DD
  const recessMap = new Map<string, RecessSaturday>()
  for (const r of recessSaturdays || []) {
    const d = toIsoDateOnly(r.date)
    if (d) recessMap.set(d, r)
  }

  const current = new Date(Date.UTC(startYear, startMonth - 1, startDay, 12, 0, 0))
  // Se o dia não for sábado (dia da semana 6), avança até o próximo sábado
  while (current.getUTCDay() !== 6) {
    current.setUTCDate(current.getUTCDate() + 1)
  }

  let endDate: Date | null = null
  if (cleanEnd) {
    const [endYear, endMonth, endDay] = cleanEnd.split('-').map(Number)
    if (endYear && endMonth && endDay) {
      endDate = new Date(Date.UTC(endYear, endMonth - 1, endDay, 23, 59, 59))
    }
  }

  const entries: SaturdayEntry[] = []
  let safetyCounter = 0
  let letivoCount = 0

  while (safetyCounter < 150) {
    safetyCounter++
    if (endDate && current > endDate) {
      break
    }
    if (!endDate && letivoCount >= fallbackCount) {
      break
    }

    const y = current.getUTCFullYear()
    const m = String(current.getUTCMonth() + 1).padStart(2, '0')
    const d = String(current.getUTCDate()).padStart(2, '0')
    const dateStr = `${y}-${m}-${d}`

    const rec = recessMap.get(dateStr)
    if (rec) {
      // Determina o tipo adequado a partir do nome
      const nameLower = (rec.name || '').toLowerCase()
      let tipo: 'feriado' | 'recesso' | 'evento' = 'recesso'
      if (
        nameLower.includes('bingo') ||
        nameLower.includes('festa') ||
        nameLower.includes('evento') ||
        nameLower.includes('confraterniza') ||
        nameLower.includes('feira') ||
        nameLower.includes('mostra') ||
        nameLower.includes('noite')
      ) {
        tipo = 'evento'
      } else if (
        nameLower.includes('feriado') ||
        nameLower.includes('páscoa') ||
        nameLower.includes('tiradentes') ||
        nameLower.includes('independência') ||
        nameLower.includes('aparecida') ||
        nameLower.includes('finados') ||
        nameLower.includes('república') ||
        nameLower.includes('trabalho') ||
        nameLower.includes('carnaval') ||
        nameLower.includes('corpus')
      ) {
        tipo = 'feriado'
      } else {
        tipo = 'recesso'
      }

      entries.push({
        date: dateStr,
        tipo,
        nome: rec.name,
        recess: rec,
      })
    } else {
      letivoCount++
      entries.push({
        date: dateStr,
        tipo: 'letivo',
      })
    }

    current.setUTCDate(current.getUTCDate() + 7)
  }

  return entries
}

export function generateSaturdaysList(
  startDateStr: string,
  recessSaturdays: RecessSaturday[],
  count = 30,
): string[] {
  const entries = generateAllSaturdaysBetween(startDateStr, undefined, recessSaturdays, count)
  return entries
    .filter((e) => e.tipo === 'letivo')
    .map((e) => e.date)
    .slice(0, count)
}

export async function syncOrRegenerateCalendar(
  config: SchoolYearConfig,
  recesses: RecessSaturday[],
  onProgress?: (msg: string) => void,
) {
  const startDate = toIsoDateOnly(config.startDate)
  if (!startDate) {
    throw new Error('A data de início das aulas é obrigatória para sincronizar o calendário.')
  }

  // Extrai o ano a partir da data de início normalizada para garantir coerência estrita
  const parsedStartYear = parseInt(startDate.split('-')[0], 10)
  const year = config.year || parsedStartYear || new Date().getFullYear()

  // Garante que feriados de recessos de meio de ano estejam inclusos na lista
  const normalizedRecesses: RecessSaturday[] = [...(recesses || [])]
  if (config.winterBreakStart && config.winterBreakEnd) {
    const wStart = toIsoDateOnly(config.winterBreakStart)
    const wEnd = toIsoDateOnly(config.winterBreakEnd)
    if (wStart && wEnd) {
      const [sy, sm, sd] = wStart.split('-').map(Number)
      const [ey, em, ed] = wEnd.split('-').map(Number)
      const cur = new Date(Date.UTC(sy, sm - 1, sd, 12, 0, 0))
      const end = new Date(Date.UTC(ey, em - 1, ed, 12, 0, 0))
      while (cur <= end) {
        if (cur.getUTCDay() === 6) {
          const y = cur.getUTCFullYear()
          const m = String(cur.getUTCMonth() + 1).padStart(2, '0')
          const d = String(cur.getUTCDate()).padStart(2, '0')
          const dStr = `${y}-${m}-${d}`
          if (!normalizedRecesses.some((r) => toIsoDateOnly(r.date) === dStr)) {
            normalizedRecesses.push({
              date: dStr,
              name: 'Férias de Julho / Recesso Escolar',
            })
          }
        }
        cur.setUTCDate(cur.getUTCDate() + 1)
      }
    }
  }

  const endDate = toIsoDateOnly(config.endDate)
  const allSaturdayEntries = generateAllSaturdaysBetween(startDate, endDate, normalizedRecesses, 30)
  const saturdays = allSaturdayEntries.filter((e) => e.tipo === 'letivo').map((e) => e.date)

  // 1. Busca todas as aulas já cadastradas para o ano
  let existingLessons = await withRetry(() =>
    pb.collection('lessons').getFullList<Lesson>({
      filter: `year=${year}`,
      sort: 'session_number',
    }),
  )

  // Fallback de compatibilidade: se não encontrou pelo campo year (ex: ano alterado recentemente no formulário),
  // busca por aulas que já pertençam ao ano da data de início (pelo prefixo da data)
  if (existingLessons.length === 0 && parsedStartYear) {
    const lessonsByDatePrefix = await withRetry(() =>
      pb.collection('lessons').getFullList<Lesson>({
        filter: `date >= '${parsedStartYear}-01-01' && date <= '${parsedStartYear}-12-31'`,
        sort: 'session_number',
      }),
    )
    if (lessonsByDatePrefix.length > 0) {
      existingLessons = lessonsByDatePrefix
    }
  }

  // Caso A: Se já existem aulas para este ano (completas ou parciais),
  // atualizamos as datas das aulas existentes por session_number preservando temas, planos e presenças,
  // e completamos eventuais sessões faltantes até 30.
  if (existingLessons.length > 0) {
    onProgress?.(`Sincronizando datas dos sábados para o ano ${year}...`)

    // Mapeia as aulas existentes por número de sessão (1..30)
    const existingBySession = new Map<number, Lesson>()
    for (const l of existingLessons) {
      if (l.session_number && !existingBySession.has(l.session_number)) {
        existingBySession.set(l.session_number, l)
      }
    }

    // Se houver aulas sem session_number, atribui pela ordem existente
    let fallbackSession = 1
    for (const l of existingLessons) {
      if (!l.session_number) {
        while (existingBySession.has(fallbackSession)) {
          fallbackSession++
        }
        existingBySession.set(fallbackSession, l)
      }
    }

    // Para evitar conflito com o índice único (idx_lessons_date UNIQUE) durante rotação de datas,
    // identificamos quais aulas precisam de nova data.
    // Usamos uma estratégia de duas fases caso datas existentes colidam com novas datas.
    const updatesToMake: Array<{ lesson: Lesson; targetDate: string; sessionNum: number }> = []

    for (let i = 0; i < saturdays.length; i++) {
      const sessionNum = i + 1
      const lesson = existingBySession.get(sessionNum)
      if (lesson) {
        const targetDate = saturdays[i]
        const currentDate = toIsoDateOnly(lesson.date)
        if (currentDate !== targetDate || lesson.year !== year) {
          updatesToMake.push({ lesson, targetDate, sessionNum })
        }
      }
    }

    if (updatesToMake.length > 0) {
      // Fase 1: se houver risco de colisão de datas entre as próprias aulas que serão alteradas,
      // temporariamente mudamos a data para uma data fictícia temporária com sufixo do id
      // apenas se a data de destino já estiver ocupada por outra aula.
      const allCurrentDatesInDb = new Set(existingLessons.map((l) => toIsoDateOnly(l.date)))
      const needsTempShift = updatesToMake.some((u) => allCurrentDatesInDb.has(u.targetDate))

      if (needsTempShift) {
        onProgress?.('Ajustando janelas de datas para evitar colisões...')
        for (let i = 0; i < updatesToMake.length; i++) {
          const item = updatesToMake[i]
          // Atribui uma data temporária única fora do intervalo escolar (ex: ano 2099)
          const tempDate = `2099-01-${String((i % 28) + 1).padStart(2, '0')} 00:00:00.000Z`
          await withRetry(() =>
            pb.collection('lessons').update(item.lesson.id, {
              date: tempDate,
            }),
          )
          await sleep(60)
        }
      }

      // Fase 2: Aplica as datas finais normalizadas
      for (const item of updatesToMake) {
        onProgress?.(`Atualizando Aula #${item.sessionNum} para ${item.targetDate}...`)
        await withRetry(() =>
          pb.collection('lessons').update(item.lesson.id, {
            date: `${item.targetDate} 00:00:00.000Z`,
            year: year,
            session_number: item.sessionNum,
          }),
        )
        await sleep(80)
      }
    }

    // Passo 2: Se o ano tinha menos de 30 aulas (ex: matriz incompleta),
    // completa as sessões faltantes preservando as que já existem.
    const completedSessionNumbers = new Set(existingBySession.keys())
    let createdMissingCount = 0

    for (let i = 0; i < saturdays.length; i++) {
      const sessionNum = i + 1
      if (!completedSessionNumbers.has(sessionNum)) {
        createdMissingCount++
        const sDate = saturdays[i]
        const themeInfo = DEFAULT_THEMES_30[i] || {
          block: 'Pedagógico Geral',
          theme: `Encontro Temático #${sessionNum}`,
        }

        onProgress?.(`Completando Aula #${sessionNum} (${sDate})...`)
        const createdLesson = await withRetry(() =>
          pb.collection('lessons').create({
            date: `${sDate} 00:00:00.000Z`,
            year: year,
            session_number: sessionNum,
            central_theme: themeInfo.theme,
            thematic_block: themeInfo.block,
            status: 'scheduled',
          }),
        )
        await sleep(100)

        // Cria planos pedagógicos para a aula que faltava
        const plans = createDefaultPlans(themeInfo.theme)
        for (const p of plans) {
          await withRetry(() =>
            pb.collection('lesson_plans').create({
              lesson_id: createdLesson.id,
              classroom: p.classroom,
              title: p.title,
              objective: p.objective,
              approach: p.approach,
              materials: p.materials,
            }),
          )
          await sleep(80)
        }
      }
    }

    const totalCount = existingLessons.length + createdMissingCount
    return {
      count: totalCount,
      action: createdMissingCount > 0 ? 'completed_matrix' : 'updated_dates',
      allEntries: allSaturdayEntries,
    }
  }

  // Caso B: Se não houver nenhuma aula para este ano, cria as aulas necessárias com planos pedagógicos
  onProgress?.(`Criando matriz de ${saturdays.length} sábados letivos para o ano ${year}...`)
  for (let i = 0; i < saturdays.length; i++) {
    const sessionNum = i + 1
    const sDate = saturdays[i]
    const themeInfo = DEFAULT_THEMES_30[i] || {
      block: 'Pedagógico Geral',
      theme: `Encontro Temático #${sessionNum}`,
    }

    onProgress?.(`Criando Aula #${sessionNum} de 30 (${sDate})...`)
    const createdLesson = await withRetry(() =>
      pb.collection('lessons').create({
        date: `${sDate} 00:00:00.000Z`,
        year: year,
        session_number: sessionNum,
        central_theme: themeInfo.theme,
        thematic_block: themeInfo.block,
        status: 'scheduled',
      }),
    )
    await sleep(100)

    // Gera planos pedagógicos padrão para as 4 salas
    const initialPlans = createDefaultPlans(themeInfo.theme)
    for (const p of initialPlans) {
      await withRetry(() =>
        pb.collection('lesson_plans').create({
          lesson_id: createdLesson.id,
          classroom: p.classroom,
          title: p.title,
          objective: p.objective,
          approach: p.approach,
          materials: p.materials,
        }),
      )
      await sleep(80)
    }
  }

  return { count: saturdays.length, action: 'created_new', allEntries: allSaturdayEntries }
}

function createDefaultPlans(theme: string) {
  return [
    {
      classroom: 'A',
      title: `Linguagem Lúdica: ${theme}`,
      objective: 'Apresentar o tema com historinhas, músicas e desenhos para os pequenos.',
      approach: 'Roda de acolhimento, contação com figuras coloridas e pintura.',
      materials: 'Folhas A4 ilustradas, giz de cera, aparelho de som.',
    },
    {
      classroom: 'B',
      title: `Compreensão Ativa: ${theme}`,
      objective: 'Estimular o diálogo e a identificação de atitudes práticas no dia a dia.',
      approach: 'Leitura participativa, perguntas disparadoras e dramatização curta.',
      materials: 'Cartolina, canetinhas, fichas com situações-problema.',
    },
    {
      classroom: 'C',
      title: `Reflexão Moral e Evangélica: ${theme}`,
      objective: 'Aprofundar os ensinamentos com analogias cotidianas.',
      approach: 'Debate mediado, análise evangélica e dinâmica reflexiva em duplas.',
      materials: 'Textos evangélicos infantojuvenis, post-its, caderno.',
    },
    {
      classroom: 'D',
      title: `Juventude e Vivência: ${theme}`,
      objective: 'Conectar o tema aos desafios cotidianos, ética e convivência fraterna.',
      approach: 'Roda de conversa aberta, estudo de caso e debate mediado.',
      materials: 'Textos de apoio, mural conceitual, fichas de discussão.',
    },
  ]
}
