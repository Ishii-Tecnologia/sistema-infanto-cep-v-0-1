import React, { useEffect, useState } from 'react'
import { settingsService } from '@/services/settings'
import { auditLogService } from '@/services/auditLogs'
import { User, UserRole } from '@/types'
import { useAuth } from '@/contexts/AuthContext'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  KeyRound,
  UserPlus,
  Calendar,
  BookOpen,
  Coins,
  Trash2,
  AlertTriangle,
  ShieldCheck,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { ChangePasswordDialog } from '@/components/ChangePasswordDialog'

import { useAcademic, SchoolYearConfig, RecessSaturday } from '@/contexts/AcademicContext'
import { formatDate } from '@/lib/academic'
import { syncOrRegenerateCalendar } from '@/services/calendarGenerator'
import { schoolYearService } from '@/services/schoolYear'
import { AnoLetivo, SabadoLetivo, JanelaFeriado, Lesson } from '@/types'
import { DatePickerBR } from '@/components/DatePickerBR'
import pb from '@/lib/pocketbase/client'
import { getErrorMessage, isAuthExpiredError } from '@/lib/pocketbase/errors'
import { useNavigate } from 'react-router-dom'
import { Plus, X, Sliders, RefreshCw, Copy, CheckCircle2, AlertCircle, Pencil } from 'lucide-react'

