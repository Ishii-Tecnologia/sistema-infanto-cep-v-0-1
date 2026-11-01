import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { settingsService } from '@/services/settings'
import { ClassroomId, ClassroomInfo, CLASSROOMS, PedagogicalPlansMap, AnoLetivo } from '@/types'
import { calculateAgeOnCutoffDate, classifyClassroomByAge } from '@/lib/academic'
import { schoolYearService } from '@/services/schoolYear'

export const DEFAULT_PEDAGOGICAL_PLANS: PedagogicalPlansMap = {
  A: {
    title: 'Linguagem Lúdica: Deus, Pai e Criador de Todas as Coisas',
    activities: 'Roda de acolhimento, contação com figuras coloridas e pintura.',
  },
  B: {
    title: 'Compreensão Ativa: Deus, Pai e Criador de Todas as Coisas',
    activities: 'Leitura participativa, perguntas disparadoras e dramatização curta.',
  },
  C: {
    title: 'Reflexão Moral e Evangélica: Deus, Pai e Criador de Todas as Coisas',
    activities: 'Debate mediado, análise evangélica e dinâmica reflexiva em duplas.',
  },
  D: {
    title: 'Juventude e Vivência: Deus, Pai e Criador de Todas as Coisas',
    activities: 'Roda de conversa aberta, estudo de caso e debate mediado.',
  },
}

export interface SchoolYearConfig {
  year: number
  startDate: string
  endDate?: string
  ageBaseDate: string // ex: "2027-03-01"
  winterBreakStart?: string // ex: "2027-07-04"
  winterBreakEnd?: string // ex: "2027-07-18"
  christmasDate?: string // ex: "2027-12-11"
}

export interface RecessSaturday {
  date: string // YYYY-MM-DD
  name: string
}

interface AcademicContextType {
  classrooms: ClassroomInfo[]
  schoolYear: SchoolYearConfig
  activeAnoLetivo: AnoLetivo | null
  anosLetivos: AnoLetivo[]
  recessSaturdays: RecessSaturday[]
  pedagogicalPlans: PedagogicalPlansMap
  loading: boolean
  reloadSettings: () => Promise<void>
  saveClassrooms: (newClassrooms: ClassroomInfo[]) => Promise<void>
  savePedagogicalPlans: (newPlans: PedagogicalPlansMap) => Promise<void>
  saveSchoolYearAndRecesses: (
    newYear: SchoolYearConfig,
    newRecesses: RecessSaturday[],
  ) => Promise<void>
  getClassroom: (id: ClassroomId) => ClassroomInfo | undefined
  getClassroomLabel: (id: ClassroomId) => string
  classifyChild: (birthDateStr: string) => ClassroomId
  calculateAge: (birthDateStr: string) => number
}

const CURRENT_YEAR = new Date().getFullYear()

const DEFAULT_SCHOOL_YEAR: SchoolYearConfig = {
  year: CURRENT_YEAR,
  startDate: `${CURRENT_YEAR}-03-06`,
  endDate: `${CURRENT_YEAR}-11-27`,
  ageBaseDate: `${CURRENT_YEAR}-03-01`,
  winterBreakStart: `${CURRENT_YEAR}-07-04`,
  winterBreakEnd: `${CURRENT_YEAR}-07-18`,
  christmasDate: `${CURRENT_YEAR}-12-04`,
}

const DEFAULT_RECESS_SATURDAYS: RecessSaturday[] = []

const AcademicContext = createContext<AcademicContextType>({
  classrooms: CLASSROOMS,
  schoolYear: DEFAULT_SCHOOL_YEAR,
  activeAnoLetivo: null,
  anosLetivos: [],
  recessSaturdays: DEFAULT_RECESS_SATURDAYS,
  pedagogicalPlans: DEFAULT_PEDAGOGICAL_PLANS,
  loading: true,
  reloadSettings: async () => {},
  saveClassrooms: async () => {},
  savePedagogicalPlans: async () => {},
  saveSchoolYearAndRecesses: async () => {},
  getClassroom: () => undefined,
  getClassroomLabel: (id) => `Sala ${id}`,
  classifyChild: () => 'A',
  calculateAge: () => 0,
})

