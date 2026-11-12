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
import { KeyRound, UserPlus, BookOpen, Coins, Trash2, AlertTriangle, Sliders } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { ChangePasswordDialog } from '@/components/ChangePasswordDialog'

import { useAcademic } from '@/contexts/AcademicContext'
import { getErrorMessage } from '@/lib/pocketbase/errors'

export default function SettingsPage() {
  const { toast } = useToast()
  const { user: currentUser } = useAuth()
  const { classrooms, pedagogicalPlans, saveClassrooms, savePedagogicalPlans } = useAcademic()

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

  // Edição de Salas no Settings
  const [editingRooms, setEditingRooms] = useState(classrooms)
  const [savingRooms, setSavingRooms] = useState(false)

  // Edição de Planos Pedagógicos por Sala
  const [editingPlans, setEditingPlans] = useState(pedagogicalPlans)
  const [savingPlans, setSavingPlans] = useState(false)

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
            Gestão de contas de acesso, papéis de permissão e regras do sistema.
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

      {/* Modal: Alterar Minha Própria Senha */}
      <ChangePasswordDialog open={ownPasswordModalOpen} onOpenChange={setOwnPasswordModalOpen} />
    </div>
  )
}
