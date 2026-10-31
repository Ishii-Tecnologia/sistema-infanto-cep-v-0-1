import pb from '@/lib/pocketbase/client'
import { Family, Guardian, Child, ClassroomId } from '@/types'

/**
 * Sanitiza payload para a coleção 'families' removendo campos de sistema,
 * relações, expand ou valores inválidos de e-mail.
 */
function sanitizeFamilyPayload(data: Partial<Family>): Record<string, any> {
  const payload: Record<string, any> = {}

  if (data.reference_name !== undefined) {
    payload.reference_name = (data.reference_name || '').trim()
  }
  if (data.primary_phone !== undefined) {
    payload.primary_phone = (data.primary_phone || '').trim()
  }
  if (data.email !== undefined) {
    const trimmed = (data.email || '').trim()
    payload.email = trimmed === '' ? '' : trimmed
  }
  if (data.address !== undefined) {
    payload.address = (data.address || '').trim()
  }
  if (data.notes !== undefined) {
    payload.notes = (data.notes || '').trim()
  }

  return payload
}

/**
 * Sanitiza payload para a coleção 'guardians' garantindo apenas campos válidos.
 * Especialmente importante: email vazio deve ser enviado como '' ou omitido, nunca null.
 */
function sanitizeGuardianPayload(data: Partial<Guardian>): Record<string, any> {
  const payload: Record<string, any> = {}

  if (data.family_id !== undefined && data.family_id) {
    payload.family_id = data.family_id
  }
  if (data.name !== undefined) {
    payload.name = (data.name || '').trim()
  }
  if (data.relationship !== undefined) {
    payload.relationship = (data.relationship || '').trim()
  }
  if (data.phone !== undefined) {
    payload.phone = (data.phone || '').trim()
  }
  if (data.email !== undefined) {
    const trimmed = (data.email || '').trim()
    payload.email = trimmed === '' ? '' : trimmed
  }
  if (data.is_emergency_contact !== undefined) {
    payload.is_emergency_contact = Boolean(data.is_emergency_contact)
  }
  if (data.photo_url !== undefined) {
    payload.photo_url = (data.photo_url || '').trim()
  }

  return payload
}

/**
 * Sanitiza payload para a coleção 'children' garantindo apenas campos válidos.
 */
function sanitizeChildPayload(data: Partial<Child>): Record<string, any> {
  const payload: Record<string, any> = {}

  if (data.family_id !== undefined && data.family_id) {
    payload.family_id = data.family_id
  }
  if (data.name !== undefined) {
    payload.name = (data.name || '').trim()
  }
  if (data.birth_date !== undefined && data.birth_date) {
    const raw = data.birth_date
    payload.birth_date = raw.includes('T') || raw.includes(' ') ? raw : `${raw} 00:00:00.000Z`
  }
  if (data.classroom !== undefined) {
    payload.classroom = data.classroom || 'A'
  }
  if (data.photo_url !== undefined) {
    payload.photo_url = (data.photo_url || '').trim()
  }
  if (data.allergies !== undefined) {
    payload.allergies = (data.allergies || '').trim()
  }
  if (data.medical_notes !== undefined) {
    payload.medical_notes = (data.medical_notes || '').trim()
  }
  if (data.image_authorized !== undefined) {
    payload.image_authorized = data.image_authorized !== false
  }
  if (data.dimdim_balance !== undefined) {
    payload.dimdim_balance = typeof data.dimdim_balance === 'number' ? data.dimdim_balance : 0
  }
  if (data.active !== undefined) {
    payload.active = data.active !== false
  }

  return payload
}

