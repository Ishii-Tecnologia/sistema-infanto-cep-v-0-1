import React, { useEffect, useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Trash2,
  AlertTriangle,
  RotateCcw,
  Search,
  Calendar,
  ShieldAlert,
  Clock,
  User,
  Tag,
  FileText,
  Filter,
} from 'lucide-react'
import { SortableTableHead, SortDirection } from '@/components/reports/SortableTableHead'
import { auditLogService, DeletionLog } from '@/services/auditLogs'
import { formatDateTime, formatDate } from '@/lib/academic'
import { useToast } from '@/hooks/use-toast'

export function DeletionLogsReport() {
  const { toast } = useToast()
  const [logs, setLogs] = useState<DeletionLog[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('todos')

  // Ordenação clicável nos cabeçalhos
  const [sortKey, setSortKey] = useState<string>('created')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')

  // Modal de Expurgo
  const [purgeModalOpen, setPurgeModalOpen] = useState(false)
  const [cutoffDate, setCutoffDate] = useState<string>('')
  const [purging, setPurging] = useState(false)

  useEffect(() => {
    loadLogs()
  }, [])

  const loadLogs = async () => {
    try {
      setLoading(true)
      const data = await auditLogService.getLogs({ sort: '-created' })
      setLogs(data)
    } catch (err: any) {
      toast({
        title: 'Sistema Infanto-CEP',
        description:
          'Erro ao carregar logs de exclusão: ' + (err?.message || 'Falha de comunicação.'),
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSort = (columnKey: string) => {
    if (sortKey === columnKey) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(columnKey)
      setSortDirection('asc')
    }
  }

  // Opções únicas de tipo de registro para filtro
  const uniqueTypes = useMemo(() => {
    const set = new Set<string>()
    logs.forEach((l) => {
      if (l.record_type) set.add(l.record_type)
    })
    return Array.from(set).sort()
  }, [logs])

  // Filtragem e Ordenação
  const processedLogs = useMemo(() => {
    let result = [...logs]

    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(
        (l) =>
          l.operator_name.toLowerCase().includes(q) ||
          l.operator_role.toLowerCase().includes(q) ||
          l.record_type.toLowerCase().includes(q) ||
          l.record_identifier.toLowerCase().includes(q) ||
          (l.details || '').toLowerCase().includes(q),
      )
    }

    if (typeFilter !== 'todos') {
      result = result.filter((l) => l.record_type === typeFilter)
    }

    result.sort((a, b) => {
      let valA: any = (a as any)[sortKey] ?? ''
      let valB: any = (b as any)[sortKey] ?? ''

      if (typeof valA === 'string') {
        valA = valA.toLowerCase()
        valB = (valB as string).toLowerCase()
      }

      if (valA < valB) return sortDirection === 'asc' ? -1 : 1
      if (valA > valB) return sortDirection === 'asc' ? 1 : -1
      return 0
    })

    return result
  }, [logs, search, typeFilter, sortKey, sortDirection])

  // Confirmação de Expurgo
  const handleConfirmPurge = async () => {
    if (!cutoffDate) {
      toast({
        title: 'Sistema Infanto-CEP',
        description: 'Por favor, selecione uma data limite válida para o expurgo.',
        variant: 'destructive',
      })
      return
    }

    try {
      setPurging(true)
      const res = await auditLogService.purgeLogsBeforeDate(cutoffDate)
      toast({
        title: 'Sistema Infanto-CEP',
        description: res.message,
      })
      setPurgeModalOpen(false)
      setCutoffDate('')
      await loadLogs()
    } catch (err: any) {
      toast({
        title: 'Sistema Infanto-CEP',
        description: 'Erro ao executar expurgo de logs: ' + (err?.message || 'Falha de permissão.'),
        variant: 'destructive',
      })
    } finally {
      setPurging(false)
    }
  }

  // Prepara valor padrão de data de corte (ex: 3 meses atrás) para facilitar o admin
  const handleOpenPurgeModal = () => {
    const defaultDate = new Date()
    defaultDate.setMonth(defaultDate.getMonth() - 1)
    const y = defaultDate.getFullYear()
    const m = String(defaultDate.getMonth() + 1).padStart(2, '0')
    const d = String(defaultDate.getDate()).padStart(2, '0')
    setCutoffDate(`${y}-${m}-${d}`)
    setPurgeModalOpen(true)
  }

  // Badges visuais por papel
  const getRoleBadge = (role: string) => {
    const r = role.toLowerCase()
    if (r === 'admin') {
      return (
        <Badge variant="outline" className="bg-rose-50 text-rose-700 border-rose-200 text-[10px]">
          Administrador
        </Badge>
      )
    }
    if (r === 'dirigente') {
      return (
        <Badge
          variant="outline"
          className="bg-indigo-50 text-indigo-700 border-indigo-200 text-[10px]"
        >
          Dirigente
        </Badge>
      )
    }
    if (r === 'professor') {
      return (
        <Badge
          variant="outline"
          className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px]"
        >
          Professor
        </Badge>
      )
    }
    if (r === 'auxiliar') {
      return (
        <Badge
          variant="outline"
          className="bg-amber-50 text-amber-700 border-amber-200 text-[10px]"
        >
          Auxiliar
        </Badge>
      )
    }
    if (r === 'bibliotecario') {
      return (
        <Badge variant="outline" className="bg-sky-50 text-sky-700 border-sky-200 text-[10px]">
          Bibliotecário
        </Badge>
      )
    }
    return (
      <Badge variant="outline" className="bg-slate-50 text-slate-700 border-slate-200 text-[10px]">
        {role}
      </Badge>
    )
  }

  return (
    <Card className="shadow-xs border-slate-200 dark:border-slate-800">
      <CardHeader className="pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <CardTitle className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-rose-600" />
              Logs de Exclusão e Auditoria
            </CardTitle>
            <CardDescription className="text-xs">
              Histórico completo de exclusões de cadastros, anos letivos, operadores, exemplares e
              estornos no Sistema Infanto-CEP. Acesso restrito ao papel Administrador.
            </CardDescription>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={loadLogs}
              disabled={loading}
              className="text-xs h-8"
              title="Atualizar lista de logs"
            >
              <RotateCcw className={`h-3.5 w-3.5 mr-1 ${loading ? 'animate-spin' : ''}`} />
              Atualizar
            </Button>

            <Button
              variant="destructive"
              size="sm"
              onClick={handleOpenPurgeModal}
              className="text-xs h-8 font-medium shadow-xs"
              title="Rotina de expurgo permanente de logs antigos"
            >
              <Trash2 className="h-3.5 w-3.5 mr-1" />
              Expurgar Logs por Data
            </Button>
          </div>
        </div>

        {/* Filtros e Busca */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3">
          <div className="relative sm:col-span-2">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Buscar por operador, tipo, registro ou detalhes..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9 text-xs"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-slate-400 shrink-0" />
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-xs shadow-xs focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring"
            >
              <option value="todos">Todos os tipos de registro ({uniqueTypes.length})</option>
              {uniqueTypes.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead className="bg-slate-50 dark:bg-slate-900 border-y border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400">
              <tr>
                <SortableTableHead
                  columnKey="created"
                  currentSortKey={sortKey}
                  currentDirection={sortDirection}
                  onSort={handleSort}
                  className="w-36 min-w-[140px]"
                >
                  Data / Hora
                </SortableTableHead>

                <SortableTableHead
                  columnKey="operator_name"
                  currentSortKey={sortKey}
                  currentDirection={sortDirection}
                  onSort={handleSort}
                  className="w-40 min-w-[150px]"
                >
                  Operador
                </SortableTableHead>

                <SortableTableHead
                  columnKey="operator_role"
                  currentSortKey={sortKey}
                  currentDirection={sortDirection}
                  onSort={handleSort}
                  className="w-28 min-w-[110px]"
                >
                  Papel
                </SortableTableHead>

                <SortableTableHead
                  columnKey="record_type"
                  currentSortKey={sortKey}
                  currentDirection={sortDirection}
                  onSort={handleSort}
                  className="w-36 min-w-[140px]"
                >
                  Tipo de Registro
                </SortableTableHead>

                <SortableTableHead
                  columnKey="record_identifier"
                  currentSortKey={sortKey}
                  currentDirection={sortDirection}
                  onSort={handleSort}
                  className="w-48 min-w-[180px]"
                >
                  Registro Excluído
                </SortableTableHead>

                <SortableTableHead
                  columnKey="details"
                  currentSortKey={sortKey}
                  currentDirection={sortDirection}
                  onSort={handleSort}
                  className="min-w-[220px]"
                >
                  Detalhes / Motivo
                </SortableTableHead>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <RotateCcw className="h-5 w-5 animate-spin text-slate-400" />
                      <span>Carregando logs de auditoria...</span>
                    </div>
                  </td>
                </tr>
              ) : processedLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-500 italic">
                    Nenhum log de exclusão encontrado com os filtros selecionados.
                  </td>
                </tr>
              ) : (
                processedLogs.map((log) => (
                  <tr
                    key={log.id}
                    className="hover:bg-slate-50/60 dark:hover:bg-slate-900/40 transition-colors"
                  >
                    <td className="p-2.5 font-medium whitespace-nowrap text-slate-700 dark:text-slate-300">
                      {formatDateTime(log.created)}
                    </td>

                    <td className="p-2.5 font-semibold text-slate-900 dark:text-slate-100">
                      {log.operator_name}
                    </td>

                    <td className="p-2.5 whitespace-nowrap">{getRoleBadge(log.operator_role)}</td>

                    <td className="p-2.5">
                      <span className="font-medium text-slate-800 dark:text-slate-200">
                        {log.record_type}
                      </span>
                    </td>

                    <td className="p-2.5 font-medium text-slate-900 dark:text-slate-100">
                      {log.record_identifier}
                    </td>

                    <td className="p-2.5 text-slate-600 dark:text-slate-400">
                      {log.details || '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Rodapé informativo */}
        <div className="p-3 bg-slate-50 dark:bg-slate-900/60 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-muted-foreground">
          <span>
            Exibindo <strong>{processedLogs.length}</strong> de <strong>{logs.length}</strong>{' '}
            registro(s) de log.
          </span>
          <span className="text-[11px] italic">
            Registrado automaticamente em tempo real no Sistema Infanto-CEP.
          </span>
        </div>
      </CardContent>

      {/* Modal de Confirmação de Expurgo Seguro (não fechável por ESC nem clique externo) */}
      <Dialog
        open={purgeModalOpen}
        onOpenChange={(open) => {
          if (!open && !purging) setPurgeModalOpen(false)
        }}
      >
        <DialogContent
          className="sm:max-w-md"
          onPointerDownOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-rose-600">
              <AlertTriangle className="h-5 w-5 shrink-0" />
              Expurgo de Logs de Exclusão
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-600 dark:text-slate-400 pt-1">
              Esta rotina exclui permanentemente todos os registros de log de auditoria com data
              anterior à data limite informada.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-md text-rose-800 dark:text-rose-300 space-y-1">
              <p className="font-semibold flex items-center gap-1.5">
                <ShieldAlert className="h-4 w-4 shrink-0 text-rose-600" />
                Aviso de Irreversibilidade:
              </p>
              <p>
                Os logs anteriores à data escolhida serão <strong>removidos definitivamente</strong>{' '}
                e não poderão ser recuperados. A ação em si será registrada como um evento de
                expurgo no Sistema Infanto-CEP.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="cutoff-date" className="text-xs font-semibold">
                Expurgar logs anteriores a (data limite):
              </Label>
              <Input
                id="cutoff-date"
                type="date"
                value={cutoffDate}
                onChange={(e) => setCutoffDate(e.target.value)}
                className="text-xs"
              />
              <p className="text-[11px] text-muted-foreground">
                Todos os logs criados antes de{' '}
                <strong>{cutoffDate ? formatDate(cutoffDate) : 'data selecionada'} 00:00</strong>{' '}
                serão apagados.
              </p>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setPurgeModalOpen(false)
                toast({
                  title: 'Sistema Infanto-CEP',
                  description:
                    'Operação de expurgo cancelada. Todos os logs foram mantidos intactos.',
                })
              }}
              disabled={purging}
              className="text-xs"
            >
              Cancelar (Manter Intacto)
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleConfirmPurge}
              disabled={purging || !cutoffDate}
              className="text-xs font-semibold"
            >
              {purging ? (
                <>
                  <RotateCcw className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                  Expurgando...
                </>
              ) : (
                <>
                  <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                  Confirmar Expurgo Permanente
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
