import { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { settingsService } from '@/services/settings'
import type { UserRole } from '@/types'

/** Chave em system_settings com a lista de papéis liberados para a Festa de Natal. */
export const FESTA_NATAL_SETTING_KEY = 'festa_natal_roles'

/** Estado inicial sugerido: Administrador e Dirigente liberados. */
export const FESTA_NATAL_DEFAULT_ROLES: UserRole[] = ['admin', 'dirigente']

/** Papéis listados em "Operadores e Papéis" (mesmos valores do cadastro de operadores). */
export const FESTA_NATAL_ROLE_OPTIONS: { value: UserRole; label: string }[] = [
  { value: 'admin', label: 'Administrador (Acesso Total)' },
  { value: 'dirigente', label: 'Dirigente (Gestão Pedagógica e Operadores)' },
  { value: 'professor', label: 'Professor(a) (Chamada, Planos e Famílias)' },
  { value: 'auxiliar', label: 'Auxiliar (Chamada e Apoio)' },
  { value: 'bibliotecario', label: 'Bibliotecário(a) (Acervo e Empréstimos)' },
]

const VALID_ROLES = new Set<string>(FESTA_NATAL_ROLE_OPTIONS.map((r) => r.value))

/** Normaliza o valor salvo; sem configuração válida usa o estado inicial. */
export function normalizeFestaNatalRoles(value: unknown): UserRole[] {
  if (!Array.isArray(value)) return FESTA_NATAL_DEFAULT_ROLES
  return value.filter((r): r is UserRole => typeof r === 'string' && VALID_ROLES.has(r))
}

/**
 * Indica se o usuário logado pode acessar a Festa de Natal.
 * Admin sempre tem acesso; os demais dependem da configuração salva.
 */
export function useFestaNatalAccess() {
  const { user, isLoading } = useAuth()
  const [allowedRoles, setAllowedRoles] = useState<UserRole[] | null>(null)

  useEffect(() => {
    let active = true
    settingsService
      .getSetting(FESTA_NATAL_SETTING_KEY)
      .then((value) => {
        if (active) setAllowedRoles(normalizeFestaNatalRoles(value))
      })
      .catch(() => {
        if (active) setAllowedRoles(FESTA_NATAL_DEFAULT_ROLES)
      })
    return () => {
      active = false
    }
  }, [])

  const role = user?.role
  const allowed =
    Boolean(role) && (role === 'admin' || (allowedRoles ?? []).includes(role as UserRole))

  return {
    allowed,
    loading: isLoading || allowedRoles === null,
  }
}
