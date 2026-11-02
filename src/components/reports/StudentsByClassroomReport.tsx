import React, { useMemo } from 'react'
import { ClassroomId, ClassroomInfo } from '@/types'
import { formatDate, getClassroomBadge } from '@/lib/academic'
import { StudentsByClassroomReportItem } from '@/services/generalReports'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Cake, Calendar, Users, Sparkles } from 'lucide-react'
import { SortableTableHead, SortDirection } from '@/components/reports/SortableTableHead'

interface StudentsByClassroomReportProps {
  students: StudentsByClassroomReportItem[]
  selectedClassroom: ClassroomId | 'ALL'
  classrooms: ClassroomInfo[]
  searchQuery?: string
}

const MONTH_LABELS = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
]

/**
 * Extrai dia e mês do aniversário a partir da string birth_date
 */
function getBirthdayParts(birthDateStr?: string) {
  if (!birthDateStr) return { day: '', monthIndex: -1, monthName: '' }
  const clean = birthDateStr.trim().split('T')[0].split(' ')[0]
  const match = clean.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (match) {
    const day = match[3]
    const mIdx = parseInt(match[2], 10) - 1
    return {
      day,
      monthIndex: mIdx,
      monthName: MONTH_LABELS[mIdx] || '',
    }
  }
  const d = new Date(birthDateStr)
  if (isNaN(d.getTime())) return { day: '', monthIndex: -1, monthName: '' }
  const day = String(d.getDate()).padStart(2, '0')
  const mIdx = d.getMonth()
  return {
    day,
    monthIndex: mIdx,
    monthName: MONTH_LABELS[mIdx] || '',
  }
}