export const AcademicProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [classrooms, setClassrooms] = useState<ClassroomInfo[]>(CLASSROOMS)
  const [schoolYear, setSchoolYear] = useState<SchoolYearConfig>(DEFAULT_SCHOOL_YEAR)
  const [activeAnoLetivo, setActiveAnoLetivo] = useState<AnoLetivo | null>(null)
  const [anosLetivos, setAnosLetivos] = useState<AnoLetivo[]>([])
  const [recessSaturdays, setRecessSaturdays] = useState<RecessSaturday[]>(DEFAULT_RECESS_SATURDAYS)
  const [pedagogicalPlans, setPedagogicalPlans] =
    useState<PedagogicalPlansMap>(DEFAULT_PEDAGOGICAL_PLANS)
  const [loading, setLoading] = useState(true)

  const reloadSettings = useCallback(async () => {
    try {
      const [data, anosList, activeAno] = await Promise.all([
        settingsService.getSettings(),
        schoolYearService.getAll().catch(() => [] as AnoLetivo[]),
        schoolYearService.getActive().catch(() => null),
      ])

      setAnosLetivos(anosList)
      setActiveAnoLetivo(activeAno)

      // 1. Salas
      if (Array.isArray(data.classrooms) && data.classrooms.length > 0) {
        setClassrooms(data.classrooms)
      } else {
        setClassrooms(CLASSROOMS)
      }

      // 1.1 Planos Pedagógicos
      if (data.pedagogical_plans && typeof data.pedagogical_plans === 'object') {
        setPedagogicalPlans({
          A: {
            title: data.pedagogical_plans.A?.title ?? DEFAULT_PEDAGOGICAL_PLANS.A.title,
            activities:
              data.pedagogical_plans.A?.activities ?? DEFAULT_PEDAGOGICAL_PLANS.A.activities,
          },
          B: {
            title: data.pedagogical_plans.B?.title ?? DEFAULT_PEDAGOGICAL_PLANS.B.title,
            activities:
              data.pedagogical_plans.B?.activities ?? DEFAULT_PEDAGOGICAL_PLANS.B.activities,
          },
          C: {
            title: data.pedagogical_plans.C?.title ?? DEFAULT_PEDAGOGICAL_PLANS.C.title,
            activities:
              data.pedagogical_plans.C?.activities ?? DEFAULT_PEDAGOGICAL_PLANS.C.activities,
          },
          D: {
            title: data.pedagogical_plans.D?.title ?? DEFAULT_PEDAGOGICAL_PLANS.D.title,
            activities:
              data.pedagogical_plans.D?.activities ?? DEFAULT_PEDAGOGICAL_PLANS.D.activities,
          },
        })
      } else {
        setPedagogicalPlans(DEFAULT_PEDAGOGICAL_PLANS)
      }

      // 2. Ano Letivo: prioridade para a coleção ano_letivo ativa (fonte de verdade)
      if (activeAno) {
        const syYear = activeAno.ano
        setSchoolYear({
          year: syYear,
          startDate: activeAno.data_inicio
            ? activeAno.data_inicio.split('T')[0]
            : `${syYear}-03-07`,
          endDate: activeAno.data_fim ? activeAno.data_fim.split('T')[0] : `${syYear}-11-28`,
          ageBaseDate: activeAno.age_base_date
            ? activeAno.age_base_date.split('T')[0]
            : `${syYear}-03-01`,
          winterBreakStart: activeAno.winter_break_start
            ? activeAno.winter_break_start.split('T')[0]
            : `${syYear}-07-04`,
          winterBreakEnd: activeAno.winter_break_end
            ? activeAno.winter_break_end.split('T')[0]
            : `${syYear}-07-18`,
          christmasDate: activeAno.christmas_date
            ? activeAno.christmas_date.split('T')[0]
            : `${syYear}-12-04`,
        })

        // Carrega janelas de feriado daquele ano
        try {
          const janelas = await schoolYearService.getJanelas(activeAno.id)
          if (janelas.length > 0) {
            setRecessSaturdays(
              janelas.map((j) => ({
                date: j.data_inicio.split('T')[0],
                name: j.nome,
              })),
            )
          } else {
            const holidaysKey = `holidays_${syYear}`
            const holidaysList = data[holidaysKey] || data.recess_saturdays
            if (Array.isArray(holidaysList)) setRecessSaturdays(holidaysList)
          }
        } catch {
          /* intentionally ignored */
        }
      } else if (data.school_year && typeof data.school_year === 'object') {
        const sy = data.school_year
        const syYear = sy.year || DEFAULT_SCHOOL_YEAR.year
        setSchoolYear({
          year: syYear,
          startDate: sy.startDate || DEFAULT_SCHOOL_YEAR.startDate,
          endDate: sy.endDate || DEFAULT_SCHOOL_YEAR.endDate,
          ageBaseDate: sy.ageBaseDate || `${syYear}-03-01`,
          winterBreakStart: sy.winterBreakStart || `${syYear}-07-04`,
          winterBreakEnd: sy.winterBreakEnd || `${syYear}-07-18`,
          christmasDate: sy.christmasDate || `${syYear}-12-04`,
        })

        const holidaysKey = `holidays_${syYear}`
        const holidaysList =
          data[holidaysKey] || data.holidays_2026 || data.holidays_2027 || data.recess_saturdays
        if (Array.isArray(holidaysList)) {
          setRecessSaturdays(holidaysList)
        }
      }
    } catch (err) {
      console.warn('Erro ao carregar configurações acadêmicas:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    reloadSettings()
  }, [reloadSettings])

  const saveClassrooms = async (newClassrooms: ClassroomInfo[]) => {
    await settingsService.updateSetting(
      'classrooms',
      newClassrooms,
      'Configuração das salas por faixa etária',
    )
    setClassrooms(newClassrooms)
  }

  const savePedagogicalPlans = async (newPlans: PedagogicalPlansMap) => {
    await settingsService.updateSetting(
      'pedagogical_plans',
      newPlans,
      'Parâmetros dos planos pedagógicos por sala para o painel de apresentação',
    )
    setPedagogicalPlans(newPlans)
  }

  const saveSchoolYearAndRecesses = async (
    newYear: SchoolYearConfig,
    newRecesses: RecessSaturday[],
  ) => {
    // 1. Atualiza na coleção ano_letivo (fonte de verdade)
    let anoRecord = await schoolYearService.getByAno(newYear.year)
    const payload = {
      ano: newYear.year,
      data_inicio: `${newYear.startDate} 00:00:00.000Z`,
      data_fim: newYear.endDate ? `${newYear.endDate} 00:00:00.000Z` : undefined,
      status: (anoRecord ? anoRecord.status : 'ativo') as 'ativo' | 'planejado' | 'encerrado',
      age_base_date: newYear.ageBaseDate
        ? `${newYear.ageBaseDate} 00:00:00.000Z`
        : `${newYear.year}-03-01 00:00:00.000Z`,
      winter_break_start: newYear.winterBreakStart
        ? `${newYear.winterBreakStart} 00:00:00.000Z`
        : undefined,
      winter_break_end: newYear.winterBreakEnd
        ? `${newYear.winterBreakEnd} 00:00:00.000Z`
        : undefined,
      christmas_date: newYear.christmasDate ? `${newYear.christmasDate} 00:00:00.000Z` : undefined,
    }

    if (anoRecord) {
      anoRecord = await schoolYearService.update(anoRecord.id, payload)
    } else {
      anoRecord = await schoolYearService.create(payload)
    }

    // 2. Mantém compatibilidade com system_settings
    await Promise.all([
      settingsService.updateSetting('school_year', newYear, 'Ano letivo ativo e datas de corte'),
      settingsService.updateSetting(
        `holidays_${newYear.year}`,
        newRecesses,
        `Feriados e janelas de recesso para ${newYear.year}`,
      ),
    ])

    setActiveAnoLetivo(anoRecord)
    setSchoolYear(newYear)
    setRecessSaturdays(newRecesses)
    const updatedList = await schoolYearService.getAll().catch(() => [])
    setAnosLetivos(updatedList)
  }

  const getClassroom = useCallback(
    (id: ClassroomId): ClassroomInfo | undefined => {
      return classrooms.find((c) => c.id === id)
    },
    [classrooms],
  )

  const getClassroomLabel = useCallback(
    (id: ClassroomId): string => {
      const cls = classrooms.find((c) => c.id === id)
      if (!cls) return `Sala ${id}`
      return cls.name || `Sala ${id}`
    },
    [classrooms],
  )

  const calculateAge = useCallback(
    (birthDateStr: string): number => {
      if (!birthDateStr) return 0
      const baseDate = schoolYear?.ageBaseDate || `${schoolYear?.year || CURRENT_YEAR}-03-01`
      const [y, m, d] = baseDate.split('-').map(Number)
      return calculateAgeOnCutoffDate(
        birthDateStr,
        y || schoolYear?.year || CURRENT_YEAR,
        (m || 3) - 1,
        d || 1,
      )
    },
    [schoolYear],
  )

  const classifyChild = useCallback(
    (birthDateStr: string): ClassroomId => {
      const age = calculateAge(birthDateStr)
      return classifyClassroomByAge(age, classrooms)
    },
    [calculateAge, classrooms],
  )

  return (
    <AcademicContext.Provider
      value={{
        classrooms,
        schoolYear,
        activeAnoLetivo,
        anosLetivos,
        recessSaturdays,
        pedagogicalPlans,
        loading,
        reloadSettings,
        saveClassrooms,
        savePedagogicalPlans,
        saveSchoolYearAndRecesses,
        getClassroom,
        getClassroomLabel,
        classifyChild,
        calculateAge,
      }}
    >
      {children}
    </AcademicContext.Provider>
  )
}

export const useAcademic = () => useContext(AcademicContext)
