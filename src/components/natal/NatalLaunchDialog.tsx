import React, { useEffect, useRef, useState } from 'react'
import { Camera, Image as ImageIcon, Gift, Lock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { VoiceTextInput } from '@/components/VoiceTextInput'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Family } from '@/types'
import { natalEntregasService, formatNatalDateTime } from '@/services/natalEntregas'
import { useToast } from '@/hooks/use-toast'
import { getErrorMessage } from '@/lib/pocketbase/errors'
import { useFestaNatalAccess } from '@/hooks/useFestaNatalAccess'

interface NatalLaunchDialogProps {
  family: Family
  onClose: () => void
  onSaved: () => void
}

/**
 * Ficha de lançamento da sacolinha. Montado apenas quando aberto, então o nome
 * sugerido e a data/hora são calculados no momento da abertura.
 */
export function NatalLaunchDialog({ family, onClose, onSaved }: NatalLaunchDialogProps) {
  const { toast } = useToast()
  const cameraRef = useRef<HTMLInputElement>(null)
  const galleryRef = useRef<HTMLInputElement>(null)

  const firstGuardianName = family.guardians?.[0]?.name || ''
  const [personName, setPersonName] = useState(firstGuardianName)
  const [nameTouched, setNameTouched] = useState(false)
  const [openedAt] = useState<Date>(() => new Date())
  const [photo, setPhoto] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState('')
  const [saving, setSaving] = useState(false)
  // Mesma regra da página: só papéis liberados (ou Administrador) lançam
  const { allowed, loading: accessLoading } = useFestaNatalAccess()
  const blocked = !accessLoading && !allowed

  // Sugestão do primeiro responsável enquanto o usuário não editar o campo
  useEffect(() => {
    if (!nameTouched) setPersonName(firstGuardianName)
  }, [firstGuardianName, nameTouched])

  // Preview local da foto escolhida, antes de salvar
  useEffect(() => {
    if (!photo) {
      setPhotoPreview('')
      return
    }
    const url = URL.createObjectURL(photo)
    setPhotoPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [photo])

  const handlePhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (file) setPhoto(file)
  }

  const handleSave = async () => {
    if (!allowed) return
    const name = personName.trim()
    if (!name) {
      toast({
        title: 'Sistema Infanto-CEP',
        description: 'Informe o nome de quem recebe a sacolinha.',
        variant: 'destructive',
      })
      return
    }
    setSaving(true)
    try {
      await natalEntregasService.create({
        familyId: family.id,
        personName: name,
        deliveredAt: openedAt,
        photo,
      })
      toast({ title: 'Sistema Infanto-CEP', description: 'Sacolinha registrada com sucesso.' })
      onSaved()
    } catch (err) {
      toast({
        title: 'Sistema Infanto-CEP',
        description: getErrorMessage(err),
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Gift className="h-5 w-5 text-rose-600" />
            Lançar Sacolinha
          </DialogTitle>
          <DialogDescription>Família: {family.reference_name}</DialogDescription>
        </DialogHeader>

        {blocked ? (
          <div role="alert" className="flex items-start gap-2 text-sm text-muted-foreground">
            <Lock className="h-4 w-4 mt-0.5 text-rose-600 shrink-0" />
            <p>
              Somente visualização — seu papel não tem permissão para lançar as sacolinhas da Festa
              de Natal. Peça a um Administrador para liberar em Configurações.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="natal-person">Quem está recebendo a sacolinha</Label>
              <VoiceTextInput
                id="natal-person"
                value={personName}
                onChange={(e) => {
                  setNameTouched(true)
                  setPersonName(e.target.value)
                }}
                placeholder="Nome de quem recebe"
              />
            </div>

            <div className="space-y-1.5">
              <Label>Data e hora</Label>
              <Input value={formatNatalDateTime(openedAt)} readOnly />
            </div>

            <div className="space-y-2">
              <Label>Foto</Label>
              {photoPreview ? (
                <img
                  src={photoPreview}
                  alt="Pré-visualização da foto"
                  className="w-full max-h-64 object-contain rounded-md border bg-slate-50"
                />
              ) : (
                <p className="text-xs text-muted-foreground">Nenhuma foto selecionada.</p>
              )}
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => cameraRef.current?.click()}
                  aria-label="Tirar foto com a câmera"
                >
                  <Camera className="h-4 w-4 mr-2" />
                  Tirar foto
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => galleryRef.current?.click()}
                  aria-label="Escolher foto da galeria"
                >
                  <ImageIcon className="h-4 w-4 mr-2" />
                  Galeria
                </Button>
              </div>
              <input
                ref={cameraRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={handlePhoto}
              />
              <input
                ref={galleryRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handlePhoto}
              />
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving || accessLoading || !allowed}
            className="bg-rose-600 hover:bg-rose-700 text-white"
          >
            {saving ? 'Salvando...' : 'Salvar lançamento'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
