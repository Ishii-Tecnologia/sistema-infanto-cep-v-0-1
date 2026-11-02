import React, { useEffect, useState, useMemo } from 'react'
import { useAcademic } from '@/contexts/AcademicContext'
import { useAuth } from '@/contexts/AuthContext'
import {
  attendanceReportService,
  AttendanceReportFilter,
  AttendanceReportData,
  ChildAttendanceSummary,
} from '@/services/attendanceReports'
import {
  generalReportsService,
  StudentsByClassroomReportItem,
  StudentSizesReportItem,
  SizeMissingFilter,
} from '@/services/generalReports'
import { ClassroomId, Child } from '@/types'
import { formatDate, getClassroomBadge } from '@/lib/academic'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  BarChart3,
  Users,
  Calendar,
  Printer,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  HelpCircle,
  RefreshCw,
  Search,
  Filter,
  CalendarDays,
  TrendingUp,
  Ban,
  Eye,
  Cake,
  Shirt,
  FileText,
} from 'lucide-react'
import { ChildAttendanceDetailModal } from '@/components/ChildAttendanceDetailModal'
import { StudentsByClassroomReport } from '@/components/reports/StudentsByClassroomReport'
import { StudentSizesReport } from '@/components/reports/StudentSizesReport'
import { useToast } from '@/hooks/use-toast'

const MONTH_NAMES = [
  { value: 3, label: 'Março' },
  { value: 4, label: 'Abril' },
  { value: 5, label: 'Maio' },
  { value: 6, label: 'Junho' },
  { value: 7, label: 'Julho' },
  { value: 8, label: 'Agosto' },
  { value: 9, label: 'Setembro' },
  { value: 10, label: 'Outubro' },
  { value: 11, label: 'Novembro' },
  { value: 12, label: 'Dezembro' },
]

export type ReportCategory = 'attendance' | 'students_birthday' | 'student_sizes'

