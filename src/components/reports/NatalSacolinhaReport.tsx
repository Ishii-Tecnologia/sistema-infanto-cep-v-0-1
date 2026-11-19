import React, { useMemo, useState } from 'react'
import { Gift, User, CalendarClock, UserCircle2, Loader2, AlertCircle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { SortableTableHead, SortDirection } from '@/components/reports/SortableTableHead'
import { NatalEntrega } from '@/services/natalEntregas'
import { formatNatalDateTime } from '@/services/natalEntregas'

interface NatalSacolinhaReportProps {
  entregas: NatalEntrega[]
  /** Nome de referência da família por id (resolvido a partir da lista de famílias). */
  familyNameById: Map<string, string>
  /** Nome do responsável principal/primeiro responsável por id de família. */
  guardianNameByFamilyId: Map<string, string>
  loading?: boolean
}

type SortKey = 'family' | 'picked_by' | 'delivered_at'

/**
 * Relatório "Entregas da Sacolinha de Natal": lista somente leitura dos
 * lançamentos da sacolinha (coleção natal_entregas), ordenada por família e,
 * dentro da mesma família, pela data/hora do lançamento.
 */
export function NatalSacolinhaReport({
  entregas,
  familyNameById,
  guardianNameByFamilyId,
  loading = false,
}: NatalSacolinhaReportProps) {
  const [sortKey, setSortKey] = useState<SortKey>('family')
  const [sortDir, setSortDir] = useState<SortDirection>('asc')

  const handleSort = (key: string) => {
    if (!['family', 'picked_by', 'delivered_at'].includes(key)) return
    if (sortKey === key) {
      setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key as SortKey)
      setSortDir('asc')
    }
  }

  const rows = useMemo(() => {
    const list = entregas.map((e) => {
      const familyName = familyNameById.get(e.family_id) || 'Família (registro removido)'
      const guardianName = guardianNameByFamilyId.get(e.family_id) || ''
      return { entrega: e, familyName, guardianName }
    })

    const dirFactor = sortDir === 'asc' ? 1 : -1
    list.sort((a, b) => {
      if (sortKey === 'picked_by') {
        const aName = (a.entrega.person_name || '').toLowerCase()
        const bName = (b.entrega.person_name || '').toLowerCase()
        if (aName !== bName) return aName < bName ? -1 * dirFactor : 1 * dirFactor
        // desempate: família, depois data
        const aFam = a.familyName.toLowerCase()
        const bFam = b.familyName.toLowerCase()
        if (aFam !== bFam) return aFam < bFam ? -1 * dirFactor : 1 * dirFactor
      }
      if (sortKey === 'delivered_at') {
        const aTime = a.entrega.delivered_at || ''
        const bTime = b.entrega.delivered_at || ''
        if (aTime !== bTime) return aTime < bTime ? -1 * dirFactor : 1 * dirFactor
        const aFam = a.familyName.toLowerCase()
        const bFam = b.familyName.toLowerCase()
        if (aFam !== bFam) return aFam < bFam ? -1 * dirFactor : 1 * dirFactor
      }
      // padrão: família, depois data/hora
      const famA = a.familyName.toLowerCase()
      const famB = b.familyName.toLowerCase()
      if (famA !== famB) return famA < famB ? -1 * dirFactor : 1 * dirFactor
      const tA = a.entrega.delivered_at || ''
      const tB = b.entrega.delivered_at || ''
      if (tA !== tB) return tA < tB ? -1 * dirFactor : 1 * dirFactor
      return 0
    })

    return list
  }, [entregas, familyNameById, guardianNameByFamilyId, sortKey, sortDir])

  const familyCount = useMemo(() => {
    const set = new Set(entregas.map((e) => e.family_id))
    return set.size
  }, [entregas])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        <Loader2 className="h-5 w-5 mr-2 animate-spin" />
        Carregando entregas da sacolinha...
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <Card className="border shadow-xs overflow-hidden print:shadow-none print:border-slate-300">
        <CardHeader className="bg-slate-50/80 dark:bg-slate-900/80 p-3 sm:p-4 border-b flex flex-row items-center justify-between gap-2">
          <div>
            <CardTitle className="text-sm sm:text-base font-bold flex items-center gap-2 text-slate-800 dark:text-slate-100">
              <Gift className="h-4 w-4 text-rose-600" />
              Entregas da Sacolinha de Natal
            </CardTitle>
            <CardDescription className="text-xs mt-0.5">
              Lançamentos da sacolinha por família, com responsável, quem pegou e data/hora.
            </CardDescription>
          </div>
          <Badge variant="secondary" className="text-xs font-semibold whitespace-nowrap">
            {entregas.length} entrega(s) · {familyCount} família(s)
          </Badge>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50 dark:bg-slate-900 text-xs">
                <TableRow>
                  <TableHead className="w-12 text-center font-bold text-slate-700">#</TableHead>
                  <SortableTableHead
                    columnKey="family"
                    currentSortKey={sortKey}
                    currentDirection={sortDir}
                    onSort={handleSort}
                  >
                    Família
                  </SortableTableHead>
                  <TableHead className="font-bold text-slate-700">
                    <span className="inline-flex items-center gap-1">
                      <UserCircle2 className="h-3.5 w-3.5" /> Responsável
                    </span>
                  </TableHead>
                  <SortableTableHead
                    columnKey="picked_by"
                    currentSortKey={sortKey}
                    currentDirection={sortDir}
                    onSort={handleSort}
                  >
                    <span className="inline-flex items-center gap-1">
                      <User className="h-3.5 w-3.5" /> Quem pegou a sacolinha
                    </span>
                  </SortableTableHead>
                  <SortableTableHead
                    columnKey="delivered_at"
                    currentSortKey={sortKey}
                    currentDirection={sortDir}
                    onSort={handleSort}
                    align="center"
                  >
                    <span className="inline-flex items-center gap-1">
                      <CalendarClock className="h-3.5 w-3.5" /> Data e hora
                    </span>
                  </SortableTableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="text-xs">
                {rows.map(({ entrega, familyName, guardianName }, index) => (
                  <TableRow
                    key={entrega.id}
                    className="transition-colors hover:bg-slate-50 dark:hover:bg-slate-900/50"
                  >
                    <TableCell className="text-center font-mono text-muted-foreground text-[11px]">
                      {index + 1}
                    </TableCell>
                    <TableCell className="font-semibold text-slate-900 dark:text-slate-100">
                      {familyName}
                    </TableCell>
                    <TableCell className="text-slate-600 dark:text-slate-300">
                      {guardianName ? (
                        guardianName
                      ) : (
                        <span className="text-muted-foreground italic">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-slate-600 dark:text-slate-300">
                      {entrega.person_name ? (
                        entrega.person_name
                      ) : (
                        <span className="text-muted-foreground italic">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center whitespace-nowrap text-slate-600 dark:text-slate-300">
                      {formatNatalDateTime(entrega.delivered_at)}
                    </TableCell>
                  </TableRow>
                ))}

                {rows.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-6 text-muted-foreground">
                      Nenhuma entrega da sacolinha registrada para o ano letivo selecionado.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {entregas.length > 0 && familyCount === 0 && (
        <div className="flex items-start gap-2 text-xs text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 rounded-md p-3">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          Há lançamentos sem vínculo de família válido; revise-os na Festa de Natal.
        </div>
      )}
    </div>
  )
}
