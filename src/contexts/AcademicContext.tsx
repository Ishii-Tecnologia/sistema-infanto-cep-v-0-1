import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { settingsService } from '@/services/settings'
import { ClassroomId, ClassroomInfo, CLASSROOMS } from '@/types'
import { calculateAgeOnCutoffDate, classifyClassroomByAge } from '@/lib/academic'

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
  recessSaturdays: RecessSaturday[]
  loading: boolean
  reloadSettings: () => Promise<void>
  saveClassrooms: (newClassrooms: ClassroomInfo[]) => Promise<void>
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
  recessSaturdays: DEFAULT_RECESS_SATURDAYS,
  loading: true,
  reloadSettings: async () => {},
  saveClassrooms: async () => {},
  saveSchoolYearAndRecesses: async () => {},
  getClassroom: () => undefined,
  getClassroomLabel: (id) => `Sala ${id}`,
  classifyChild: () => 'A',
  calculateAge: () => 0,
})

export const AcademicProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [classrooms, setClassrooms] = useState<ClassroomInfo[]>(CLASSROOMS)
  const [schoolYear, setSchoolYear] = useState<SchoolYearConfig>(DEFAULT_SCHOOL_YEAR)
  const [recessSaturdays, setRecessSaturdays] = useState<RecessSaturday[]>(DEFAULT_RECESS_SATURDAYS)
  const [loading, setLoading] = useState(true)

  const reloadSettings = useCallback(async () => {
    try {
      const data = await settingsService.getSettings()

      // 1. Salas
      if (Array.isArray(data.classrooms) && data.classrooms.length > 0) {
        setClassrooms(data.classrooms)
      } else {
        setClassrooms(CLASSROOMS)
      }

      // 2. Ano Letivo
      if (data.school_year && typeof data.school_year === 'object') {
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
      }

      // 3. Feriados e Recessos
      const curYear = data.school_year?.year || DEFAULT_SCHOOL_YEAR.year
      const holidaysKey = `holidays_${curYear}`
      const holidaysList =
        data[holidaysKey] || data.holidays_2026 || data.holidays_2027 || data.recess_saturdays
      if (Array.isArray(holidaysList)) {
        setRecessSaturdays(holidaysList)
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

  const saveSchoolYearAndRecesses = async (
    newYear: SchoolYearConfig,
    newRecesses: RecessSaturday[],
  ) => {
    await Promise.all([
      settingsService.updateSetting('school_year', newYear, 'Ano letivo ativo e datas de corte'),
      settingsService.updateSetting(
        `holidays_${newYear.year}`,
        newRecesses,
        `Feriados e janelas de recesso para ${newYear.year}`,
      ),
    ])
    setSchoolYear(newYear)
    setRecessSaturdays(newRecesses)
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
        recessSaturdays,
        loading,
        reloadSettings,
        saveClassrooms,
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
