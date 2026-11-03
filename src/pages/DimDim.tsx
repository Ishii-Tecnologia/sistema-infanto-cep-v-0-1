import React, { useEffect, useState } from 'react'
import { dimdimService } from '@/services/dimdim'
import { auditLogService } from '@/services/auditLogs'
import { childService } from '@/services/families'
import { Child, DimDimTransaction, DimDimTransactionType, DimDimCategory } from '@/types'
import { formatDateTime, getClassroomBadge } from '@/lib/academic'
import { useAcademic } from '@/contexts/AcademicContext'
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
  Coins,
  ArrowUpRight,
  ArrowDownLeft,
  RotateCcw,
  Sparkles,
  Search,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Gift,
  Pencil,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { getErrorMessage } from '@/lib/pocketbase/errors'

export default function DimDimPage() {
  const { toast } = useToast()
  const { classrooms } = useAcademic()
  const [children, setChildren] = useState<Child[]>([])
  const [transactions, setTransactions] = useState<DimDimTransaction[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedChildId, setSelectedChildId] = useState<string>('all')

  // Modal de Lançamento Avulso (Crédito ou Débito)
  const [txOpen, setTxOpen] = useState(false)
  const [txForm, setTxForm] = useState<{
    childId: string
    type: DimDimTransactionType
    amount: number
    reason: string
    category: DimDimCategory
  }>({
    childId: '',
    type: 'credit',
    amount: 10,
    reason: 'Presença e participação no sábado',
    category: 'presenca',
  })

  // Modal de Crédito Rápido por Turma
  const [quickOpen, setQuickOpen] = useState(false)
  const [quickClassroom, setQuickClassroom] = useState<string>('A')
  const [quickAmount, setQuickAmount] = useState<number>(10)
  const [quickReason, setQuickReason] = useState<string>('Presença no sábado letivo')

  // Modal de Edição Direta de Saldo DimDim da Criança
  const [balanceEditOpen, setBalanceEditOpen] = useState(false)
  const [editingChild, setEditingChild] = useState<Child | null>(null)
  const [customBalance, setCustomBalance] = useState<number>(0)
  const [savingBalance, setSavingBalance] = useState(false)

  // Modal de Confirmação de Estorno de Lançamento
  const [reverseModalOpen, setReverseModalOpen] = useState(false)
  const [txToReverse, setTxToReverse] = useState<DimDimTransaction | null>(null)
  const [reversing, setReversing] = useState(false)

  useEffect(() => {
    loadDimDimData()
  }, [])

  const loadDimDimData = async () => {
    try {
      setLoading(true)
      const [allChildren, allTx] = await Promise.all([
        childService.getAll(),
        dimdimService.getTransactions(),
      ])

      setChildren(allChildren)
      setTransactions(allTx)
    } catch (err) {
      console.error('Erro ao carregar dados DimDim:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSaveTransaction = async () => {
    if (!txForm.childId) {
      toast({ title: 'Atenção', description: 'Selecione a criança.', variant: 'destructive' })
      return
    }
    if (txForm.amount <= 0) {
      toast({
        title: 'Atenção',
        description: 'O valor deve ser maior que zero.',
        variant: 'destructive',
      })
      return
    }

    try {
      await dimdimService.addTransaction(
        txForm.childId,
        txForm.type,
        txForm.amount,
        txForm.reason,
        txForm.category,
      )

      toast({
        title: txForm.type === 'credit' ? 'Crédito realizado!' : 'Débito lançado!',
        description: `${txForm.amount} DimDim registrados com sucesso.`,
      })
      setTxOpen(false)
      loadDimDimData()
    } catch (err: any) {
      toast({
        title: 'Erro ao lançar transação',
        description: getErrorMessage(err),
        variant: 'destructive',
      })
    }
  }

  const handleQuickCreditClassroom = async () => {
    try {
      const classChildren = children.filter((c) => c.classroom === quickClassroom)
      if (classChildren.length === 0) {
        toast({
          title: 'Atenção',
          description: 'Nenhuma criança cadastrada nesta sala.',
          variant: 'destructive',
        })
        return
      }

      const ids = classChildren.map((c) => c.id)
      await dimdimService.quickCredit(ids, quickAmount, quickReason, 'presenca')

      toast({
        title: 'Crédito coletivo realizado!',
        description: `${quickAmount} DimDim creditados para ${ids.length} crianças da Sala ${quickClassroom}.`,
      })
      setQuickOpen(false)
      loadDimDimData()
    } catch (err: any) {
      toast({
        title: 'Erro no crédito coletivo',
        description: getErrorMessage(err),
        variant: 'destructive',
      })
    }
  }

  const handleOpenEditBalance = (child: Child) => {
    setEditingChild(child)
    setCustomBalance(child.dimdim_balance || 0)
    setBalanceEditOpen(true)
  }

  const handleSaveBalance = async () => {
    if (!editingChild) return
    try {
      setSavingBalance(true)
      await childService.update(editingChild.id, {
        dimdim_balance: customBalance,
      })
      toast({
        title: 'Saldo atualizado!',
        description: `O saldo de DimDim de ${editingChild.name} foi ajustado para ${customBalance}.`,
      })
      setBalanceEditOpen(false)
      setEditingChild(null)
      loadDimDimData()
    } catch (err: any) {
      toast({
        title: 'Erro ao atualizar saldo',
        description: getErrorMessage(err),
        variant: 'destructive',
      })
    } finally {
      setSavingBalance(false)
    }
  }

  const handleRequestReverseTransaction = (tx: DimDimTransaction) => {
    setTxToReverse(tx)
    setReverseModalOpen(true)
  }

  const handleConfirmReverseTransaction = async () => {
    if (!txToReverse) return
    try {
      setReversing(true)
      await dimdimService.reverseTransaction(txToReverse.id)

      // Registra log explícito de auditoria do estorno
      const childName = txToReverse.expand?.child_id?.name || 'aluno'
      auditLogService.recordLog({
        recordType: 'Estorno DimDim',
        recordIdentifier: `Estorno de ${txToReverse.amount} DD (${childName})`,
        details: `Lançamento original: "${txToReverse.reason}" (${txToReverse.type}) • Aluno: ${childName}`,
      })

      toast({
        title: 'Sistema Infanto-CEP',
        description: `O lançamento de ${txToReverse.amount} DimDim foi estornado com sucesso no Sistema Infanto-CEP.`,
      })
      setReverseModalOpen(false)
      setTxToReverse(null)
      loadDimDimData()
    } catch (err: any) {
      toast({
        title: 'Erro ao estornar transação',
        description: getErrorMessage(err),
        variant: 'destructive',
      })
    } finally {
      setReversing(false)
    }
  }

  const filteredChildren = children.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()),
  )

  const filteredTransactions = transactions.filter((t) => {
    if (selectedChildId !== 'all' && t.child_id !== selectedChildId) return false
    return true
  })

  const totalCirculation = children.reduce((acc, c) => acc + (c.dimdim_balance || 0), 0)

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400 font-semibold uppercase tracking-wider mb-0.5">
            <Sparkles className="h-4 w-4" /> Moeda Educativa Espírita
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Gestão do DimDim
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Incentivo pedagógico por presença, dedicação e tarefas. Débitos para feirinha e
            premiações.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            onClick={() => setQuickOpen(true)}
            variant="outline"
            className="border-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/30 text-amber-800 dark:text-amber-200"
          >
            <Coins className="h-4 w-4 mr-1.5" />
            Crédito Rápido por Turma
          </Button>

          <Button
            onClick={() => {
              setTxForm({
                childId: children[0]?.id || '',
                type: 'credit',
                amount: 10,
                reason: 'Participação ativa na aula',
                category: 'presenca',
              })
              setTxOpen(true)
            }}
            className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold"
          >
            <ArrowUpRight className="h-4 w-4 mr-1.5" />
            Novo Lançamento
          </Button>
        </div>
      </div>

      {/* Cartões de Indicadores DimDim */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-amber-50 to-amber-100/40 dark:from-amber-950/20 dark:to-slate-900 border-amber-200 dark:border-amber-900">
          <CardHeader className="pb-1">
            <CardTitle className="text-xs font-semibold uppercase text-amber-900 dark:text-amber-200">
              Total em Circulação
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl sm:text-3xl font-bold text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
              <Coins className="h-6 w-6" /> {totalCirculation} DimDim
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              Distribuídos entre as {children.length} crianças ativas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="text-xs font-semibold uppercase text-muted-foreground">
              Regra de Pontuação Padrão
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs space-y-1">
            <p>
              • Presença no Sábado: <strong>+10 DimDim</strong>
            </p>
            <p>
              • Tarefa / Colaboração: <strong>+5 DimDim</strong>
            </p>
            <p>
              • Feirinha / Premiação: <strong>-20 DimDim</strong>
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="text-xs font-semibold uppercase text-muted-foreground">
              Total de Transações
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{transactions.length}</div>
            <p className="text-[11px] text-muted-foreground mt-1">
              Histórico com rastreamento e estornos
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="saldos" className="space-y-4">
        <TabsList className="grid grid-cols-2 max-w-sm">
          <TabsTrigger value="saldos">Saldos por Criança</TabsTrigger>
          <TabsTrigger value="extrato">Extrato Completo</TabsTrigger>
        </TabsList>

        {/* ABA 1: SALDOS POR CRIANÇA */}
        <TabsContent value="saldos" className="space-y-4">
          <Card>
            <CardContent className="p-4">
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Pesquisar criança por nome..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredChildren.map((child) => {
              const badge = getClassroomBadge(child.classroom, classrooms)
              return (
                <Card
                  key={child.id}
                  className="p-3.5 space-y-2 hover:border-amber-300 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className="h-8 w-8 rounded-full overflow-hidden bg-slate-200 shrink-0">
                        {child.photo_url ? (
                          <img
                            src={child.photo_url}
                            alt={child.name}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <span className="text-xs flex items-center justify-center h-full font-bold text-slate-600">
                            {child.name.charAt(0)}
                          </span>
                        )}
                      </div>
                      <div>
                        <p className="font-bold text-xs text-slate-900 dark:text-slate-100 truncate max-w-[130px]">
                          {child.name}
                        </p>
                        <Badge variant="outline" className={`text-[10px] px-1 py-0 ${badge.color}`}>
                          {badge.name}
                        </Badge>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-lg font-bold text-amber-600 dark:text-amber-400">
                        {child.dimdim_balance || 0}
                      </span>
                      <span className="text-[10px] text-muted-foreground block -mt-1">DimDim</span>
                    </div>
                  </div>

                  <div className="pt-2 border-t flex items-center justify-between gap-1 text-xs">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleOpenEditBalance(child)}
                      className="h-7 text-[11px] px-2 text-slate-500 hover:text-indigo-600"
                      title="Ajustar saldo diretamente"
                    >
                      <Pencil className="h-3 w-3 mr-1" />
                      Editar
                    </Button>

                    <div className="flex items-center gap-1.5">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setTxForm({
                            childId: child.id,
                            type: 'credit',
                            amount: 10,
                            reason: 'Incentivo pedagógico',
                            category: 'comportamento',
                          })
                          setTxOpen(true)
                        }}
                        className="h-7 text-[11px] px-2 text-emerald-600 border-emerald-200"
                      >
                        + Creditar
                      </Button>

                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setTxForm({
                            childId: child.id,
                            type: 'debit',
                            amount: 10,
                            reason: 'Troca na feirinha de prêmios',
                            category: 'premiacao',
                          })
                          setTxOpen(true)
                        }}
                        className="h-7 text-[11px] px-2 text-rose-600 border-rose-200"
                      >
                        - Debitar
                      </Button>
                    </div>
                  </div>
                </Card>
              )
            })}
          </div>
        </TabsContent>

        {/* ABA 2: EXTRATO COMPLETO */}
        <TabsContent value="extrato" className="space-y-4">
          <Card>
            <CardContent className="p-4 flex flex-col sm:flex-row gap-3">
              <div className="w-full sm:w-64">
                <Label className="text-xs mb-1 block">Filtrar por Criança</Label>
                <Select value={selectedChildId} onValueChange={setSelectedChildId}>
                  <SelectTrigger className="text-xs h-9">
                    <SelectValue placeholder="Todas as crianças" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as Crianças</SelectItem>
                    {children.map((c) => (
                      <SelectItem key={c.id} value={c.id} className="text-xs">
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-0">
              <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                {filteredTransactions.map((tx) => {
                  const isCredit = tx.type === 'credit'
                  const isReversal = tx.type === 'reversal'

                  return (
                    <div
                      key={tx.id}
                      className="p-3.5 flex items-center justify-between hover:bg-slate-50/50 dark:hover:bg-slate-900/50"
                    >
                      <div className="flex items-center space-x-3">
                        <div
                          className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 ${
                            isCredit
                              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                              : isReversal
                                ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                                : 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                          }`}
                        >
                          {isCredit ? (
                            <ArrowUpRight className="h-4 w-4" />
                          ) : isReversal ? (
                            <RotateCcw className="h-4 w-4" />
                          ) : (
                            <ArrowDownLeft className="h-4 w-4" />
                          )}
                        </div>

                        <div>
                          <p className="font-bold text-slate-900 dark:text-slate-100">
                            {tx.reason}
                          </p>
                          <p className="text-[11px] text-muted-foreground">
                            Aluno: <strong>{tx.expand?.child_id?.name || 'Criança'}</strong> •{' '}
                            {formatDateTime(tx.created)}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center space-x-3">
                        <span
                          className={`font-bold text-sm ${
                            isCredit
                              ? 'text-emerald-600'
                              : isReversal
                                ? 'text-amber-600'
                                : 'text-rose-600'
                          }`}
                        >
                          {isCredit ? `+${tx.amount}` : `-${tx.amount}`} DimDim
                        </span>

                        {!isReversal && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleRequestReverseTransaction(tx)}
                            className="h-7 text-[10px] text-slate-500 hover:text-rose-600"
                            title="Estornar lançamento"
                          >
                            Estornar
                          </Button>
                        )}
                      </div>
                    </div>
                  )
                })}

                {filteredTransactions.length === 0 && (
                  <div className="p-8 text-center text-muted-foreground text-xs">
                    Nenhuma transação encontrada para o filtro selecionado.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Modal: Lançamento Avulso */}
      <Dialog open={txOpen} onOpenChange={setTxOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Lançamento de DimDim</DialogTitle>
            <DialogDescription className="text-xs">
              Crédito por participação ou débito para retirada de prêmios na feirinha.
            </DialogDescription>
          </DialogHeader>

          <div className="py-2 space-y-3 text-xs">
            <div className="space-y-1">
              <Label>Criança</Label>
              <Select
                value={txForm.childId}
                onValueChange={(val) => setTxForm({ ...txForm, childId: val })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a criança..." />
                </SelectTrigger>
                <SelectContent>
                  {children.map((c) => (
                    <SelectItem key={c.id} value={c.id} className="text-xs">
                      {c.name} (Saldo: {c.dimdim_balance || 0} DimDim)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Tipo de Operação</Label>
                <Select
                  value={txForm.type}
                  onValueChange={(val) =>
                    setTxForm({ ...txForm, type: val as DimDimTransactionType })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="credit">Crédito (+)</SelectItem>
                    <SelectItem value="debit">Débito (-)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label>Quantidade de DimDim</Label>
                <Input
                  type="number"
                  min={1}
                  value={txForm.amount}
                  onChange={(e) => setTxForm({ ...txForm, amount: parseInt(e.target.value) || 0 })}
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label>Motivo do Lançamento</Label>
              <Input
                placeholder="Ex: Presença pontual, ajudou o colega, feirinha..."
                value={txForm.reason}
                onChange={(e) => setTxForm({ ...txForm, reason: e.target.value })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setTxOpen(false)}>
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={handleSaveTransaction}
              className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold"
            >
              Confirmar Lançamento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal: Crédito Rápido por Turma */}
      <Dialog open={quickOpen} onOpenChange={setQuickOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Crédito Coletivo por Sala</DialogTitle>
            <DialogDescription className="text-xs">
              Credite uma quantidade fixa de DimDim para todas as crianças de uma sala de uma só vez
              (ex: todas as presenças da aula).
            </DialogDescription>
          </DialogHeader>

          <div className="py-2 space-y-3 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Sala Selecionada</Label>
                <Select value={quickClassroom} onValueChange={setQuickClassroom}>
                  <SelectTrigger>
                    <SelectValue />
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

              <div className="space-y-1">
                <Label>Valor por Aluno</Label>
                <Input
                  type="number"
                  min={1}
                  value={quickAmount}
                  onChange={(e) => setQuickAmount(parseInt(e.target.value, 10) || 0)}
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label>Motivo Coletivo</Label>
              <Input value={quickReason} onChange={(e) => setQuickReason(e.target.value)} />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setQuickOpen(false)}>
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={handleQuickCreditClassroom}
              className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold"
            >
              Executar Crédito Coletivo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal: Confirmação de Estorno de Lançamento */}
      <Dialog
        open={reverseModalOpen}
        onOpenChange={(open) => {
          if (!reversing) {
            setReverseModalOpen(open)
            if (!open) setTxToReverse(null)
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
              Estornar Lançamento de DimDim
            </DialogTitle>
            <DialogDescription className="text-xs">
              Você está prestes a estornar a transação &quot;{txToReverse?.reason}&quot; (
              {txToReverse?.amount} DimDim) de{' '}
              <strong>{txToReverse?.expand?.child_id?.name || 'aluno'}</strong> no{' '}
              <strong>Sistema Infanto-CEP</strong>.
            </DialogDescription>
          </DialogHeader>

          <div className="py-2 space-y-2 text-xs text-slate-700 dark:text-slate-300">
            <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/40 space-y-1.5">
              <p className="font-semibold text-rose-800 dark:text-rose-300 flex items-center gap-1.5">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                Esta ação reverte o saldo e não pode ser desfeita.
              </p>
              <ul className="list-disc list-inside text-rose-700 dark:text-rose-400 space-y-1 text-[11px]">
                <li>
                  {txToReverse?.type === 'credit'
                    ? `O saldo da criança será debitado em ${txToReverse?.amount} DimDim.`
                    : `O saldo da criança será creditado de volta em ${txToReverse?.amount} DimDim.`}
                </li>
                <li>
                  Um registro de estorno será gerado no extrato para auditoria e histórico de
                  lançamentos.
                </li>
              </ul>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Deseja realmente confirmar o estorno deste lançamento?
            </p>
          </div>

          <DialogFooter className="flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setReverseModalOpen(false)
                setTxToReverse(null)
              }}
              disabled={reversing}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              size="sm"
              variant="destructive"
              onClick={handleConfirmReverseTransaction}
              disabled={reversing}
              className="bg-rose-600 hover:bg-rose-700 text-white"
            >
              {reversing ? 'Estornando...' : 'Sim, Estornar Lançamento'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal: Editar Saldo de DimDim da Criança */}
      <Dialog open={balanceEditOpen} onOpenChange={setBalanceEditOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Saldo de DimDim</DialogTitle>
            <DialogDescription className="text-xs">
              Ajuste o saldo total acumulado de {editingChild?.name}.
            </DialogDescription>
          </DialogHeader>

          <div className="py-2 space-y-3 text-xs">
            <div className="space-y-1">
              <Label>Saldo de DimDim</Label>
              <Input
                type="number"
                min={0}
                value={customBalance}
                onChange={(e) => setCustomBalance(parseInt(e.target.value, 10) || 0)}
              />
              <p className="text-[11px] text-muted-foreground">
                Informe o valor total corrigido para esta criança.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setBalanceEditOpen(false)}
              disabled={savingBalance}
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={handleSaveBalance}
              disabled={savingBalance}
              className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold"
            >
              {savingBalance ? 'Salvando...' : 'Salvar Saldo'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
