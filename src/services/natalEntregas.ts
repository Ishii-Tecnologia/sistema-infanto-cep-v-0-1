import pb from '@/lib/pocketbase/client'

export interface NatalEntrega {
  id: string
  collectionId: string
  collectionName?: string
  family_id: string
  person_name: string
  delivered_at: string
  photo?: string
  created_by?: string
  /** Nome do operador logado que realizou a entrega (ausente em registros antigos). */
  operator_name?: string
  created?: string
  updated?: string
}

/** Formata uma data/hora no padrão brasileiro dd/mm/aaaa HH:mm (fuso local). */
export function formatNatalDateTime(value: Date | string): string {
  const d = typeof value === 'string' ? new Date(value) : value
  if (Number.isNaN(d.getTime())) return ''
  const p = (n: number) => String(n).padStart(2, '0')
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}`
}

export const natalEntregasService = {
  /** Todos os lançamentos de todos as famílias (para o relatório da sacolinha). */
  async listAll(): Promise<NatalEntrega[]> {
    return pb.collection('natal_entregas').getFullList<NatalEntrega>({
      sort: '-delivered_at',
    })
  },

  async listByFamily(familyId: string): Promise<NatalEntrega[]> {
    return pb.collection('natal_entregas').getFullList<NatalEntrega>({
      filter: `family_id = "${familyId}"`,
      sort: '-delivered_at',
    })
  },

  async create(input: {
    familyId: string
    personName: string
    deliveredAt: Date
    photo: File | null
  }): Promise<NatalEntrega> {
    const body = new FormData()
    body.append('family_id', input.familyId)
    body.append('person_name', input.personName)
    body.append('delivered_at', input.deliveredAt.toISOString())
    const operatorId = pb.authStore.record?.id
    if (operatorId) body.append('created_by', operatorId)
    const operatorName = pb.authStore.record?.name || pb.authStore.record?.email
    if (operatorName) body.append('operator_name', String(operatorName))
    if (input.photo) body.append('photo', input.photo)
    return pb.collection('natal_entregas').create<NatalEntrega>(body)
  },

  /** Exclui um lançamento (a regra de API permite somente o perfil admin). */
  async remove(id: string): Promise<void> {
    await pb.collection('natal_entregas').delete(id)
  },

  photoUrl(entrega: NatalEntrega, thumb?: string): string {
    if (!entrega.photo) return ''
    return pb.files.getURL(entrega, entrega.photo, thumb ? { thumb } : undefined)
  },
}