export default function AttendanceReportsPage() {
  const { toast } = useToast()
  const { classrooms, schoolYear, loading: academicLoading } = useAcademic()
  const { user } = useAuth()

  // Seletor do tipo de relatório ativo
  const [reportCategory, setReportCategory] = useState<ReportCategory>('attendance')

  // Filtros principais
  const [selectedClassroom, setSelectedClassroom] = useState<ClassroomId | 'ALL'>('ALL')
  const [periodType, setPeriodType] = useState<'all' | 'month' | 'custom'>('all')
  const [selectedMonth, setSelectedMonth] = useState<number>(3) // Padrão Março
  const [startDate, setStartDate] = useState<string>(
    () => `${schoolYear.year || new Date().getFullYear()}-03-01`,
  )
  const [endDate, setEndDate] = useState<string>(
    () => `${schoolYear.year || new Date().getFullYear()}-04-30`,
  )

  useEffect(() => {
    if (schoolYear.year) {
      setStartDate(`${schoolYear.year}-03-01`)
      setEndDate(`${schoolYear.year}-04-30`)
    }
  }, [schoolYear.year])

  // Filtros locais de busca e pendências
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [onlyLowAttendance, setOnlyLowAttendance] = useState<boolean>(false)
  const [sizeMissingFilter, setSizeMissingFilter] = useState<SizeMissingFilter>('all')

  // Dados e estado de carregamento
  const [loading, setLoading] = useState(true)
  const [rawData, setRawData] = useState<{
    lessons: any[]
    children: any[]
    attendances: any[]
  }>({ lessons: [], children: [], attendances: [] })
  const [allChildren, setAllChildren] = useState<Child[]>([])

  // Modal de detalhes da criança (Relatório de Frequência)
  const [selectedChildForModal, setSelectedChildForModal] = useState<ChildAttendanceSummary | null>(
    null,
  )
  const [detailModalOpen, setDetailModalOpen] = useState(false)

  // Carrega dados do servidor
  const fetchData = async () => {
    try {
      if (!schoolYear.year) return
      setLoading(true)
      const [data, childrenList] = await Promise.all([
        attendanceReportService.loadReportData(schoolYear.year),
        generalReportsService.loadActiveChildren(),
      ])
      setRawData(data)
      setAllChildren(childrenList)
    } catch (err: any) {
      console.error('Erro ao carregar dados do relatório:', err)
      toast({
        title: 'Sistema Infanto-CEP',
        description: 'Não foi possível carregar os dados dos relatórios.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!academicLoading) {
      fetchData()
    }
  }, [schoolYear.year, academicLoading])

  // ========================================================
  // 1. Processamento: Relatório de Frequência
  // ========================================================
  const attendanceFilter: AttendanceReportFilter = useMemo(() => {
    return {
      classroomId: selectedClassroom,
      periodType,
      month: periodType === 'month' ? selectedMonth : undefined,
      year: schoolYear.year,
      startDate: periodType === 'custom' ? startDate : undefined,
      endDate: periodType === 'custom' ? endDate : undefined,
    }
  }, [selectedClassroom, periodType, selectedMonth, startDate, endDate, schoolYear.year])

  const reportData: AttendanceReportData = useMemo(() => {
    return attendanceReportService.processReport(rawData, attendanceFilter)
  }, [rawData, attendanceFilter])

  const filteredChildSummaries = useMemo(() => {
    return reportData.childSummaries.filter((child) => {
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase()
        if (!child.childName.toLowerCase().includes(query)) {
          return false
        }
      }
      if (onlyLowAttendance && !child.isLowAttendance) {
        return false
      }
      return true
    })
  }, [reportData.childSummaries, searchQuery, onlyLowAttendance])

  // ========================================================
  // 2. Processamento: Relatório de Alunos por Sala (com Aniversário)
  // ========================================================
  const studentsByClassroomData: StudentsByClassroomReportItem[] = useMemo(() => {
    return generalReportsService.processStudentsByClassroom(allChildren, selectedClassroom)
  }, [allChildren, selectedClassroom])

  // ========================================================
  // 3. Processamento: Relatório de Tamanhos de Roupa e Calçado
  // ========================================================
  const studentSizesData: StudentSizesReportItem[] = useMemo(() => {
    return generalReportsService.processStudentSizes(
      allChildren,
      selectedClassroom,
      sizeMissingFilter,
    )
  }, [allChildren, selectedClassroom, sizeMissingFilter])

  // Dispara a impressão do navegador
  const handlePrint = () => {
    window.print()
  }

  // Texto legível do período para cabeçalho e impressão
  const periodLabel = useMemo(() => {
    if (periodType === 'all') {
      return `Ano Letivo ${academicLoading ? '...' : schoolYear.year} (Completo)`
    }
    if (periodType === 'month') {
      const m = MONTH_NAMES.find((item) => item.value === selectedMonth)
      return `${m ? m.label : 'Mês'} de ${academicLoading ? '...' : schoolYear.year}`
    }
    if (periodType === 'custom') {
      return `Período de ${formatDate(startDate)} até ${formatDate(endDate)}`
    }
    return 'Geral'
  }, [periodType, selectedMonth, startDate, endDate, schoolYear.year, academicLoading])

  const classroomLabel = useMemo(() => {
    if (selectedClassroom === 'ALL') return 'Todas as Salas (A, B, C e D)'
    const c = classrooms.find((item) => item.id === selectedClassroom)
    return c ? `${c.name} (${c.description})` : `Sala ${selectedClassroom}`
  }, [selectedClassroom, classrooms])

  const reportCategoryTitle = useMemo(() => {
    switch (reportCategory) {
      case 'students_birthday':
        return 'Relatório de Alunos por Sala com Data de Aniversário'
      case 'student_sizes':
        return 'Relatório de Tamanhos para Calçado e Roupa dos Alunos'
      case 'attendance':
      default:
        return 'Relatório de Frequência e Assiduidade'
    }
  }, [reportCategory])

  const openChildDetails = (summary: ChildAttendanceSummary) => {
    setSelectedChildForModal(summary)
    setDetailModalOpen(true)
  }

  return (
    <div className="space-y-6">
      {/* ========================================================
          CABEÇALHO EXCLUSIVO PARA IMPRESSÃO (visível apenas ao imprimir)
          ======================================================== */}
      <div className="hidden print:block mb-6 border-b-2 border-slate-800 pb-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900">
              CEP-Coligação Espírita Progressista
            </h1>
            <p className="text-xs text-slate-600 font-medium">
              Departamento de Educação Espírita Infantil & Juventude • Sistema Infanto-CEP
            </p>
          </div>
          <div className="text-right text-xs text-slate-500">
            <p>Data de emissão: {formatDate(new Date())}</p>
            <p>Emitido por: {user?.name || 'Administração'}</p>
          </div>
        </div>

        <div className="mt-3 pt-3 border-t border-slate-300 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div>
            <span className="font-semibold text-slate-700">Tipo de Relatório: </span>
            <span className="text-slate-900 font-bold">{reportCategoryTitle}</span>
          </div>
          <div>
            <span className="font-semibold text-slate-700">Turma / Sala: </span>
            <span className="text-slate-900 font-bold">{classroomLabel}</span>
          </div>
          {reportCategory === 'attendance' && (
            <>
              <div>
                <span className="font-semibold text-slate-700">Período: </span>
                <span className="text-slate-900 font-bold">{periodLabel}</span>
              </div>
              <div>
                <span className="font-semibold text-slate-700">Frequência Geral: </span>
                <span className="text-slate-900 font-bold">{reportData.overallAverageRate}%</span>
              </div>
            </>
          )}
          {reportCategory === 'students_birthday' && (
            <div>
              <span className="font-semibold text-slate-700">Total de Alunos: </span>
              <span className="text-slate-900 font-bold">{studentsByClassroomData.length}</span>
            </div>
          )}
          {reportCategory === 'student_sizes' && (
            <div>
              <span className="font-semibold text-slate-700">Filtro de Informações: </span>
              <span className="text-slate-900 font-bold">
                {sizeMissingFilter === 'all' && 'Todos os alunos'}
                {sizeMissingFilter === 'missing_any' && 'Sem roupa ou calçado'}
                {sizeMissingFilter === 'missing_both' && 'Sem roupa e sem calçado'}
                {sizeMissingFilter === 'missing_clothing' && 'Sem tamanho de roupa'}
                {sizeMissingFilter === 'missing_shoe' && 'Sem tamanho de calçado'}
                {sizeMissingFilter === 'complete' && 'Tamanhos completos'}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* ========================================================
          CABEÇALHO DA TELA NA APLICAÇÃO (oculto na impressão)
          ======================================================== */}
      <div className="print:hidden flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-indigo-600 dark:text-indigo-400 font-semibold uppercase tracking-wider mb-1">
            <BarChart3 className="h-4 w-4" /> Gestão Pedagógica & Acompanhamento
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
            Relatórios
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Acompanhe a assiduidade escolar, listas de aniversariantes e conferência de tamanhos
            para doações.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchData}
            disabled={loading}
            className="text-xs h-9 shadow-xs"
            title="Recarregar dados do servidor"
          >
            <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>

          <Button
            onClick={handlePrint}
            className="bg-sky-700 hover:bg-sky-800 text-white text-xs h-9 shadow-xs font-semibold"
            title="Imprimir relatório limpo ou salvar como PDF"
          >
            <Printer className="h-3.5 w-3.5 mr-1.5" />
            Imprimir / Salvar PDF
          </Button>
        </div>
      </div>

      {/* ========================================================
          SELETOR DO TIPO DE RELATÓRIO (Abas principais de topo)
          ======================================================== */}
      <div className="print:hidden bg-slate-100 dark:bg-slate-800/80 p-1.5 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-wrap gap-1.5">
        <Button
          type="button"
          size="sm"
          variant={reportCategory === 'attendance' ? 'default' : 'ghost'}
          onClick={() => setReportCategory('attendance')}
          className={`text-xs h-9 font-semibold flex items-center gap-2 ${
            reportCategory === 'attendance'
              ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
              : 'text-slate-600 dark:text-slate-300 hover:bg-white/60 dark:hover:bg-slate-900/40'
          }`}
        >
          <BarChart3 className="h-4 w-4 text-indigo-600" />
          <span>Frequência das Chamadas</span>
        </Button>

        <Button
          type="button"
          size="sm"
          variant={reportCategory === 'students_birthday' ? 'default' : 'ghost'}
          onClick={() => setReportCategory('students_birthday')}
          className={`text-xs h-9 font-semibold flex items-center gap-2 ${
            reportCategory === 'students_birthday'
              ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
              : 'text-slate-600 dark:text-slate-300 hover:bg-white/60 dark:hover:bg-slate-900/40'
          }`}
        >
          <Cake className="h-4 w-4 text-pink-600" />
          <span>Alunos por Sala (com Aniversário)</span>
        </Button>

        <Button
          type="button"
          size="sm"
          variant={reportCategory === 'student_sizes' ? 'default' : 'ghost'}
          onClick={() => setReportCategory('student_sizes')}
          className={`text-xs h-9 font-semibold flex items-center gap-2 ${
            reportCategory === 'student_sizes'
              ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
              : 'text-slate-600 dark:text-slate-300 hover:bg-white/60 dark:hover:bg-slate-900/40'
          }`}
        >
          <Shirt className="h-4 w-4 text-sky-600" />
          <span>Tamanhos de Roupa e Calçado</span>
        </Button>
      </div>

      {/* ========================================================
          FILTROS PRINCIPAIS: SALA E CRITÉRIOS (oculto na impressão)
          ======================================================== */}
      <Card className="print:hidden border-sky-100 dark:border-sky-950 shadow-sm">
        <CardHeader className="p-3.5 sm:p-4 pb-2 border-b">
          <CardTitle className="text-xs sm:text-sm font-bold flex items-center gap-2 text-slate-800 dark:text-slate-200">
            <Filter className="h-4 w-4 text-sky-600" /> Filtros do Relatório
          </CardTitle>
          <CardDescription className="text-xs">
            {reportCategory === 'attendance'
              ? 'Selecione a sala e a janela de datas que deseja consolidar.'
              : reportCategory === 'students_birthday'
                ? 'Filtre pela turma/sala desejada ou veja todas as salas agrupadas com as datas de nascimento e aniversário.'
                : 'Selecione a turma/sala e filtre alunos com dados completos ou com informações faltantes de roupa e calçado.'}
          </CardDescription>
        </CardHeader>

        <CardContent className="p-3.5 sm:p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* 1. Seleção de Sala (comum a todos os relatórios) */}
          <div className="space-y-1">
            <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Turma / Sala
            </Label>
            <Select
              value={selectedClassroom}
              onValueChange={(val) => setSelectedClassroom(val as ClassroomId | 'ALL')}
            >
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder="Selecione a sala" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL" className="text-xs font-bold text-sky-700">
                  Todas as Salas (A, B, C, D)
                </SelectItem>
                {classrooms.map((c) => (
                  <SelectItem key={c.id} value={c.id} className="text-xs">
                    {c.name} ({c.minAge} a {c.maxAge} anos)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 2. Campo de busca por nome (comum a todos os relatórios) */}
          <div className="space-y-1">
            <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Buscar na Lista
            </Label>
            <div className="relative">
              <Search className="h-3.5 w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-9 pl-8 text-xs"
              />
            </div>
          </div>

          {/* Filtros específicos de Frequência (período/datas) */}
          {reportCategory === 'attendance' && (
            <>
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Tipo de Período
                </Label>
                <Select
                  value={periodType}
                  onValueChange={(val) => setPeriodType(val as 'all' | 'month' | 'custom')}
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="Tipo de período" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all" className="text-xs">
                      Ano Completo ({academicLoading ? '...' : schoolYear.year})
                    </SelectItem>
                    <SelectItem value="month" className="text-xs">
                      Mês Específico
                    </SelectItem>
                    <SelectItem value="custom" className="text-xs">
                      Intervalo de Datas Personalizado
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {periodType === 'month' && (
                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Mês de Referência
                  </Label>
                  <Select
                    value={String(selectedMonth)}
                    onValueChange={(val) => setSelectedMonth(Number(val))}
                  >
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue placeholder="Selecione o mês" />
                    </SelectTrigger>
                    <SelectContent>
                      {MONTH_NAMES.map((m) => (
                        <SelectItem key={m.value} value={String(m.value)} className="text-xs">
                          {m.label} de {academicLoading ? '...' : schoolYear.year}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {periodType === 'custom' && (
                <>
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                        Data Inicial
                      </Label>
                      {startDate && (
                        <span className="text-[10px] text-sky-700 font-mono font-medium">
                          {formatDate(startDate)}
                        </span>
                      )}
                    </div>
                    <Input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="h-9 text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                        Data Final
                      </Label>
                      {endDate && (
                        <span className="text-[10px] text-sky-700 font-mono font-medium">
                          {formatDate(endDate)}
                        </span>
                      )}
                    </div>
                    <Input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="h-9 text-xs"
                    />
                  </div>
                </>
              )}

              {periodType === 'all' && (
                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Calendário Letivo
                  </Label>
                  <div className="h-9 px-3 rounded-md border bg-slate-50 dark:bg-slate-900 flex items-center text-xs text-muted-foreground">
                    <CalendarDays className="h-3.5 w-3.5 mr-1.5 text-sky-600" />
                    Ano Letivo {academicLoading ? '...' : schoolYear.year}
                  </div>
                </div>
              )}
            </>
          )}

          {/* Filtros específicos de Tamanho (filtro de pendências) */}
          {reportCategory === 'student_sizes' && (
            <div className="space-y-1 sm:col-span-2">
              <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Filtro de Informações de Tamanho
              </Label>
              <Select
                value={sizeMissingFilter}
                onValueChange={(val) => setSizeMissingFilter(val as SizeMissingFilter)}
              >
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Selecione a situação" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-xs">
                    Todos os Alunos
                  </SelectItem>
                  <SelectItem value="missing_any" className="text-xs font-bold text-rose-700">
                    Sem Informação (Roupa OU Calçado)
                  </SelectItem>
                  <SelectItem value="missing_both" className="text-xs font-bold text-rose-800">
                    Sem Ambos (Sem Roupa E Sem Calçado)
                  </SelectItem>
                  <SelectItem value="missing_clothing" className="text-xs text-amber-800">
                    Apenas Sem Tamanho de Roupa
                  </SelectItem>
                  <SelectItem value="missing_shoe" className="text-xs text-amber-800">
                    Apenas Sem Tamanho de Calçado
                  </SelectItem>
                  <SelectItem value="complete" className="text-xs text-emerald-700">
                    Tamanhos Completos (Ambos Preenchidos)
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Indicativo rápido para Aniversariantes */}
          {reportCategory === 'students_birthday' && (
            <div className="space-y-1 sm:col-span-2">
              <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Mês Corrente
              </Label>
              <div className="h-9 px-3 rounded-md border bg-slate-50 dark:bg-slate-900 flex items-center text-xs text-muted-foreground">
                <Cake className="h-3.5 w-3.5 mr-1.5 text-pink-600" />
                Data de Nascimento em padrão brasileiro (dd/mm/aaaa) com destaque mensal
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ========================================================
          CONTEÚDO DO RELATÓRIO SELECIONADO
          ======================================================== */}

      {/* --------------------------------------------------------
          TIPO 1: RELATÓRIO DE FREQUÊNCIA
          -------------------------------------------------------- */}
      {reportCategory === 'attendance' && (
        <div className="space-y-6">
          {/* Cards de Resumo e Indicadores Rápidos */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
            <Card className="p-3 sm:p-4 bg-white dark:bg-slate-900 border-slate-200">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase">
                Aulas Letivas
              </p>
              <div className="mt-1 flex items-baseline justify-between">
                <span className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                  {reportData.totalActiveLessons}
                </span>
                <span className="text-xs text-sky-600 font-medium">no período</span>
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">
                (Aulas canceladas desconsideradas)
              </p>
            </Card>

            <Card className="p-3 sm:p-4 bg-white dark:bg-slate-900 border-slate-200">
              <p className="text-[11px] font-semibold text-emerald-700 uppercase">
                Presenças Registradas
              </p>
              <div className="mt-1 flex items-baseline justify-between">
                <span className="text-2xl font-bold text-emerald-600">
                  {reportData.totalPresentCount}
                </span>
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">Total de presenças</p>
            </Card>

            <Card className="p-3 sm:p-4 bg-white dark:bg-slate-900 border-slate-200">
              <p className="text-[11px] font-semibold text-rose-700 uppercase">
                Ausências Não Justificadas
              </p>
              <div className="mt-1 flex items-baseline justify-between">
                <span className="text-2xl font-bold text-rose-600">
                  {reportData.totalAbsentCount}
                </span>
                <XCircle className="h-4 w-4 text-rose-500" />
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">Faltas sem aviso</p>
            </Card>

            <Card className="p-3 sm:p-4 bg-white dark:bg-slate-900 border-slate-200">
              <p className="text-[11px] font-semibold text-amber-700 uppercase">
                Faltas Justificadas
              </p>
              <div className="mt-1 flex items-baseline justify-between">
                <span className="text-2xl font-bold text-amber-600">
                  {reportData.totalJustifiedCount}
                </span>
                <HelpCircle className="h-4 w-4 text-amber-500" />
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">Com motivo registrado</p>
            </Card>

            <Card className="p-3 sm:p-4 bg-gradient-to-br from-indigo-50 to-sky-50 dark:from-indigo-950/40 dark:to-sky-950/40 border-indigo-200 dark:border-indigo-900 col-span-2 lg:col-span-1">
              <p className="text-[11px] font-bold text-indigo-800 dark:text-indigo-300 uppercase">
                Frequência Média
              </p>
              <div className="mt-1 flex items-baseline justify-between">
                <span className="text-2xl font-extrabold text-indigo-700 dark:text-indigo-300">
                  {reportData.overallAverageRate}%
                </span>
                <TrendingUp className="h-4 w-4 text-indigo-600" />
              </div>
              <p className="text-[10px] text-indigo-600/90 dark:text-indigo-400 mt-1">
                {reportData.lowAttendanceCount > 0 ? (
                  <span className="font-semibold text-rose-600 dark:text-rose-400">
                    {reportData.lowAttendanceCount} criança(s) em alerta
                  </span>
                ) : (
                  'Turma com bom engajamento'
                )}
              </p>
            </Card>
          </div>

          {/* Sábado Crítico com mais ausências (Destaque visual) */}
          {reportData.criticalSaturday && (
            <div className="p-3 sm:p-4 rounded-xl bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/60 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 text-xs">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 rounded-lg bg-amber-100 text-amber-800 shrink-0">
                  <AlertTriangle className="h-4 w-4" />
                </div>
                <div>
                  <p className="font-bold text-amber-950 dark:text-amber-200">
                    Sábado com Maior Taxa de Faltas no Período
                  </p>
                  <p className="text-amber-800 dark:text-amber-300">
                    Aula #{reportData.criticalSaturday.sessionNumber} em{' '}
                    <strong>{formatDate(reportData.criticalSaturday.date)}</strong> — Tema:{' '}
                    <em>{reportData.criticalSaturday.centralTheme}</em>
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 font-medium shrink-0">
                <Badge
                  variant="outline"
                  className="bg-white border-amber-300 text-amber-900 text-xs"
                >
                  {reportData.criticalSaturday.absents} falta(s) +{' '}
                  {reportData.criticalSaturday.justified} justificada(s)
                </Badge>
                <Badge className="bg-amber-600 text-white text-xs">
                  {reportData.criticalSaturday.rate}% presença
                </Badge>
              </div>
            </div>
          )}

          {/* Abas de Visualização de Frequência: Por Criança / Por Aula */}
          <Tabs defaultValue="children" className="w-full">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b pb-3 print:hidden">
              <TabsList className="bg-slate-100 dark:bg-slate-800">
                <TabsTrigger value="children" className="text-xs flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5" />
                  Visão por Criança ({filteredChildSummaries.length})
                </TabsTrigger>
                <TabsTrigger value="lessons" className="text-xs flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5" />
                  Visão por Sábado / Aula ({reportData.lessonSummaries.length})
                </TabsTrigger>
              </TabsList>

              {/* Filtros rápidos da tabela de crianças */}
              <div className="flex items-center gap-2 flex-wrap">
                <Button
                  type="button"
                  variant={onlyLowAttendance ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setOnlyLowAttendance(!onlyLowAttendance)}
                  className={`h-8 text-xs font-semibold ${
                    onlyLowAttendance
                      ? 'bg-rose-600 hover:bg-rose-700 text-white'
                      : 'text-rose-700 border-rose-200 hover:bg-rose-50'
                  }`}
                >
                  <AlertTriangle className="h-3.5 w-3.5 mr-1" />
                  Apenas Frequência Baixa (&lt;70% ou faltas consecutivas)
                </Button>
              </div>
            </div>

            {/* ABA 1: VISÃO POR CRIANÇA */}
            <TabsContent value="children" className="space-y-4 pt-3">
              <Card className="border shadow-xs overflow-hidden">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-slate-50 dark:bg-slate-900 text-xs">
                      <TableRow>
                        <TableHead className="font-bold text-slate-800 dark:text-slate-200">
                          Criança
                        </TableHead>
                        <TableHead className="font-bold text-slate-800 dark:text-slate-200">
                          Sala
                        </TableHead>
                        <TableHead className="text-center font-bold text-slate-800 dark:text-slate-200">
                          Total Aulas
                        </TableHead>
                        <TableHead className="text-center font-bold text-emerald-700">
                          Presenças
                        </TableHead>
                        <TableHead className="text-center font-bold text-rose-700">
                          Ausências
                        </TableHead>
                        <TableHead className="text-center font-bold text-amber-700">
                          Justificadas
                        </TableHead>
                        <TableHead className="text-center font-bold text-slate-800 dark:text-slate-200">
                          Frequência
                        </TableHead>
                        <TableHead className="font-bold text-slate-800 dark:text-slate-200">
                          Situação / Alerta
                        </TableHead>
                        <TableHead className="text-right font-bold text-slate-800 dark:text-slate-200 print:hidden">
                          Ações
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody className="text-xs">
                      {filteredChildSummaries.map((child) => {
                        const badge = getClassroomBadge(child.classroom, classrooms)
                        const isCritical = child.isLowAttendance

                        return (
                          <TableRow
                            key={child.childId}
                            className={`transition-colors ${
                              isCritical
                                ? 'bg-rose-50/40 dark:bg-rose-950/20 border-l-4 border-l-rose-500'
                                : 'hover:bg-slate-50 dark:hover:bg-slate-900/50'
                            }`}
                          >
                            <TableCell className="font-semibold text-slate-900 dark:text-slate-100">
                              <div className="flex items-center space-x-2.5">
                                <div className="h-8 w-8 rounded-full overflow-hidden bg-slate-200 border shrink-0">
                                  {child.photoUrl ? (
                                    <img
                                      src={child.photoUrl}
                                      alt={child.childName}
                                      className="h-full w-full object-cover"
                                    />
                                  ) : (
                                    <div className="h-full w-full flex items-center justify-center font-bold text-slate-600 text-[10px]">
                                      {child.childName.slice(0, 2).toUpperCase()}
                                    </div>
                                  )}
                                </div>
                                <span className="font-bold">{child.childName}</span>
                              </div>
                            </TableCell>

                            <TableCell>
                              <Badge
                                variant="outline"
                                className={`text-[10px] font-semibold border ${badge.color}`}
                              >
                                {badge.name}
                              </Badge>
                            </TableCell>

                            <TableCell className="text-center font-semibold">
                              {child.totalLessons}
                            </TableCell>

                            <TableCell className="text-center font-bold text-emerald-600">
                              {child.presents}
                            </TableCell>

                            <TableCell className="text-center font-bold text-rose-600">
                              {child.absents}
                            </TableCell>

                            <TableCell className="text-center font-bold text-amber-600">
                              {child.justified}
                            </TableCell>

                            <TableCell className="text-center">
                              <div className="flex items-center justify-center space-x-1.5">
                                <span
                                  className={`font-extrabold text-xs ${
                                    child.percentage >= 85
                                      ? 'text-emerald-700'
                                      : child.percentage >= 70
                                        ? 'text-sky-700'
                                        : 'text-rose-700 font-black'
                                  }`}
                                >
                                  {child.percentage}%
                                </span>
                              </div>
                            </TableCell>

                            <TableCell>
                              {child.isLowAttendance ? (
                                <div className="flex items-center gap-1.5 text-rose-700 dark:text-rose-400 font-semibold text-[11px]">
                                  <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                                  <span>{child.warningReason || 'Frequência Baixa (< 70%)'}</span>
                                </div>
                              ) : (
                                <div className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400 text-[11px] font-medium">
                                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
                                  <span>Frequência Regular</span>
                                </div>
                              )}
                            </TableCell>

                            <TableCell className="text-right print:hidden">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openChildDetails(child)}
                                className="h-7 text-xs px-2 text-sky-700 hover:text-sky-900 hover:bg-sky-50"
                                title="Ver histórico detalhado por aula"
                              >
                                <Eye className="h-3.5 w-3.5 mr-1" />
                                Detalhes
                              </Button>
                            </TableCell>
                          </TableRow>
                        )
                      })}

                      {filteredChildSummaries.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                            Nenhuma criança encontrada para os filtros aplicados.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </Card>
            </TabsContent>

            {/* ABA 2: VISÃO POR AULA / SÁBADO LETIVO */}
            <TabsContent value="lessons" className="space-y-4 pt-3">
              <Card className="border shadow-xs overflow-hidden">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-slate-50 dark:bg-slate-900 text-xs">
                      <TableRow>
                        <TableHead className="font-bold text-slate-800 dark:text-slate-200">
                          Sábado / Aula
                        </TableHead>
                        <TableHead className="font-bold text-slate-800 dark:text-slate-200">
                          Tema Central
                        </TableHead>
                        <TableHead className="text-center font-bold text-slate-800 dark:text-slate-200">
                          Status
                        </TableHead>
                        <TableHead className="text-center font-bold text-emerald-700">
                          Presenças
                        </TableHead>
                        <TableHead className="text-center font-bold text-rose-700">
                          Ausências
                        </TableHead>
                        <TableHead className="text-center font-bold text-amber-700">
                          Justificadas
                        </TableHead>
                        <TableHead className="text-center font-bold text-slate-800 dark:text-slate-200">
                          Taxa de Presença
                        </TableHead>
                        <TableHead className="font-bold text-slate-800 dark:text-slate-200">
                          Observação do Sábado
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody className="text-xs">
                      {reportData.lessonSummaries.map((lesson) => {
                        const isCanceled = lesson.isCanceled
                        const isCritical = lesson.isHighestAbsenceRate && !isCanceled

                        return (
                          <TableRow
                            key={lesson.lessonId}
                            className={`transition-colors ${
                              isCanceled
                                ? 'bg-slate-100/60 dark:bg-slate-900/60 text-muted-foreground line-through-text'
                                : isCritical
                                  ? 'bg-amber-50/50 dark:bg-amber-950/20 border-l-4 border-l-amber-500'
                                  : 'hover:bg-slate-50 dark:hover:bg-slate-900/50'
                            }`}
                          >
                            <TableCell className="font-semibold text-slate-900 dark:text-slate-100 whitespace-nowrap">
                              <div>
                                <span className="font-bold">{formatDate(lesson.date)}</span>
                                {lesson.sessionNumber && (
                                  <p className="text-[11px] text-muted-foreground">
                                    Aula #{lesson.sessionNumber}
                                  </p>
                                )}
                              </div>
                            </TableCell>

                            <TableCell>
                              <div className="max-w-xs">
                                <p className="font-semibold text-slate-900 dark:text-slate-100 leading-tight">
                                  {lesson.centralTheme}
                                </p>
                                {lesson.thematicBlock && (
                                  <p className="text-[10px] text-muted-foreground mt-0.5">
                                    Bloco: {lesson.thematicBlock}
                                  </p>
                                )}
                              </div>
                            </TableCell>

                            <TableCell className="text-center">
                              {isCanceled ? (
                                <Badge
                                  variant="outline"
                                  className="text-[10px] border-slate-300 text-slate-600 bg-slate-100"
                                >
                                  <Ban className="h-3 w-3 mr-1" /> Cancelada
                                </Badge>
                              ) : (
                                <Badge
                                  variant="outline"
                                  className="text-[10px] border-emerald-300 text-emerald-800 bg-emerald-50"
                                >
                                  Realizada
                                </Badge>
                              )}
                            </TableCell>

                            <TableCell className="text-center font-bold text-emerald-600">
                              {isCanceled ? '—' : lesson.presents}
                            </TableCell>

                            <TableCell className="text-center font-bold text-rose-600">
                              {isCanceled ? '—' : lesson.absents}
                            </TableCell>

                            <TableCell className="text-center font-bold text-amber-600">
                              {isCanceled ? '—' : lesson.justified}
                            </TableCell>

                            <TableCell className="text-center">
                              {isCanceled ? (
                                <span className="text-muted-foreground">—</span>
                              ) : (
                                <span
                                  className={`font-extrabold ${
                                    lesson.rate >= 80
                                      ? 'text-emerald-700'
                                      : lesson.rate >= 60
                                        ? 'text-sky-700'
                                        : 'text-rose-700'
                                  }`}
                                >
                                  {lesson.rate}%
                                </span>
                              )}
                            </TableCell>

                            <TableCell>
                              {isCanceled ? (
                                <span className="text-xs text-rose-700 dark:text-rose-400 font-medium">
                                  Motivo: {lesson.cancelReason || 'Cancelada no calendário'}
                                </span>
                              ) : isCritical ? (
                                <span className="inline-flex items-center gap-1 text-xs text-amber-800 dark:text-amber-300 font-semibold bg-amber-100 dark:bg-amber-950/60 px-2 py-0.5 rounded-md border border-amber-300">
                                  <AlertTriangle className="h-3 w-3" /> Sábado com mais faltas no
                                  período
                                </span>
                              ) : (
                                <span className="text-xs text-muted-foreground">Normal</span>
                              )}
                            </TableCell>
                          </TableRow>
                        )
                      })}

                      {reportData.lessonSummaries.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                            Nenhuma aula cadastrada para o período selecionado.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      )}

      {/* --------------------------------------------------------
          TIPO 2: RELATÓRIO DE ALUNOS POR SALA (COM ANIVERSÁRIO)
          -------------------------------------------------------- */}
      {reportCategory === 'students_birthday' && (
        <StudentsByClassroomReport
          students={studentsByClassroomData}
          selectedClassroom={selectedClassroom}
          classrooms={classrooms}
          searchQuery={searchQuery}
        />
      )}

      {/* --------------------------------------------------------
          TIPO 3: RELATÓRIO DE TAMANHOS DE ROUPA E CALÇADO
          -------------------------------------------------------- */}
      {reportCategory === 'student_sizes' && (
        <StudentSizesReport
          students={studentSizesData}
          selectedClassroom={selectedClassroom}
          classrooms={classrooms}
          searchQuery={searchQuery}
          missingFilter={sizeMissingFilter}
          onMissingFilterChange={setSizeMissingFilter}
        />
      )}

      {/* ========================================================
          RODAPÉ DE IMPRESSÃO LIMPO COM ASSINATURA INSTITUCIONAL
          ======================================================== */}
      <div className="hidden print:block mt-8 pt-6 border-t border-slate-300 text-xs">
        <div className="flex justify-between items-end">
          <div className="space-y-1">
            <p className="font-bold text-slate-800">CEP-Coligação Espírita Progressista</p>
            <p className="text-slate-600">Secretaria Pedagógica • Sistema Infanto-CEP</p>
            <p className="text-[10px] text-slate-500">
              Relatório gerado automaticamente para arquivo, controle e atendimento às famílias.
            </p>
          </div>
          <div className="text-center border-t border-slate-400 w-56 pt-2">
            <p className="font-semibold text-slate-800">Coordenação / Dirigente</p>
            <p className="text-[10px] text-slate-500">Assinatura do Responsável</p>
          </div>
        </div>
      </div>

      {/* Modal de Detalhes da Criança (Usado no relatório de Frequência) */}
      <ChildAttendanceDetailModal
        summary={selectedChildForModal}
        open={detailModalOpen}
        onOpenChange={setDetailModalOpen}
      />
    </div>
  )
}
