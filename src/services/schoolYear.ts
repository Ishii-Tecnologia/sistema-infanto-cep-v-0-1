import pb from '@/lib/pocketbase/client'
import { AnoLetivo, SabadoLetivo, JanelaFeriado } from '@/types'

// Helpers de cálculo de feriados móveis nacionais (Carnaval, Sexta-feira Santa, Páscoa, Corpus Christi)
// Algoritmo de Meeus/Jones/Butcher para computar a data do Domingo de Páscoa
export function getEasterSunday(year: number): { month: number; day: number } {
  const a = year % 19
  const b = Math.floor(year / 100)
  const c = year % 100
  const d = Math.floor(b / 4)
  const e = b % 4
  const f = Math.floor((b + 8) / 25)
  const g = Math.floor((b - f + 1) / 3)
  const h = (19 * a + b - d - g + 15) % 30
  const i = Math.floor(c / 4)
  const k = c % 4
  const l = (32 + 2 * e + 2 * i - h - k) % 7
  const m = Math.floor((a + 11 * h + 22 * l) / 451)
  const month = Math.floor((h + l - 7 * m + 114) / 31) // 3 = Março, 4 = Abril
  const day = ((h + l - 7 * m + 114) % 31) + 1
  return { month, day }
}

export interface MovableHoliday {
  nome: string
  dateStr: string // YYYY-MM-DD
}

export function getMovableHolidaysForYear(year: number): MovableHoliday[] {
  const easter = getEasterSunday(year)
  const easterDate = new Date(Date.UTC(year, easter.month - 1, easter.day, 12, 0, 0))

  const addDays = (d: Date, days: number): string => {
    const copy = new Date(d.getTime())
    copy.setUTCDate(copy.getUTCDate() + days)
    const y = copy.getUTCFullYear()
    const m = String(copy.getUTCMonth() + 1).padStart(2, '0')
    const day = String(copy.getUTCDate()).padStart(2, '0')
    return `${y}-${m}-${day}`
  }

  return [
    { nome: 'Segunda-feira de Carnaval', dateStr: addDays(easterDate, -48) },
    { nome: 'Terça-feira de Carnaval', dateStr: addDays(easterDate, -47) },
    { nome: 'Quarta-feira de Cinzas', dateStr: addDays(easterDate, -46) },
    { nome: 'Sábado de Carnaval', dateStr: addDays(easterDate, -50) },
    { nome: 'Sexta-feira Santa', dateStr: addDays(easterDate, -2) },
    { nome: 'Sábado de Aleluia', dateStr: addDays(easterDate, -1) },
    { nome: 'Domingo de Páscoa', dateStr: addDays(easterDate, 0) },
    { nome: 'Corpus Christi', dateStr: addDays(easterDate, 60) },
    { nome: 'Sábado após Corpus Christi', dateStr: addDays(easterDate, 62) },
  ]
}

export function detectMovableHolidayConflict(dateStr: string, year: number): string | null {
  const clean = dateStr.split('T')[0].split(' ')[0]
  const holidays = getMovableHolidaysForYear(year)
  const match = holidays.find((h) => h.dateStr === clean)
  return match ? `Possível conflito com feriado móvel: ${match.nome}` : null
}

// Converte data mantendo dia/mês, com tratamento de 29/02 e ajuste: se cair em domingo, recua para sábado anterior
export function shiftDatePreservingDayMonth(
  dateStr: string,
  targetYear: number,
): {
  newDateStr: string
  shiftedFromSunday: boolean
} {
  const clean = dateStr ? dateStr.split('T')[0].split(' ')[0] : ''
  const [origY, origM, origD] = clean.split('-').map(Number)
  if (!origY || !origM || !origD) {
    return { newDateStr: `${targetYear}-03-01`, shiftedFromSunday: false }
  }

  let day = origD
  let month = origM
  // Tratamento de ano bissexto (29 de fevereiro)
  if (month === 2 && day === 29) {
    const isLeap = (targetYear % 4 === 0 && targetYear % 100 !== 0) || targetYear % 400 === 0
    if (!isLeap) {
      day = 28
    }
  }

  const dt = new Date(Date.UTC(targetYear, month - 1, day, 12, 0, 0))
  let shiftedFromSunday = false

  // Se cair em domingo (dia da semana 0), desloca para o sábado anterior (regra definida pelo usuário)
  if (dt.getUTCDay() === 0) {
    dt.setUTCDate(dt.getUTCDate() - 1)
    shiftedFromSunday = true
  }

  const y = dt.getUTCFullYear()
  const m = String(dt.getUTCMonth() + 1).padStart(2, '0')
  const d = String(dt.getUTCDate()).padStart(2, '0')
  return {
    newDateStr: `${y}-${m}-${d}`,
    shiftedFromSunday,
  }
}

