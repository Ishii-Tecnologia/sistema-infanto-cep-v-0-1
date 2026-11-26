import { useEffect, useState } from 'react'
import { Gift, Eye, Search, Users } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { familyService } from '@/services/families'
import { natalEntregasService } from '@/services/natalEntregas'
import { Family } from '@/types'
import { familyMatchesSearch } from '@/lib/familySearch'
import { formatPhoneBR } from '@/lib/phoneBR'
import { useToast } from '@/hooks/use-toast'
import { getErrorMessage } from '@/lib/pocketbase/errors'
import { VoiceTextInput } from '@/components/VoiceTextInput'
import { NatalFamilyDialog } from '@/components/natal/NatalFamilyDialog'
import natalTreeImg from '@/assets/image-80489.png'
import { useFestaNatalAccess } from '@/hooks/useFestaNatalAccess'

/**
 * Festa de Natal: a busca de famílias fica direto na página — sem etapa
 * intermediária. Selecionar uma família abre a ficha de sacolinha; fechar
 * volta para a busca. TODOS os usuários veem a lista (somente leitura); o
 * LANÇAMENTO da sacolinha fica restrito aos papéis autorizados nas
 * Configurações (admin sempre liberado) — ver useFestaNatalAccess.
 */
export default function FestaNatalPage() {
  const { toast } = useToast()
  const [families, setFamilies] = useState<Family[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Family | null>(null)
  /** IDs das famílias que já têm pelo menos um lançamento realizado (selo "Ok"). */
  const [entregaFamilyIds, setEntregaFamilyIds] = useState<Set<string>>(new Set())
  const { allowed: canLaunch, loading: accessLoading } = useFestaNatalAccess()

  const loadFamilies = async () => {
    setLoading(true)
    try {
      const [familyList, entregas] = await Promise.all([
        familyService.getAll(),
        natalEntregasService.listAll(),
      ])
      setFamilies(familyList)
      setEntregaFamilyIds(new Set(entregas.map((e) => e.family_id)))
    } catch (err) {
      toast({
        title: 'Sistema Infanto-CEP',
        description: getErrorMessage(err),
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadFamilies()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const filtered = families.filter((f) => familyMatchesSearch(f, search))

  const handleCloseFamily = () => {
    setSelected(null)
    loadFamilies()
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Gift className="h-6 w-6 text-rose-600" />
            Festa de Natal — Buscar Família
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Busque a família e consulte as entregas das sacolinhas de Natal.
          </p>
          {!accessLoading && !canLaunch && (
            <p className="mt-1 inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-0.5 text-[11px] font-medium text-amber-800 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900">
              <Eye className="h-3 w-3" aria-hidden="true" />
              Somente visualização — lançamento restrito a papéis autorizados.
            </p>
          )}
        </div>
        {/* Mesmo padrão de voz dos campos de Famílias: VoiceTextInput
            (useVoiceInput + VoiceMicButton, dedup v0.0.113). O modo 'replace'
            troca o texto da busca pelo enunciado ditado. */}
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <VoiceTextInput
            placeholder="Buscar por nome da família, responsável ou aluno..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            voiceMode="replace"
            className="pl-9"
            aria-label="Buscar por nome da família, responsável ou aluno"
            autoFocus
          />
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="pb-2">
                <div className="h-5 w-2/3 bg-muted rounded" />
                <div className="h-3 w-1/3 bg-muted rounded mt-2" />
              </CardHeader>
              <CardContent className="pt-0">
                <div className="h-3 w-3/4 bg-muted rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((fam) => (
            <Card
              key={fam.id}
              className="hover:border-rose-300 transition-all cursor-pointer shadow-xs"
              onClick={() => setSelected(fam)}
            >
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <CardTitle className="text-base font-bold truncate">
                      {fam.reference_name}
                    </CardTitle>
                    <CardDescription className="text-xs mt-1">
                      {formatPhoneBR(fam.primary_phone || '') || 'Sem telefone registrado'}
                    </CardDescription>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <Badge variant="outline" className="text-xs">
                      {fam.children?.length || 0} criança(s)
                    </Badge>
                    {entregaFamilyIds.has(fam.id) && (
                      <div className="flex items-center gap-1.5">
                        <img
                          src={natalTreeImg}
                          alt=""
                          width={40}
                          height={40}
                          className="h-10 w-10 object-contain shrink-0"
                        />
                        <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                          Ok
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-xs text-slate-700 dark:text-slate-300 truncate">
                  {(fam.guardians || []).map((g) => g.name).join(', ') || 'Sem responsáveis'}
                </p>
              </CardContent>
            </Card>
          ))}
          {filtered.length === 0 && (
            <div className="flex flex-col items-center gap-2 text-muted-foreground col-span-full py-10">
              <Users className="h-8 w-8" />
              <p className="text-sm">Nenhuma família encontrada.</p>
            </div>
          )}
        </div>
      )}

      <NatalFamilyDialog
        family={selected}
        onClose={handleCloseFamily}
        canLaunch={!accessLoading && canLaunch}
      />
    </div>
  )
}
