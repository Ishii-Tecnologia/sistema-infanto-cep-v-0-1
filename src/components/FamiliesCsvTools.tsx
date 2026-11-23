/**
 * Ferramentas de CSV da tela /familias: Exportar, Baixar Modelo e Importar.
 * Mantidas em um módulo próprio para não crescer o Families.tsx. Os fluxos de
 * voz/ditado e o wizard de cadastro existentes não são tocados por este código.
 */
import React, { useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Download, FileDown, Upload, AlertTriangle, CheckCircle2, Loader2 } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { getErrorMessage } from '@/lib/pocketbase/errors'
import { Family } from '@/types'
import { useAcademic } from '@/contexts/AcademicContext'
import {
  exportFamiliesCsv,
  downloadFamiliesCsvTemplate,
  parseFamiliesCsv,
  filterRowsBySearchText,
  applyFamiliesCsv,
  CsvImportResult,
} from '@/services/familiesCsv'

interface FamiliesCsvToolsProps {
  families: Family[]
  /** Busca/filtro de texto da tela: quando preenchido, o CSV importa somente as famílias que casam com ele. */
  searchText: string
  /** Recarrega a lista de famílias após uma importação bem-sucedida. */
  onImported: () => void
}

export function FamiliesCsvTools({ families, searchText, onImported }: FamiliesCsvToolsProps) {
  const { toast } = useToast()
  // Mesmo classificador de sala do cadastro individual (idade na data de corte)
  const { classifyChild } = useAcademic()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [importOpen, setImportOpen] = useState(false)
  const [importing, setImporting] = useState(false)
  const [pendingFileName, setPendingFileName] = useState('')
  const [result, setResult] = useState<{
    fileName: string
    summary: CsvImportResult
    ignoredFamilies: number
    ignoredLines: number
  } | null>(null)

  const handleExport = () => {
    try {
      if (families.length === 0) {
        toast({
          title: 'Nada para exportar',
          description:
            'Nenhuma família cadastrada ainda no Sistema Infanto-CEP. Cadastre famílias primeiro.',
        })
        return
      }
      exportFamiliesCsv(families)
      toast({
        title: 'CSV exportado',
        description: `Arquivo com ${families.length} família(s) gerado. Abra no Excel — os acentos são preservados.`,
      })
    } catch (err) {
      toast({
        title: 'Erro ao exportar CSV',
        description: getErrorMessage(err),
        variant: 'destructive',
      })
    }
  }

  const handleFileSelected = async (file: File | undefined) => {
    if (!file) return
    setPendingFileName(file.name)
    setImporting(true)
    try {
      const text = await file.text()
      const rows = parseFamiliesCsv(text, classifyChild)
      const filterActive = searchText.trim().length > 0
      const filtered = filterRowsBySearchText(rows, searchText)
      if (filtered.rows.length === 0) {
        setResult({
          fileName: file.name,
          summary: {
            familiesCreated: 0,
            familiesUpdated: 0,
            guardiansCreated: 0,
            guardiansUpdated: 0,
            childrenCreated: 0,
            childrenUpdated: 0,
            errors: [],
          },
          ignoredFamilies: filtered.ignoredFamilies,
          ignoredLines: filtered.ignoredLines,
        })
        toast({
          title: 'Nada importado',
          description: `O filtro "${searchText.trim()}" não casa com nenhuma família do arquivo — ${filtered.ignoredFamilies} família(s) ignorada(s). Limpe a busca da tela para importar tudo.`,
          variant: 'destructive',
        })
        return
      }
      const summary = await applyFamiliesCsv(filtered.rows, families)
      setResult({
        fileName: file.name,
        summary,
        ignoredFamilies: filtered.ignoredFamilies,
        ignoredLines: filtered.ignoredLines,
      })
      onImported()
      if (summary.errors.length === 0) {
        toast({
          title: 'Importação concluída',
          description: `Resumo: ${summary.familiesCreated} família(s) criada(s), ${summary.familiesUpdated} atualizada(s), ${summary.childrenCreated} criança(s) criada(s), ${summary.childrenUpdated} atualizada(s).${
            filterActive
              ? ` ${filtered.ignoredFamilies} família(s) ignorada(s) pelo filtro da tela.`
              : ''
          }`,
        })
      } else {
        toast({
          title: 'Importação concluída com erros',
          description: `${summary.errors.length} linha(s) com problema. Veja o detalhe na janela aberta.${
            filterActive
              ? ` ${filtered.ignoredFamilies} família(s) ignorada(s) pelo filtro da tela.`
              : ''
          }`,
          variant: 'destructive',
        })
      }
    } catch (err) {
      // Erro de formato do arquivo (cabeçalho, linha sem família etc.)
      toast({
        title: 'Arquivo CSV inválido',
        description: getErrorMessage(err),
        variant: 'destructive',
      })
    } finally {
      setImporting(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const totalErrors = result?.summary.errors.length || 0

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={handleExport}
          title="Baixa um arquivo .csv com todas as famílias, responsáveis e crianças (uma linha por criança)"
        >
          <Download className="h-4 w-4 mr-2" />
          Exportar CSV
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={() => setImportOpen(true)}
          title="Importa famílias/responsáveis/crianças de um arquivo .csv no formato do modelo"
        >
          <Upload className="h-4 w-4 mr-2" />
          Importar CSV
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => downloadFamiliesCsvTemplate()}
          title="Baixa um modelo de CSV de exemplo com o cabeçalho correto"
        >
          <FileDown className="h-4 w-4 mr-2" />
          Baixar modelo
        </Button>
      </div>

      {/* Confirmação de importação */}
      <Dialog
        open={importOpen}
        onOpenChange={(open) => !open && !importing && setImportOpen(false)}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Importar CSV</DialogTitle>
            <DialogDescription>
              Selecione um arquivo .csv no formato do modelo. Regras:
              <br />• A família é identificada pelo <strong>Nome de Referência</strong> — existe,
              atualiza; não existe, cria.
              <br />• A criança é identificada por <strong>Nome + Data de Nascimento</strong>; o
              responsável, por <strong>Nome + Parentesco</strong>.
              <br />• Datas em <strong>dd/mm/aaaa</strong>. A sala é definida pela idade na data de
              nascimento, como no cadastro individual.
              <br />• <strong>Nada é apagado</strong>: registros que não estão no arquivo são
              mantidos.
              {searchText.trim() && (
                <>
                  <br />• <strong>Filtro ativo</strong>: a busca "{searchText.trim()}" está
                  preenchida — somente as famílias que casam com ela serão importadas; as demais
                  linhas do arquivo serão ignoradas.
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => handleFileSelected(e.target.files?.[0])}
            />
            {importing ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground py-4 justify-center">
                <Loader2 className="h-4 w-4 animate-spin" />
                Importando {pendingFileName}...
              </div>
            ) : (
              <Button
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="h-4 w-4 mr-2" />
                Escolher arquivo .csv
              </Button>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" disabled={importing} onClick={() => setImportOpen(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Resumo da importação */}
      <Dialog open={result !== null} onOpenChange={(open) => !open && setResult(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {totalErrors > 0 ? (
                <AlertTriangle className="h-5 w-5 text-amber-500" />
              ) : (
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              )}
              {totalErrors > 0 ? 'Importação concluída com erros' : 'Importação concluída'}
            </DialogTitle>
            <DialogDescription>Arquivo: {result?.fileName}</DialogDescription>
          </DialogHeader>

          {result && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="rounded-md border p-2">
                  <span className="font-semibold">{result.summary.familiesCreated}</span> família(s)
                  criada(s)
                </div>
                <div className="rounded-md border p-2">
                  <span className="font-semibold">{result.summary.familiesUpdated}</span> família(s)
                  atualizada(s)
                </div>
                <div className="rounded-md border p-2">
                  <span className="font-semibold">{result.summary.guardiansCreated}</span>{' '}
                  responsável(is) criado(s)
                </div>
                <div className="rounded-md border p-2">
                  <span className="font-semibold">{result.summary.guardiansUpdated}</span>{' '}
                  responsável(is) atualizado(s)
                </div>
                <div className="rounded-md border p-2">
                  <span className="font-semibold">{result.summary.childrenCreated}</span> criança(s)
                  criada(s)
                </div>
                <div className="rounded-md border p-2">
                  <span className="font-semibold">{result.summary.childrenUpdated}</span> criança(s)
                  atualizada(s)
                </div>
                {result.ignoredFamilies > 0 && (
                  <div className="rounded-md border p-2">
                    <span className="font-semibold">{result.ignoredFamilies}</span> família(s)
                    ignorada(s) pelo filtro ({result.ignoredLines} linha(s) do arquivo)
                  </div>
                )}
              </div>

              {totalErrors > 0 && (
                <div>
                  <p className="text-sm font-semibold text-destructive mb-1">
                    {totalErrors} linha(s) com erro:
                  </p>
                  <ul className="max-h-40 overflow-y-auto space-y-1 text-xs rounded-md border border-destructive/30 bg-destructive/5 p-2">
                    {result.summary.errors.map((e, i) => (
                      <li key={i}>
                        <strong>Linha {e.line}:</strong> {e.reason}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setResult(null)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

export default FamiliesCsvTools
