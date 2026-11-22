import pb from '@/lib/pocketbase/client'
import { getClassroomScope, classroomScopeToChildFilter } from '@/services/classroomScope'
import { Lesson, Child, ClassroomId, Attendance, AttendanceStatus } from '@/types'
import { photoDisplayUrl } from '@/services/photos'

export interface AttendanceReportFilter {
  classroomId: ClassroomId | 'ALL'
  periodType: 'month' | 'custom' | 'all'
  month?: number // 1-12
  year?: number
  startDate?: string // YYYY-MM-DD
  endDate?: string // YYYY-MM-DD
}

export interface ChildAttendanceSummary {
  childId: string
  childName: string
  classroom: ClassroomId
  photoUrl?: string
  totalLessons: number
  presents: number
  absents: number
  justified: number
  percentage: number
  consecutiveAbsences: number
  isLowAttendance: boolean
  warningReason?: string
  details: Array<{
    lessonId: string
    lessonDate: string
    sessionNumber?: number
    theme: string
    status: AttendanceStatus | 'unregistered'
    justification?: string
    notes?: string
  }>
}

export interface LessonAttendanceSummary {
  lessonId: string
  sessionNumber?: number
  date: string
  centralTheme: string
  thematicBlock?: string
  status: 'scheduled' | 'completed' | 'canceled'
  cancelReason?: string
  totalExpected: number
  presents: number
  absents: number
  justified: number
  rate: number // % presente
  isCanceled: boolean
  isHighestAbsenceRate?: boolean
}

export interface AttendanceReportData {
  lessons: Lesson[]
  children: Child[]
  attendances: Attendance[]
  childSummaries: ChildAttendanceSummary[]
  lessonSummaries: LessonAttendanceSummary[]
  totalActiveLessons: number
  overallAverageRate: number
  totalPresentCount: number
  totalAbsentCount: number
  totalJustifiedCount: number
  lowAttendanceCount: number
  criticalSaturday?: LessonAttendanceSummary
}

