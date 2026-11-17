import { useEffect, useState } from 'react'
import { Gift, Search, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { familyService } from '@/services/families'
import { Family } from '@/types'
import { familyMatchesSearch } from '@/lib/familySearch'
import { formatPhoneBR } from '@/lib/phoneBR'
import { useToast } from '@/hooks/use-toast'
import { getErrorMessage } from '@/lib/pocketbase/errors'
import { NatalFamilyDialog } from '@/components/natal/NatalFamilyDialog'

/** Festa de Natal: modal de busca de famílias (mesmo padrão de /familias) e ficha de sacolinha. */
export default function FestaNatalPage() {
  const { toast } = useToast()
  const [families, setFamilies] = useState<Family[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [searchOpen, setSearchOpen] = useState(true)
  const [selected, setSelected] = useState<Family | null>(null)

  const loadFamilies = async () => {
    setLoading(true)
    try {
      setFamilies(await familyService.getAll())
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

  const handleSelect = (fam: Family) => {
    setSearchOpen(false)
    setSelected(fam)
  }

  const handleCloseFamily = () => {
    setSelected(null)
    setSearchOpen(true)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Festa de Natal
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Busque a família e lance a entrega das sacolinhas de Natal.
          </p>
        </div>
        <Button
          onClick={() => setSearchOpen(true)}
          className="bg-rose-600 hover:bg-rose-700 text-white"
        >
          <Search className="h-4 w-4 mr-2" />
          Buscar família
        </Button>
      </div>

      <Dialog open={searchOpen} onOpenChange={setSearchOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Festa de Natal — Buscar Família</DialogTitle>
            <DialogDescription>
              Pesquise pelo nome da família, responsável, criança ou telefone.
            </DialogDescription>
          </DialogHeader>

          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome da família, responsável ou aluno..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {filtered.map((fam) => (
              <Card
                key={fam.id}
                className="hover:border-rose-300 transition-all cursor-pointer shadow-xs"
                onClick={() => handleSelect(fam)}
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
                    <Badge variant="outline" className="text-xs shrink-0">
                      {fam.children?.length || 0} criança(s)
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <p className="text-xs text-slate-700 dark:text-slate-300 truncate">
                    {(fam.guardians || []).map((g) => g.name).join(', ') || 'Sem responsáveis'}
                  </p>
                </CardContent>
              </Card>
            ))}
            {filtered.length === 0 && !loading && (
              <p className="text-sm text-muted-foreground col-span-full text-center py-6">
                Nenhuma família encontrada.
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {!searchOpen && !selected && (
        <div className="flex flex-col items-center gap-2 text-muted-foreground py-10">
          <Users className="h-8 w-8" />
          <p className="text-sm">Abra a busca para escolher uma família.</p>
        </div>
      )}

      <NatalFamilyDialog family={selected} onClose={handleCloseFamily} />
    </div>
  )
}
