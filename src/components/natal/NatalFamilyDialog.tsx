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
import { Family, Guardian, Child } from '@/types'
import { formatPhoneBR } from '@/lib/phoneBR'
import { getClassroomBadge } from '@/lib/academic'
import { useToast } from '@/hooks/use-toast'
import { getErrorMessage } from '@/lib/pocketbase/errors'
import { natalEntregasService, formatNatalDateTime, NatalEntrega } from '@/services/natalEntregas'
import { photoDisplayUrl } from '@/services/photos'
import { ImageLightbox } from '@/components/ImageLightbox'
import { NatalLaunchDialog } from '@/components/natal/NatalLaunchDialog'

interface NatalFamilyDialogProps {
  family: Family | null
  onClose: () => void
}

/** Idade em texto completo a partir da data de nascimento (ISO ou yyyy-mm-dd); '' se não houver data. */
function ageLabelFromBirthDate(birthDate?: string): string {
  if (!birthDate) return ''
  const clean = birthDate.trim().split('T')[0].split(' ')[0]
  const match = clean.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  let birth: Date | null = null
  if (match) {
    birth = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
  } else {
    const parsed = new Date(clean)
    if (Number.isNaN(parsed.getTime())) return ''
    birth = parsed
  }

  const now = new Date()
  let age = now.getFullYear() - birth.getFullYear()
  const beforeBirthday =
    now.getMonth() < birth.getMonth() ||
    (now.getMonth() === birth.getMonth() && now.getDate() < birth.getDate())
  if (beforeBirthday) age -= 1
  if (age < 0) return ''
  return `${age} anos`
}

/**
 * Ficha da família na Festa de Natal: responsáveis, crianças, lançamentos e
 * botão de lançar. Cliques nas fotos de responsáveis abrem o mesmo lightbox
 * ampliado usado no cadastro de famílias (ImageLightbox), que funciona sobre
 * modal Radix (pointer-events-auto no root).
 */
export function NatalFamilyDialog({ family, onClose }: NatalFamilyDialogProps) {
  const { toast } = useToast()
  const [entregas, setEntregas] = useState<NatalEntrega[]>([])
  const [launchOpen, setLaunchOpen] = useState(false)
  const [lightboxImage, setLightboxImage] = useState<{
    src: string
    title?: string
    description?: string
  } | null>(null)
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
    setLightboxImage(null)
    if (familyId) loadEntregas(familyId)
    else setEntregas([])
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [familyId])

  /** Abre o lightbox com a foto do responsável/criança (arquivo novo ou Base64 legado). */
  const openPhotoLightbox = (person: Guardian | Child, relationshipOrSala?: string) => {
    const photoSrc = photoDisplayUrl(person)
    if (!photoSrc) return
    setLightboxImage({
      src: photoSrc,
      title: person.name,
      description: relationshipOrSala,
    })
  }

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
                {(family.guardians || []).map((g) => {
                  const photoSrc = photoDisplayUrl(g)
                  return (
                    <div key={g.id} className="flex items-center gap-2 py-0.5">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          openPhotoLightbox(g, g.relationship || undefined)
                        }}
                        className={`h-8 w-8 rounded-full overflow-hidden bg-slate-200 shrink-0 transition-transform ${
                          photoSrc
                            ? 'cursor-pointer hover:scale-105 hover:ring-2 hover:ring-rose-500 focus:outline-none focus:ring-2 focus:ring-rose-500'
                            : 'cursor-default'
                        }`}
                        title={photoSrc ? `Clique para ampliar foto de ${g.name}` : undefined}
                        aria-label={
                          photoSrc ? `Ampliar foto de ${g.name}` : `Sem foto de ${g.name}`
                        }
                      >
                        {photoSrc ? (
                          <img src={photoSrc} alt={g.name} className="h-full w-full object-cover" />
                        ) : (
                          <span className="text-[10px] flex items-center justify-center h-full text-slate-600 font-bold">
                            {g.name.charAt(0)}
                          </span>
                        )}
                      </button>
                      <p className="text-xs font-medium min-w-0">
                        {g.name} {g.relationship ? `(${g.relationship})` : ''}
                      </p>
                    </div>
                  )
                })}
              </div>
              <div>
                <p className="text-[11px] font-semibold text-muted-foreground uppercase mb-1">
                  Crianças
                </p>
                {(family.children || []).length === 0 && (
                  <p className="text-xs text-muted-foreground">Nenhuma criança cadastrada.</p>
                )}
                {(family.children || []).map((c) => {
                  const photoSrc = photoDisplayUrl(c)
                  const age = ageLabelFromBirthDate(c.birth_date)
                  const sala = getClassroomBadge(c.classroom).rawName
                  return (
                    <div key={c.id} className="flex items-center gap-2 py-0.5">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          openPhotoLightbox(c, [sala, age].filter(Boolean).join(' • ') || undefined)
                        }}
                        className={`h-8 w-8 rounded-full overflow-hidden bg-slate-200 shrink-0 transition-transform ${
                          photoSrc
                            ? 'cursor-pointer hover:scale-105 hover:ring-2 hover:ring-rose-500 focus:outline-none focus:ring-2 focus:ring-rose-500'
                            : 'cursor-default'
                        }`}
                        title={photoSrc ? `Clique para ampliar foto de ${c.name}` : undefined}
                        aria-label={
                          photoSrc ? `Ampliar foto de ${c.name}` : `Sem foto de ${c.name}`
                        }
                      >
                        {photoSrc ? (
                          <img src={photoSrc} alt={c.name} className="h-full w-full object-cover" />
                        ) : (
                          <span className="text-[10px] flex items-center justify-center h-full text-slate-600 font-bold">
                            {c.name.charAt(0)}
                          </span>
                        )}
                      </button>
                      <p className="text-xs font-medium min-w-0">
                        {c.name}
                        {age ? ` — ${age}` : ''}
                      </p>
                    </div>
                  )
                })}
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
                const person = [...(family.guardians || []), ...(family.children || [])].find(
                  (p) => p.name === e.person_name,
                )
                const age = ageLabelFromBirthDate(person?.birth_date)
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
                      <p className="text-sm font-semibold truncate">
                        {e.person_name}
                        {age ? <span className="font-normal"> · {age}</span> : ''}
                      </p>
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

      {/* Lightbox de foto ampliada — mesmo componente do cadastro de famílias */}
      {lightboxImage && (
        <ImageLightbox
          src={lightboxImage.src}
          title={lightboxImage.title}
          description={lightboxImage.description}
          onClose={() => setLightboxImage(null)}
        />
      )}
    </Dialog>
  )
}