export default function SettingsPage() {
  const { toast } = useToast()
  const navigate = useNavigate()
  const { user: currentUser } = useAuth()
  const {
    classrooms,
    schoolYear,
    activeAnoLetivo,
    anosLetivos,
    recessSaturdays: academicRecesses,
    pedagogicalPlans,
    reloadSettings,
    saveClassrooms,
    savePedagogicalPlans,
    saveSchoolYearAndRecesses,
  } = useAcademic()

  const [users, setUsers] = useState<User[]>([])
  const [settings, setSettings] = useState<Record<string, any>>({})
  const [loading, setLoading] = useState(true)

  // Modal de Novo Operador
  const [userModalOpen, setUserModalOpen] = useState(false)
  const emptyUserForm: { name: string; email: string; role: UserRole; password: string } = {
    name: '',
    email: '',
    role: 'professor',
    password: '',
  }
  const [userForm, setUserForm] = useState<{
    name: string
    email: string
    role: UserRole
    password: string
  }>(emptyUserForm)
  const [userConfirmPassword, setUserConfirmPassword] = useState('')

  // Abre o modal de criação sempre com o formulário limpo
  const openCreateUserModal = () => {
    setUserForm(emptyUserForm)
    setUserConfirmPassword('')
    setUserModalOpen(true)
  }

  const handleUserModalOpenChange = (open: boolean) => {
    if (!open) {
      setUserForm(emptyUserForm)
      setUserConfirmPassword('')
    }
    setUserModalOpen(open)
  }

  // Modal de Redefinição de Senha
  const [resetModalOpen, setResetModalOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [newPassword, setNewPassword] = useState('Skip@Pass')
  const [confirmNewPassword, setConfirmNewPassword] = useState('')

  // Modal de Alteração da Própria Senha
  const [ownPasswordModalOpen, setOwnPasswordModalOpen] = useState(false)

  // Modal de Exclusão de Operador
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [userToDelete, setUserToDelete] = useState<User | null>(null)
  const [deleting, setDeleting] = useState(false)

  // Configurações editáveis
  const [rulesLibrary, setRulesLibrary] = useState({
    maxLoansPerChild: 2,
    loanDurationDays: 7,
  })

  const [rulesDimDim, setRulesDimDim] = useState({
    attendanceReward: 10,
    taskReward: 5,
    goodBehaviorReward: 5,
    defaultRewardCost: 20,
  })

  // Edição de Ano Letivo e Feriados (Fonte Única de Verdade)
  const [selectedYearNum, setSelectedYearNum] = useState<number>(schoolYear.year || 2026)
  const [selectedAnoLetivoRecord, setSelectedAnoLetivoRecord] = useState<AnoLetivo | null>(
    activeAnoLetivo,
  )
  const [yearForm, setYearForm] = useState<SchoolYearConfig>(schoolYear)
  const [recessList, setRecessList] = useState<RecessSaturday[]>(academicRecesses)
  const [sabadosDoAno, setSabadosDoAno] = useState<SabadoLetivo[]>([])
  const [janelasDoAno, setJanelasDoAno] = useState<JanelaFeriado[]>([])
  const [newRecessDate, setNewRecessDate] = useState('')
  const [newRecessName, setNewRecessName] = useState('')
  const [savingYear, setSavingYear] = useState(false)
  const [syncingCalendar, setSyncingCalendar] = useState(false)
  const [replicating, setReplicating] = useState(false)

  // Modal de Alteração de Janela de Feriado / Recesso
  const [editJanelaModalOpen, setEditJanelaModalOpen] = useState(false)
  const [editingJanelaId, setEditingJanelaId] = useState<string | null>(null)
  const [editingJanelaIndex, setEditingJanelaIndex] = useState<number | null>(null)
  const [editJanelaNome, setEditJanelaNome] = useState('')
  const [editJanelaStart, setEditJanelaStart] = useState('')
  const [editJanelaEnd, setEditJanelaEnd] = useState('')
  const [savingEditJanela, setSavingEditJanela] = useState(false)

  // Modal de Confirmação de Exclusão de Janela de Feriado / Recesso
  const [deleteRecessModalOpen, setDeleteRecessModalOpen] = useState(false)
  const [recessToDeleteIndex, setRecessToDeleteIndex] = useState<number | null>(null)
  const [deletingRecess, setDeletingRecess] = useState(false)

  // Guarda de permissão para Admin e Dirigente
  const canManage = currentUser?.role === 'admin' || currentUser?.role === 'dirigente'

  // Modal para criar novo ano letivo
  const [newYearModalOpen, setNewYearModalOpen] = useState(false)
  const [newYearInput, setNewYearInput] = useState<number>(new Date().getFullYear() + 1)

  // Edição de Salas no Settings
  const [editingRooms, setEditingRooms] = useState(classrooms)
  const [savingRooms, setSavingRooms] = useState(false)

  // Edição de Planos Pedagógicos por Sala
  const [editingPlans, setEditingPlans] = useState(pedagogicalPlans)
  const [savingPlans, setSavingPlans] = useState(false)

  useEffect(() => {
    if (activeAnoLetivo) {
      setSelectedYearNum(activeAnoLetivo.ano)
      setSelectedAnoLetivoRecord(activeAnoLetivo)
    } else if (schoolYear.year) {
      setSelectedYearNum(schoolYear.year)
    }
  }, [activeAnoLetivo, schoolYear.year])

  // Quando selectedYearNum muda, busca o registro correspondente da coleção ano_letivo
  // Se o ano selecionado não tiver registros, campos aparecem VAZIOS com placeholder (nunca herdar silenciosamente)
  useEffect(() => {
    let active = true

    async function fetchYearDetails() {
      if (!selectedYearNum) return
      try {
        const found = await schoolYearService.getByAno(selectedYearNum)
        if (!active) return

        if (found) {
          setSelectedAnoLetivoRecord(found)
          setYearForm({
            year: found.ano,
            startDate: found.data_inicio ? found.data_inicio.split('T')[0] : '',
            endDate: found.data_fim ? found.data_fim.split('T')[0] : '',
            ageBaseDate: found.age_base_date
              ? found.age_base_date.split('T')[0]
              : `${found.ano}-03-01`,
            winterBreakStart: found.winter_break_start
              ? found.winter_break_start.split('T')[0]
              : '',
            winterBreakEnd: found.winter_break_end ? found.winter_break_end.split('T')[0] : '',
            christmasDate: found.christmas_date ? found.christmas_date.split('T')[0] : '',
          })

          const [sabs, jans] = await Promise.all([
            schoolYearService.getSabados(found.id),
            schoolYearService.getJanelas(found.id),
          ])
          if (!active) return
          setSabadosDoAno(sabs)
          setJanelasDoAno(jans)
          setRecessList(
            jans.map((j) => ({
              date: j.data_inicio.split('T')[0],
              name: j.nome,
            })),
          )
        } else {
          // Ano não cadastrado no banco: campos totalmente vazios com placeholder
          setSelectedAnoLetivoRecord(null)
          setYearForm({
            year: selectedYearNum,
            startDate: '',
            endDate: '',
            ageBaseDate: `${selectedYearNum}-03-01`,
            winterBreakStart: '',
            winterBreakEnd: '',
            christmasDate: '',
          })
          setSabadosDoAno([])
          setJanelasDoAno([])
          setRecessList([])
        }
      } catch (err) {
        console.warn('Erro ao buscar ano letivo selecionado:', err)
      }
    }

    fetchYearDetails()

    return () => {
      active = false
    }
  }, [selectedYearNum])

  useEffect(() => {
    setEditingRooms(classrooms)
  }, [classrooms])

  useEffect(() => {
    setEditingPlans(pedagogicalPlans)
  }, [pedagogicalPlans])

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      const [allUsers, allSettings] = await Promise.all([
        settingsService.getAllUsers(),
        settingsService.getSettings(),
      ])

      setUsers(allUsers)
      setSettings(allSettings)

      if (allSettings.rules_library) {
        setRulesLibrary({
          maxLoansPerChild: allSettings.rules_library.maxLoansPerChild || 2,
          loanDurationDays: allSettings.rules_library.loanDurationDays || 7,
        })
      }

      if (allSettings.rules_dimdim) {
        setRulesDimDim({
          attendanceReward: allSettings.rules_dimdim.attendanceReward || 10,
          taskReward: allSettings.rules_dimdim.taskReward || 5,
          goodBehaviorReward: allSettings.rules_dimdim.goodBehaviorReward || 5,
          defaultRewardCost: allSettings.rules_dimdim.defaultRewardCost || 20,
        })
      }
    } catch (err) {
      console.error('Erro ao carregar configurações:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateUser = async () => {
    if (!userForm.name || !userForm.email) {
      toast({
        title: 'Atenção',
        description: 'Nome e e-mail são obrigatórios.',
        variant: 'destructive',
      })
      return
    }

    if (userForm.password !== userConfirmPassword) {
      toast({
        title: 'Atenção',
        description: 'As senhas não coincidem. Digite a mesma senha nos dois campos.',
        variant: 'destructive',
      })
      return
    }

    try {
      await settingsService.createUser(userForm)
      toast({
        title: 'Operador criado com sucesso!',
        description: 'Novo acesso registrado no Sistema Infanto-CEP.',
      })
      setUserModalOpen(false)
      setUserForm(emptyUserForm)
      setUserConfirmPassword('')
      loadData()
    } catch (err: any) {
      toast({
        title: 'Erro ao criar operador',
        description: getErrorMessage(err),
        variant: 'destructive',
      })
    }
  }

  const handleToggleUserStatus = async (user: User) => {
    try {
      await settingsService.updateUser(user.id, { active: !user.active })
      toast({
        title: user.active ? 'Operador desativado' : 'Operador reativado',
        description: `O status de ${user.name} foi atualizado no Sistema Infanto-CEP.`,
      })
      loadData()
    } catch (err: any) {
      toast({
        title: 'Erro ao alterar status',
        description: getErrorMessage(err),
        variant: 'destructive',
      })
    }
  }

  const handleResetPassword = async () => {
    if (!selectedUser) return
    if (!newPassword || newPassword.length < 8) {
      toast({
        title: 'Atenção',
        description: 'A nova senha deve ter no mínimo 8 caracteres.',
        variant: 'destructive',
      })
      return
    }

    if (newPassword !== confirmNewPassword) {
      toast({
        title: 'Atenção',
        description: 'As senhas não coincidem. Digite a mesma senha nos dois campos.',
        variant: 'destructive',
      })
      return
    }

    try {
      await settingsService.resetUserPassword(selectedUser.id, newPassword)
      toast({
        title: 'Senha redefinida com sucesso!',
        description: `A senha do operador ${selectedUser.name} foi redefinida.`,
      })
      setResetModalOpen(false)
    } catch (err: any) {
      const errMsg = err?.data?.message || err?.message || 'Falha ao atualizar registro de usuário.'
      toast({ title: 'Erro ao redefinir senha', description: errMsg, variant: 'destructive' })
    }
  }

  const handleDeleteUser = async () => {
    if (!userToDelete) return
    if (currentUser && userToDelete.id === currentUser.id) {
      toast({
        title: 'Operação não permitida',
        description: 'Você não pode excluir a sua própria conta logada.',
        variant: 'destructive',
      })
      setDeleteModalOpen(false)
      setUserToDelete(null)
      return
    }

    try {
      setDeleting(true)
      const uName = userToDelete.name
      const uRole = userToDelete.role
      const uEmail = userToDelete.email

      await settingsService.deleteUser(userToDelete.id)

      auditLogService.recordLog({
        recordType: 'Operador',
        recordIdentifier: uName,
        details: `Conta de operador excluída: Papel ${uRole} • E-mail: ${uEmail}`,
      })

      toast({
        title: 'Sistema Infanto-CEP',
        description: `A conta de ${uName} foi removida com sucesso do Sistema Infanto-CEP.`,
      })
      setDeleteModalOpen(false)
      setUserToDelete(null)
      loadData()
    } catch (err: any) {
      const errMsg =
        err?.data?.message || err?.message || 'Falha ao excluir o operador no Sistema Infanto-CEP.'
      toast({
        title: 'Erro ao excluir operador',
        description: errMsg,
        variant: 'destructive',
      })
    } finally {
      setDeleting(false)
    }
  }

  const handleSaveLibraryRules = async () => {
    try {
      await settingsService.updateSetting(
        'rules_library',
        rulesLibrary,
        'Regras de empréstimos da biblioteca',
      )
      toast({ title: 'Regras da biblioteca salvas!' })
    } catch (err: any) {
      toast({ title: 'Erro ao salvar', description: err?.message, variant: 'destructive' })
    }
  }

  const handleSaveDimDimRules = async () => {
    try {
      await settingsService.updateSetting(
        'rules_dimdim',
        rulesDimDim,
        'Parâmetros e limites da moeda educativa DimDim',
      )
      toast({ title: 'Regras da moeda DimDim salvas!' })
    } catch (err: any) {
      toast({ title: 'Erro ao salvar', description: err?.message, variant: 'destructive' })
    }
  }

  const handleCreateNewYear = async () => {
    if (!newYearInput || newYearInput < 2000 || newYearInput > 2100) {
      toast({
        title: 'Ano inválido',
        description: 'Informe um ano de 4 dígitos válido.',
        variant: 'destructive',
      })
      return
    }

    try {
      // Verifica se já existe
      const existing = await schoolYearService.getByAno(newYearInput)
      if (existing) {
        toast({
          title: 'Ano já cadastrado',
          description: `O ano letivo ${newYearInput} já existe na lista.`,
        })
        setSelectedYearNum(newYearInput)
        setNewYearModalOpen(false)
        return
      }

      const created = await schoolYearService.create({
        ano: newYearInput,
        data_inicio: `${newYearInput}-03-01 00:00:00.000Z`,
        status: 'planejado',
        age_base_date: `${newYearInput}-03-01 00:00:00.000Z`,
      })

      toast({
        title: 'Ano criado!',
        description: `Ano letivo ${newYearInput} criado no Sistema Infanto-CEP.`,
      })
      await reloadSettings()
      setSelectedYearNum(newYearInput)
      setSelectedAnoLetivoRecord(created)
      setNewYearModalOpen(false)
    } catch (err: any) {
      toast({
        title: 'Erro ao criar ano',
        description: err?.message || 'Falha ao cadastrar novo ano letivo.',
        variant: 'destructive',
      })
    }
  }

  const handleReplicateFromPreviousYear = async () => {
    if (!selectedAnoLetivoRecord) {
      toast({
        title: 'Ano não salvo',
        description: 'Salve o ano letivo antes de replicar dados para ele.',
        variant: 'destructive',
      })
      return
    }

    // Busca o ano imediatamente anterior cadastrado
    const previousYears = anosLetivos.filter((a) => a.ano < selectedAnoLetivoRecord.ano)
    if (previousYears.length === 0) {
      toast({
        title: 'Nenhum ano anterior encontrado',
        description:
          'Não há um ano letivo anterior cadastrado para ser usado como base de replicação.',
        variant: 'destructive',
      })
      return
    }

    const sourceAno = previousYears[0] // o mais recente antes deste

    try {
      setReplicating(true)
      const res = await schoolYearService.replicateFromYear(
        sourceAno.id,
        selectedAnoLetivoRecord.id,
        selectedAnoLetivoRecord.ano,
      )

      const domDesloc = res.domingosDeslocados ?? 0
      const conflitosQtd = res.conflitosDetectados ?? 0
      const detalhesMsg = [
        `Clonados ${res.sabadosClonados} sábados e ${res.janelasClonadas} janelas de ${sourceAno.ano}.`,
        domDesloc > 0
          ? `${domDesloc} data(s) caíram em domingo e foram deslocadas para o sábado anterior.`
          : 'Nenhuma data caiu em domingo.',
        conflitosQtd > 0
          ? `${conflitosQtd} conflito(s) com feriados móveis sinalizados para revisão manual.`
          : 'Sem conflitos de feriados móveis.',
        'Todos os registros foram marcados com revisão pendente no Sistema Infanto-CEP.',
      ].join(' ')

      toast({
        title: 'Replicação concluída!',
        description: detalhesMsg,
      })

      // Refetch
      const [sabs, jans, updatedAno] = await Promise.all([
        schoolYearService.getSabados(selectedAnoLetivoRecord.id),
        schoolYearService.getJanelas(selectedAnoLetivoRecord.id),
        schoolYearService.getById(selectedAnoLetivoRecord.id),
      ])
      setSabadosDoAno(sabs)
      setJanelasDoAno(jans)
      setSelectedAnoLetivoRecord(updatedAno)
      setRecessList(
        jans.map((j) => ({
          date: j.data_inicio.split('T')[0],
          name: j.nome,
        })),
      )
      await reloadSettings()
    } catch (err: any) {
      toast({
        title: 'Erro na replicação',
        description: err?.message || 'Falha ao replicar do ano anterior.',
        variant: 'destructive',
      })
    } finally {
      setReplicating(false)
    }
  }

  const handleSaveYearAndHolidays = async () => {
    try {
      setSavingYear(true)
      if (!yearForm.startDate) {
        toast({
          title: 'Data de início obrigatória',
          description: 'Preencha a data de início das aulas antes de salvar.',
          variant: 'destructive',
        })
        return
      }

      const targetYear = selectedYearNum || yearForm.year || new Date().getFullYear()
      const normalizedConfig: SchoolYearConfig = {
        ...yearForm,
        year: targetYear,
        ageBaseDate: yearForm.ageBaseDate || `${targetYear}-03-01`,
      }

      // Se houver recesso de meio de ano preenchido, assegura que seus sábados estejam na lista
      const updatedRecesses = [...recessList]
      if (normalizedConfig.winterBreakStart && normalizedConfig.winterBreakEnd) {
        const cleanStart = normalizedConfig.winterBreakStart.split('T')[0]
        const cleanEnd = normalizedConfig.winterBreakEnd.split('T')[0]
        const [sy, sm, sd] = cleanStart.split('-').map(Number)
        const [ey, em, ed] = cleanEnd.split('-').map(Number)
        if (sy && sm && sd && ey && em && ed) {
          const cur = new Date(Date.UTC(sy, sm - 1, sd, 12, 0, 0))
          const end = new Date(Date.UTC(ey, em - 1, ed, 12, 0, 0))
          while (cur <= end) {
            if (cur.getUTCDay() === 6) {
              const y = cur.getUTCFullYear()
              const m = String(cur.getUTCMonth() + 1).padStart(2, '0')
              const d = String(cur.getUTCDate()).padStart(2, '0')
              const dateStr = `${y}-${m}-${d}`
              if (!updatedRecesses.some((r) => r.date === dateStr)) {
                updatedRecesses.push({
                  date: dateStr,
                  name: 'Férias de Julho / Recesso Escolar',
                })
              }
            }
            cur.setUTCDate(cur.getUTCDate() + 1)
          }
          updatedRecesses.sort((a, b) => a.date.localeCompare(b.date))
          setRecessList(updatedRecesses)
        }
      }

      setYearForm(normalizedConfig)

      // 1. Salva ou atualiza o registro na coleção ano_letivo
      let anoRec = selectedAnoLetivoRecord
      if (!anoRec) {
        anoRec = await schoolYearService.getByAno(targetYear)
      }

      const anoPayload = {
        ano: targetYear,
        data_inicio: `${normalizedConfig.startDate} 00:00:00.000Z`,
        data_fim: normalizedConfig.endDate
          ? `${normalizedConfig.endDate} 00:00:00.000Z`
          : undefined,
        status: (anoRec ? anoRec.status : 'ativo') as 'ativo' | 'planejado' | 'encerrado',
        age_base_date: normalizedConfig.ageBaseDate
          ? `${normalizedConfig.ageBaseDate} 00:00:00.000Z`
          : `${targetYear}-03-01 00:00:00.000Z`,
        winter_break_start: normalizedConfig.winterBreakStart
          ? `${normalizedConfig.winterBreakStart} 00:00:00.000Z`
          : undefined,
        winter_break_end: normalizedConfig.winterBreakEnd
          ? `${normalizedConfig.winterBreakEnd} 00:00:00.000Z`
          : undefined,
        christmas_date: normalizedConfig.christmasDate
          ? `${normalizedConfig.christmasDate} 00:00:00.000Z`
          : undefined,
      }

      if (anoRec) {
        anoRec = await schoolYearService.update(anoRec.id, anoPayload)
      } else {
        anoRec = await schoolYearService.create(anoPayload)
      }
      setSelectedAnoLetivoRecord(anoRec)

      // 2. Persiste as janelas de feriado na coleção janela_feriado vinculadas a este ano_letivo
      // (Com validação de sobreposição no backend)
      for (const rec of updatedRecesses) {
        const dStr = rec.date.split('T')[0]
        const existingJan = janelasDoAno.find((j) => j.data_inicio.startsWith(dStr))
        if (!existingJan) {
          try {
            await schoolYearService.createJanela({
              ano_letivo_id: anoRec.id,
              data_inicio: `${dStr} 00:00:00.000Z`,
              data_fim: `${dStr} 23:59:59.000Z`,
              nome: rec.name.substring(0, 120),
              revisado: true,
            })
          } catch (err: any) {
            console.warn('Validação de janela ao salvar:', err?.message)
          }
        }
      }

      await saveSchoolYearAndRecesses(normalizedConfig, updatedRecesses)
      await reloadSettings()

      const [updatedSabs, updatedJans] = await Promise.all([
        schoolYearService.getSabados(anoRec.id),
        schoolYearService.getJanelas(anoRec.id),
      ])
      setSabadosDoAno(updatedSabs)
      setJanelasDoAno(updatedJans)

      toast({
        title: 'Ano Letivo e Feriados Salvos!',
        description: `Configurações para ${normalizedConfig.year} registradas na fonte única de verdade (Sistema Infanto-CEP).`,
      })
    } catch (err: any) {
      toast({
        title: 'Erro ao salvar ano letivo',
        description: err?.message || 'Falha ao salvar.',
        variant: 'destructive',
      })
    } finally {
      setSavingYear(false)
    }
  }

  const handleSyncCalendarDates = async () => {
    try {
      setSyncingCalendar(true)
      if (!yearForm.startDate) {
        toast({
          title: 'Data de início obrigatória',
          description: 'Defina a Data de Início das Aulas antes de sincronizar o calendário.',
          variant: 'destructive',
        })
        return
      }

      const targetYear = selectedYearNum || yearForm.year || new Date().getFullYear()
      const normalizedConfig: SchoolYearConfig = {
        ...yearForm,
        year: targetYear,
        ageBaseDate: yearForm.ageBaseDate || `${targetYear}-03-01`,
      }
      setYearForm(normalizedConfig)

      // Primeiro salva as configurações no banco
      await saveSchoolYearAndRecesses(normalizedConfig, recessList)

      // Garante que o ano letivo esteja salvo
      let anoRec = selectedAnoLetivoRecord
      if (!anoRec) {
        anoRec = await schoolYearService.getByAno(targetYear)
        if (!anoRec) {
          anoRec = await schoolYearService.create({
            ano: targetYear,
            data_inicio: `${normalizedConfig.startDate} 00:00:00.000Z`,
            status: 'ativo',
            age_base_date: `${targetYear}-03-01 00:00:00.000Z`,
          })
        }
        setSelectedAnoLetivoRecord(anoRec)
      }

      // Sincroniza o calendário de aulas (lessons)
      const res = await syncOrRegenerateCalendar(normalizedConfig, recessList)

      // Sincroniza também a coleção sabado_letivo com todas as datas (letivas e não letivas)
      const updatedLessons = await pb.collection('lessons').getFullList<Lesson>({
        filter: `year=${targetYear}`,
        sort: 'session_number',
      })

      const existingSabados = await schoolYearService.getSabados(anoRec.id)
      const sabadosByLessonId = new Map<string, SabadoLetivo>()
      const sabadosByDate = new Map<string, SabadoLetivo>()
      for (const sab of existingSabados) {
        if (sab.lesson_id) sabadosByLessonId.set(sab.lesson_id, sab)
        const d = sab.data ? sab.data.split('T')[0] : ''
        if (d) sabadosByDate.set(d, sab)
      }

      // 1. Processa todas as aulas letivas
      for (const l of updatedLessons) {
        const lDate = l.date ? l.date.split('T')[0] : ''
        const matchedSab =
          sabadosByLessonId.get(l.id) || (lDate ? sabadosByDate.get(lDate) : undefined)
        if (matchedSab) {
          const currentSabDate = matchedSab.data ? matchedSab.data.split('T')[0] : ''
          const patchPayload: Partial<SabadoLetivo> = {}
          if (currentSabDate !== lDate) {
            patchPayload.data = `${lDate} 00:00:00.000Z`
          }
          if (matchedSab.lesson_id !== l.id) {
            patchPayload.lesson_id = l.id
          }
          if (matchedSab.tipo !== 'letivo') {
            patchPayload.tipo = 'letivo'
          }
          if (!matchedSab.descricao && l.central_theme) {
            patchPayload.descricao = l.central_theme
          }
          if (Object.keys(patchPayload).length > 0) {
            try {
              await schoolYearService.updateSabado(matchedSab.id, patchPayload)
            } catch (sabErr) {
              console.warn('Atualização de sabado_letivo ignorada:', sabErr)
            }
          }
        } else {
          // Cria o sábado letivo correspondente
          try {
            const created = await schoolYearService.createSabado({
              ano_letivo_id: anoRec.id,
              data: `${lDate} 00:00:00.000Z`,
              tipo: 'letivo',
              descricao: l.central_theme || `Aula #${l.session_number}`,
              lesson_id: l.id,
              revisado: true,
            })
            sabadosByDate.set(lDate, created)
            sabadosByLessonId.set(l.id, created)
          } catch (createErr) {
            console.warn('Criação de sabado_letivo ignorada:', createErr)
          }
        }
      }

      // 2. Processa os sábados não letivos (eventos, feriados, recessos) a partir de allEntries ou janelas
      if (res.allEntries) {
        for (const entry of res.allEntries) {
          if (entry.tipo === 'letivo') continue
          const matchedSab = sabadosByDate.get(entry.date)
          const desc =
            entry.nome ||
            (entry.tipo === 'evento'
              ? 'Evento Escolar'
              : entry.tipo === 'feriado'
                ? 'Feriado'
                : 'Recesso Escolar')
          if (matchedSab) {
            const patchPayload: Partial<SabadoLetivo> = {}
            if (matchedSab.tipo !== entry.tipo) {
              patchPayload.tipo = entry.tipo
            }
            if (!matchedSab.descricao || matchedSab.descricao.startsWith('Aula #')) {
              patchPayload.descricao = desc
            }
            if (matchedSab.lesson_id) {
              patchPayload.lesson_id = ''
            }
            if (Object.keys(patchPayload).length > 0) {
              try {
                await schoolYearService.updateSabado(matchedSab.id, patchPayload)
              } catch (err) {
                console.warn('Atualização de sábado não-letivo ignorada:', err)
              }
            }
          } else {
            try {
              const created = await schoolYearService.createSabado({
                ano_letivo_id: anoRec.id,
                data: `${entry.date} 00:00:00.000Z`,
                tipo: entry.tipo,
                descricao: desc,
                revisado: true,
              })
              sabadosByDate.set(entry.date, created)
            } catch (createErr) {
              console.warn('Criação de sábado não-letivo ignorada:', createErr)
            }
          }
        }
      }

      // Refetch sabados
      const sabs = await schoolYearService.getSabados(anoRec.id)
      setSabadosDoAno(sabs)

      toast({
        title: 'Calendário sincronizado com sucesso!',
        description:
          res.action === 'updated_dates'
            ? `As datas dos ${res.count} sábados foram ajustadas às novas janelas sem perder planos ou presenças.`
            : res.action === 'completed_matrix'
              ? `A matriz de ${res.count} sábados para ${normalizedConfig.year} foi atualizada e completada com sucesso.`
              : `Foram gerados ${res.count} sábados letivos para o ano ${normalizedConfig.year}.`,
      })
    } catch (err: any) {
      if (isAuthExpiredError(err)) {
        toast({
          title: 'Sessão Expirada',
          description:
            'Sua sessão expirou durante a sincronização. Por favor, faça login novamente.',
          variant: 'destructive',
        })
        setTimeout(() => {
          navigate('/login')
        }, 1500)
        return
      }

      const errMsg =
        err?.data?.message ||
        err?.message ||
        (err?.status === 429
          ? 'Muitas requisições simultâneas. Tente novamente em instantes.'
          : 'Falha na sincronização.')
      toast({
        title: 'Erro ao sincronizar calendário',
        description: errMsg,
        variant: 'destructive',
      })
    } finally {
      setSyncingCalendar(false)
    }
  }

  const handleAddRecess = async () => {
    if (!newRecessDate || !newRecessName) {
      toast({
        title: 'Dados incompletos',
        description: 'Informe a data e o nome do recesso/feriado.',
        variant: 'destructive',
      })
      return
    }

    const dStr = newRecessDate.split('T')[0]

    // Validação preventiva no frontend de sobreposição
    const duplicate = recessList.some((r) => r.date.split('T')[0] === dStr)
    if (duplicate) {
      toast({
        title: 'Sobreposição detectada',
        description: `Já existe um recesso/feriado configurado para a data ${formatDate(dStr)} neste ano letivo.`,
        variant: 'destructive',
      })
      return
    }

    // Se houver ano salvo, tenta gravar direto na coleção janela_feriado para validar sobreposição no backend
    if (selectedAnoLetivoRecord) {
      try {
        const created = await schoolYearService.createJanela({
          ano_letivo_id: selectedAnoLetivoRecord.id,
          data_inicio: `${dStr} 00:00:00.000Z`,
          data_fim: `${dStr} 23:59:59.000Z`,
          nome: newRecessName.substring(0, 120),
          revisado: true,
        })
        setJanelasDoAno([...janelasDoAno, created])
      } catch (err: any) {
        toast({
          title: 'Sobreposição de feriados',
          description:
            err?.data?.message ||
            err?.message ||
            'O período informado coincide com outra janela de feriado já cadastrada neste ano.',
          variant: 'destructive',
        })
        return
      }
    }

    const updated = [...recessList, { date: newRecessDate, name: newRecessName }]
    updated.sort((a, b) => a.date.localeCompare(b.date))
    setRecessList(updated)
    setNewRecessDate('')
    setNewRecessName('')
    toast({ title: 'Janela de recesso adicionada!' })
  }

  const handleRequestRemoveRecess = (indexToRemove: number) => {
    setRecessToDeleteIndex(indexToRemove)
    setDeleteRecessModalOpen(true)
  }

  const handleConfirmRemoveRecess = async () => {
    if (recessToDeleteIndex === null) return
    const item = recessList[recessToDeleteIndex]
    try {
      setDeletingRecess(true)
      if (item && selectedAnoLetivoRecord) {
        const dStr = item.date.split('T')[0]
        const foundJan = janelasDoAno.find((j) => j.data_inicio.startsWith(dStr))
        if (foundJan) {
          try {
            await schoolYearService.deleteJanela(foundJan.id)
            setJanelasDoAno(janelasDoAno.filter((j) => j.id !== foundJan.id))

            auditLogService.recordLog({
              recordType: 'Janela de Recesso/Feriado',
              recordIdentifier: item?.name || 'Janela de Recesso',
              details: `Removida da configuração do ano letivo • Data base: ${item?.date || ''}`,
            })
          } catch {
            /* intentionally ignored */
          }
        }
      }
      setRecessList(recessList.filter((_, i) => i !== recessToDeleteIndex))
      toast({
        title: 'Sistema Infanto-CEP',
        description: `A janela "${item?.name}" foi removida com sucesso do calendário no Sistema Infanto-CEP.`,
      })
      setDeleteRecessModalOpen(false)
      setRecessToDeleteIndex(null)
    } finally {
      setDeletingRecess(false)
    }
  }

  const handleOpenEditJanela = (rec: RecessSaturday, index: number) => {
    const dStr = rec.date.split('T')[0]
    const matchedJan = janelasDoAno.find(
      (j) => j.data_inicio.startsWith(dStr) || j.nome === rec.name,
    )
    setEditingJanelaIndex(index)
    setEditingJanelaId(matchedJan?.id || null)
    setEditJanelaNome(matchedJan?.nome || rec.name)
    setEditJanelaStart(matchedJan?.data_inicio ? matchedJan.data_inicio.split('T')[0] : dStr)
    setEditJanelaEnd(
      matchedJan?.data_fim
        ? matchedJan.data_fim.split('T')[0]
        : matchedJan?.data_inicio
          ? matchedJan.data_inicio.split('T')[0]
          : dStr,
    )
    setEditJanelaModalOpen(true)
  }

  const handleSaveEditJanela = async () => {
    if (!canManage) {
      toast({
        title: 'Acesso Restrito',
        description: 'Apenas Administradores e Dirigentes podem alterar janelas de feriado.',
        variant: 'destructive',
      })
      return
    }

    const trimmedNome = editJanelaNome.trim()
    if (!trimmedNome) {
      toast({
        title: 'Nome obrigatório',
        description: 'Informe o nome ou motivo da janela de recesso/feriado.',
        variant: 'destructive',
      })
      return
    }

    if (!editJanelaStart || !editJanelaEnd) {
      toast({
        title: 'Datas obrigatórias',
        description: 'Informe a data de início e a data de fim da janela de recesso.',
        variant: 'destructive',
      })
      return
    }

    const sStr = editJanelaStart.split('T')[0]
    const eStr = editJanelaEnd.split('T')[0]

    if (eStr < sStr) {
      toast({
        title: 'Data inválida',
        description: 'A data de fim não pode ser anterior à data de início.',
        variant: 'destructive',
      })
      return
    }

    try {
      setSavingEditJanela(true)

      if (editingJanelaId && selectedAnoLetivoRecord) {
        await schoolYearService.updateJanela(editingJanelaId, {
          nome: trimmedNome.substring(0, 120),
          data_inicio: `${sStr} 00:00:00.000Z`,
          data_fim: `${eStr} 23:59:59.000Z`,
          revisado: true,
        })
      } else if (selectedAnoLetivoRecord) {
        // Se ainda não tinha ID gravado
        await schoolYearService.createJanela({
          ano_letivo_id: selectedAnoLetivoRecord.id,
          nome: trimmedNome.substring(0, 120),
          data_inicio: `${sStr} 00:00:00.000Z`,
          data_fim: `${eStr} 23:59:59.000Z`,
          revisado: true,
        })
      }

      // Recarrega lista de janelas da fonte de verdade
      if (selectedAnoLetivoRecord) {
        const jans = await schoolYearService.getJanelas(selectedAnoLetivoRecord.id)
        setJanelasDoAno(jans)
        setRecessList(
          jans.map((j) => ({
            date: j.data_inicio.split('T')[0],
            name: j.nome,
          })),
        )
      } else {
        const updated = [...recessList]
        if (editingJanelaIndex !== null && updated[editingJanelaIndex]) {
          updated[editingJanelaIndex] = { date: sStr, name: trimmedNome }
          updated.sort((a, b) => a.date.localeCompare(b.date))
          setRecessList(updated)
        }
      }

      toast({
        title: 'Janela alterada com sucesso!',
        description: `A janela "${trimmedNome}" foi atualizada no Sistema Infanto-CEP.`,
      })
      setEditJanelaModalOpen(false)
      setEditingJanelaId(null)
      setEditingJanelaIndex(null)
    } catch (err: any) {
      toast({
        title: 'Sobreposição de feriados',
        description:
          err?.data?.message ||
          err?.message ||
          'O período informado coincide com outra janela de feriado já cadastrada neste ano.',
        variant: 'destructive',
      })
    } finally {
      setSavingEditJanela(false)
    }
  }

  const handleSaveRooms = async () => {
    try {
      setSavingRooms(true)
      await saveClassrooms(editingRooms)
      toast({
        title: 'Configurações de salas salvas!',
        description: 'Os nomes e faixas etárias foram atualizados no Sistema Infanto-CEP.',
      })
    } catch (err: any) {
      toast({
        title: 'Erro ao salvar salas',
        description: err?.message || 'Falha ao salvar.',
        variant: 'destructive',
      })
    } finally {
      setSavingRooms(false)
    }
  }

  const handleSavePlans = async () => {
    try {
      setSavingPlans(true)
      await savePedagogicalPlans(editingPlans)
      toast({
        title: 'Planos pedagógicos salvos com sucesso!',
        description: 'Os temas e atividades de cada sala foram atualizados no Sistema Infanto-CEP.',
      })
    } catch (err: any) {
      toast({
        title: 'Erro ao salvar planos pedagógicos',
        description: err?.message || 'Falha ao salvar.',
        variant: 'destructive',
      })
    } finally {
      setSavingPlans(false)
    }
  }

  const roleLabels: Record<UserRole, { label: string; color: string }> = {
    admin: { label: 'Administrador', color: 'bg-rose-100 text-rose-800 border-rose-200' },
    dirigente: { label: 'Dirigente', color: 'bg-indigo-100 text-indigo-800 border-indigo-200' },
    professor: {
      label: 'Professor(a)',
      color: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    },
    auxiliar: { label: 'Auxiliar', color: 'bg-amber-100 text-amber-800 border-amber-200' },
    bibliotecario: { label: 'Bibliotecário(a)', color: 'bg-sky-100 text-sky-800 border-sky-200' },
  }

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Operadores e Configurações
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Gestão de contas de acesso, papéis de permissão, ano letivo{' '}
            {yearForm.year || schoolYear.year}, feriados e regras do sistema.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            onClick={() => setOwnPasswordModalOpen(true)}
            variant="outline"
            className="border-indigo-300 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/40"
          >
            <KeyRound className="h-4 w-4 mr-2 text-indigo-600" />
            Alterar Minha Senha
          </Button>

          <Button
            onClick={openCreateUserModal}
            className="bg-indigo-600 hover:bg-indigo-700 text-white"
          >
            <UserPlus className="h-4 w-4 mr-2" />
            Novo Operador
          </Button>
        </div>
      </div>

      <Tabs defaultValue="operadores" className="space-y-4">
        <TabsList className="grid grid-cols-2 max-w-sm bg-yellow-100 dark:bg-yellow-950/40">
          <TabsTrigger
            value="operadores"
            className="bg-yellow-100 dark:bg-yellow-950/40 text-yellow-900 dark:text-yellow-200 data-[state=active]:bg-yellow-200 dark:data-[state=active]:bg-yellow-900/60 data-[state=active]:text-yellow-900 dark:data-[state=active]:text-yellow-100 data-[state=active]:shadow-md data-[state=active]:ring-1 data-[state=active]:ring-yellow-400/60"
          >
            Operadores e Papéis
          </TabsTrigger>
          <TabsTrigger
            value="parametros"
            className="bg-yellow-100 dark:bg-yellow-950/40 text-yellow-900 dark:text-yellow-200 data-[state=active]:bg-yellow-200 dark:data-[state=active]:bg-yellow-900/60 data-[state=active]:text-yellow-900 dark:data-[state=active]:text-yellow-100 data-[state=active]:shadow-md data-[state=active]:ring-1 data-[state=active]:ring-yellow-400/60"
          >
            Regras e Parâmetros
          </TabsTrigger>
        </TabsList>

        {/* ABA 1: OPERADORES */}
        <TabsContent value="operadores" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {users.map((u) => {
              const rInfo = roleLabels[u.role] || { label: u.role, color: '' }
              const isActive = u.active !== false
              const isCurrentUser = currentUser?.id === u.id

              return (
                <Card
                  key={u.id}
                  className={`flex flex-col justify-between border transition-all shadow-sm ${
                    !isActive
                      ? 'bg-slate-50/80 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800 opacity-75'
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:shadow-md'
                  }`}
                >
                  <CardHeader className="p-4 sm:p-5 pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1 min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <h3
                            className="font-bold text-sm sm:text-base text-slate-900 dark:text-slate-100 truncate"
                            title={u.name}
                          >
                            {u.name}
                          </h3>
                          {isCurrentUser && (
                            <span className="text-[10px] font-semibold text-indigo-600 bg-indigo-50 dark:bg-indigo-950/60 dark:text-indigo-400 px-1.5 py-0.5 rounded shrink-0">
                              Você
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground truncate" title={u.email}>
                          {u.email}
                        </p>
                      </div>

                      <Badge
                        variant="outline"
                        className={`text-[11px] font-medium shrink-0 px-2 py-0.5 whitespace-nowrap border ${rInfo.color}`}
                      >
                        {rInfo.label}
                      </Badge>
                    </div>
                  </CardHeader>

                  <CardContent className="p-4 sm:p-5 pt-0 flex-1 flex flex-col justify-end space-y-3">
                    {/* Linha de status do operador */}
                    <div className="flex items-center justify-between py-2 border-y border-slate-100 dark:border-slate-800 text-xs">
                      <span className="text-slate-500 dark:text-slate-400">Status:</span>
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`inline-block h-2 w-2 rounded-full ${
                            isActive ? 'bg-emerald-500' : 'bg-rose-500'
                          }`}
                        />
                        <span
                          className={`font-semibold ${
                            isActive
                              ? 'text-emerald-700 dark:text-emerald-400'
                              : 'text-rose-700 dark:text-rose-400'
                          }`}
                        >
                          {isActive ? 'Ativo' : 'Inativo'}
                        </span>
                      </div>
                    </div>

                    {/* Grupo de ações com layout responsivo e alinhado */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 pt-1">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedUser(u)
                          setNewPassword('Skip@Pass')
                          setConfirmNewPassword('')
                          setResetModalOpen(true)
                        }}
                        className="h-8 text-xs text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-900/50 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 font-medium px-2"
                        title="Redefinir senha de acesso"
                      >
                        <KeyRound className="h-3.5 w-3.5 mr-1 shrink-0" />
                        <span className="truncate">Senha</span>
                      </Button>

                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleToggleUserStatus(u)}
                        className={`h-8 text-xs font-medium px-2 ${
                          isActive
                            ? 'text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-900/50 hover:bg-amber-50 dark:hover:bg-amber-950/40'
                            : 'text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900/50 hover:bg-emerald-50 dark:hover:bg-emerald-950/40'
                        }`}
                        title={isActive ? 'Desativar operador' : 'Reativar operador'}
                      >
                        <span className="truncate">{isActive ? 'Desativar' : 'Reativar'}</span>
                      </Button>

                      {/* Botão de Excluir com lixeira */}
                      {!isCurrentUser ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setUserToDelete(u)
                            setDeleteModalOpen(true)
                          }}
                          className="col-span-2 sm:col-span-1 h-8 text-xs text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-900/50 hover:bg-rose-50 dark:hover:bg-rose-950/40 font-medium px-2"
                          title="Excluir operador definitivamente"
                        >
                          <Trash2 className="h-3.5 w-3.5 mr-1 shrink-0" />
                          <span className="truncate">Excluir</span>
                        </Button>
                      ) : (
                        <div className="col-span-2 sm:col-span-1 flex items-center justify-center text-[10px] text-muted-foreground italic h-8 border border-dashed rounded px-1 text-center">
                          Sua conta
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </TabsContent>

        {/* ABA 2: REGRAS E PARÂMETROS */}
        <TabsContent value="parametros" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Parâmetros da Biblioteca */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-sky-600" />
                  Regras da Biblioteca Infantil
                </CardTitle>
                <CardDescription className="text-xs">
                  Limites de empréstimos simultâneos e prazo padrão de devolução aplicados em todo o
                  Sistema Infanto-CEP
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-xs">
                <div className="space-y-1">
                  <Label>Máximo de livros simultâneos por criança</Label>
                  <Input
                    type="number"
                    min={1}
                    max={5}
                    value={rulesLibrary.maxLoansPerChild}
                    onChange={(e) =>
                      setRulesLibrary({
                        ...rulesLibrary,
                        maxLoansPerChild: parseInt(e.target.value) || 2,
                      })
                    }
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Padrão institucional: 2 exemplares simultâneos
                  </p>
                </div>

                <div className="space-y-1">
                  <Label>Prazo padrão de empréstimo (dias)</Label>
                  <Input
                    type="number"
                    min={1}
                    max={60}
                    value={rulesLibrary.loanDurationDays}
                    onChange={(e) =>
                      setRulesLibrary({
                        ...rulesLibrary,
                        loanDurationDays: parseInt(e.target.value) || 7,
                      })
                    }
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Utilizado no cálculo da devolução prevista e nos alertas de atraso na Biblioteca
                  </p>
                </div>

                <Button
                  onClick={handleSaveLibraryRules}
                  className="w-full bg-sky-600 hover:bg-sky-700 text-white"
                >
                  Salvar Regras da Biblioteca
                </Button>
              </CardContent>
            </Card>

            {/* Parâmetros do DimDim */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <Coins className="h-4 w-4 text-amber-500" />
                  Parâmetros da Moeda DimDim
                </CardTitle>
                <CardDescription className="text-xs">
                  Valores sugeridos para premiação pedagógica e feirinha
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label>Crédito por Presença</Label>
                    <Input
                      type="number"
                      value={rulesDimDim.attendanceReward}
                      onChange={(e) =>
                        setRulesDimDim({
                          ...rulesDimDim,
                          attendanceReward: parseInt(e.target.value) || 10,
                        })
                      }
                    />
                  </div>

                  <div className="space-y-1">
                    <Label>Crédito por Tarefa</Label>
                    <Input
                      type="number"
                      value={rulesDimDim.taskReward}
                      onChange={(e) =>
                        setRulesDimDim({
                          ...rulesDimDim,
                          taskReward: parseInt(e.target.value) || 5,
                        })
                      }
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <Label>Custo Padrão na Feirinha de Prêmios</Label>
                  <Input
                    type="number"
                    value={rulesDimDim.defaultRewardCost}
                    onChange={(e) =>
                      setRulesDimDim({
                        ...rulesDimDim,
                        defaultRewardCost: parseInt(e.target.value) || 20,
                      })
                    }
                  />
                </div>

                <Button
                  onClick={handleSaveDimDimRules}
                  className="w-full bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold"
                >
                  Salvar Parâmetros do DimDim
                </Button>
              </CardContent>
            </Card>

            {/* Salas e Faixas Etárias Editáveis */}
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <Sliders className="h-4 w-4 text-indigo-600" />
                  Configuração de Salas e Faixas Etárias
                </CardTitle>
                <CardDescription className="text-xs">
                  Personalize os nomes/rótulos (ex: <em>Sala D (Responsáveis)</em>) e as idades
                  mínima e máxima. As faixas definem a classificação automática das crianças em 1º
                  de março.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 text-xs">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {editingRooms.map((room, idx) => (
                    <div
                      key={room.id}
                      className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 space-y-2.5"
                    >
                      <div className="flex items-center justify-between">
                        <Badge className="bg-indigo-600 text-white font-bold text-xs">
                          Sala {room.id}
                        </Badge>
                        <span className="text-[11px] text-muted-foreground">
                          Faixa: {room.minAge} a {room.maxAge} anos
                        </span>
                      </div>

                      <div className="space-y-1">
                        <Label className="text-[11px]">Nome / Rótulo da Sala</Label>
                        <Input
                          value={room.name}
                          onChange={(e) => {
                            const updated = [...editingRooms]
                            updated[idx] = { ...updated[idx], name: e.target.value }
                            setEditingRooms(updated)
                          }}
                          placeholder={`Nome da Sala ${room.id}`}
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <Label className="text-[11px]">Idade Mín.</Label>
                          <Input
                            type="number"
                            min={0}
                            max={99}
                            value={room.minAge}
                            onChange={(e) => {
                              const val = parseInt(e.target.value, 10) || 0
                              const updated = [...editingRooms]
                              updated[idx] = { ...updated[idx], minAge: val }
                              setEditingRooms(updated)
                            }}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[11px]">Idade Máx.</Label>
                          <Input
                            type="number"
                            min={0}
                            max={99}
                            value={room.maxAge}
                            onChange={(e) => {
                              const val = parseInt(e.target.value, 10) || 0
                              const updated = [...editingRooms]
                              updated[idx] = { ...updated[idx], maxAge: val }
                              setEditingRooms(updated)
                            }}
                          />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <Label className="text-[11px] text-muted-foreground">Descrição</Label>
                        <Input
                          value={room.description || ''}
                          onChange={(e) => {
                            const updated = [...editingRooms]
                            updated[idx] = { ...updated[idx], description: e.target.value }
                            setEditingRooms(updated)
                          }}
                          placeholder="Descrição da turma"
                        />
                      </div>
                    </div>
                  ))}
                </div>

                <Button
                  onClick={handleSaveRooms}
                  disabled={savingRooms}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white w-full sm:w-auto"
                >
                  {savingRooms ? 'Salvando...' : 'Salvar Configurações de Salas'}
                </Button>
              </CardContent>
            </Card>

            {/* Planos Pedagógicos por Sala (Painel de Apresentação) */}
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-indigo-600" />
                  Planos Pedagógicos das Salas (Painel Principal)
                </CardTitle>
                <CardDescription className="text-xs">
                  Configure as duas linhas de texto exibidas para cada sala no painel de
                  apresentação do ano letivo: (1) o título/tema do plano e (2) a linha descritiva de
                  atividades. Os rótulos de cada sala (ex.: &quot;Sala A&quot;) vêm do bloco acima.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 text-xs">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {classrooms.map((room) => {
                    const roomPlan = editingPlans[room.id] || { title: '', activities: '' }
                    return (
                      <div
                        key={room.id}
                        className="p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 space-y-3"
                      >
                        <div className="flex items-center justify-between border-b pb-2">
                          <div className="flex items-center gap-2">
                            <Badge className="bg-indigo-600 text-white font-bold text-xs">
                              {room.name || `Sala ${room.id}`}
                            </Badge>
                            <span className="text-[11px] text-muted-foreground font-medium">
                              ({room.minAge}-{room.maxAge} anos)
                            </span>
                          </div>
                          <span className="text-[10px] text-indigo-700 dark:text-indigo-300 font-mono">
                            Linhas 1 e 2
                          </span>
                        </div>

                        <div className="space-y-1">
                          <Label className="text-[11px] font-semibold">
                            Linha 1: Título / Tema do Plano Pedagógico
                          </Label>
                          <Input
                            value={roomPlan.title}
                            onChange={(e) => {
                              setEditingPlans({
                                ...editingPlans,
                                [room.id]: {
                                  ...roomPlan,
                                  title: e.target.value,
                                },
                              })
                            }}
                            placeholder="Ex: Linguagem Lúdica: Deus, Pai e Criador de Todas as Coisas"
                          />
                        </div>

                        <div className="space-y-1">
                          <Label className="text-[11px] font-semibold">
                            Linha 2: Descrição das Atividades
                          </Label>
                          <Input
                            value={roomPlan.activities}
                            onChange={(e) => {
                              setEditingPlans({
                                ...editingPlans,
                                [room.id]: {
                                  ...roomPlan,
                                  activities: e.target.value,
                                },
                              })
                            }}
                            placeholder="Ex: Roda de acolhimento, contação com figuras coloridas e pintura."
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>

                <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3">
                  <Button
                    onClick={handleSavePlans}
                    disabled={savingPlans}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white w-full sm:w-auto"
                  >
                    {savingPlans ? 'Salvando...' : 'Salvar Planos Pedagógicos'}
                  </Button>
                  <p className="text-[11px] text-muted-foreground">
                    Ao salvar, o painel principal exibirá imediatamente os textos configurados.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Ano Letivo e Janelas de Feriados: movido para o modal de Calendário (src/pages/Calendar.tsx) */}
          </div>
        </TabsContent>
      </Tabs>
=======
                      {selectedAnoLetivoRecord?.replicado_de && (
                        <Badge
                          variant="outline"
                          className="bg-amber-50 text-amber-700 border-amber-200 text-[10px] font-normal"
                        >
                          herdado de{' '}
                          {anosLetivos.find((a) => a.id === selectedAnoLetivoRecord.replicado_de)
                            ?.ano || 'ano anterior'}
                        </Badge>
                      )}
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Fonte única de verdade: selecione o ano letivo, defina as datas
                      institucionais, adicione janelas de feriados ou replique do ano anterior com
                      recálculo automático de domingos.
                    </CardDescription>
                  </div>

                  {/* Seletor de Ano Letivo + Botão Novo Ano */}
                  <div className="flex items-center gap-2">
                    <Select
                      value={String(selectedYearNum)}
                      onValueChange={(val) => setSelectedYearNum(parseInt(val, 10))}
                    >
                      <SelectTrigger className="w-[140px] h-9 text-xs font-semibold">
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

                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setNewYearModalOpen(true)}
                      className="h-9 text-xs"
                      title="Cadastrar novo ano letivo"
                    >
                      <Plus className="h-3.5 w-3.5 mr-1" />
                      Novo Ano
                    </Button>

                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleReplicateFromPreviousYear}
                      disabled={replicating || !selectedAnoLetivoRecord}
                      className="h-9 text-xs border-indigo-200 text-indigo-700 hover:bg-indigo-50"
                      title="Replicar sábados e feriados do ano letivo anterior recalculando datas (domingos ajustados para sábados)"
                    >
                      <Copy className="h-3.5 w-3.5 mr-1" />
                      {replicating ? 'Replicando...' : 'Replicar do ano anterior'}
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="text-xs space-y-4">
                {/* Alerta quando o ano selecionado não tiver registros salvos */}
                {!selectedAnoLetivoRecord && (
                  <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 rounded-lg text-amber-900 dark:text-amber-200 flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 shrink-0 text-amber-600" />
                    <span>
                      O ano letivo <strong>{selectedYearNum}</strong> ainda não possui configuração
                      gravada. Preencha os campos abaixo com as datas oficiais ou clique em{' '}
                      <em>Replicar do ano anterior</em>.
                    </span>
                  </div>
                )}

                {/* Linha 1: Parâmetros do Calendário */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 p-3.5 rounded-lg bg-slate-50 dark:bg-slate-900 border">
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">Ano Selecionado</Label>
                    <Input
                      type="number"
                      readOnly
                      value={selectedYearNum}
                      className="bg-slate-100 dark:bg-slate-800 font-bold"
                    />
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-semibold">Data de Início das Aulas</Label>
                      {yearForm.startDate && (
                        <span className="text-[10px] text-indigo-600 font-mono font-medium">
                          {formatDate(yearForm.startDate)}
                        </span>
                      )}
                    </div>
                    <DatePickerBR
                      value={yearForm.startDate}
                      onChange={(val) => setYearForm({ ...yearForm, startDate: val })}
                    />
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-semibold">
                        Data de Encerramento (Prevista)
                      </Label>
                      {yearForm.endDate && (
                        <span className="text-[10px] text-indigo-600 font-mono font-medium">
                          {formatDate(yearForm.endDate)}
                        </span>
                      )}
                    </div>
                    <DatePickerBR
                      value={yearForm.endDate || ''}
                      onChange={(val) => setYearForm({ ...yearForm, endDate: val })}
                    />
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-semibold">
                        Início do Recesso de Meio de Ano
                      </Label>
                      {yearForm.winterBreakStart && (
                        <span className="text-[10px] text-indigo-600 font-mono font-medium">
                          {formatDate(yearForm.winterBreakStart)}
                        </span>
                      )}
                    </div>
                    <DatePickerBR
                      value={yearForm.winterBreakStart || ''}
                      onChange={(val) => setYearForm({ ...yearForm, winterBreakStart: val })}
                    />
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-semibold">Fim do Recesso de Meio de Ano</Label>
                      {yearForm.winterBreakEnd && (
                        <span className="text-[10px] text-indigo-600 font-mono font-medium">
                          {formatDate(yearForm.winterBreakEnd)}
                        </span>
                      )}
                    </div>
                    <DatePickerBR
                      value={yearForm.winterBreakEnd || ''}
                      onChange={(val) => setYearForm({ ...yearForm, winterBreakEnd: val })}
                    />
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-semibold">Data da Festa de Natal</Label>
                      {yearForm.christmasDate && (
                        <span className="text-[10px] text-indigo-600 font-mono font-medium">
                          {formatDate(yearForm.christmasDate)}
                        </span>
                      )}
                    </div>
                    <DatePickerBR
                      value={yearForm.christmasDate || ''}
                      onChange={(val) => setYearForm({ ...yearForm, christmasDate: val })}
                    />
                  </div>
                </div>

                {/* Linha 2: Sábados com Recesso Configurados */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      Sábados com Recesso / Feriados Excluídos do Calendário ({recessList.length})
                    </Label>
                  </div>

                  <div className="max-h-60 overflow-y-auto space-y-1.5 border rounded-lg p-2 bg-slate-50/50 dark:bg-slate-900/30">
                    {recessList.map((rec, i) => {
                      const dStr = rec.date.split('T')[0]
                      const matchedJan = janelasDoAno.find(
                        (j) => j.data_inicio.startsWith(dStr) || j.nome === rec.name,
                      )
                      const startDateStr = matchedJan?.data_inicio
                        ? matchedJan.data_inicio.split('T')[0]
                        : dStr
                      const endDateStr = matchedJan?.data_fim
                        ? matchedJan.data_fim.split('T')[0]
                        : startDateStr
                      const hasMultiDays = endDateStr !== startDateStr

                      return (
                        <div
                          key={`${rec.date}-${i}`}
                          className="flex items-center justify-between p-2 rounded bg-white dark:bg-slate-900 border text-xs gap-2"
                        >
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            <Badge
                              variant="outline"
                              className="font-mono text-[10px] font-semibold text-indigo-700 bg-indigo-50 border-indigo-200 shrink-0"
                            >
                              {hasMultiDays
                                ? `${formatDate(startDateStr)} a ${formatDate(endDateStr)}`
                                : formatDate(startDateStr)}
                            </Badge>
                            <span
                              className="font-medium text-slate-800 dark:text-slate-200 truncate"
                              title={rec.name}
                            >
                              {rec.name}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            {canManage && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleOpenEditJanela(rec, i)}
                                className="h-7 px-2 text-xs text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/40"
                                title="Alterar período e nome desta janela de feriado"
                              >
                                <Pencil className="h-3 w-3 mr-1" />
                                Alterar
                              </Button>
                            )}
                            {canManage && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleRequestRemoveRecess(i)}
                                className="h-7 w-7 p-0 text-rose-600 hover:text-rose-800 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                                title="Remover recesso"
                              >
                                <X className="h-3.5 w-3.5" />
                              </Button>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  {/* Formulário para Adicionar Sábado com Recesso */}
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 pt-1 items-end">
                    <div className="sm:col-span-4 space-y-1">
                      <div className="flex items-center justify-between">
                        <Label className="text-[11px]">Data do Sábado de Recesso</Label>
                        {newRecessDate && (
                          <span className="text-[10px] text-indigo-600 font-mono">
                            {formatDate(newRecessDate)}
                          </span>
                        )}
                      </div>
                      <DatePickerBR
                        value={newRecessDate}
                        onChange={(val) => setNewRecessDate(val)}
                      />
                    </div>
                    <div className="sm:col-span-6 space-y-1">
                      <Label className="text-[11px]">Nome / Motivo do Recesso</Label>
                      <Input
                        placeholder="Ex: Sábado de Páscoa ou Recesso Municipal"
                        value={newRecessName}
                        onChange={(e) => setNewRecessName(e.target.value)}
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleAddRecess}
                        className="w-full text-xs h-9"
                      >
                        <Plus className="h-3.5 w-3.5 mr-1" />
                        Adicionar
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                    <Button
                      onClick={handleSaveYearAndHolidays}
                      disabled={savingYear || syncingCalendar}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white w-full sm:w-auto"
                    >
                      {savingYear ? 'Salvando...' : 'Salvar Ano Letivo e Datas'}
                    </Button>

                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleSyncCalendarDates}
                      disabled={savingYear || syncingCalendar}
                      className="border-indigo-300 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-50 w-full sm:w-auto"
                      title="Sincroniza as datas das aulas respeitando a data de início e os recessos configurados"
                    >
                      <RefreshCw
                        className={`h-3.5 w-3.5 mr-1.5 ${syncingCalendar ? 'animate-spin' : ''}`}
                      />
                      {syncingCalendar ? 'Sincronizando...' : 'Sincronizar Calendário de Sábados'}
                    </Button>
                  </div>

                  <p className="text-[11px] text-muted-foreground">
                    As datas salvas definem o cálculo de corte de idade (01/03) e a geração de
                    sábados.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Modal: Novo Operador */}
      <Dialog open={userModalOpen} onOpenChange={handleUserModalOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cadastrar Novo Operador</DialogTitle>
            <DialogDescription className="text-xs">
              Defina o nome, e-mail e papel de acesso do educador ou dirigente.
            </DialogDescription>
          </DialogHeader>

          <div className="py-2 space-y-3 text-xs">
            <div className="space-y-1">
              <Label>Nome Completo *</Label>
              <Input
                placeholder="Ex: Cláudia Silveira"
                value={userForm.name}
                onChange={(e) => setUserForm({ ...userForm, name: e.target.value })}
              />
            </div>

            <div className="space-y-1">
              <Label>E-mail de Acesso *</Label>
              <Input
                type="email"
                placeholder="prof.claudia@cep.org.br"
                value={userForm.email}
                onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
              />
            </div>

            <div className="space-y-1">
              <Label>Papel no Sistema *</Label>
              <Select
                value={userForm.role}
                onValueChange={(val) => setUserForm({ ...userForm, role: val as UserRole })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Administrador (Acesso Total)</SelectItem>
                  <SelectItem value="dirigente">
                    Dirigente (Gestão Pedagógica e Operadores)
                  </SelectItem>
                  <SelectItem value="professor">
                    Professor(a) (Chamada, Planos e Famílias)
                  </SelectItem>
                  <SelectItem value="auxiliar">Auxiliar (Chamada e Apoio)</SelectItem>
                  <SelectItem value="bibliotecario">
                    Bibliotecário(a) (Acervo e Empréstimos)
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label>Senha Inicial</Label>
              <Input
                type="password"
                placeholder="Em branco usa a senha padrão"
                autoComplete="new-password"
                value={userForm.password}
                onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
              />
            </div>

            <div className="space-y-1">
              <Label>Confirmar Senha</Label>
              <Input
                type="password"
                placeholder="Repita a senha inicial"
                autoComplete="new-password"
                value={userConfirmPassword}
                onChange={(e) => setUserConfirmPassword(e.target.value)}
                aria-invalid={
                  userConfirmPassword !== '' && userForm.password !== userConfirmPassword
                }
              />
              {userConfirmPassword !== '' && userForm.password !== userConfirmPassword && (
                <p className="text-[11px] text-rose-600 dark:text-rose-400">
                  As senhas não coincidem.
                </p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => handleUserModalOpenChange(false)}>
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={handleCreateUser}
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              Cadastrar Operador
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal: Redefinir Senha */}
      <Dialog open={resetModalOpen} onOpenChange={setResetModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Redefinir Senha do Operador</DialogTitle>
            <DialogDescription className="text-xs">
              Altere a senha de acesso para <strong>{selectedUser?.name}</strong>.
            </DialogDescription>
          </DialogHeader>

          <div className="py-2 space-y-2 text-xs">
            <Label>Nova Senha</Label>
            <Input
              type="password"
              placeholder="Digite a nova senha (mínimo 8 caracteres)"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
            <Label>Confirmar Nova Senha</Label>
            <Input
              type="password"
              placeholder="Repita a nova senha"
              autoComplete="new-password"
              value={confirmNewPassword}
              onChange={(e) => setConfirmNewPassword(e.target.value)}
              aria-invalid={confirmNewPassword !== '' && newPassword !== confirmNewPassword}
            />
            {confirmNewPassword !== '' && newPassword !== confirmNewPassword && (
              <p className="text-[11px] text-rose-600 dark:text-rose-400">
                As senhas não coincidem.
              </p>
            )}
            <p className="text-[11px] text-muted-foreground">
              Por privacidade e segurança, a senha informada não será exibida na confirmação.
            </p>
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setResetModalOpen(false)}>
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={handleResetPassword}
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              Confirmar Nova Senha
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal: Confirmar Exclusão Definitiva de Operador */}
      <Dialog
        open={deleteModalOpen}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteModalOpen(false)
            setUserToDelete(null)
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-rose-600">
              <AlertTriangle className="h-5 w-5" />
              Excluir Operador Definitivamente
            </DialogTitle>
            <DialogDescription className="text-xs">
              Você está prestes a remover o operador <strong>{userToDelete?.name}</strong> (
              {userToDelete?.email}) da plataforma institucional do{' '}
              <strong>CEP-Coligação Espírita Progressista</strong>.
            </DialogDescription>
          </DialogHeader>

          <div className="py-2 space-y-2 text-xs text-slate-700 dark:text-slate-300">
            <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/40 space-y-1.5">
              <p className="font-semibold text-rose-800 dark:text-rose-300 flex items-center gap-1.5">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                Esta ação é irreversível e definitiva.
              </p>
              <ul className="list-disc list-inside text-rose-700 dark:text-rose-400 space-y-1 text-[11px]">
                <li>O login e o acesso deste operador serão permanentemente revogados.</li>
                <li>
                  Os registros históricos (presenças, planos de aula, empréstimos e lançamentos de
                  DimDim) permanecerão intactos no banco de dados.
                </li>
              </ul>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Deseja realmente confirmar a exclusão deste operador?
            </p>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setDeleteModalOpen(false)
                setUserToDelete(null)
              }}
              disabled={deleting}
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={handleDeleteUser}
              disabled={deleting}
              className="bg-rose-600 hover:bg-rose-700 text-white"
            >
              {deleting ? 'Excluindo...' : 'Sim, Excluir Operador'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal: Cadastrar Novo Ano Letivo */}
      <Dialog open={newYearModalOpen} onOpenChange={setNewYearModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Criar Novo Ano Letivo</DialogTitle>
            <DialogDescription className="text-xs">
              Informe o ano de 4 dígitos para cadastrar um novo ciclo no{' '}
              <strong>CEP-Coligação Espírita Progressista</strong>.
            </DialogDescription>
          </DialogHeader>

          <div className="py-2 space-y-2 text-xs">
            <Label>Ano Letivo (4 dígitos)</Label>
            <Input
              type="number"
              placeholder="Ex: 2028"
              value={newYearInput}
              onChange={(e) => setNewYearInput(parseInt(e.target.value, 10) || 0)}
            />
            <p className="text-[11px] text-muted-foreground">
              O novo ano será criado com status <em>planejado</em> e campos vazios prontos para
              configuração ou replicação.
            </p>
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setNewYearModalOpen(false)}>
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={handleCreateNewYear}
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              Criar Ano Letivo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal: Alterar Janela de Feriado / Recesso */}
      <Dialog open={editJanelaModalOpen} onOpenChange={setEditJanelaModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-indigo-700 dark:text-indigo-400">
              <Calendar className="h-4 w-4" />
              Alterar Janela de Feriado / Recesso
            </DialogTitle>
            <DialogDescription className="text-xs">
              Atualize o nome e as datas de início e fim da janela cadastrada para o ano letivo{' '}
              {selectedYearNum}.
            </DialogDescription>
          </DialogHeader>

          <div className="py-2 space-y-3 text-xs">
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Nome / Motivo do Recesso *</Label>
              <Input
                placeholder="Ex: Sábado de Páscoa ou Recesso Municipal"
                value={editJanelaNome}
                onChange={(e) => setEditJanelaNome(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold">Data de Início *</Label>
                  {editJanelaStart && (
                    <span className="text-[10px] text-indigo-600 font-mono">
                      {formatDate(editJanelaStart)}
                    </span>
                  )}
                </div>
                <DatePickerBR value={editJanelaStart} onChange={(val) => setEditJanelaStart(val)} />
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold">Data de Fim *</Label>
                  {editJanelaEnd && (
                    <span className="text-[10px] text-indigo-600 font-mono">
                      {formatDate(editJanelaEnd)}
                    </span>
                  )}
                </div>
                <DatePickerBR value={editJanelaEnd} onChange={(val) => setEditJanelaEnd(val)} />
              </div>
            </div>

            <p className="text-[11px] text-muted-foreground">
              A alteração será validada contra sobreposições com outras janelas cadastradas. Para
              aplicar ao calendário após salvar, utilize o botão &quot;Sincronizar Calendário de
              Sábados&quot;.
            </p>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEditJanelaModalOpen(false)}
              disabled={savingEditJanela}
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={handleSaveEditJanela}
              disabled={savingEditJanela}
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              {savingEditJanela ? 'Salvando...' : 'Salvar Alteração'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal: Confirmar Exclusão de Janela de Feriado / Recesso */}
      <Dialog
        open={deleteRecessModalOpen}
        onOpenChange={(open) => {
          if (!deletingRecess) {
            setDeleteRecessModalOpen(open)
            if (!open) setRecessToDeleteIndex(null)
          }
        }}
      >
        <DialogContent
          className="max-w-md"
          onInteractOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-rose-600">
              <AlertTriangle className="h-5 w-5 shrink-0" />
              Excluir Janela de Recesso / Feriado
            </DialogTitle>
            <DialogDescription className="text-xs">
              Você está prestes a remover a janela de feriado/recesso{' '}
              <strong>
                {recessToDeleteIndex !== null ? recessList[recessToDeleteIndex]?.name : ''}
              </strong>{' '}
              do calendário do ano letivo {selectedYearNum}.
            </DialogDescription>
          </DialogHeader>

          <div className="py-2 space-y-2 text-xs text-slate-700 dark:text-slate-300">
            <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/40 space-y-1.5">
              <p className="font-semibold text-rose-800 dark:text-rose-300 flex items-center gap-1.5">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                Esta ação é irreversível e definitiva.
              </p>
              <ul className="list-disc list-inside text-rose-700 dark:text-rose-400 space-y-1 text-[11px]">
                <li>
                  A janela de recesso/feriado será desvinculada deste ano letivo no{' '}
                  <strong>Sistema Infanto-CEP</strong>.
                </li>
                <li>
                  Os sábados anteriormente bloqueados por este feriado poderão voltar a constar como
                  dias letivos regulares após a sincronização do calendário.
                </li>
              </ul>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Deseja realmente confirmar a exclusão da janela{' '}
              <strong className="text-slate-900 dark:text-slate-100">
                {recessToDeleteIndex !== null ? recessList[recessToDeleteIndex]?.name : ''}
              </strong>
              ?
            </p>
          </div>

          <DialogFooter className="flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setDeleteRecessModalOpen(false)
                setRecessToDeleteIndex(null)
              }}
              disabled={deletingRecess}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              size="sm"
              variant="destructive"
              onClick={handleConfirmRemoveRecess}
              disabled={deletingRecess}
              className="bg-rose-600 hover:bg-rose-700 text-white"
            >
              {deletingRecess ? 'Excluindo...' : 'Sim, Excluir Janela'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal: Alterar Minha Própria Senha */}
      <ChangePasswordDialog open={ownPasswordModalOpen} onOpenChange={setOwnPasswordModalOpen} />
    </div>
  )
}
