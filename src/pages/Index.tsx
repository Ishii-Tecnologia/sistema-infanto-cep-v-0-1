import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { lessonService, attendanceService } from '@/services/lessons'
import { familyService } from '@/services/families'
import { libraryService } from '@/services/library'
import { Lesson, BookLoan, Family } from '@/types'
import { formatDate, getClassroomBadge } from '@/lib/academic'
import { useAcademic } from '@/contexts/AcademicContext'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Calendar,
  ClipboardCheck,
  BookOpen,
  Users,
  Coins,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ArrowRight,
  Sparkles,
  BookMarked,
} from 'lucide-react'

export default function Index() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { classrooms, schoolYear, pedagogicalPlans, loading: academicLoading } = useAcademic()
  const [lessons, setLessons] = useState<Lesson[]>([])
  const [overdueLoans, setOverdueLoans] = useState<BookLoan[]>([])
  const [families, setFamilies] = useState<Family[]>([])
  const [libraryRules, setLibraryRules] = useState({ maxLoansPerChild: 2, loanDurationDays: 7 })
  const [nextLesson, setNextLesson] = useState<Lesson | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!academicLoading) {
      loadDashboardData()
    }
  }, [schoolYear.year, academicLoading])

  const loadDashboardData = async () => {
    try {
      setLoading(true)
      const [allLessons, allLoans, allFamilies, rules] = await Promise.all([
        lessonService.getAll(schoolYear.year),
        libraryService.getAllLoans(),
        familyService.getAll(),
        libraryService.getLibraryRules(),
      ])

      setLibraryRules(rules)

      setLessons(allLessons)
      setFamilies(allFamilies)

      // Encontrar empréstimos atrasados
      const overdues = allLoans.filter((l) => l.status === 'overdue')
      setOverdueLoans(overdues)

      // Encontrar próxima aula agendada (ou primeira aula ativa)
      const scheduled = allLessons.filter((l) => l.status === 'scheduled')
      if (scheduled.length > 0) {
        setNextLesson(scheduled[0])
      } else if (allLessons.length > 0) {
        setNextLesson(allLessons[0])
      }
    } catch (err) {
      console.error('Erro ao carregar dados do painel:', err)
    } finally {
      setLoading(false)
    }
  }

  const totalChildren = families.reduce((acc, f) => acc + (f.children?.length || 0), 0)

  return (
    <div className="space-y-6">
      {/* Boas-vindas e Cabeçalho do Painel */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-gradient-to-r from-sky-600 via-blue-600 to-sky-700 text-white p-6 rounded-2xl shadow-sm">
        <div>
          <div className="flex items-center gap-2 text-amber-300 text-xs font-semibold uppercase tracking-wider mb-1">
            <Sparkles className="h-4 w-4" />
            {academicLoading
              ? 'Evangelização Infantil'
              : `Ano Letivo ${schoolYear.year} • Evangelização Infantil`}
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
            Olá, {user?.name || 'Educador(a)'}!
          </h1>
          <p className="text-sm text-sky-100 mt-1 max-w-2xl">
            Bem-vindo ao sistema de Educação Espírita da CEP-Coligação Espírita Progressista. Aqui
            você acompanha a aula do dia, chamada por sala, empréstimos e moeda DimDim.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            onClick={() => navigate('/presenca')}
            className="bg-amber-400 hover:bg-amber-500 text-slate-950 font-semibold shadow-sm"
          >
            <ClipboardCheck className="h-4 w-4 mr-2" />
            Fazer Chamada
          </Button>
          <Button
            onClick={() => navigate('/familias')}
            variant="outline"
            className="border-white/30 text-white hover:bg-white/15"
          >
            <Users className="h-4 w-4 mr-2" />
            Cadastros
          </Button>
        </div>
      </div>

      {/* Cartões de Indicadores Rápidos */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase">
              Famílias Cadastradas
            </CardTitle>
            <Users className="h-4 w-4 text-indigo-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{families.length}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {totalChildren} crianças distribuídas nas salas A a D
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase">
              Sábados Letivos
            </CardTitle>
            <Calendar className="h-4 w-4 text-sky-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{lessons.length}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {lessons.filter((l) => l.status === 'scheduled').length} aulas agendadas no ano letivo
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase">
              Empréstimos Atrasados
            </CardTitle>
            <AlertTriangle
              className={`h-4 w-4 ${overdueLoans.length > 0 ? 'text-rose-500' : 'text-emerald-500'}`}
            />
          </CardHeader>
          <CardContent>
            <div
              className={`text-2xl font-bold ${overdueLoans.length > 0 ? 'text-rose-600' : 'text-emerald-600'}`}
            >
              {overdueLoans.length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {overdueLoans.length > 0
                ? 'Livros pendentes de devolução'
                : 'Nenhum atraso no acervo'}
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase">
              Moeda Educativa
            </CardTitle>
            <Coins className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">DimDim Ativo</div>
            <p className="text-xs text-muted-foreground mt-1">
              Crédito rápido por presença e tarefas
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Painel Central: Próxima Aula e Plano Pedagógico */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-indigo-100 dark:border-indigo-950 shadow-sm">
            <CardHeader className="bg-indigo-50/50 dark:bg-indigo-950/20 pb-4 border-b border-indigo-100 dark:border-indigo-900/50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge
                    variant="outline"
                    className="bg-indigo-100 text-indigo-800 border-indigo-200"
                  >
                    Sábado Letivo • Aula #{nextLesson?.session_number || 1}
                  </Badge>
                  <span className="text-xs text-muted-foreground font-medium">
                    {formatDate(nextLesson?.date)}
                  </span>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => navigate('/calendario')}
                  className="text-xs text-indigo-600 hover:text-indigo-800"
                >
                  Ver Calendário Completo <ArrowRight className="h-3.5 w-3.5 ml-1" />
                </Button>
              </div>
              <CardTitle className="text-xl font-bold text-slate-900 dark:text-slate-100 mt-2">
                {nextLesson?.central_theme || 'Carregando tema pedagógico...'}
              </CardTitle>
              <CardDescription className="text-xs">
                Bloco Temático:{' '}
                <strong className="text-slate-700 dark:text-slate-300">
                  {nextLesson?.thematic_block || 'Fundamentos Espíritas'}
                </strong>
              </CardDescription>
            </CardHeader>

            <CardContent className="pt-4 space-y-4">
              <div className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                Planos Pedagógicos por Sala:
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {classrooms.map((room) => {
                  const badge = getClassroomBadge(room.id, classrooms)
                  // Procura se a aula do dia tem plano customizado salvo; caso contrário ou se vazio, usa a parametrização do painel
                  const lessonPlan = nextLesson?.plans?.find((p) => p.classroom === room.id)
                  const configuredPlan = pedagogicalPlans[room.id]

                  const displayTitle =
                    configuredPlan?.title ||
                    lessonPlan?.title ||
                    `Linguagem Pedagógica: ${room.name}`
                  const displayActivities =
                    configuredPlan?.activities ||
                    lessonPlan?.approach ||
                    lessonPlan?.objective ||
                    'Atividades lúdicas e reflexivas para a faixa etária.'

                  return (
                    <div
                      key={room.id}
                      className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 shadow-xs hover:border-indigo-200 transition-colors"
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <Badge variant="outline" className={`text-xs font-semibold ${badge.color}`}>
                          {badge.name}
                        </Badge>
                      </div>
                      <h4
                        className="text-xs font-bold text-slate-800 dark:text-slate-100 line-clamp-1"
                        title={displayTitle}
                      >
                        {displayTitle}
                      </h4>
                      <p
                        className="text-xs text-muted-foreground mt-1 line-clamp-2"
                        title={displayActivities}
                      >
                        {displayActivities}
                      </p>
                    </div>
                  )
                })}
              </div>

              <div className="pt-2 flex justify-end">
                <Button
                  onClick={() => navigate('/presenca')}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white w-full sm:w-auto"
                >
                  <ClipboardCheck className="h-4 w-4 mr-2" />
                  Ir para a Chamada deste Sábado
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Atalhos Rápidos Operacionais */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-bold">Atalhos Operacionais</CardTitle>
              <CardDescription className="text-xs">
                Acesso direto às tarefas mais frequentes do dia a dia
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <Button
                  variant="outline"
                  onClick={() => navigate('/familias')}
                  className="h-20 flex flex-col items-center justify-center p-2 text-center hover:border-indigo-300 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/30"
                >
                  <Users className="h-5 w-5 text-indigo-600 mb-1" />
                  <span className="text-xs font-medium">Nova Família</span>
                </Button>

                <Button
                  variant="outline"
                  onClick={() => navigate('/presenca')}
                  className="h-20 flex flex-col items-center justify-center p-2 text-center hover:border-amber-300 hover:bg-amber-50/50 dark:hover:bg-amber-950/30"
                >
                  <ClipboardCheck className="h-5 w-5 text-amber-600 mb-1" />
                  <span className="text-xs font-medium">Chamada Celular</span>
                </Button>

                <Button
                  variant="outline"
                  onClick={() => navigate('/dimdim')}
                  className="h-20 flex flex-col items-center justify-center p-2 text-center hover:border-emerald-300 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/30"
                >
                  <Coins className="h-5 w-5 text-emerald-600 mb-1" />
                  <span className="text-xs font-medium">Lançar DimDim</span>
                </Button>

                <Button
                  variant="outline"
                  onClick={() => navigate('/biblioteca')}
                  className="h-20 flex flex-col items-center justify-center p-2 text-center hover:border-sky-300 hover:bg-sky-50/50 dark:hover:bg-sky-950/30"
                >
                  <BookMarked className="h-5 w-5 text-sky-600 mb-1" />
                  <span className="text-xs font-medium">Empréstimo Livro</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Coluna Lateral: Alertas da Biblioteca e Informações */}
        <div className="space-y-6">
          <Card className="border-rose-100 dark:border-rose-950/50">
            <CardHeader className="pb-3 bg-rose-50/40 dark:bg-rose-950/20 border-b border-rose-100 dark:border-rose-900/50">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-bold flex items-center gap-1.5 text-rose-900 dark:text-rose-200">
                  <AlertTriangle className="h-4 w-4 text-rose-500" />
                  Empréstimos Pendentes
                </CardTitle>
                <Badge
                  variant="outline"
                  className="text-xs bg-rose-100 text-rose-800 border-rose-200"
                >
                  {overdueLoans.length}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="pt-3">
              {overdueLoans.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground text-xs">
                  <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto mb-2" />
                  Todos os livros estão em dia com o prazo de devolução de{' '}
                  {libraryRules.loanDurationDays} dias.
                </div>
              ) : (
                <div className="space-y-3">
                  {overdueLoans.map((loan) => (
                    <div
                      key={loan.id}
                      className="p-3 rounded-lg border border-rose-200 dark:border-rose-900/60 bg-rose-50/30 dark:bg-rose-950/20 text-xs space-y-1"
                    >
                      <div className="font-semibold text-slate-800 dark:text-slate-100">
                        {loan.expand?.copy_id?.expand?.book_id?.title || 'Livro da Biblioteca'}
                      </div>
                      <div className="text-muted-foreground flex items-center justify-between">
                        <span>
                          Criança: <strong>{loan.expand?.child_id?.name || 'Aluno'}</strong>
                        </span>
                        <span className="text-rose-600 font-bold">
                          Venceu {formatDate(loan.due_date)}
                        </span>
                      </div>
                      <div className="pt-1 flex justify-end">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => navigate('/biblioteca')}
                          className="h-6 text-[10px] px-2"
                        >
                          Receber Devolução
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Resumo Pedagógico e Regras */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold flex items-center gap-1.5">
                <BookOpen className="h-4 w-4 text-indigo-600" />
                Diretrizes Pedagógicas
              </CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground space-y-2.5 leading-relaxed">
              <div className="p-2.5 rounded-lg bg-slate-100 dark:bg-slate-900">
                <p className="font-semibold text-slate-800 dark:text-slate-200">
                  Classificação por Idade:
                </p>
                <p>Corte em 1º de março de {academicLoading ? '...' : schoolYear.year}:</p>
                <ul className="list-disc list-inside mt-1 space-y-0.5 text-[11px]">
                  {classrooms.map((c) => (
                    <li key={c.id}>
                      {c.name}: {c.minAge} a {c.maxAge} anos
                    </li>
                  ))}
                </ul>
              </div>

              <div className="p-2.5 rounded-lg bg-slate-100 dark:bg-slate-900">
                <p className="font-semibold text-slate-800 dark:text-slate-200">
                  Regras da Biblioteca:
                </p>
                <p>
                  Até {libraryRules.maxLoansPerChild}{' '}
                  {libraryRules.maxLoansPerChild === 1 ? 'livro simultâneo' : 'livros simultâneos'}{' '}
                  por criança com prazo de {libraryRules.loanDurationDays} dias para devolução.
                </p>
              </div>

              <div className="pt-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate('/manual')}
                  className="w-full text-xs text-sky-700 dark:text-sky-300 border-sky-300 dark:border-sky-800 hover:bg-sky-50 dark:hover:bg-sky-950/40"
                >
                  <BookOpen className="h-3.5 w-3.5 mr-1.5" />
                  Abrir Manual do Sistema
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