export const familyService = {
  async getAll(): Promise<Family[]> {
    const families = await pb.collection('families').getFullList<Family>({
      sort: 'reference_name',
    })

    const [guardians, children] = await Promise.all([
      pb.collection('guardians').getFullList<Guardian>(),
      pb.collection('children').getFullList<Child>({
        sort: 'name',
      }),
    ])

    const guardianMap = new Map<string, Guardian[]>()
    for (const g of guardians) {
      const list = guardianMap.get(g.family_id) || []
      list.push(g)
      guardianMap.set(g.family_id, list)
    }

    const childMap = new Map<string, Child[]>()
    for (const c of children) {
      const list = childMap.get(c.family_id) || []
      list.push(c)
      childMap.set(c.family_id, list)
    }

    return families.map((f) => ({
      ...f,
      guardians: guardianMap.get(f.id) || [],
      children: childMap.get(f.id) || [],
    }))
  },

  async getById(id: string): Promise<Family> {
    const family = await pb.collection('families').getOne<Family>(id)
    const [guardians, children] = await Promise.all([
      pb.collection('guardians').getFullList<Guardian>({
        filter: `family_id = "${id}"`,
      }),
      pb.collection('children').getFullList<Child>({
        filter: `family_id = "${id}"`,
      }),
    ])

    return {
      ...family,
      guardians,
      children,
    }
  },

  async create(
    familyData: Partial<Family>,
    guardiansData: Partial<Guardian>[],
    childrenData: Partial<Child>[],
  ): Promise<Family> {
    const sanitizedFamily = sanitizeFamilyPayload(familyData)
    const family = await pb.collection('families').create<Family>(sanitizedFamily)

    const createdGuardians: Guardian[] = []
    for (const g of guardiansData) {
      if (g.name?.trim()) {
        const payload = sanitizeGuardianPayload({
          ...g,
          family_id: family.id,
        })
        const guard = await pb.collection('guardians').create<Guardian>(payload)
        createdGuardians.push(guard)
      }
    }

    const createdChildren: Child[] = []
    for (const c of childrenData) {
      if (c.name?.trim()) {
        const payload = sanitizeChildPayload({
          ...c,
          family_id: family.id,
          birth_date: c.birth_date || new Date().toISOString(),
          active: true,
        })
        const child = await pb.collection('children').create<Child>(payload)
        createdChildren.push(child)
      }
    }

    return {
      ...family,
      guardians: createdGuardians,
      children: createdChildren,
    }
  },

  async update(id: string, data: Partial<Family>): Promise<Family> {
    const sanitized = sanitizeFamilyPayload(data)
    return pb.collection('families').update<Family>(id, sanitized)
  },

  async updateComplete(
    familyId: string,
    familyData: Partial<Family>,
    guardiansData: Array<Partial<Guardian> & { id?: string }>,
    childrenData: Array<Partial<Child> & { id?: string }>,
  ): Promise<Family> {
    // 1. Atualiza dados da família com payload higienizado
    const sanitizedFamily = sanitizeFamilyPayload(familyData)
    const updatedFamily = await pb.collection('families').update<Family>(familyId, sanitizedFamily)

    // 2. Responsáveis existentes e sincronização
    const existingGuardians = await pb.collection('guardians').getFullList<Guardian>({
      filter: `family_id = "${familyId}"`,
    })
    const existingGuardianIds = new Set(existingGuardians.map((g) => g.id))
    const keptGuardianIds = new Set<string>()

    const updatedGuardians: Guardian[] = []
    for (const g of guardiansData) {
      if (!g.name?.trim()) continue

      const payload = sanitizeGuardianPayload({
        name: g.name,
        relationship: g.relationship,
        phone: g.phone,
        email: g.email,
        is_emergency_contact: g.is_emergency_contact,
        photo_url: g.photo_url,
      })

      if (g.id && existingGuardianIds.has(g.id)) {
        keptGuardianIds.add(g.id)
        const updated = await pb.collection('guardians').update<Guardian>(g.id, payload)
        updatedGuardians.push(updated)
      } else {
        payload.family_id = familyId
        const created = await pb.collection('guardians').create<Guardian>(payload)
        updatedGuardians.push(created)
      }
    }

    // Exclui responsáveis removidos
    for (const g of existingGuardians) {
      if (!keptGuardianIds.has(g.id)) {
        try {
          await pb.collection('guardians').delete(g.id)
        } catch (e) {
          console.warn('Erro ao deletar guardião removido:', e)
        }
      }
    }

    // 3. Crianças existentes e sincronização
    const existingChildren = await pb.collection('children').getFullList<Child>({
      filter: `family_id = "${familyId}"`,
    })
    const existingChildIds = new Set(existingChildren.map((c) => c.id))
    const keptChildIds = new Set<string>()

    const updatedChildren: Child[] = []
    for (const c of childrenData) {
      if (!c.name?.trim()) continue

      const payload = sanitizeChildPayload({
        name: c.name,
        birth_date: c.birth_date,
        classroom: c.classroom,
        photo_url: c.photo_url,
        allergies: c.allergies,
        medical_notes: c.medical_notes,
        image_authorized: c.image_authorized,
        active: c.active,
      })

      if (c.id && existingChildIds.has(c.id)) {
        keptChildIds.add(c.id)
        const updated = await pb.collection('children').update<Child>(c.id, payload)
        updatedChildren.push(updated)
      } else {
        payload.family_id = familyId
        payload.dimdim_balance = c.dimdim_balance || 0
        payload.active = true
        const created = await pb.collection('children').create<Child>(payload)
        updatedChildren.push(created)
      }
    }

    // Exclui crianças removidas
    for (const c of existingChildren) {
      if (!keptChildIds.has(c.id)) {
        try {
          await pb.collection('children').delete(c.id)
        } catch (e) {
          console.warn('Erro ao deletar criança removida:', e)
        }
      }
    }

    return {
      ...updatedFamily,
      guardians: updatedGuardians,
      children: updatedChildren,
    }
  },

  async delete(id: string): Promise<boolean> {
    await pb.collection('families').delete(id)
    return true
  },
}

export const guardianService = {
  async create(data: Partial<Guardian>): Promise<Guardian> {
    const sanitized = sanitizeGuardianPayload(data)
    return pb.collection('guardians').create<Guardian>(sanitized)
  },

  async update(id: string, data: Partial<Guardian>): Promise<Guardian> {
    const sanitized = sanitizeGuardianPayload(data)
    return pb.collection('guardians').update<Guardian>(id, sanitized)
  },

  async delete(id: string): Promise<boolean> {
    await pb.collection('guardians').delete(id)
    return true
  },
}

export const childService = {
  async create(data: Partial<Child>): Promise<Child> {
    const sanitized = sanitizeChildPayload(data)
    if (!sanitized.birth_date) {
      sanitized.birth_date = new Date().toISOString()
    }
    return pb.collection('children').create<Child>(sanitized)
  },
  async getAll(classroom?: ClassroomId): Promise<Child[]> {
    const filter = classroom ? `classroom = "${classroom}"` : ''
    return pb.collection('children').getFullList<Child>({
      filter,
      sort: 'name',
      expand: 'family_id',
    })
  },

  async getById(id: string): Promise<Child> {
    return pb.collection('children').getOne<Child>(id, {
      expand: 'family_id',
    })
  },

  async update(id: string, data: Partial<Child>): Promise<Child> {
    const sanitized = sanitizeChildPayload(data)
    return pb.collection('children').update<Child>(id, sanitized)
  },

  async delete(id: string): Promise<boolean> {
    await pb.collection('children').delete(id)
    return true
  },
}
