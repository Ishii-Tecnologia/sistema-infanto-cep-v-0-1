import React, { useMemo } from 'react'
import { ClassroomId, ClassroomInfo } from '@/types'
import { formatDate, getClassroomBadge } from '@/lib/academic'
import { StudentsByClassroomReportItem } from '@/services/generalReports'
import { photoDisplayUrl } from '@/services/photos'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Cake, CalendarDays, Users } from 'lucide-react'
import { SortableTableHead, SortDirection } from '@/components/reports/SortableTableHead'

interface BirthdaysListReportProps {
  students: StudentsByClassroomReportItem[]
  selectedMonth: number | 'ALL'
  onMonthChange: (month: number | 'ALL') => void
  includeGuardians: boolean
  onIncludeGuardiansChange: (checked: boolean) => void
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

const ALL_MONTHS = MONTH_LABELS.map((label, idx) => ({ value: idx + 1, label }))

/**
 * Extrai dia (1-31) e mês (1-12) do aniversário a partir da string birth_date
 */
function getBirthdayParts(birthDateStr?: string) {
  const empty = { day: 0, month: 0 }
  if (!birthDateStr) return empty
  const clean = birthDateStr.trim().split('T')[0].split(' ')[0]
  const match = clean.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (match) {
    return {
      day: parseInt(match[3], 10),
      month: parseInt(match[2], 10),
    }
  }
  const d = new Date(birthDateStr)
  if (isNaN(d.getTime())) return empty
  return { day: d.getDate(), month: d.getMonth() + 1 }
}

export function BirthdaysListReport({
  students,
  selectedMonth,
  onMonthChange,
  includeGuardians,
  onIncludeGuardiansChange,
  selectedClassroom,
  classrooms,
  searchQuery = '',
}: BirthdaysListReportProps) {
  const [sortKey, setSortKey] = React.useState<string>('day')
  const [sortDir, setSortDir] = React.useState<SortDirection>('asc')

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  // Recorte por mês + busca + ordenação (por dia dentro do mês escolhido)
  const filtered = useMemo(() => {
    let list = students.filter((s) => {
      const parts = getBirthdayParts(s.birth_date)
      if (parts.day === 0 || parts.month === 0) return false
      if (selectedMonth !== 'ALL' && parts.month !== selectedMonth) return false
      return true
    })

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim()
      list = list.filter((s) => {
        const nameMatch = s.name.toLowerCase().includes(q)
        const familyMatch = s.familyName ? s.familyName.toLowerCase().includes(q) : false
        return nameMatch || familyMatch
      })
    }

    return [...list].sort((a, b) => {
      let valA: any
      let valB: any

      const partsA = getBirthdayParts(a.birth_date)
      const partsB = getBirthdayParts(b.birth_date)

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
        case 'day':
        default:
          // Dia dentro do mês escolhido; em "Todos os meses", mês depois dia
          valA = selectedMonth === 'ALL' ? partsA.month * 100 + partsA.day : partsA.day
          valB = selectedMonth === 'ALL' ? partsB.month * 100 + partsB.day : partsB.day
      }

      if (valA < valB) return sortDir === 'asc' ? -1 : 1
      if (valA > valB) return sortDir === 'asc' ? 1 : -1
      return a.name.localeCompare(b.name, 'pt-BR')
    })
  }, [students, selectedMonth, searchQuery, sortKey, sortDir])

  const childCount = filtered.filter((s) => s.personKind !== 'guardian').length
  const guardianCount = filtered.length - childCount
  const monthLabel = selectedMonth === 'ALL' ? 'Todos os Meses' : MONTH_LABELS[selectedMonth - 1]

  return (
    <div className="space-y-6">
      {/* ---------------------------------------------------------
          CONTROLES: MÊS + CHECKBOX INCLUIR RESPONSÁVEIS
          (na tela ficam no card "Filtros do Relatório" da página;
           esta cópia aparece só na impressão, para o papel)
          --------------------------------------------------------- */}
      <div className="hidden print:flex flex-col sm:flex-row sm:items-end gap-3 sm:gap-6 flex-wrap">
        <div className="space-y-1">
          <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
            Mês do Aniversário
          </Label>
          <div className="h-9 px-3 rounded-md border bg-white dark:bg-slate-900 flex items-center text-xs font-semibold text-slate-800 dark:text-slate-200">
            <Cake className="h-3.5 w-3.5 mr-1.5 text-pink-600" />
            {monthLabel}
          </div>
        </div>

        <div className="flex items-center gap-2 pb-2.5">
          <Checkbox
            id="birthdays-include-guardians"
            checked={includeGuardians}
            onCheckedChange={(checked) => onIncludeGuardiansChange(checked === true)}
          />
          <Label
            htmlFor="birthdays-include-guardians"
            className="text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer"
          >
            Incluir responsáveis
          </Label>
        </div>
      </div>

      {/* ---------------------------------------------------------
          CARDS DE RESUMO
          --------------------------------------------------------- */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 print:grid-cols-3">
        <Card className="p-3 sm:p-4 bg-white dark:bg-slate-900 border-slate-200">
          <p className="text-[11px] font-semibold text-muted-foreground uppercase">
            Total no Período
          </p>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              {filtered.length}
            </span>
            <CalendarDays className="h-4 w-4 text-sky-600" />
          </div>
          <p className="text-[10px] text-muted-foreground mt-1">{monthLabel}</p>
        </Card>

        <Card className="p-3 sm:p-4 bg-white dark:bg-slate-900 border-slate-200">
          <p className="text-[11px] font-semibold text-sky-700 uppercase">Crianças</p>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-sky-600">{childCount}</span>
            <Users className="h-4 w-4 text-sky-500" />
          </div>
          <p className="text-[10px] text-muted-foreground mt-1">
            {includeGuardians ? 'Com responsáveis incluídos' : 'Somente crianças'}
          </p>
        </Card>

        <Card className="p-3 sm:p-4 bg-gradient-to-br from-pink-50 to-rose-50 dark:from-pink-950/40 dark:to-rose-950/40 border-pink-200 dark:border-pink-900 col-span-2 lg:col-span-1">
          <p className="text-[11px] font-bold text-pink-800 dark:text-pink-300 uppercase">
            Responsáveis
          </p>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-2xl font-extrabold text-pink-700 dark:text-pink-300">
              {guardianCount}
            </span>
            <Cake className="h-4 w-4 text-pink-500" />
          </div>
          <p className="text-[10px] text-pink-600/90 dark:text-pink-400 mt-1">
            {includeGuardians
              ? 'Listados junto das crianças'
              : 'Marque "Incluir responsáveis" para listar'}
          </p>
        </Card>
      </div>

      {/* ---------------------------------------------------------
          TABELA: NOME COMPLETO + DIA DO ANIVERSÁRIO
          --------------------------------------------------------- */}
      <Card className="border shadow-xs overflow-hidden print:shadow-none print:border-slate-300">
        <CardHeader className="bg-slate-50/80 dark:bg-slate-900/80 p-3 sm:p-4 border-b flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-sm sm:text-base font-bold flex items-center gap-2 text-slate-800 dark:text-slate-100">
              <Cake className="h-4 w-4 text-pink-600" />
              <span>Lista de Aniversariantes — {monthLabel}</span>
            </CardTitle>
            <CardDescription className="text-xs mt-0.5">
              Nome completo e dia do aniversário, ordenados pelo dia dentro do mês.
            </CardDescription>
          </div>
          <Badge variant="secondary" className="text-xs font-semibold">
            {filtered.length} pessoa(s)
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
                    Nome Completo
                  </SortableTableHead>
                  <SortableTableHead
                    columnKey="day"
                    currentSortKey={sortKey}
                    currentDirection={sortDir}
                    onSort={handleSort}
                    align="center"
                    className="text-pink-700 dark:text-pink-400"
                  >
                    Dia do Aniversário
                  </SortableTableHead>
                  <SortableTableHead
                    columnKey="birth_date"
                    currentSortKey={sortKey}
                    currentDirection={sortDir}
                    onSort={handleSort}
                    align="center"
                  >
                    Data de Nascimento
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
                    columnKey="familyName"
                    currentSortKey={sortKey}
                    currentDirection={sortDir}
                    onSort={handleSort}
                  >
                    Família
                  </SortableTableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="text-xs">
                {filtered.map((person, index) => {
                  const parts = getBirthdayParts(person.birth_date)
                  const isGuardian = person.personKind === 'guardian'
                  const badge = getClassroomBadge(person.classroom, classrooms)
                  const isCurrentMonth = parts.month === new Date().getMonth()

                  return (
                    <TableRow
                      key={person.id}
                      className={`transition-colors ${
                        isGuardian
                          ? 'bg-pink-50/40 dark:bg-pink-950/15'
                          : isCurrentMonth
                            ? 'bg-pink-50/25 dark:bg-pink-950/10'
                            : 'hover:bg-slate-50 dark:hover:bg-slate-900/50'
                      }`}
                    >
                      <TableCell className="text-center font-mono text-muted-foreground text-[11px]">
                        {index + 1}
                      </TableCell>

                      <TableCell className="font-semibold text-slate-900 dark:text-slate-100">
                        <div className="flex items-center space-x-2.5">
                          <div className="h-7 w-7 rounded-full overflow-hidden bg-slate-200 border shrink-0">
                            {photoDisplayUrl(person) ? (
                              <img
                                src={photoDisplayUrl(person)!}
                                alt={person.name}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <div className="h-full w-full flex items-center justify-center font-bold text-slate-600 text-[10px]">
                                {isGuardian ? 'R' : person.name.slice(0, 2).toUpperCase()}
                              </div>
                            )}
                          </div>
                          <div>
                            <span className="font-bold">{person.name}</span>
                            {isGuardian && (
                              <span className="ml-2 inline-flex items-center text-[10px] text-pink-700 dark:text-pink-400 font-bold">
                                Responsável
                              </span>
                            )}
                          </div>
                        </div>
                      </TableCell>

                      <TableCell className="text-center">
                        <span className="inline-flex items-center gap-1 font-bold text-pink-700 dark:text-pink-400 bg-pink-100/80 dark:bg-pink-950/60 px-2 py-0.5 rounded text-[11px]">
                          <Cake className="h-3 w-3" />
                          {String(parts.day).padStart(2, '0')}/
                          {String(parts.month).padStart(2, '0')}
                        </span>
                      </TableCell>

                      <TableCell className="text-center font-mono font-semibold text-slate-800 dark:text-slate-200">
                        {person.birth_date ? formatDate(person.birth_date) : '—'}
                      </TableCell>

                      <TableCell className="text-center">
                        <Badge
                          variant="outline"
                          className={`text-[10px] font-semibold border ${badge.color}`}
                        >
                          {badge.rawName}
                        </Badge>
                      </TableCell>

                      <TableCell className="text-slate-600 dark:text-slate-300">
                        {person.familyName ? (
                          <span>Família {person.familyName}</span>
                        ) : (
                          <span className="text-muted-foreground italic">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })}

                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-6 text-muted-foreground">
                      Nenhum aniversariante encontrado para os filtros selecionados.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {filtered.length === 0 && (
        <Card className="p-8 text-center text-muted-foreground border-dashed print:hidden">
          Nenhum aniversariante encontrado para os filtros aplicados.
        </Card>
      )}
    </div>
  )
}
