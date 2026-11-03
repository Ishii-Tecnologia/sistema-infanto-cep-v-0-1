import pb from '@/lib/pocketbase/client'

export interface DeletionLog {
  id: string
  user_id?: string
  operator_name: string
  operator_role: string
  record_type: string
  record_identifier: string
  details?: string
  created: string
  updated: string
}

export interface PurgeLogsResponse {
  success: boolean
  deletedCount: number
  cutoffDate: string
  message: string
}

export const auditLogService = {
  /**
   * Grava um log de exclusão diretamente (útil para auditoria explícita com detalhes adicionais)
   */
  async recordLog(data: {
    recordType: string
    recordIdentifier: string
    details?: string
    operatorName?: string
    operatorRole?: string
    userId?: string
  }): Promise<DeletionLog | null> {
    try {
      const authModel = pb.authStore.model
      const payload = {
        user_id: data.userId || authModel?.id || '',
        operator_name:
          data.operatorName || authModel?.name || authModel?.email || 'Operador Autenticado',
        operator_role: data.operatorRole || authModel?.role || 'operador',
        record_type: data.recordType,
        record_identifier: data.recordIdentifier || '(sem identificação)',
        details: data.details || '',
      }

      return await pb.collection('logs_exclusao').create<DeletionLog>(payload)
    } catch (err) {
      console.warn('Falha silenciosa ao registrar log de exclusão:', err)
      return null
    }
  },

  /**
   * Lista todos os logs de exclusão ordenados
   */
  async getLogs(options?: { sort?: string; filter?: string }): Promise<DeletionLog[]> {
    const sort = options?.sort || '-created'
    const filter = options?.filter || ''

    return await pb.collection('logs_exclusao').getFullList<DeletionLog>({
      sort,
      filter,
    })
  },

  /**
   * Executa expurgo seguro de logs anteriores à data de corte
   */
  async purgeLogsBeforeDate(cutoffDate: string): Promise<PurgeLogsResponse> {
    try {
      const res = await pb.send<PurgeLogsResponse>('/backend/v1/infanto-cep/expurgo-logs', {
        method: 'POST',
        body: { cutoffDate },
      })
      return res
    } catch (err: any) {
      // Fallback seguro caso o endpoint customizado falhe ou requisição direta
      const authModel = pb.authStore.model
      if (authModel?.role !== 'admin') {
        throw new Error('Apenas Administradores possuem permissão para executar o expurgo de logs.')
      }

      const limitDateStr = cutoffDate.includes('T') ? cutoffDate : `${cutoffDate} 00:00:00`
      const records = await pb.collection('logs_exclusao').getFullList<DeletionLog>({
        filter: `created < "${limitDateStr}"`,
      })

      let deleted = 0
      for (const r of records) {
        try {
          await pb.collection('logs_exclusao').delete(r.id)
          deleted++
        } catch {
          /* intentionally ignored */
        }
      }

      // Registra o expurgo
      await this.recordLog({
        recordType: 'Expurgo de Logs',
        recordIdentifier: `Expurgo anterior a ${cutoffDate.slice(0, 10)}`,
        details: `Operação de expurgo permanente: ${deleted} registro(s) de log removido(s) do Sistema Infanto-CEP.`,
      })

      return {
        success: true,
        deletedCount: deleted,
        cutoffDate,
        message: `${deleted} registro(s) de log anteriores a ${cutoffDate} foram expurgados permanentemente no Sistema Infanto-CEP.`,
      }
    }
  },
}
