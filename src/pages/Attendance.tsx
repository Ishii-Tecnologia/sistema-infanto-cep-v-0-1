import React, { useEffect, useState } from 'react'
import { lessonService, attendanceService } from '@/services/lessons'
import { childService } from '@/services/families'
import { photoDisplayUrl } from '@/services/photos'
import { Lesson, Child, ClassroomId, AttendanceStatus, Attendance } from '@/types'
import { formatDate, getClassroomBadge } from '@/lib/academic'
import { useAcademic } from '@/contexts/AcademicContext'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  ClipboardCheck,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Calendar,
  Sparkles,
  Save,
  MessageSquare,
  AlertCircle,
  Smartphone,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

export default function AttendancePage() {
  const { toast } = useToast()
  const { classrooms, schoolYear, loading: academicLoading } = useAcademic()
  const [lessons, setLessons] = useState<Lesson[]>([])
  const [selectedLessonId, setSelectedLessonId] = useState<string>('')
  const [selectedClassroom, setSelectedClassroom] = useState<ClassroomId>('A')
  const [children, setChildren] = useState<Child[]>([])
  const [attendances, setAttendances] = useState<
    Record<string, { status: AttendanceStatus; justification: string; notes: string }>
  >({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!academicLoading) {
      loadLessons()
    }
  }, [schoolYear.year, academicLoading])

  const loadLessons = async () => {
    try {
      setLoading(true)
      const data = await lessonService.getAll(schoolYear.year)
      setLessons(data)

      const active = data.find((l) => l.status === 'scheduled')
      if (active) {
        setSelectedLessonId(active.id)
      } else if (data.length > 0) {
        setSelectedLessonId(data[0].id)
      }
    } catch (err) {
      console.error('Erro ao carregar aulas:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (selectedLessonId && selectedClassroom) {
      loadClassroomAttendance()
    }
  }, [selectedLessonId, selectedClassroom])

  const loadClassroomAttendance = async () => {
    try {
      setLoading(true)
      const [classChildren, existingAttendances] = await Promise.all([
        childService.getAll(selectedClassroom),
        attendanceService.getByLessonAndClassroom(selectedLessonId, selectedClassroom),
      ])

      setChildren(classChildren)

      // Mapeia registros existentes
      const attMap: Record<
        string,
        { status: AttendanceStatus; justification: string; notes: string }
      > = {}

      for (const att of existingAttendances) {
        attMap[att.child_id] = {
          status: att.status,
          justification: att.justification || '',
          notes: att.notes || '',
        }
      }

      // Para crianças sem chamada ainda, padrão inicial é não definido ou presente ao tocar
      for (const c of classChildren) {
        if (!attMap[c.id]) {
          attMap[c.id] = {
            status: 'present',
            justification: '',
            notes: '',
          }
        }
      }

      setAttendances(attMap)
    } catch (err) {
      console.error('Erro ao carregar chamada:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleStatusChange = (childId: string, status: AttendanceStatus) => {
    setAttendances((prev) => ({
      ...prev,
      [childId]: {
        ...prev[childId],
        status,
      },
    }))
  }

  const handleNotesChange = (childId: string, notes: string) => {
    setAttendances((prev) => ({
      ...prev,
      [childId]: {
        ...prev[childId],
        notes,
      },
    }))
  }

  const handleJustificationChange = (childId: string, justification: string) => {
    setAttendances((prev) => ({
      ...prev,
      [childId]: {
        ...prev[childId],
        justification,
      },
    }))
  }

  const handleSaveAttendance = async () => {
    if (!selectedLessonId) return

    try {
      setSaving(true)
      const payload = children.map((c) => {
        const att = attendances[c.id] || { status: 'present', justification: '', notes: '' }
        return {
          lessonId: selectedLessonId,
          childId: c.id,
          classroom: selectedClassroom,
          status: att.status,
          justification: att.justification,
          notes: att.notes,
        }
      })

      await attendanceService.bulkSaveAttendances(payload)
      toast({
        title: 'Chamada salva no servidor!',
        description: `Presenças da Sala ${selectedClassroom} gravadas com sucesso.`,
      })
    } catch (err: any) {
      toast({
        title: 'Erro ao salvar chamada',
        description: err?.message || 'Ocorreu uma falha na gravação.',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  const currentLesson = lessons.find((l) => l.id === selectedLessonId)
  const currentPlan = currentLesson?.plans?.find((p) => p.classroom === selectedClassroom)
  const classroomBadge = getClassroomBadge(selectedClassroom, classrooms)

  // Estatísticas rápidas
  const countPresent = Object.values(attendances).filter((a) => a.status === 'present').length
  const countAbsent = Object.values(attendances).filter((a) => a.status === 'absent').length
  const countJustified = Object.values(attendances).filter((a) => a.status === 'justified').length

  return (
    <div className="space-y-4 max-w-3xl mx-auto">
      {/* Cabeçalho da Chamada */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="flex items-center gap-1.5 text-xs text-indigo-600 dark:text-indigo-400 font-semibold uppercase tracking-wider mb-0.5">
            <Smartphone className="h-4 w-4" /> Chamada no Celular • Salvamento Direto
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Registro de Presença
          </h1>
        </div>

        <Button
          onClick={handleSaveAttendance}
          disabled={saving}
          className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm w-full sm:w-auto"
        >
          <Save className="h-4 w-4 mr-2" />
          {saving ? 'Gravando...' : 'Salvar Chamada'}
        </Button>
      </div>

      {/* Seletores de Data da Aula e Sala */}
      <Card className="border-indigo-100 dark:border-indigo-950">
        <CardContent className="p-3 sm:p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="text-xs font-semibold">Sábado Letivo</Label>
            <Select value={selectedLessonId} onValueChange={setSelectedLessonId}>
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder="Selecione o sábado" />
              </SelectTrigger>
              <SelectContent>
                {lessons.map((l) => (
                  <SelectItem key={l.id} value={l.id} className="text-xs">
                    #{l.session_number} • {formatDate(l.date)} - {l.central_theme}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label className="text-xs font-semibold">Turma / Sala</Label>
            <Select
              value={selectedClassroom}
              onValueChange={(val) => setSelectedClassroom(val as ClassroomId)}
            >
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder="Selecione a sala" />
              </SelectTrigger>
              <SelectContent>
                {classrooms.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name} ({c.minAge} a {c.maxAge} anos)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Cabeçalho Pedagógico da Sala */}
      {currentLesson && (
        <Card className="bg-gradient-to-r from-slate-900 to-indigo-950 text-white border-0 shadow-sm">
          <CardContent className="p-4 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <Badge
                variant="outline"
                className={`font-semibold border-white/20 text-white ${classroomBadge.color}`}
              >
                {classroomBadge.name}
              </Badge>
              <span className="text-sky-200">
                Data: <strong>{formatDate(currentLesson.date)}</strong>
              </span>
            </div>

            <div>
              <p className="text-xs text-sky-200 uppercase font-semibold">
                Tema Central do Sábado:
              </p>
              <h2 className="text-base sm:text-lg font-bold text-white leading-tight">
                {currentLesson.central_theme}
              </h2>
            </div>

            {currentPlan && (
              <div className="pt-1.5 border-t border-white/10 text-xs text-sky-100 flex items-center justify-between">
                <span className="truncate">
                  Plano da Sala: <strong>{currentPlan.title}</strong>
                </span>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Barra de Totais da Chamada */}
      <div className="grid grid-cols-3 gap-2 text-center text-xs">
        <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 text-emerald-800 dark:text-emerald-200 font-semibold">
          {countPresent} Presente(s)
        </div>
        <div className="p-2 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 text-rose-800 dark:text-rose-200 font-semibold">
          {countAbsent} Ausente(s)
        </div>
        <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 text-amber-800 dark:text-amber-200 font-semibold">
          {countJustified} Justificada(s)
        </div>
      </div>

      {/* Lista de Alunos para Chamada Otimizada para Celular */}
      <div className="space-y-3">
        {children.map((child) => {
          const att = attendances[child.id] || { status: 'present', justification: '', notes: '' }

          return (
            <Card
              key={child.id}
              className={`transition-all border-l-4 ${
                att.status === 'present'
                  ? 'border-l-emerald-500 bg-white dark:bg-slate-900'
                  : att.status === 'absent'
                    ? 'border-l-rose-500 bg-rose-50/10 dark:bg-slate-900'
                    : 'border-l-amber-500 bg-amber-50/10 dark:bg-slate-900'
              }`}
            >
              <CardContent className="p-3.5 space-y-3">
                {/* Linha da Criança: Foto, Nome e Alergias */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2.5">
                    <div className="h-10 w-10 rounded-full overflow-hidden bg-slate-200 shrink-0">
                      {photoDisplayUrl(child) ? (
                        <img
                          src={photoDisplayUrl(child)!}
                          alt={child.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center font-bold text-slate-600 text-xs">
                          {child.name.slice(0, 2).toUpperCase()}
                        </div>
                      )}
                    </div>

                    <div>
                      <p className="font-bold text-sm text-slate-900 dark:text-slate-100 leading-tight">
                        {child.name}
                      </p>
                      {child.allergies ? (
                        <p className="text-[11px] text-rose-600 font-semibold flex items-center gap-1 mt-0.5">
                          <AlertCircle className="h-3 w-3" /> Alergia: {child.allergies}
                        </p>
                      ) : (
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          Saldo: <strong>{child.dimdim_balance || 0} DimDim</strong>
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Botões de Presença Grandes (Otimizados para toque no celular) */}
                <div className="grid grid-cols-3 gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant={att.status === 'present' ? 'default' : 'outline'}
                    onClick={() => handleStatusChange(child.id, 'present')}
                    className={`h-11 text-xs font-semibold flex items-center justify-center gap-1.5 ${
                      att.status === 'present'
                        ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs'
                        : 'border-slate-200 hover:bg-emerald-50 hover:text-emerald-700'
                    }`}
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    Presente
                  </Button>

                  <Button
                    type="button"
                    size="sm"
                    variant={att.status === 'absent' ? 'default' : 'outline'}
                    onClick={() => handleStatusChange(child.id, 'absent')}
                    className={`h-11 text-xs font-semibold flex items-center justify-center gap-1.5 ${
                      att.status === 'absent'
                        ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-xs'
                        : 'border-slate-200 hover:bg-rose-50 hover:text-rose-700'
                    }`}
                  >
                    <XCircle className="h-4 w-4" />
                    Ausente
                  </Button>

                  <Button
                    type="button"
                    size="sm"
                    variant={att.status === 'justified' ? 'default' : 'outline'}
                    onClick={() => handleStatusChange(child.id, 'justified')}
                    className={`h-11 text-xs font-semibold flex items-center justify-center gap-1.5 ${
                      att.status === 'justified'
                        ? 'bg-amber-600 hover:bg-amber-700 text-white shadow-xs'
                        : 'border-slate-200 hover:bg-amber-50 hover:text-amber-700'
                    }`}
                  >
                    <HelpCircle className="h-4 w-4" />
                    Justificada
                  </Button>
                </div>

                {/* Campo de Justificativa se ausência for justificada */}
                {att.status === 'justified' && (
                  <div className="space-y-1 pt-1">
                    <Label className="text-[11px] text-amber-800 dark:text-amber-300">
                      Motivo da Justificativa
                    </Label>
                    <Input
                      placeholder="Ex: Viagem com a família, atestado médico..."
                      value={att.justification}
                      onChange={(e) => handleJustificationChange(child.id, e.target.value)}
                      className="text-xs h-8"
                    />
                  </div>
                )}

                {/* Campo de Observação Pedagógica vinculada à criança e aula */}
                <div className="space-y-1 pt-1">
                  <Label className="text-[11px] text-muted-foreground flex items-center gap-1">
                    <MessageSquare className="h-3 w-3" /> Observação do aluno neste sábado:
                  </Label>
                  <Input
                    placeholder="Ex: Muito participativo, ajudou os colegas, esqueceu a apostila..."
                    value={att.notes}
                    onChange={(e) => handleNotesChange(child.id, e.target.value)}
                    className="text-xs h-8"
                  />
                </div>
              </CardContent>
            </Card>
          )
        })}

        {children.length === 0 && !loading && (
          <div className="p-8 text-center text-muted-foreground bg-white dark:bg-slate-900 rounded-xl border">
            <ClipboardCheck className="h-8 w-8 mx-auto text-slate-400 mb-2" />
            <p className="text-xs font-medium">
              Nenhuma criança matriculada na Sala {selectedClassroom}.
            </p>
          </div>
        )}
      </div>

      {/* Botão de Rodapé Flutuante ou Fixo para Salvar */}
      <div className="pt-2 sticky bottom-4">
        <Button
          onClick={handleSaveAttendance}
          disabled={saving}
          className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-12 shadow-lg"
        >
          <Save className="h-5 w-5 mr-2" />
          {saving
            ? 'Gravando presenças no servidor...'
            : `Salvar Chamada da ${classrooms.find((c) => c.id === selectedClassroom)?.name || `Sala ${selectedClassroom}`}`}
        </Button>
      </div>
    </div>
  )
}
