import React, { useMemo } from 'react'
import { ClassroomId, ClassroomInfo } from '@/types'
import { getClassroomBadge } from '@/lib/academic'
import { StudentSizesReportItem, SizeMissingFilter } from '@/services/generalReports'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Shirt,
  Footprints,
  AlertCircle,
  CheckCircle2,
  Filter,
  Check,
  AlertTriangle,
} from 'lucide-react'

interface StudentSizesReportProps {
  students: StudentSizesReportItem[]
  selectedClassroom: ClassroomId | 'ALL'
  classrooms: ClassroomInfo[]
  searchQuery?: string
  missingFilter: SizeMissingFilter
  onMissingFilterChange: (filter: SizeMissingFilter) => void
}

export function StudentSizesReport({
  students,
  selectedClassroom,
  classrooms,
  searchQuery = '',
  missingFilter,
  onMissingFilterChange,
}: StudentSizesReportProps) {
  // Filtro de busca local
  const filteredStudents = useMemo(() => {
    if (!searchQuery.trim()) return students
    const q = searchQuery.toLowerCase().trim()
    return students.filter((s) => {
      const nameMatch = s.name.toLowerCase().includes(q)
      const familyMatch = s.familyName ? s.familyName.toLowerCase().includes(q) : false
      const clothingMatch = s.clothing_size.toLowerCase().includes(q)
      const shoeMatch = s.shoe_size.toLowerCase().includes(q)
      return nameMatch || familyMatch || clothingMatch || shoeMatch
    })
  }, [students, searchQuery])

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

  // Totais analíticos para cartões e badges
  const totalCount = students.length
  const completeCount = students.filter((s) => s.hasClothing && s.hasShoe).length
  const missingAnyCount = students.filter((s) => s.missingAny).length
  const missingClothingCount = students.filter((s) => !s.hasClothing).length
  const missingShoeCount = students.filter((s) => !s.hasShoe).length
  const missingBothCount = students.filter((s) => s.missingBoth).length

  return (
    <div className="space-y-6">
      {/* Cards de Resumo e Indicadores de Pendências */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 print:grid-cols-4">
        <Card className="p-3 sm:p-4 bg-white dark:bg-slate-900 border-slate-200">
          <p className="text-[11px] font-semibold text-muted-foreground uppercase">
            Total de Alunos
          </p>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              {totalCount}
            </span>
            <span className="text-xs text-slate-500 font-medium">cadastrados</span>
          </div>
          <p className="text-[10px] text-muted-foreground mt-1">
            {selectedClassroom === 'ALL'
              ? 'Todas as salas (A, B, C, D)'
              : `Sala ${selectedClassroom}`}
          </p>
        </Card>

        <Card className="p-3 sm:p-4 bg-white dark:bg-slate-900 border-slate-200">
          <p className="text-[11px] font-semibold text-emerald-700 uppercase">Tamanhos Completos</p>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-emerald-600">{completeCount}</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </div>
          <p className="text-[10px] text-muted-foreground mt-1">
            {totalCount > 0
              ? `${Math.round((completeCount / totalCount) * 100)}% dos alunos com ambos informados`
              : 'Sem registros'}
          </p>
        </Card>

        <Card className="p-3 sm:p-4 bg-white dark:bg-slate-900 border-rose-200 dark:border-rose-950">
          <p className="text-[11px] font-semibold text-rose-700 uppercase">
            Sem Informação (Roupa ou Calçado)
          </p>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-rose-600">{missingAnyCount}</span>
            <AlertCircle className="h-4 w-4 text-rose-500" />
          </div>
          <p className="text-[10px] text-rose-600/90 font-medium mt-1">
            {missingBothCount} sem nenhuma das duas informações
          </p>
        </Card>

        <Card className="p-3 sm:p-4 bg-gradient-to-br from-indigo-50 to-sky-50 dark:from-indigo-950/40 dark:to-sky-950/40 border-indigo-200 dark:border-indigo-900 col-span-2 lg:col-span-1">
          <p className="text-[11px] font-bold text-indigo-800 dark:text-indigo-300 uppercase">
            Detalhamento de Faltantes
          </p>
          <div className="mt-1 space-y-1 text-xs">
            <div className="flex items-center justify-between text-indigo-950 dark:text-indigo-200">
              <span className="flex items-center gap-1">
                <Shirt className="h-3 w-3 text-indigo-600" /> Sem roupa:
              </span>
              <span className="font-bold">{missingClothingCount}</span>
            </div>
            <div className="flex items-center justify-between text-indigo-950 dark:text-indigo-200">
              <span className="flex items-center gap-1">
                <Footprints className="h-3 w-3 text-indigo-600" /> Sem calçado:
              </span>
              <span className="font-bold">{missingShoeCount}</span>
            </div>
          </div>
        </Card>
      </div>

      {/* Seletor rápido de filtro de pendências (apenas na tela) */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b pb-3 print:hidden">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 mr-1 flex items-center gap-1">
            <Filter className="h-3.5 w-3.5 text-sky-600" /> Exibir:
          </span>

          <Button
            type="button"
            size="sm"
            variant={missingFilter === 'all' ? 'default' : 'outline'}
            onClick={() => onMissingFilterChange('all')}
            className={`h-7 text-xs ${missingFilter === 'all' ? 'bg-sky-700 hover:bg-sky-800 text-white' : ''}`}
          >
            Todos ({totalCount})
          </Button>

          <Button
            type="button"
            size="sm"
            variant={missingFilter === 'missing_any' ? 'default' : 'outline'}
            onClick={() => onMissingFilterChange('missing_any')}
            className={`h-7 text-xs font-semibold ${
              missingFilter === 'missing_any'
                ? 'bg-rose-600 hover:bg-rose-700 text-white'
                : 'text-rose-700 border-rose-200 hover:bg-rose-50'
            }`}
          >
            <AlertCircle className="h-3 w-3 mr-1" />
            Sem Informação ({missingAnyCount})
          </Button>

          <Button
            type="button"
            size="sm"
            variant={missingFilter === 'missing_both' ? 'default' : 'outline'}
            onClick={() => onMissingFilterChange('missing_both')}
            className={`h-7 text-xs ${
              missingFilter === 'missing_both'
                ? 'bg-rose-700 hover:bg-rose-800 text-white font-bold'
                : 'text-rose-800 border-rose-200'
            }`}
          >
            Sem ambos ({missingBothCount})
          </Button>

          <Button
            type="button"
            size="sm"
            variant={missingFilter === 'missing_clothing' ? 'default' : 'outline'}
            onClick={() => onMissingFilterChange('missing_clothing')}
            className={`h-7 text-xs ${missingFilter === 'missing_clothing' ? 'bg-amber-600 hover:bg-amber-700 text-white' : ''}`}
          >
            <Shirt className="h-3 w-3 mr-1" /> Sem Roupa ({missingClothingCount})
          </Button>

          <Button
            type="button"
            size="sm"
            variant={missingFilter === 'missing_shoe' ? 'default' : 'outline'}
            onClick={() => onMissingFilterChange('missing_shoe')}
            className={`h-7 text-xs ${missingFilter === 'missing_shoe' ? 'bg-amber-600 hover:bg-amber-700 text-white' : ''}`}
          >
            <Footprints className="h-3 w-3 mr-1" /> Sem Calçado ({missingShoeCount})
          </Button>

          <Button
            type="button"
            size="sm"
            variant={missingFilter === 'complete' ? 'default' : 'outline'}
            onClick={() => onMissingFilterChange('complete')}
            className={`h-7 text-xs ${
              missingFilter === 'complete'
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                : 'text-emerald-700 border-emerald-200 hover:bg-emerald-50'
            }`}
          >
            <Check className="h-3 w-3 mr-1" /> Completos ({completeCount})
          </Button>
        </div>

        {missingFilter !== 'all' && (
          <Badge
            variant="outline"
            className="text-xs bg-amber-50 border-amber-300 text-amber-900 w-fit"
          >
            Filtro ativo: {missingFilter === 'missing_any' && 'Sem roupa ou calçado'}
            {missingFilter === 'missing_both' && 'Sem roupa e sem calçado'}
            {missingFilter === 'missing_clothing' && 'Apenas sem roupa'}
            {missingFilter === 'missing_shoe' && 'Apenas sem calçado'}
            {missingFilter === 'complete' && 'Apenas com ambos preenchidos'}
          </Badge>
        )}
      </div>

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
                  <span>Tamanhos de Roupa e Calçado</span>
                </CardTitle>
                <CardDescription className="text-xs mt-0.5">
                  Conferência para doações, eventos e uniformes institucionais.
                </CardDescription>
              </div>
              <Badge variant="secondary" className="text-xs font-semibold">
                {group.list.length} aluno(s) listado(s)
              </Badge>
            </CardHeader>

            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-slate-50 dark:bg-slate-900 text-xs">
                    <TableRow>
                      <TableHead className="w-12 text-center font-bold text-slate-700">#</TableHead>
                      <TableHead className="font-bold text-slate-800 dark:text-slate-200">
                        Nome do Aluno
                      </TableHead>
                      <TableHead className="font-bold text-slate-800 dark:text-slate-200">
                        Família
                      </TableHead>
                      <TableHead className="text-center font-bold text-slate-800 dark:text-slate-200">
                        Sala
                      </TableHead>
                      <TableHead className="text-center font-bold text-indigo-800 dark:text-indigo-300">
                        <span className="inline-flex items-center gap-1">
                          <Shirt className="h-3.5 w-3.5" /> Tamanho de Roupa
                        </span>
                      </TableHead>
                      <TableHead className="text-center font-bold text-sky-800 dark:text-sky-300">
                        <span className="inline-flex items-center gap-1">
                          <Footprints className="h-3.5 w-3.5" /> Tamanho de Calçado
                        </span>
                      </TableHead>
                      <TableHead className="text-center font-bold text-slate-800 dark:text-slate-200">
                        Status do Cadastro
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="text-xs">
                    {group.list.map((student, index) => {
                      const isMissingAny = student.missingAny

                      return (
                        <TableRow
                          key={student.id}
                          className={`transition-colors ${
                            student.missingBoth
                              ? 'bg-rose-50/40 dark:bg-rose-950/20 border-l-4 border-l-rose-500'
                              : isMissingAny
                                ? 'bg-amber-50/30 dark:bg-amber-950/15 border-l-4 border-l-amber-400'
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
                              <span className="font-bold">{student.name}</span>
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

                          {/* Tamanho de Roupa */}
                          <TableCell className="text-center">
                            {student.hasClothing ? (
                              <Badge
                                variant="outline"
                                className="bg-indigo-50 border-indigo-300 text-indigo-900 dark:bg-indigo-950/60 dark:text-indigo-200 text-xs font-bold"
                              >
                                {student.clothing_size}
                              </Badge>
                            ) : (
                              <span className="inline-flex items-center text-xs text-rose-700 dark:text-rose-400 font-semibold bg-rose-50 dark:bg-rose-950/40 px-2 py-0.5 rounded border border-rose-200 dark:border-rose-900">
                                <AlertTriangle className="h-3 w-3 mr-1" />
                                Não informado
                              </span>
                            )}
                          </TableCell>

                          {/* Tamanho de Calçado */}
                          <TableCell className="text-center">
                            {student.hasShoe ? (
                              <Badge
                                variant="outline"
                                className="bg-sky-50 border-sky-300 text-sky-900 dark:bg-sky-950/60 dark:text-sky-200 text-xs font-bold"
                              >
                                {student.shoe_size}
                              </Badge>
                            ) : (
                              <span className="inline-flex items-center text-xs text-rose-700 dark:text-rose-400 font-semibold bg-rose-50 dark:bg-rose-950/40 px-2 py-0.5 rounded border border-rose-200 dark:border-rose-900">
                                <AlertTriangle className="h-3 w-3 mr-1" />
                                Não informado
                              </span>
                            )}
                          </TableCell>

                          {/* Status / Alerta de pendência */}
                          <TableCell className="text-center">
                            {!student.hasClothing && !student.hasShoe ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-700 dark:text-rose-400">
                                <AlertCircle className="h-3.5 w-3.5" /> Faltam roupa e calçado
                              </span>
                            ) : !student.hasClothing ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 dark:text-amber-400">
                                <AlertTriangle className="h-3.5 w-3.5" /> Falta tamanho de roupa
                              </span>
                            ) : !student.hasShoe ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 dark:text-amber-400">
                                <AlertTriangle className="h-3.5 w-3.5" /> Falta tamanho de calçado
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">
                                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> Completo
                              </span>
                            )}
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
          Nenhum aluno encontrado para os filtros de tamanho e busca aplicados.
        </Card>
      )}
    </div>
  )
}
