import { useEffect, useState } from 'react'
import { Gift } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { settingsService } from '@/services/settings'
import { useToast } from '@/hooks/use-toast'
import { getErrorMessage } from '@/lib/pocketbase/errors'
import {
  FESTA_NATAL_ROLE_OPTIONS,
  FESTA_NATAL_SETTING_KEY,
  normalizeFestaNatalRoles,
} from '@/hooks/useFestaNatalAccess'
import type { UserRole } from '@/types'

/**
 * Seção de Configurações: escolhe quais papéis podem acessar a Festa de Natal
 * (lançamento das sacolinhas). Cada alteração é salva na hora em system_settings.
 */
export function FestaNatalAccessSettings() {
  const { toast } = useToast()
  const [roles, setRoles] = useState<UserRole[] | null>(null)

  useEffect(() => {
    let active = true
    settingsService
      .getSetting(FESTA_NATAL_SETTING_KEY)
      .then((value) => {
        if (active) setRoles(normalizeFestaNatalRoles(value))
      })
      .catch(() => {
        if (active) setRoles(normalizeFestaNatalRoles(null))
      })
    return () => {
      active = false
    }
  }, [])

  const handleToggle = async (role: UserRole, checked: boolean) => {
    if (!roles || role === 'admin') return
    const previous = roles
    const next = checked
      ? [...roles.filter((r) => r !== role), role]
      : roles.filter((r) => r !== role)
    setRoles(next)
    try {
      await settingsService.updateSetting(
        FESTA_NATAL_SETTING_KEY,
        next,
        'Papéis liberados para o lançamento das sacolinhas da Festa de Natal',
      )
    } catch (err) {
      setRoles(previous)
      toast({
        title: 'Sistema Infanto-CEP',
        description: getErrorMessage(err),
        variant: 'destructive',
      })
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Gift className="h-4 w-4 text-rose-600" />
          Festa de Natal
        </CardTitle>
        <CardDescription>
          Marque os papéis que podem acessar a Festa de Natal e lançar as sacolinhas. O
          Administrador sempre tem acesso.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {FESTA_NATAL_ROLE_OPTIONS.map((option) => {
          const isAdmin = option.value === 'admin'
          const checked = isAdmin || (roles ?? []).includes(option.value)
          const id = `festa-natal-role-${option.value}`
          return (
            <div key={option.value} className="flex items-start gap-3">
              <Checkbox
                id={id}
                checked={checked}
                disabled={isAdmin || roles === null}
                onCheckedChange={(value) => handleToggle(option.value, value === true)}
                className="mt-0.5"
              />
              <Label htmlFor={id} className="text-sm leading-snug">
                {option.label}
                {isAdmin && (
                  <span className="block text-xs text-muted-foreground">
                    Sempre liberado (não pode ser desmarcado)
                  </span>
                )}
              </Label>
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}
