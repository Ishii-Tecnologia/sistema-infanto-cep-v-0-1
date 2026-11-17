import type { Family } from '@/types'

/** Normaliza texto para busca: minúsculas e sem acentos. */
export function normalizeSearchText(value: string): string {
  return (value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

/**
 * Busca tokenizada de famílias: cada palavra digitada precisa constar em algum
 * nome (família, responsável ou criança), em qualquer ordem, ignorando caixa e
 * acentos. O telefone entra sem máscara (somente dígitos).
 */
export function familyMatchesSearch(family: Family, query: string): boolean {
  const tokens = normalizeSearchText(query).split(/\s+/).filter(Boolean)
  if (tokens.length === 0) return true

  const names = [
    family.reference_name,
    family.email,
    family.address,
    family.bairro,
    ...(family.guardians || []).map((g) => g.name),
    ...(family.children || []).map((c) => c.name),
  ]
    .filter(Boolean)
    .join(' ')

  const haystack = `${normalizeSearchText(names)} ${(family.primary_phone || '').replace(/\D/g, '')}`
  return tokens.every((token) => haystack.includes(token))
}