export const schoolYearService = {
  // Lista todos os anos letivos ordenados do mais recente para o mais antigo
  async getAll(): Promise<AnoLetivo[]> {
    return pb.collection('ano_letivo').getFullList<AnoLetivo>({
      sort: '-ano',
      expand: 'replicado_de',
    })
  },

  async getById(id: string): Promise<AnoLetivo> {
    return pb.collection('ano_letivo').getOne<AnoLetivo>(id, {
      expand: 'replicado_de',
    })
  },

  async getByAno(ano: number): Promise<AnoLetivo | null> {
    try {
      return await pb.collection('ano_letivo').getFirstListItem<AnoLetivo>(`ano=${ano}`, {
        expand: 'replicado_de',
      })
    } catch (_) {
      return null
    }
  },

  async getActive(): Promise<AnoLetivo | null> {
    try {
      return await pb.collection('ano_letivo').getFirstListItem<AnoLetivo>("status='ativo'", {
        sort: '-ano',
        expand: 'replicado_de',
      })
    } catch (_) {
      const all = await this.getAll()
      return all.length > 0 ? all[0] : null
    }
  },

  async create(data: Partial<AnoLetivo>): Promise<AnoLetivo> {
    const sanitized = { ...data }
    if (sanitized.data_inicio) {
      const d = sanitized.data_inicio.split('T')[0].split(' ')[0]
      sanitized.data_inicio = `${d} 00:00:00.000Z`
    }
    if (sanitized.data_fim) {
      const d = sanitized.data_fim.split('T')[0].split(' ')[0]
      sanitized.data_fim = `${d} 23:59:59.000Z`
    }
    if (sanitized.age_base_date) {
      const d = sanitized.age_base_date.split('T')[0].split(' ')[0]
      sanitized.age_base_date = `${d} 00:00:00.000Z`
    }
    if (sanitized.winter_break_start) {
      const d = sanitized.winter_break_start.split('T')[0].split(' ')[0]
      sanitized.winter_break_start = `${d} 00:00:00.000Z`
    }
    if (sanitized.winter_break_end) {
      const d = sanitized.winter_break_end.split('T')[0].split(' ')[0]
      sanitized.winter_break_end = `${d} 23:59:59.000Z`
    }
    if (sanitized.christmas_date) {
      const d = sanitized.christmas_date.split('T')[0].split(' ')[0]
      sanitized.christmas_date = `${d} 00:00:00.000Z`
    }
    return pb.collection('ano_letivo').create<AnoLetivo>(sanitized)
  },

  async update(id: string, data: Partial<AnoLetivo>): Promise<AnoLetivo> {
    const sanitized = { ...data }
    if (sanitized.data_inicio) {
      const d = sanitized.data_inicio.split('T')[0].split(' ')[0]
      sanitized.data_inicio = `${d} 00:00:00.000Z`
    }
    if (sanitized.data_fim) {
      const d = sanitized.data_fim.split('T')[0].split(' ')[0]
      sanitized.data_fim = `${d} 23:59:59.000Z`
    }
    if (sanitized.age_base_date) {
      const d = sanitized.age_base_date.split('T')[0].split(' ')[0]
      sanitized.age_base_date = `${d} 00:00:00.000Z`
    }
    if (sanitized.winter_break_start) {
      const d = sanitized.winter_break_start.split('T')[0].split(' ')[0]
      sanitized.winter_break_start = `${d} 00:00:00.000Z`
    }
    if (sanitized.winter_break_end) {
      const d = sanitized.winter_break_end.split('T')[0].split(' ')[0]
      sanitized.winter_break_end = `${d} 23:59:59.000Z`
    }
    if (sanitized.christmas_date) {
      const d = sanitized.christmas_date.split('T')[0].split(' ')[0]
      sanitized.christmas_date = `${d} 00:00:00.000Z`
    }
    return pb.collection('ano_letivo').update<AnoLetivo>(id, sanitized)
  },

  // Sábados Letivos
  async getSabados(anoLetivoId: string): Promise<SabadoLetivo[]> {
    if (!anoLetivoId) return []
    return pb.collection('sabado_letivo').getFullList<SabadoLetivo>({
      filter: `ano_letivo_id='${anoLetivoId}'`,
      sort: 'data',
      expand: 'lesson_id',
    })
  },

  async createSabado(data: Partial<SabadoLetivo>): Promise<SabadoLetivo> {
    const sanitized = { ...data }
    if (sanitized.data) {
      const d = sanitized.data.split('T')[0].split(' ')[0]
      sanitized.data = `${d} 00:00:00.000Z`
    }
    return pb.collection('sabado_letivo').create<SabadoLetivo>(sanitized)
  },

  async updateSabado(id: string, data: Partial<SabadoLetivo>): Promise<SabadoLetivo> {
    const sanitized = { ...data }
    if (sanitized.data) {
      const d = sanitized.data.split('T')[0].split(' ')[0]
      sanitized.data = `${d} 00:00:00.000Z`
    }
    return pb.collection('sabado_letivo').update<SabadoLetivo>(id, sanitized)
  },

  async deleteSabado(id: string): Promise<boolean> {
    return pb.collection('sabado_letivo').delete(id)
  },

  // Janelas de Feriado
  async getJanelas(anoLetivoId: string): Promise<JanelaFeriado[]> {
    if (!anoLetivoId) return []
    return pb.collection('janela_feriado').getFullList<JanelaFeriado>({
      filter: `ano_letivo_id='${anoLetivoId}'`,
      sort: 'data_inicio',
    })
  },

  async createJanela(data: Partial<JanelaFeriado>): Promise<JanelaFeriado> {
    const sanitized = { ...data }
    if (sanitized.data_inicio) {
      const d = sanitized.data_inicio.split('T')[0].split(' ')[0]
      sanitized.data_inicio = `${d} 00:00:00.000Z`
    }
    if (sanitized.data_fim) {
      const d = sanitized.data_fim.split('T')[0].split(' ')[0]
      sanitized.data_fim = `${d} 23:59:59.000Z`
    }
    return pb.collection('janela_feriado').create<JanelaFeriado>(sanitized)
  },

  async updateJanela(id: string, data: Partial<JanelaFeriado>): Promise<JanelaFeriado> {
    const sanitized = { ...data }
    if (sanitized.data_inicio) {
      const d = sanitized.data_inicio.split('T')[0].split(' ')[0]
      sanitized.data_inicio = `${d} 00:00:00.000Z`
    }
    if (sanitized.data_fim) {
      const d = sanitized.data_fim.split('T')[0].split(' ')[0]
      sanitized.data_fim = `${d} 23:59:59.000Z`
    }
    return pb.collection('janela_feriado').update<JanelaFeriado>(id, sanitized)
  },

  async deleteJanela(id: string): Promise<boolean> {
    return pb.collection('janela_feriado').delete(id)
  },

  /**
   * Atualiza o status do ano letivo (ativo, planejado, encerrado).
   * Regra de negócio: se o novo status for 'ativo', garante que nenhum outro
   * ano letivo permaneça como 'ativo' (desativa os outros para 'encerrado' ou 'planejado').
   */
  async setStatus(id: string, newStatus: 'ativo' | 'planejado' | 'encerrado'): Promise<AnoLetivo> {
    if (newStatus === 'ativo') {
      const allYears = await this.getAll()
      for (const y of allYears) {
        if (y.id !== id && y.status === 'ativo') {
          try {
            await pb.collection('ano_letivo').update(y.id, { status: 'encerrado' })
          } catch (err) {
            console.warn(`Erro ao desativar ano ${y.ano}:`, err)
          }
        }
      }
    }
    return pb.collection('ano_letivo').update<AnoLetivo>(id, { status: newStatus })
  },

  /**
   * Exclui um ano letivo em cascata, desde que NÃO esteja com status 'ativo'.
   * Remove em cascata:
   * 1. Presenças e planos vinculados às aulas daquele ano
   * 2. Aulas (lessons) do ano
   * 3. Sábados letivos (sabado_letivo)
   * 4. Janelas de feriado (janela_feriado)
   * 5. O registro do ano_letivo
   */
  async deleteSchoolYear(
    id: string,
  ): Promise<{ deletedYear: number; sabadosRemovidos: number; janelasRemovidas: number }> {
    const anoRec = await this.getById(id)
    if (!anoRec) {
      throw new Error('Ano letivo não encontrado.')
    }
    if (anoRec.status === 'ativo') {
      throw new Error('Não é possível excluir um ano letivo ativo. Desative-o antes de excluir.')
    }

    const anoNum = anoRec.ano

    // 1. Janelas de feriado vinculadas ao ano
    let janelasCount = 0
    try {
      const janelas = await pb.collection('janela_feriado').getFullList<JanelaFeriado>({
        filter: `ano_letivo_id='${id}'`,
      })
      for (const j of janelas) {
        await pb.collection('janela_feriado').delete(j.id)
        janelasCount++
      }
    } catch (err) {
      console.warn('Erro ao remover janelas de feriado na cascata:', err)
    }

    // 2. Sábados letivos vinculados ao ano
    let sabadosCount = 0
    try {
      const sabados = await pb.collection('sabado_letivo').getFullList<SabadoLetivo>({
        filter: `ano_letivo_id='${id}'`,
      })
      for (const s of sabados) {
        await pb.collection('sabado_letivo').delete(s.id)
        sabadosCount++
      }
    } catch (err) {
      console.warn('Erro ao remover sábados letivos na cascata:', err)
    }

    // 3. Aulas (lessons) do ano correspondente e seus filhos (attendances, lesson_plans)
    try {
      const lessons = await pb.collection('lessons').getFullList<{ id: string }>({
        filter: `year=${anoNum}`,
      })
      for (const l of lessons) {
        // Remover presenças da aula
        try {
          const atts = await pb.collection('attendances').getFullList<{ id: string }>({
            filter: `lesson_id='${l.id}'`,
          })
          for (const a of atts) {
            await pb.collection('attendances').delete(a.id)
          }
        } catch (attErr) {
          console.warn(`Erro ao remover presenças da aula ${l.id}:`, attErr)
        }

        // Remover planos pedagógicos da aula
        try {
          const plans = await pb.collection('lesson_plans').getFullList<{ id: string }>({
            filter: `lesson_id='${l.id}'`,
          })
          for (const p of plans) {
            await pb.collection('lesson_plans').delete(p.id)
          }
        } catch (planErr) {
          console.warn(`Erro ao remover planos da aula ${l.id}:`, planErr)
        }

        // Remover a própria lesson
        try {
          await pb.collection('lessons').delete(l.id)
        } catch (lessonErr) {
          console.warn(`Erro ao remover aula ${l.id}:`, lessonErr)
        }
      }
    } catch (lessonsErr) {
      console.warn('Erro ao listar/remover aulas na cascata do ano:', lessonsErr)
    }

    // 4. Se algum outro ano letivo apontava para este em replicado_de, limpa a referência
    try {
      const dependentYears = await pb.collection('ano_letivo').getFullList<AnoLetivo>({
        filter: `replicado_de='${id}'`,
      })
      for (const dep of dependentYears) {
        await pb.collection('ano_letivo').update(dep.id, { replicado_de: '' })
      }
    } catch (depErr) {
      console.warn('Erro ao limpar replicado_de de anos dependentes:', depErr)
    }

    // 5. Exclui o registro de ano_letivo
    await pb.collection('ano_letivo').delete(id)

    return {
      deletedYear: anoNum,
      sabadosRemovidos: sabadosCount,
      janelasRemovidas: janelasCount,
    }
  },

  // Replicar do ano anterior:
  // Clona SabadoLetivo e JanelaFeriado recalculando as datas para o novo ano (mesmo dia/mês,
  // com tratamento de 29/02 e ajuste de dia da semana: domingos movidos para o sábado anterior).
  // Grava replicado_de no AnoLetivo de destino.
  // Sinaliza conflitos com feriados móveis e marca revisado=false.
  // Chama a rota de backend /backend/v1/school-year/replicate ou executa fallback com regras equivalentes.
  async replicateFromYear(
    sourceAnoLetivoId: string,
    targetAnoLetivoId: string,
    targetYearNum: number,
  ): Promise<{
    sabadosClonados: number
    janelasClonadas: number
    domingosDeslocados?: number
    shiftedSundayDates?: string[]
    conflitosList?: string[]
    conflitosDetectados: number
    sourceYear?: number
    targetYear?: number
  }> {
    // Tenta primeiro a rota customizada no backend
    try {
      const res = await pb.send<{
        success: boolean
        sourceYear: number
        targetYear: number
        sabadosClonados: number
        janelasClonadas: number
        domingosDeslocados: number
        shiftedSundayDates: string[]
        conflitosList: string[]
        conflitosDetectados: number
      }>('/backend/v1/school-year/replicate', {
        method: 'POST',
        body: {
          source_ano_letivo_id: sourceAnoLetivoId,
          target_ano_letivo_id: targetAnoLetivoId,
          target_year: targetYearNum,
        },
      })
      if (res && res.success) {
        return res
      }
    } catch (routeErr) {
      console.warn('Rota customizada de replicação não respondeu, usando fallback local:', routeErr)
    }

    // Fallback cliente
    const [sourceSabados, sourceJanelas, sourceAno] = await Promise.all([
      this.getSabados(sourceAnoLetivoId),
      this.getJanelas(sourceAnoLetivoId),
      this.getById(sourceAnoLetivoId).catch(() => null),
    ])

    let conflitosDetectados = 0
    let domingosDeslocados = 0
    const shiftedSundayDates: string[] = []
    const conflitosList: string[] = []

    // Atualiza replicado_de no ano de destino
    await this.update(targetAnoLetivoId, {
      replicado_de: sourceAnoLetivoId,
    })

    // Clona janelas de feriado
    let janelasClonadas = 0
    for (const janela of sourceJanelas) {
      const shiftStart = shiftDatePreservingDayMonth(janela.data_inicio, targetYearNum)
      const shiftEnd = shiftDatePreservingDayMonth(janela.data_fim, targetYearNum)
      const conflito = detectMovableHolidayConflict(shiftStart.newDateStr, targetYearNum)
      if (conflito) {
        conflitosDetectados++
        conflitosList.push(`${janela.nome} (${shiftStart.newDateStr})`)
      }
      if (shiftStart.shiftedFromSunday) {
        domingosDeslocados++
        shiftedSundayDates.push(
          `${janela.nome}: ${janela.data_inicio.split('T')[0]} -> ${shiftStart.newDateStr}`,
        )
      }

      try {
        await pb.collection('janela_feriado').create({
          ano_letivo_id: targetAnoLetivoId,
          data_inicio: `${shiftStart.newDateStr} 00:00:00.000Z`,
          data_fim: `${shiftEnd.newDateStr} 23:59:59.000Z`,
          nome: janela.nome,
          revisado: false,
          conflito_motivo:
            conflito ||
            (shiftStart.shiftedFromSunday ? 'Deslocado do domingo para o sábado anterior' : ''),
        })
        janelasClonadas++
      } catch (err) {
        console.warn('Falha ao replicar janela:', err)
      }
    }

    // Clona sábados letivos
    let sabadosClonados = 0
    for (const sabado of sourceSabados) {
      const shift = shiftDatePreservingDayMonth(sabado.data, targetYearNum)
      const conflito = detectMovableHolidayConflict(shift.newDateStr, targetYearNum)
      if (conflito) {
        conflitosDetectados++
        conflitosList.push(`${sabado.descricao || 'Sábado'} (${shift.newDateStr})`)
      }
      if (shift.shiftedFromSunday) {
        domingosDeslocados++
        shiftedSundayDates.push(
          `${sabado.descricao || 'Sábado'}: ${sabado.data.split('T')[0]} -> ${shift.newDateStr}`,
        )
      }

      const motivo = [
        conflito,
        shift.shiftedFromSunday
          ? 'Data original caía em domingo; deslocado para o sábado anterior'
          : '',
      ]
        .filter(Boolean)
        .join(' • ')

      try {
        await pb.collection('sabado_letivo').create({
          ano_letivo_id: targetAnoLetivoId,
          data: `${shift.newDateStr} 00:00:00.000Z`,
          tipo: sabado.tipo,
          descricao: sabado.descricao || '',
          revisado: false,
          conflito_motivo: motivo,
        })
        sabadosClonados++
      } catch (err) {
        console.warn('Falha ao replicar sábado letivo:', err)
      }
    }

    return {
      sabadosClonados,
      janelasClonadas,
      domingosDeslocados,
      shiftedSundayDates,
      conflitosList,
      conflitosDetectados,
      sourceYear: sourceAno?.ano,
      targetYear: targetYearNum,
    }
  },
}
