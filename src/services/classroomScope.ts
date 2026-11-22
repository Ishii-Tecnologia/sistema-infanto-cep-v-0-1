import { ClassroomId, User } from '@/types'

/**
 * Escopo de sala do operador logado sobre famílias/alunos:
 *  - 'all'      → vê tudo (admin, dirigente, auxiliar, bibliotecário)
 *  - A/B/C/D    → professor com sala definida: vê só aquela sala
 *  - null       → professor SEM sala definida: falha segura, vê nada
 */
export type ClassroomScope = ClassroomId | 'all' | null

export function getClassroomScope(
  user: Pick<User, 'role' | 'assigned_classroom'> | null,
): ClassroomScope {
  if (!user) return null
  if (user.role !== 'professor') return 'all'
  return user.assigned_classroom || null
}

/** Filtro PocketBase para a coleção children, dado o escopo. */
export function classroomScopeToChildFilter(scope: ClassroomScope): string {
  if (scope === 'all') return ''
  if (scope === null) return 'id = ""'
  return `classroom = "${scope}"`
}

/** Um child (ou classroom de presença etc.) está dentro do escopo do operador? */
export function childInScope(scope: ClassroomScope, classroom: ClassroomId | undefined): boolean {
  if (scope === 'all') return true
  if (scope === null) return false
  return classroom === scope
}

/** Uma família está dentro do escopo (tem ao menos uma criança na sala)? */
export function familyInScope(
  scope: ClassroomScope,
  children: Array<{ classroom?: ClassroomId }> | undefined,
): boolean {
  if (scope === 'all') return true
  if (scope === null) return false
  return (children || []).some((c) => c.classroom === scope)
}