export const attendanceReportService = {
  /**
   * Carrega os dados brutos necessários para relatórios:
   * Aulas, Crianças ativas e Chamadas registradas.
   */
  async loadReportData(year?: number): Promise<{
    lessons: Lesson[]
    children: Child[]
    attendances: Attendance[]
  }> {
    const filter = year ? `year = ${year}` : ''
    const scope = getClassroomScope(pb.authStore.record as any)
    const scopeFilter = classroomScopeToChildFilter(scope)
    const childFilter = ['active = true', scopeFilter].filter(Boolean).join(' && ')
    const [lessons, children, attendances] = await Promise.all([
      pb.collection('lessons').getFullList<Lesson>({
        filter,
        sort: 'date',
      }),
      pb.collection('children').getFullList<Child>({
        filter: childFilter,
        sort: 'name',
        expand: 'family_id',
      }),
      pb.collection('attendances').getFullList<Attendance>({
        sort: 'created',
        expand: 'child_id,lesson_id',
      }),
    ])

    return { lessons, children, attendances }
  },

  /**
   * Processa os relatórios com base nos filtros selecionados:
   * - Filtra as aulas do período e da sala selecionada.
   * - Aulas canceladas NÃO entram na contagem de frequência das crianças.
   * - Calcula presenças, ausências, faltas justificadas, taxa percentual e faltas consecutivas.
   * - Destaca crianças com frequência abaixo de 70% ou 2+ faltas consecutivas.
   * - Identifica os sábados com maior número/taxa de faltas.
   */
  processReport(
    rawData: {
      lessons: Lesson[]
      children: Child[]
      attendances: Attendance[]
    },
    filter: AttendanceReportFilter,
  ): AttendanceReportData {
    const { lessons, children, attendances } = rawData

    // 1. Filtrar aulas pelo período escolhido
    const filteredLessons = lessons.filter((lesson) => {
      // Extrair data normalizada (YYYY-MM-DD)
      const rawDate = lesson.date ? lesson.date.slice(0, 10) : ''
      if (!rawDate) return false

      if (filter.periodType === 'month' && filter.month) {
        const lessonDate = new Date(rawDate + 'T12:00:00Z')
        const lessonMonth = lessonDate.getUTCMonth() + 1
        const lessonYear = lessonDate.getUTCFullYear()
        if (filter.year && lessonYear !== filter.year) return false
        return lessonMonth === filter.month
      }

      if (filter.periodType === 'custom') {
        if (filter.startDate && rawDate < filter.startDate) return false
        if (filter.endDate && rawDate > filter.endDate) return false
      }

      // 'all': sem restrição adicional além do ano ativo
      return true
    })

    // Aulas ativas do período (desconsiderando aulas com status 'canceled')
    const activeLessons = filteredLessons.filter((l) => l.status !== 'canceled')

    // 2. Filtrar crianças pela sala escolhida
    const filteredChildren = children.filter((child) => {
      if (filter.classroomId === 'ALL') return true
      return child.classroom === filter.classroomId
    })

    // Mapeamento rápido de chamadas por chave: `lessonId_childId`
    const attMap = new Map<string, Attendance>()
    for (const att of attendances) {
      attMap.set(`${att.lesson_id}_${att.child_id}`, att)
    }

    // 3. Processar visão por criança
    const childSummaries: ChildAttendanceSummary[] = filteredChildren.map((child) => {
      let presents = 0
      let absents = 0
      let justified = 0

      // Detalhes cronológicos por aula ativa do período
      const details: ChildAttendanceSummary['details'] = []

      // Rastreamento de faltas consecutivas nas aulas ativas
      let consecutiveAbsences = 0
      let maxConsecutiveAbsences = 0

      for (const lesson of activeLessons) {
        const key = `${lesson.id}_${child.id}`
        const att = attMap.get(key)
        const dateStr = lesson.date ? lesson.date.slice(0, 10) : ''

        if (att) {
          if (att.status === 'present') {
            presents++
            consecutiveAbsences = 0
          } else if (att.status === 'absent') {
            absents++
            consecutiveAbsences++
            if (consecutiveAbsences > maxConsecutiveAbsences) {
              maxConsecutiveAbsences = consecutiveAbsences
            }
          } else if (att.status === 'justified') {
            justified++
            consecutiveAbsences = 0
          }

          details.push({
            lessonId: lesson.id,
            lessonDate: dateStr,
            sessionNumber: lesson.session_number,
            theme: lesson.central_theme,
            status: att.status,
            justification: att.justification,
            notes: att.notes,
          })
        } else {
          // Não houve registro de chamada lançado para a criança nesta aula
          details.push({
            lessonId: lesson.id,
            lessonDate: dateStr,
            sessionNumber: lesson.session_number,
            theme: lesson.central_theme,
            status: 'unregistered',
          })
        }
      }

      const totalLessons = activeLessons.length
      // % de presença calculada sobre o total de aulas realizadas no período
      // (Se não houver aulas no período, porcentagem é 100%)
      const percentage = totalLessons > 0 ? Math.round((presents / totalLessons) * 100) : 100

      // Destaque de frequência baixa: abaixo de 70% OU 2 ou mais faltas consecutivas
      const hasConsecutiveAbsenceAlert = maxConsecutiveAbsences >= 2
      const isPercentageLow = totalLessons > 0 && percentage < 70
      const isLowAttendance = totalLessons > 0 && (isPercentageLow || hasConsecutiveAbsenceAlert)

      let warningReason: string | undefined
      if (isPercentageLow && hasConsecutiveAbsenceAlert) {
        warningReason = `Frequência de ${percentage}% e ${maxConsecutiveAbsences} faltas consecutivas`
      } else if (isPercentageLow) {
        warningReason = `Frequência de ${percentage}% (abaixo do mínimo de 70%)`
      } else if (hasConsecutiveAbsenceAlert) {
        warningReason = `${maxConsecutiveAbsences} faltas consecutivas no período`
      }

      return {
        childId: child.id,
        childName: child.name,
        classroom: child.classroom,
        photoUrl: photoDisplayUrl(child) || undefined,
        totalLessons,
        presents,
        absents,
        justified,
        percentage,
        consecutiveAbsences: maxConsecutiveAbsences,
        isLowAttendance,
        warningReason,
        details,
      }
    })

    // 4. Processar visão por aula (taxa de presença e faltas por sábado letivo)
    const lessonSummaries: LessonAttendanceSummary[] = filteredLessons.map((lesson) => {
      const isCanceled = lesson.status === 'canceled'
      const dateStr = lesson.date ? lesson.date.slice(0, 10) : ''

      if (isCanceled) {
        return {
          lessonId: lesson.id,
          sessionNumber: lesson.session_number,
          date: dateStr,
          centralTheme: lesson.central_theme,
          thematicBlock: lesson.thematic_block,
          status: 'canceled',
          cancelReason: lesson.cancel_reason || 'Aula cancelada no calendário institucional',
          totalExpected: 0,
          presents: 0,
          absents: 0,
          justified: 0,
          rate: 0,
          isCanceled: true,
        }
      }

      let presents = 0
      let absents = 0
      let justified = 0

      for (const child of filteredChildren) {
        const key = `${lesson.id}_${child.id}`
        const att = attMap.get(key)
        if (att) {
          if (att.status === 'present') presents++
          else if (att.status === 'absent') absents++
          else if (att.status === 'justified') justified++
        }
      }

      const totalExpected = filteredChildren.length
      // Taxa de presença do sábado
      const rate = totalExpected > 0 ? Math.round((presents / totalExpected) * 100) : 0

      return {
        lessonId: lesson.id,
        sessionNumber: lesson.session_number,
        date: dateStr,
        centralTheme: lesson.central_theme,
        thematicBlock: lesson.thematic_block,
        status: lesson.status,
        cancelReason: lesson.cancel_reason,
        totalExpected,
        presents,
        absents,
        justified,
        rate,
        isCanceled: false,
      }
    })

    // 5. Identificar o sábado ativo com maior número/taxa de faltas
    const activeLessonSummaries = lessonSummaries.filter((l) => !l.isCanceled)
    let maxAbsenceCount = -1
    let criticalSaturday: LessonAttendanceSummary | undefined

    for (const item of activeLessonSummaries) {
      const totalUnattended = item.absents + item.justified
      if (totalUnattended > maxAbsenceCount && totalUnattended > 0) {
        maxAbsenceCount = totalUnattended
        criticalSaturday = item
      }
    }

    if (criticalSaturday) {
      for (const item of lessonSummaries) {
        if (item.lessonId === criticalSaturday.lessonId) {
          item.isHighestAbsenceRate = true
        }
      }
    }

    // 6. Totais globais
    const totalPresentCount = childSummaries.reduce((acc, c) => acc + c.presents, 0)
    const totalAbsentCount = childSummaries.reduce((acc, c) => acc + c.absents, 0)
    const totalJustifiedCount = childSummaries.reduce((acc, c) => acc + c.justified, 0)
    const totalExpectedSlots = childSummaries.length * activeLessons.length
    const overallAverageRate =
      totalExpectedSlots > 0 ? Math.round((totalPresentCount / totalExpectedSlots) * 100) : 100
    const lowAttendanceCount = childSummaries.filter((c) => c.isLowAttendance).length

    return {
      lessons: filteredLessons,
      children: filteredChildren,
      attendances,
      childSummaries,
      lessonSummaries,
      totalActiveLessons: activeLessons.length,
      overallAverageRate,
      totalPresentCount,
      totalAbsentCount,
      totalJustifiedCount,
      lowAttendanceCount,
      criticalSaturday,
    }
  },
}
