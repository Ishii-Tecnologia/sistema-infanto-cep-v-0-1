import pb from '@/lib/pocketbase/client'
import { DimDimTransaction, DimDimTransactionType, DimDimCategory, Child } from '@/types'

export const dimdimService = {
  async getTransactions(childId?: string): Promise<DimDimTransaction[]> {
    const filter = childId ? `child_id = "${childId}"` : ''
    return pb.collection('dimdim_transactions').getFullList<DimDimTransaction>({
      filter,
      sort: '-created',
      expand: 'child_id',
    })
  },

  async addTransaction(
    childId: string,
    type: DimDimTransactionType,
    amount: number,
    reason: string,
    category: DimDimCategory = 'presenca',
    reversalOfId?: string,
    notes?: string,
  ): Promise<DimDimTransaction> {
    if (amount <= 0) {
      throw new Error('O valor de DimDim deve ser maior que zero.')
    }

    const child = await pb.collection('children').getOne<Child>(childId)
    let currentBalance = child.dimdim_balance || 0

    if (type === 'debit' && currentBalance < amount) {
      throw new Error(
        `Saldo insuficiente. A criança tem ${currentBalance} DimDim e o débito é de ${amount}.`,
      )
    }

    // Calcula novo saldo
    let newBalance = currentBalance
    if (type === 'credit') {
      newBalance += amount
    } else if (type === 'debit') {
      newBalance -= amount
    } else if (type === 'reversal') {
      // Estorno pode ser ajuste de crédito ou débito
      newBalance = Math.max(0, newBalance - amount)
    }

    // Salvar transação
    const txPayload: Record<string, any> = {
      child_id: childId,
      type,
      amount,
      reason: (reason || '').trim(),
      category,
      reversal_of_id: (reversalOfId || '').trim(),
      notes: (notes || '').trim(),
    }
    const tx = await pb.collection('dimdim_transactions').create<DimDimTransaction>(txPayload)

    // Atualizar saldo na ficha da criança enviando somente dimdim_balance
    await pb.collection('children').update(childId, {
      dimdim_balance: newBalance,
    })

    return tx
  },

  async quickCredit(
    childIds: string[],
    amount: number,
    reason: string,
    category: DimDimCategory = 'presenca',
  ): Promise<void> {
    for (const id of childIds) {
      await this.addTransaction(id, 'credit', amount, reason, category)
    }
  },

  async reverseTransaction(
    txId: string,
    reason = 'Estorno solicitado pelo operador',
  ): Promise<DimDimTransaction> {
    const originalTx = await pb.collection('dimdim_transactions').getOne<DimDimTransaction>(txId)
    if (originalTx.type === 'reversal') {
      throw new Error('Não é possível estornar uma transação que já é um estorno.')
    }

    // Se era crédito, estorno retira; se era débito, estorno devolve
    const child = await pb.collection('children').getOne<Child>(originalTx.child_id)
    const currentBalance = child.dimdim_balance || 0

    let newBalance = currentBalance
    if (originalTx.type === 'credit') {
      newBalance = Math.max(0, currentBalance - originalTx.amount)
    } else if (originalTx.type === 'debit') {
      newBalance = currentBalance + originalTx.amount
    }

    const reversalTx = await pb.collection('dimdim_transactions').create<DimDimTransaction>({
      child_id: originalTx.child_id,
      type: 'reversal',
      amount: originalTx.amount,
      reason: `${reason} (Ref: ${originalTx.reason})`.trim(),
      category: originalTx.category,
      reversal_of_id: txId,
      notes: '',
    })

    await pb.collection('children').update(originalTx.child_id, {
      dimdim_balance: newBalance,
    })

    return reversalTx
  },
}
