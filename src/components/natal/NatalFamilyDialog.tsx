import { useEffect, useState } from 'react'
import { Gift, Phone } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Family } from '@/types'
import { formatPhoneBR } from '@/lib/phoneBR'
import { useToast } from '@/hooks/use-toast'
import { getErrorMessage } from '@/lib/pocketbase/errors'
import { natalEntregasService, formatNatalDateTime, NatalEntrega } from '@/services/natalEntregas'
import { NatalLaunchDialog } from '@/components/natal/NatalLaunchDialog'

interface NatalFamilyDialogProps {
  family: Family | null
  onClose: () => void
}

/** Ficha da família na Festa de Natal: responsáveis, crianças, lançamentos e botão de lançar. */
export function NatalFamilyDialog({ family, onClose }: NatalFamilyDialogProps) {
  const { toast } = useToast()
  const [entregas, setEntregas] = useState<NatalEntrega[]>([])
  const [launchOpen, setLaunchOpen] = useState(false)
  const familyId = family?.id

  const loadEntregas = async (id: string) => {
    try {
      setEntregas(await natalEntregasService.listByFamily(id))
    } catch (err) {
      toast({
        title: 'Sistema Infanto-CEP',
        description: getErrorMessage(err),
        variant: 'destructive',
      })
    }
  }

  useEffect(() => {
    setLaunchOpen(false)
    if (familyId) loadEntregas(familyId)
    else setEntregas([])
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [familyId])

  return (
    <Dialog open={!!family} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        {family && (
          <>
            <DialogHeader>
              <DialogTitle>{family.reference_name}</DialogTitle>
              <DialogDescription className="flex items-center gap-1.5">
                <Phone className="h-3 w-3" />
                {formatPhoneBR(family.primary_phone || '') || 'Sem telefone registrado'}
              </DialogDescription>
            </DialogHeader>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-[11px] font-semibold text-muted-foreground uppercase mb-1">
                  Responsáveis
                </p>
                {(family.guardians || []).length === 0 && (
                  <p className="text-xs text-muted-foreground">Nenhum responsável cadastrado.</p>
                )}
                {(family.guardians || []).map((g) => (
                  <p key={g.id} className="text-xs font-medium">
                    {g.name} {g.relationship ? `(${g.relationship})` : ''}
                  </p>
                ))}
              </div>
              <div>
                <p className="text-[11px] font-semibold text-muted-foreground uppercase mb-1">
                  Crianças
                </p>
                {(family.children || []).length === 0 && (
                  <p className="text-xs text-muted-foreground">Nenhuma criança cadastrada.</p>
                )}
                {(family.children || []).map((c) => (
                  <p key={c.id} className="text-xs font-medium">
                    {c.name}
                  </p>
                ))}
              </div>
            </div>

            <div className="pt-2">
              <Button
                onClick={() => setLaunchOpen(true)}
                className="bg-rose-600 hover:bg-rose-700 text-white"
              >
                <Gift className="h-4 w-4 mr-2" />
                Lançar Sacolinha
              </Button>
            </div>

            <div className="space-y-2 pt-2">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase">
                Lançamentos desta família
              </p>
              {entregas.length === 0 && (
                <p className="text-xs text-muted-foreground">Nenhuma sacolinha lançada ainda.</p>
              )}
              {entregas.map((e) => {
                const url = natalEntregasService.photoUrl(e, '400x400')
                return (
                  <div
                    key={e.id}
                    className="flex items-center gap-3 rounded-md border p-2 bg-white dark:bg-slate-900"
                  >
                    {url ? (
                      <img
                        src={url}
                        alt={`Foto de ${e.person_name}`}
                        className="h-16 w-16 rounded object-cover shrink-0"
                      />
                    ) : (
                      <div className="h-16 w-16 rounded bg-slate-100 shrink-0" />
                    )}
                    <div className="min-w-0">
                      <p className="text-sm font-semibold truncate">{e.person_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatNatalDateTime(e.delivered_at)}
                        {e.operator_name ? ` — Operador: ${e.operator_name}` : ''}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>

            {launchOpen && (
              <NatalLaunchDialog
                family={family}
                onClose={() => setLaunchOpen(false)}
                onSaved={() => {
                  setLaunchOpen(false)
                  loadEntregas(family.id)
                }}
              />
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
