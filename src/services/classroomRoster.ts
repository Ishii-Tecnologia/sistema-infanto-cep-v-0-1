import { ClassroomId, Family, Guardian, Child } from '@/types'

/**
 * Composição das salas.
 *
 * Salas A, B e C: apenas crianças (children.classroom).
 * Sala D: crianças da sala D + qualquer responsável (guardian) com
 * participa_sala_aula = true — o "Participa da Sala de Aula da Família (Sala D)".
 *
 * Este módulo é o ponto ÚNICO de composição de roster de sala: qualquer tela
 * que precise listar "alunos da sala" deve usar estes helpers.
 */

export type RosterParticipantKind = 'child' | 'guardian'

export interface RosterParticipant {
  /** Identificador estável: `child:<id>` ou `guardian:<id>`. */
  key: string
  kind: RosterParticipantKind
  id: string
  name: string
  classroom: ClassroomId
  /** Família de origem (children: child.family_id; guardians: guardian.family_id). */
  family_id: string
  child?: Child
  guardian?: Guardian
}

/** Responsável participante da Sala de Aula da Família (Sala D). */
export function guardianParticipaSalaD(guardian?: Guardian): boolean {
  return guardian?.participa_sala_aula === true
}

/**
 * Responsáveis participantes da Sala D de uma família (para a ficha da
 * família com filtro de sala D ativo).
 */
export function getSalaDGuardiansOfFamily(family?: Family | null): Guardian[] {
  if (!family) return []
  return (family.guardians || []).filter(guardianParticipaSalaD)
}

/** Há algum responsável participante da Sala D nesta família? */
export function familyHasSalaDGuardian(family?: Family | null): boolean {
  return getSalaDGuardiansOfFamily(family).length > 0
}

/**
 * Roster completo de uma sala:
 * - Salas A, B e C: somente crianças da sala.
 * - Sala D: crianças da sala D + TODOS os responsáveis marcados como
 *   participantes da Sala de Aula da Família, de qualquer família.
 */
export function getClassroomRoster(
  classroom: ClassroomId,
  families: Family[],
): RosterParticipant[] {
  const participants: RosterParticipant[] = []

  for (const family of families) {
    for (const child of family.children || []) {
      if (child.classroom !== classroom) continue
      participants.push({
        key: `child:${child.id}`,
        kind: 'child',
        id: child.id,
        name: child.name,
        classroom,
        family_id: family.id,
        child,
        guardian: undefined,
      })
    }

    if (classroom === 'D') {
      for (const guardian of getSalaDGuardiansOfFamily(family)) {
        participants.push({
          key: `guardian:${guardian.id}`,
          kind: 'guardian',
          id: guardian.id,
          name: guardian.name,
          classroom: 'D',
          family_id: family.id,
          guardian,
          child: undefined,
        })
      }
    }
  }

  return participants
}

/** Nome de exibição do participante (mesmo formato usado na ficha). */
export function rosterParticipantName(participant: RosterParticipant): string {
  if (participant.kind === 'guardian' && participant.guardian) {
    const g = participant.guardian
    return g.relationship ? `${g.name} (${g.relationship})` : g.name
  }
  return participant.name
}

/**
 * Rótulo curto do tipo do participante, para listas/relatórios:
 * crianças não recebem etiqueta; responsáveis aparecem como "Responsável".
 */
export function rosterParticipantBadgeLabel(participant: RosterParticipant): string | null {
  return participant.kind === 'guardian' ? 'Responsável' : null
}