export function StudentsByClassroomReport({
  students,
  selectedClassroom,
  classrooms,
  searchQuery = '',
}: StudentsByClassroomReportProps) {
  // Estado de ordenação
  const [sortKey, setSortKey] = React.useState<string>('name')
  const [sortDir, setSortDir] = React.useState<SortDirection>('asc')

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  // Filtro de busca local e ordenação
  const filteredStudents = useMemo(() => {
    let list = students
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim()
      list = students.filter((s) => {
        const nameMatch = s.name.toLowerCase().includes(q)
        const familyMatch = s.familyName ? s.familyName.toLowerCase().includes(q) : false
        const bday = getBirthdayParts(s.birth_date)
        const monthMatch = bday.monthName.toLowerCase().includes(q)
        return nameMatch || familyMatch || monthMatch
      })
    }

    return [...list].sort((a, b) => {
      let valA: any
      let valB: any

      const bdayA = getBirthdayParts(a.birth_date)
      const bdayB = getBirthdayParts(b.birth_date)

      switch (sortKey) {
        case 'name':
          valA = a.name.toLowerCase()
          valB = b.name.toLowerCase()
          break
        case 'familyName':
          valA = (a.familyName || '').toLowerCase()
          valB = (b.familyName || '').toLowerCase()
          break
        case 'classroom':
          valA = a.classroom
          valB = b.classroom
          break
        case 'birth_date':
          valA = a.birth_date || ''
          valB = b.birth_date || ''
          break
        case 'birthday_day':
          valA = bdayA.day ? parseInt(bdayA.day, 10) : 999
          valB = bdayB.day ? parseInt(bdayB.day, 10) : 999
          break
        case 'birthday_month':
          valA = bdayA.monthIndex >= 0 ? bdayA.monthIndex : 999
          valB = bdayB.monthIndex >= 0 ? bdayB.monthIndex : 999
          break
        default:
          valA = a.name.toLowerCase()
          valB = b.name.toLowerCase()
      }

      if (valA < valB) return sortDir === 'asc' ? -1 : 1
      if (valA > valB) return sortDir === 'asc' ? 1 : -1
      return 0
    })
  }, [students, searchQuery, sortKey, sortDir])

  // Agrupamento por sala quando 'ALL' estiver selecionado
  const groupedByClassroom = useMemo(() => {
    if (selectedClassroom !== 'ALL') {
      return [{ classroom: selectedClassroom, list: filteredStudents }]
    }
    const order: ClassroomId[] = ['A', 'B', 'C', 'D']
    return order
      .map((cId) => ({
        classroom: cId,
        list: filteredStudents.filter((s) => s.classroom === cId),
      }))
      .filter((g) => g.list.length > 0)
  }, [filteredStudents, selectedClassroom])

  // Próximos aniversariantes do mês corrente para destaque amigável
  const currentMonthIndex = new Date().getMonth()
  const birthdaysThisMonth = useMemo(() => {
    return filteredStudents.filter((s) => {
      const { monthIndex } = getBirthdayParts(s.birth_date)
      return monthIndex === currentMonthIndex
    })
  }, [filteredStudents, currentMonthIndex])

  return (
    <div className="space-y-6">
      {/* Banner / Card com contadores resumidos */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 print:grid-cols-3">
        <Card className="p-3 sm:p-4 bg-white dark:bg-slate-900 border-slate-200">
          <p className="text-[11px] font-semibold text-muted-foreground uppercase">
            Total de Alunos Matriculados
          </p>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              {filteredStudents.length}
            </span>
            <Users className="h-4 w-4 text-sky-600" />
          </div>
          <p className="text-[10px] text-muted-foreground mt-1">
            {selectedClassroom === 'ALL'
              ? 'Todas as salas (A, B, C, D)'
              : `Sala ${selectedClassroom}`}
          </p>
        </Card>

        <Card className="p-3 sm:p-4 bg-white dark:bg-slate-900 border-slate-200">
          <p className="text-[11px] font-semibold text-pink-700 uppercase">
            Aniversariantes de {MONTH_LABELS[currentMonthIndex]}
          </p>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-pink-600">{birthdaysThisMonth.length}</span>
            <Cake className="h-4 w-4 text-pink-500" />
          </div>
          <p className="text-[10px] text-muted-foreground mt-1">Neste mês corrente</p>
        </Card>

        <Card className="p-3 sm:p-4 bg-gradient-to-br from-indigo-50 to-sky-50 dark:from-indigo-950/40 dark:to-sky-950/40 border-indigo-200 dark:border-indigo-900">
          <p className="text-[11px] font-bold text-indigo-800 dark:text-indigo-300 uppercase">
            Distribuição por Sala
          </p>
          <div className="mt-1 flex items-center gap-1.5 flex-wrap">
            {(['A', 'B', 'C', 'D'] as ClassroomId[]).map((cId) => {
              const count = filteredStudents.filter((s) => s.classroom === cId).length
              const badge = getClassroomBadge(cId, classrooms)
              return (
                <Badge
                  key={cId}
                  variant="outline"
                  className={`text-[10px] py-0 px-1.5 font-bold ${badge.color}`}
                >
                  {badge.rawName}: {count}
                </Badge>
              )
            })}
          </div>
          <p className="text-[10px] text-indigo-600/90 dark:text-indigo-400 mt-1">
            Classificação por idade em 01/03
          </p>
        </Card>
      </div>

      {/* Destaque visual dos aniversariantes do mês corrente na tela */}
      {birthdaysThisMonth.length > 0 && (
        <div className="p-3 sm:p-4 rounded-xl bg-pink-50/70 dark:bg-pink-950/20 border border-pink-200 dark:border-pink-900/60 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 text-xs print:hidden">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-lg bg-pink-100 text-pink-800 shrink-0">
              <Cake className="h-4 w-4" />
            </div>
            <div>
              <p className="font-bold text-pink-950 dark:text-pink-200">
                Aniversariantes deste mês ({MONTH_LABELS[currentMonthIndex]})
              </p>
              <p className="text-pink-800 dark:text-pink-300">
                {birthdaysThisMonth.map((s, idx) => {
                  const bday = getBirthdayParts(s.birth_date)
                  return (
                    <span key={s.id}>
                      <strong>{s.name}</strong> (dia {bday.day} • Sala {s.classroom})
                      {idx < birthdaysThisMonth.length - 1 ? ' • ' : ''}
                    </span>
                  )
                })}
              </p>
            </div>
          </div>
          <Badge className="bg-pink-600 text-white text-xs shrink-0 self-start sm:self-auto">
            <Sparkles className="h-3 w-3 mr-1" /> Fazer felicitação
          </Badge>
        </div>
      )}

      {/* Tabelas de alunos (agrupadas por sala ou sala única) */}
      {groupedByClassroom.map((group) => {
        const badge = getClassroomBadge(group.classroom, classrooms)

        return (
          <Card
            key={group.classroom}
            className="border shadow-xs overflow-hidden print:shadow-none print:border-slate-300"
          >
            <CardHeader className="bg-slate-50/80 dark:bg-slate-900/80 p-3 sm:p-4 border-b flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm sm:text-base font-bold flex items-center gap-2 text-slate-800 dark:text-slate-100">
                  <Badge variant="outline" className={`text-xs font-bold border ${badge.color}`}>
                    {badge.name}
                  </Badge>
                  <span>Alunos Matriculados</span>
                </CardTitle>
                <CardDescription className="text-xs mt-0.5">
                  Lista nominal com data completa de nascimento e dia de aniversário.
                </CardDescription>
              </div>
              <Badge variant="secondary" className="text-xs font-semibold">
                {group.list.length} aluno(s)
              </Badge>
            </CardHeader>

            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-slate-50 dark:bg-slate-900 text-xs">
                    <TableRow>
                      <TableHead className="w-12 text-center font-bold text-slate-700">#</TableHead>
                      <SortableTableHead
                        columnKey="name"
                        currentSortKey={sortKey}
                        currentDirection={sortDir}
                        onSort={handleSort}
                      >
                        Nome do Aluno
                      </SortableTableHead>
                      <SortableTableHead
                        columnKey="familyName"
                        currentSortKey={sortKey}
                        currentDirection={sortDir}
                        onSort={handleSort}
                      >
                        Família / Responsável
                      </SortableTableHead>
                      <SortableTableHead
                        columnKey="classroom"
                        currentSortKey={sortKey}
                        currentDirection={sortDir}
                        onSort={handleSort}
                        align="center"
                      >
                        Sala
                      </SortableTableHead>
                      <SortableTableHead
                        columnKey="birth_date"
                        currentSortKey={sortKey}
                        currentDirection={sortDir}
                        onSort={handleSort}
                        align="center"
                      >
                        Data de Nascimento (dd/mm/aaaa)
                      </SortableTableHead>
                      <SortableTableHead
                        columnKey="birthday_day"
                        currentSortKey={sortKey}
                        currentDirection={sortDir}
                        onSort={handleSort}
                        align="center"
                        className="text-pink-700 dark:text-pink-400"
                      >
                        Dia do Aniversário
                      </SortableTableHead>
                      <SortableTableHead
                        columnKey="birthday_month"
                        currentSortKey={sortKey}
                        currentDirection={sortDir}
                        onSort={handleSort}
                        align="center"
                      >
                        Mês
                      </SortableTableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="text-xs">
                    {group.list.map((student, index) => {
                      const bday = getBirthdayParts(student.birth_date)
                      const isBirthdayMonth = bday.monthIndex === currentMonthIndex

                      return (
                        <TableRow
                          key={student.id}
                          className={`transition-colors ${
                            isBirthdayMonth
                              ? 'bg-pink-50/40 dark:bg-pink-950/15'
                              : 'hover:bg-slate-50 dark:hover:bg-slate-900/50'
                          }`}
                        >
                          <TableCell className="text-center font-mono text-muted-foreground text-[11px]">
                            {index + 1}
                          </TableCell>

                          <TableCell className="font-semibold text-slate-900 dark:text-slate-100">
                            <div className="flex items-center space-x-2.5">
                              <div className="h-7 w-7 rounded-full overflow-hidden bg-slate-200 border shrink-0">
                                {student.photo_url ? (
                                  <img
                                    src={student.photo_url}
                                    alt={student.name}
                                    className="h-full w-full object-cover"
                                  />
                                ) : (
                                  <div className="h-full w-full flex items-center justify-center font-bold text-slate-600 text-[10px]">
                                    {student.name.slice(0, 2).toUpperCase()}
                                  </div>
                                )}
                              </div>
                              <div>
                                <span className="font-bold">{student.name}</span>
                                {isBirthdayMonth && (
                                  <span className="ml-2 inline-flex items-center text-[10px] text-pink-700 dark:text-pink-400 font-bold">
                                    <Cake className="h-3 w-3 mr-0.5 inline" /> Aniversariante deste
                                    mês!
                                  </span>
                                )}
                              </div>
                            </div>
                          </TableCell>

                          <TableCell className="text-slate-600 dark:text-slate-300">
                            {student.familyName ? (
                              <span>Família {student.familyName}</span>
                            ) : (
                              <span className="text-muted-foreground italic">—</span>
                            )}
                          </TableCell>

                          <TableCell className="text-center">
                            <Badge
                              variant="outline"
                              className={`text-[10px] font-semibold border ${badge.color}`}
                            >
                              {badge.rawName}
                            </Badge>
                          </TableCell>

                          <TableCell className="text-center font-mono font-semibold text-slate-800 dark:text-slate-200">
                            {student.birth_date ? formatDate(student.birth_date) : '—'}
                          </TableCell>

                          <TableCell className="text-center">
                            {bday.day ? (
                              <span className="inline-flex items-center gap-1 font-bold text-pink-700 dark:text-pink-400 bg-pink-100/80 dark:bg-pink-950/60 px-2 py-0.5 rounded text-[11px]">
                                <Cake className="h-3 w-3" /> Dia {bday.day}
                              </span>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>

                          <TableCell className="text-center font-medium text-slate-700 dark:text-slate-300">
                            {bday.monthName || '—'}
                          </TableCell>
                        </TableRow>
                      )
                    })}

                    {group.list.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-6 text-muted-foreground">
                          Nenhum aluno encontrado para os filtros selecionados.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )
      })}

      {filteredStudents.length === 0 && (
        <Card className="p-8 text-center text-muted-foreground border-dashed">
          Nenhum aluno encontrado para os filtros aplicados.
        </Card>
      )}
    </div>
  )
}
