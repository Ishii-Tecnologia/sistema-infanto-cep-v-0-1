import pb from '@/lib/pocketbase/client'
import { User, SystemSetting } from '@/types'

export const settingsService = {
  async getSettings(): Promise<Record<string, any>> {
    const list = await pb.collection('system_settings').getFullList<SystemSetting>()
    const result: Record<string, any> = {}
    for (const item of list) {
      try {
        result[item.key] = typeof item.value === 'string' ? JSON.parse(item.value) : item.value
      } catch (_) {
        result[item.key] = item.value
      }
    }
    return result
  },

  async getSetting(key: string): Promise<any> {
    try {
      const item = await pb
        .collection('system_settings')
        .getFirstListItem<SystemSetting>(`key = "${key}"`)
      return typeof item.value === 'string' ? JSON.parse(item.value) : item.value
    } catch (_) {
      return null
    }
  },

  async updateSetting(key: string, value: any, description?: string): Promise<SystemSetting> {
    const jsonStr = JSON.stringify(value)
    try {
      const existing = await pb
        .collection('system_settings')
        .getFirstListItem<SystemSetting>(`key = "${key}"`)
      return pb.collection('system_settings').update<SystemSetting>(existing.id, {
        value: jsonStr,
        description: description ?? existing.description,
      })
    } catch (_) {
      return pb.collection('system_settings').create<SystemSetting>({
        key,
        value: jsonStr,
        description: description || '',
      })
    }
  },

  async getAllUsers(): Promise<User[]> {
    return pb.collection('users').getFullList<User>({
      sort: 'name',
    })
  },

  async createUser(data: Partial<User> & { password?: string }): Promise<User> {
    const payload: Record<string, any> = {
      email: (data.email || '').trim().toLowerCase(),
      password: data.password || 'Skip@Pass',
      passwordConfirm: data.password || 'Skip@Pass',
      name: (data.name || '').trim(),
      role: data.role || 'auxiliar',
      active: data.active !== false,
    }
    return pb.collection('users').create<User>(payload)
  },

  async updateUser(id: string, data: Partial<User>): Promise<User> {
    const payload: Record<string, any> = {}
    if (data.name !== undefined) payload.name = (data.name || '').trim()
    if (data.role !== undefined) payload.role = data.role
    if (data.active !== undefined) payload.active = Boolean(data.active)
    if (data.email !== undefined && data.email.trim()) {
      payload.email = data.email.trim().toLowerCase()
    }

    return pb.collection('users').update<User>(id, payload)
  },

  async deleteUser(id: string): Promise<boolean> {
    return pb.collection('users').delete(id)
  },

  async resetUserPassword(id: string, newPass = 'Skip@Pass'): Promise<void> {
    try {
      // Tenta via endpoint do backend dedicado para redefinição por admin/dirigente
      await pb.send('/backend/v1/reset-operator-password', {
        method: 'POST',
        body: {
          userId: id,
          newPassword: newPass,
        },
      })
    } catch (endpointError: any) {
      console.warn('Fallback para update direto da coleção users:', endpointError)
      // Fallback para update direto da coleção users caso o hook não responda
      await pb.collection('users').update(id, {
        password: newPass,
        passwordConfirm: newPass,
      })
    }
  },

  async changeOwnPassword(oldPassword: string, newPassword: string): Promise<void> {
    if (!pb.authStore.record?.id) {
      throw new Error('Nenhum usuário logado.')
    }
    const currentUserId = pb.authStore.record.id

    // Atualização com validação da senha atual pelo PocketBase
    await pb.collection('users').update(currentUserId, {
      oldPassword,
      password: newPassword,
      passwordConfirm: newPassword,
    })
  },

  async requestPasswordReset(email: string): Promise<void> {
    await pb.collection('users').requestPasswordReset(email)
  },
}
