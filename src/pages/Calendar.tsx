import React, { useEffect, useState } from 'react'
import { lessonService } from '@/services/lessons'
import { schoolYearService } from '@/services/schoolYear'
import { Lesson, LessonPlan, ClassroomId, AnoLetivo, SabadoLetivo } from '@/types'
import { formatDate, getClassroomBadge } from '@/lib/academic'
import { useAcademic } from '@/contexts/AcademicContext'
import { Link } from 'react-router-dom'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Calendar, BookOpen, AlertCircle, Sliders, Settings2 } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

export default function CalendarPage() {
  const { toast } = useToast()
  const {
    classrooms,
    saveClassrooms,
    schoolYear,
    activeAnoLetivo,
    anosLetivos,
    loading: academicLoading,
  } = useAcademic()
  const [selectedYearNum, setSelectedYearNum] = useState<number>(schoolYear.year || 2026)
  const [currentAnoLetivo, setCurrentAnoLetivo] = useState<AnoLetivo | null>(activeAnoLetivo)
  const [sabadosLetivos, setSabadosLetivos] = useState<SabadoLetivo[]>([])
  const [lessons, setLessons] = useState<Lesson[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null)

  // Modal de Visualização/Edição de Plano Pedagógico (visualização com planos por sala)
  const [viewingPlan, setViewingPlan] = useState<LessonPlan | null>(null)

  // Modal de Configuração das Salas (Nome e Faixa Etária)
  const [classroomsModalOpen, setClassroomsModalOpen] = useState(false)
  const [editingClassrooms, setEditingClassrooms] = useState(classrooms)
  const [savingClassrooms, setSavingClassrooms] = useState(false)

  useEffect(() => {
    setEditingClassrooms(classrooms)
  }, [classrooms])

  useEffect(() => {
    if (activeAnoLetivo) {
      setSelectedYearNum(activeAnoLetivo.ano)
      setCurrentAnoLetivo(activeAnoLetivo)
    } else if (schoolYear.year) {
      setSelectedYearNum(schoolYear.year)
    }
  }, [activeAnoLetivo, schoolYear.year])

  useEffect(() => {
    if (!academicLoading && selectedYearNum) {
      loadYearData(selectedYearNum)
    }
  }, [selectedYearNum, academicLoading])

  const loadYearData = async (anoNum: number) => {
    try {
      setLoading(true)
      // 1. Busca ano_letivo pelo ano
      const anoRec = await schoolYearService.getByAno(anoNum)
      setCurrentAnoLetivo(anoRec)

      let sabs: SabadoLetivo[] = []
      if (anoRec) {
        sabs = await schoolYearService.getSabados(anoRec.id)
      }
      setSabadosLetivos(sabs)

      // 2. Busca aulas (lessons) correspondentes
      const data = await lessonService.getAll(anoNum)
      setLessons(data)
      if (data.length > 0) {
        setSelectedLesson(data[0])
      } else {
        setSelectedLesson(null)
      }
    } catch (err) {
      console.error('Erro ao carregar calendário do ano:', err)
      toast({
        title: 'Erro ao carregar calendário',
        description: 'Não foi possível carregar os sábados letivos do ano selecionado.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleOpenClassroomsModal = () => {
    setEditingClassrooms(JSON.parse(JSON.stringify(classrooms)))
    setClassroomsModalOpen(true)
  }

  const handleSaveClassrooms = async () => {
    try {
      setSavingClassrooms(true)
      await saveClassrooms(editingClassrooms)
      toast({
        title: 'Configurações de salas salvas!',
        description:
          'Os novos nomes/rótulos e faixas etárias foram atualizados no Sistema Infanto-CEP.',
      })
      setClassroomsModalOpen(false)
    } catch (err: any) {
      toast({
        title: 'Erro ao salvar salas',
        description: err?.message || 'Falha ao salvar novas configurações.',
        variant: 'destructive',
      })
    } finally {
      setSavingClassrooms(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              Calendário e Matriz Pedagógica
            </h1>
            {currentAnoLetivo?.replicado_de && (
              <Badge
                variant="outline"
                className="bg-amber-50 text-amber-700 border-amber-200 text-xs font-normal"
              >
                herdado de{' '}
                {anosLetivos.find((a) => a.id === currentAnoLetivo.replicado_de)?.ano ||
                  'ano anterior'}
              </Badge>
            )}
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            {academicLoading
              ? 'Sábados letivos do ano, excluindo feriados e com planos por sala.'
              : `${lessons.length > 0 ? `${lessons.length} Sábados` : 'Sábados'} letivos de ${selectedYearNum}, derivados da fonte única de verdade.`}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Seletor de Ano Letivo no topo */}
          <div className="flex items-center gap-1.5 bg-white dark:bg-slate-900 border rounded-lg px-2 py-1 shadow-xs">
            <Calendar className="h-3.5 w-3.5 text-indigo-600 shrink-0" />
            <span className="text-xs text-muted-foreground font-medium">Ano:</span>
            <Select
              value={String(selectedYearNum)}
              onValueChange={(val) => setSelectedYearNum(parseInt(val, 10))}
            >
              <SelectTrigger className="h-8 border-0 shadow-none text-xs font-bold w-[120px] focus:ring-0">
                <SelectValue placeholder="Ano Letivo" />
              </SelectTrigger>
              <SelectContent>
                {anosLetivos.map((a) => (
                  <SelectItem key={a.id} value={String(a.ano)}>
                    {a.ano} {a.status === 'ativo' ? '• Ativo' : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={handleOpenClassroomsModal}
            className="h-9 text-xs border-indigo-200 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/40"
          >
            <Sliders className="h-3.5 w-3.5 mr-1.5 text-indigo-600" />
            Configurar Salas
          </Button>

          <Badge
            variant="outline"
            className="bg-indigo-50 text-indigo-700 border-indigo-200 text-xs py-1.5 px-3"
          >
            Ano Letivo {selectedYearNum} • {lessons.length} Sábados
          </Badge>
        </div>
      </div>

      {/* Estado Vazio Explícito: se o ano não tiver sábados cadastrados */}
      {!loading && lessons.length === 0 && sabadosLetivos.length === 0 ? (
        <Card className="p-8 sm:p-12 text-center space-y-4 border-dashed bg-slate-50/50 dark:bg-slate-900/20">
          <div className="mx-auto w-12 h-12 rounded-full bg-indigo-100 dark:bg-indigo-950/60 flex items-center justify-center text-indigo-600">
            <Calendar className="h-6 w-6" />
          </div>
          <div className="max-w-md mx-auto space-y-1">
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
              Nenhum sábado letivo para o ano {selectedYearNum}
            </h3>
            <p className="text-xs text-muted-foreground">
              O ano letivo selecionado ainda não possui sábados gerados na fonte única de verdade.
              Configure as datas institucionais ou replique do ano anterior.
            </p>
          </div>
          <div className="pt-2">
            <Button asChild className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs">
              <Link to="/settings">
                <Settings2 className="h-3.5 w-3.5 mr-1.5" />
                Configurar em Ano Letivo {selectedYearNum}
              </Link>
            </Button>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Coluna da Esquerda: Lista de Sábados do Ano (Read-Only) */}
          <div className="lg:col-span-5 space-y-3">
            <Card className="h-[700px] flex flex-col">
              <CardHeader className="p-4 border-b">
                <CardTitle className="text-sm font-bold flex items-center justify-between">
                  <span>Lista de Sábados Letivos</span>
                  <span className="text-xs text-muted-foreground font-normal">
                    {lessons.length > 0 ? lessons.length : sabadosLetivos.length} encontros
                  </span>
                </CardTitle>
              </CardHeader>

              <CardContent className="p-2 flex-1 overflow-y-auto space-y-1.5">
                {lessons.map((lesson) => {
                  const isSelected = selectedLesson?.id === lesson.id
                  const isCanceled = lesson.status === 'canceled'

                  return (
                    <div
                      key={lesson.id}
                      onClick={() => setSelectedLesson(lesson)}
                      className={`p-3 rounded-lg border text-xs cursor-pointer transition-all ${
                        isSelected
                          ? 'border-indigo-500 bg-indigo-50/60 dark:bg-indigo-950/40 shadow-xs'
                          : 'border-slate-200 dark:border-slate-800 hover:border-indigo-200'
                      } ${isCanceled ? 'opacity-60 bg-slate-50 dark:bg-slate-900/30' : ''}`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 dark:text-slate-100">
                            #{lesson.session_number} • {formatDate(lesson.date)}
                          </span>
                        </div>

                        {isCanceled ? (
                          <Badge
                            variant="outline"
                            className="text-[10px] bg-rose-50 text-rose-700 border-rose-200"
                          >
                            Cancelada
                          </Badge>
                        ) : (
                          <Badge
                            variant="outline"
                            className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200"
                          >
                            Agendada
                          </Badge>
                        )}
                      </div>

                      <p className="font-semibold text-slate-800 dark:text-slate-200 line-clamp-1">
                        {lesson.central_theme}
                      </p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        Bloco: {lesson.thematic_block}
                      </p>
                    </div>
                  )
                })}
              </CardContent>
            </Card>
          </div>

          {/* Coluna da Direita: Detalhe do Sábado e Planos por Sala */}
          <div className="lg:col-span-7 space-y-4">
            {selectedLesson ? (
              <div className="space-y-4">
                <Card className="border-indigo-100 dark:border-indigo-950 shadow-sm">
                  <CardHeader className="bg-indigo-50/40 dark:bg-indigo-950/20 pb-4 border-b">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Badge className="bg-indigo-600 text-white text-xs">
                          Aula #{selectedLesson.session_number}
                        </Badge>
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                          {formatDate(selectedLesson.date)}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        {selectedLesson.status === 'canceled' ? (
                          <Badge
                            variant="outline"
                            className="text-xs bg-rose-50 text-rose-700 border-rose-200"
                          >
                            Aula Cancelada
                          </Badge>
                        ) : (
                          <Badge
                            variant="outline"
                            className="text-xs bg-emerald-50 text-emerald-700 border-emerald-200"
                          >
                            Aula Agendada
                          </Badge>
                        )}
                        <Button
                          asChild
                          size="sm"
                          variant="outline"
                          className="h-8 text-xs border-indigo-200 text-indigo-700 hover:bg-indigo-50"
                        >
                          <Link to="/settings">
                            <Settings2 className="h-3.5 w-3.5 mr-1 text-indigo-600" />
                            Gerenciar em Configurações
                          </Link>
                        </Button>
                      </div>
                    </div>

                    <CardTitle className="text-xl font-bold mt-2">
                      {selectedLesson.central_theme}
                    </CardTitle>
                    <CardDescription className="text-xs text-slate-600 dark:text-slate-400">
                      Bloco Temático: <strong>{selectedLesson.thematic_block}</strong>
                    </CardDescription>

                    {selectedLesson.status === 'canceled' && (
                      <div className="mt-2 p-2 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 rounded text-xs text-rose-800 dark:text-rose-200 flex items-center gap-1.5">
                        <AlertCircle className="h-4 w-4 shrink-0" />
                        <span>
                          <strong>Aula cancelada:</strong>{' '}
                          {selectedLesson.cancel_reason || 'Motivo não informado'}. Os planos
                          permanecem salvos como histórico.
                        </span>
                      </div>
                    )}
                  </CardHeader>

                  <CardContent className="p-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                        <BookOpen className="h-4 w-4 text-indigo-600" />
                        Planos de Aula por Sala (A, B, C e D)
                      </h3>
                    </div>

                    {/* Abas com planos pedagógicos de cada sala */}
                    <Tabs defaultValue="A" className="w-full">
                      <TabsList className="grid grid-cols-4 w-full">
                        {(['A', 'B', 'C', 'D'] as ClassroomId[]).map((cId) => {
                          const room = classrooms.find((c) => c.id === cId)
                          return (
                            <TabsTrigger key={cId} value={cId} className="truncate text-xs px-1">
                              {room?.name || `Sala ${cId}`}
                            </TabsTrigger>
                          )
                        })}
                      </TabsList>

                      {(['A', 'B', 'C', 'D'] as ClassroomId[]).map((cId) => {
                        const plan = (selectedLesson.plans || []).find((p) => p.classroom === cId)
                        const badge = getClassroomBadge(cId, classrooms)

                        return (
                          <TabsContent key={cId} value={cId} className="pt-3 space-y-3">
                            {plan ? (
                              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-3 text-xs">
                                <div className="flex items-center justify-between">
                                  <Badge
                                    variant="outline"
                                    className={`font-semibold ${badge.color}`}
                                  >
                                    {badge.name}
                                  </Badge>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => setViewingPlan(plan)}
                                    className="h-7 text-xs text-indigo-600 hover:text-indigo-800"
                                  >
                                    <BookOpen className="h-3.5 w-3.5 mr-1" />
                                    Visualizar Detalhes
                                  </Button>
                                </div>

                                <div>
                                  <span className="text-[11px] font-semibold text-muted-foreground uppercase">
                                    Título da Aula
                                  </span>
                                  <p className="font-bold text-sm text-slate-900 dark:text-slate-100 mt-0.5">
                                    {plan.title}
                                  </p>
                                </div>

                                <div>
                                  <span className="text-[11px] font-semibold text-muted-foreground uppercase">
                                    Objetivo Pedagógico
                                  </span>
                                  <p className="text-slate-700 dark:text-slate-300 mt-0.5">
                                    {plan.objective || 'Não preenchido'}
                                  </p>
                                </div>

                                <div>
                                  <span className="text-[11px] font-semibold text-muted-foreground uppercase">
                                    Abordagem Metodológica
                                  </span>
                                  <p className="text-slate-700 dark:text-slate-300 mt-0.5">
                                    {plan.approach || 'Não preenchido'}
                                  </p>
                                </div>

                                <div>
                                  <span className="text-[11px] font-semibold text-muted-foreground uppercase">
                                    Recursos e Materiais
                                  </span>
                                  <p className="text-slate-700 dark:text-slate-300 mt-0.5">
                                    {plan.materials || 'Não preenchido'}
                                  </p>
                                </div>
                              </div>
                            ) : (
                              <div className="p-6 text-center text-muted-foreground text-xs">
                                Nenhum plano cadastrado para a {badge.name}.
                              </div>
                            )}
                          </TabsContent>
                        )
                      })}
                    </Tabs>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <Card className="p-8 text-center text-muted-foreground text-xs">
                Selecione um sábado letivo à esquerda para visualizar seu tema e planos de aula.
              </Card>
            )}
          </div>
        </div>
      )}

      {/* Modal: Visualizar Plano Pedagógico da Aula (Read-Only) */}
      <Dialog open={!!viewingPlan} onOpenChange={(open) => !open && setViewingPlan(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              Plano de Aula —{' '}
              {classrooms.find((c) => c.id === viewingPlan?.classroom)?.name ||
                `Sala ${viewingPlan?.classroom}`}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Visualização pedagógica da atividade programada. Para editar temas, blocos ou sábados,
              acesse a ficha de configuração em Operadores e Configurações.
            </DialogDescription>
          </DialogHeader>

          <div className="py-2 space-y-3 text-xs">
            <div className="space-y-1">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase">
                Título da Aula
              </span>
              <p className="font-bold text-sm text-slate-900 dark:text-slate-100">
                {viewingPlan?.title || 'Sem título cadastrado'}
              </p>
            </div>

            <div className="space-y-1">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase">
                Objetivo Pedagógico
              </span>
              <p className="text-slate-700 dark:text-slate-300 leading-relaxed bg-slate-50 dark:bg-slate-900 p-2.5 rounded border">
                {viewingPlan?.objective || 'Não preenchido'}
              </p>
            </div>

            <div className="space-y-1">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase">
                Abordagem / Dinâmica da Sala
              </span>
              <p className="text-slate-700 dark:text-slate-300 leading-relaxed bg-slate-50 dark:bg-slate-900 p-2.5 rounded border">
                {viewingPlan?.approach || 'Não preenchido'}
              </p>
            </div>

            <div className="space-y-1">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase">
                Recursos e Materiais
              </span>
              <p className="text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-900 p-2.5 rounded border">
                {viewingPlan?.materials || 'Não preenchido'}
              </p>
            </div>
          </div>

          <DialogFooter className="flex justify-between items-center sm:justify-between w-full">
            <Button
              asChild
              variant="outline"
              size="sm"
              className="text-xs border-indigo-200 text-indigo-700"
            >
              <Link to="/settings">
                <Settings2 className="h-3.5 w-3.5 mr-1" />
                Ir para Configurações
              </Link>
            </Button>
            <Button
              size="sm"
              onClick={() => setViewingPlan(null)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal: Configurações de Salas (Nomes e Faixas Etárias Editáveis) */}
      <Dialog open={classroomsModalOpen} onOpenChange={setClassroomsModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-indigo-700 dark:text-indigo-300">
              <Sliders className="h-5 w-5" />
              Configuração das Salas e Faixas Etárias
            </DialogTitle>
            <DialogDescription className="text-xs">
              Ajuste os nomes/rótulos das salas (ex: <em>Sala D (Responsáveis)</em>) e as idades
              mínima e máxima de cada turma. A classificação automática das crianças em 1º de março
              passará a seguir essas novas faixas configuradas.
            </DialogDescription>
          </DialogHeader>

          <div className="py-3 space-y-4 text-xs">
            <div className="p-3 bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-900 rounded-lg text-indigo-900 dark:text-indigo-200">
              <p className="font-semibold text-xs mb-1">Regra Institucional:</p>
              <p className="text-[11px] leading-relaxed">
                As crianças continuam sendo classificadas com base na idade completa até a data de
                corte (1º de março). Ao alterar as idades de cada sala, novos cadastros e a
                visualização dos crachás adotarão imediatamente os rótulos configurados.
              </p>
            </div>

            <div className="space-y-3">
              {editingClassrooms.map((room, idx) => (
                <Card key={room.id} className="p-3.5 border border-slate-200 dark:border-slate-800">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Badge className="bg-indigo-600 text-white font-bold text-xs">
                        ID: {room.id}
                      </Badge>
                      <span className="font-bold text-slate-800 dark:text-slate-200 text-sm">
                        {room.name}
                      </span>
                    </div>
                    <span className="text-[11px] text-muted-foreground">
                      Faixa atual: {room.minAge} a {room.maxAge} anos
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="sm:col-span-2 space-y-1">
                      <Label className="text-xs">
                        Nome / Rótulo da Sala (ex: Sala D (Responsáveis))
                      </Label>
                      <Input
                        value={room.name}
                        onChange={(e) => {
                          const updated = [...editingClassrooms]
                          updated[idx] = { ...updated[idx], name: e.target.value }
                          setEditingClassrooms(updated)
                        }}
                        placeholder={`Nome da Sala ${room.id}`}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label className="text-xs">Idade Mín.</Label>
                        <Input
                          type="number"
                          min={0}
                          max={99}
                          value={room.minAge}
                          onChange={(e) => {
                            const val = parseInt(e.target.value, 10) || 0
                            const updated = [...editingClassrooms]
                            updated[idx] = { ...updated[idx], minAge: val }
                            setEditingClassrooms(updated)
                          }}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Idade Máx.</Label>
                        <Input
                          type="number"
                          min={0}
                          max={99}
                          value={room.maxAge}
                          onChange={(e) => {
                            const val = parseInt(e.target.value, 10) || 0
                            const updated = [...editingClassrooms]
                            updated[idx] = { ...updated[idx], maxAge: val }
                            setEditingClassrooms(updated)
                          }}
                        />
                      </div>
                    </div>

                    <div className="sm:col-span-3 space-y-1">
                      <Label className="text-[11px] text-muted-foreground">
                        Descrição pedagógica da turma
                      </Label>
                      <Input
                        value={room.description || ''}
                        onChange={(e) => {
                          const updated = [...editingClassrooms]
                          updated[idx] = { ...updated[idx], description: e.target.value }
                          setEditingClassrooms(updated)
                        }}
                        placeholder="Ex: Maternal e Jardim (3 a 5 anos completos até 01/03)"
                      />
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setClassroomsModalOpen(false)}
              disabled={savingClassrooms}
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={handleSaveClassrooms}
              disabled={savingClassrooms}
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              {savingClassrooms ? 'Salvando...' : 'Salvar Configurações de Salas'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
