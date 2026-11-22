import pb from '@/lib/pocketbase/client'
import { DidacticBook, DidacticLoan, DidacticRequest } from '@/types'

/** Prazo padrão de devolução (dias) aplicado na aprovação server-side. */
export const DIDACTIC_LOAN_DURATION_DAYS = 14

export interface DidacticRequestInput {
  bookId: string
  quantity: number
  useDate: Date
  notes?: string
}

export const didacticLibraryService = {
  // ---------------- Acervo ----------------
  async listBooks(): Promise<DidacticBook[]> {
    return pb.collection('didactic_books').getFullList<DidacticBook>({
      sort: 'title',
    })
  },

  async createBook(data: {
    title: string
    author?: string
    category?: string
    synopsis?: string
    totalCopies: number
  }): Promise<DidacticBook> {
    return pb.collection('didactic_books').create<DidacticBook>({
      title: data.title.trim(),
      author: (data.author || '').trim(),
      category: (data.category || '').trim(),
      synopsis: (data.synopsis || '').trim(),
      total_copies: Math.max(0, Math.floor(data.totalCopies || 0)),
      available_copies: Math.max(0, Math.floor(data.totalCopies || 0)),
    })
  },

  async updateBook(id: string, data: Partial<DidacticBook>): Promise<DidacticBook> {
    const payload: Record<string, unknown> = {}
    if (data.title !== undefined) payload.title = data.title.trim()
    if (data.author !== undefined) payload.author = (data.author || '').trim()
    if (data.category !== undefined) payload.category = (data.category || '').trim()
    if (data.synopsis !== undefined) payload.synopsis = (data.synopsis || '').trim()
    // total_copies/available_copies não são alteráveis por API (regra de API + hook)
    return pb.collection('didactic_books').update<DidacticBook>(id, payload)
  },

  async deleteBook(id: string): Promise<void> {
    await pb.collection('didactic_books').delete(id)
  },

  // ---------------- Solicitações ----------------
  async listRequests(): Promise<DidacticRequest[]> {
    return pb.collection('didactic_requests').getFullList<DidacticRequest>({
      sort: '-created',
      expand: 'book_id,requester',
    })
  },

  /** Lista das solicitações do próprio operador (perfil professor/auxiliar). */
  async listMyRequests(): Promise<DidacticRequest[]> {
    const uid = pb.authStore.record?.id
    if (!uid) return []
    return pb.collection('didactic_requests').getFullList<DidacticRequest>({
      filter: `requester = "${uid}"`,
      sort: '-created',
      expand: 'book_id',
    })
  },

  /** Cria uma solicitação em nome do operador logado (professor/auxiliar). */
  async createRequest(input: DidacticRequestInput): Promise<DidacticRequest> {
    const uid = pb.authStore.record?.id
    if (!uid) throw new Error('Você precisa estar autenticado para solicitar um empréstimo.')

    const quantity = Math.floor(input.quantity)
    if (!input.bookId) throw new Error('Escolha um livro do acervo didático.')
    if (!(quantity >= 1)) throw new Error('A quantidade deve ser ao menos 1 exemplar.')

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const useDate = new Date(input.useDate)
    useDate.setHours(0, 0, 0, 0)
    if (useDate < today) {
      throw new Error('A data de uso não pode ser no passado.')
    }

    return pb.collection('didactic_requests').create<DidacticRequest>({
      book_id: input.bookId,
      requester: uid,
      quantity,
      use_date: useDate.toISOString(),
      notes: (input.notes || '').trim(),
      status: 'pendente',
    })
  },

  /** Aprova (débito de estoque + criação de empréstimo) — server-side via hook. */
  async approveRequest(id: string): Promise<DidacticRequest> {
    return pb.collection('didactic_requests').update<DidacticRequest>(id, { status: 'aprovada' })
  },

  /** Recusa (não altera o acervo) — server-side via hook. */
  async rejectRequest(id: string, decisionNote?: string): Promise<DidacticRequest> {
    return pb
      .collection('didactic_requests')
      .update<DidacticRequest>(id, { status: 'recusada', decision_note: decisionNote || '' })
  },

  // ---------------- Empréstimos ----------------
  async listLoans(): Promise<DidacticLoan[]> {
    return pb.collection('didactic_loans').getFullList<DidacticLoan>({
      sort: '-loan_date,-created',
      expand: 'book_id,requester,request_id',
    })
  },

  /** Registrar devolução (restitui o acervo) — server-side via hook. */
  async returnLoan(id: string): Promise<DidacticLoan> {
    return pb.collection('didactic_loans').update<DidacticLoan>(id, { status: 'devolvido' })
  },
}

/** Status efetivo do empréstimo: 'atrasado' quando ativo após o prazo. */
export function didacticLoanEffectiveStatus(
  loan: DidacticLoan,
): 'ativo' | 'atrasado' | 'devolvido' {
  if (loan.status === 'devolvido') return 'devolvido'
  if (loan.due_date && new Date(loan.due_date) < new Date()) return 'atrasado'
  return 'ativo'
}

/** Dias em atraso (0 quando em dia ou devolvido). */
export function didacticLoanDaysOverdue(loan: DidacticLoan): number {
  if (didacticLoanEffectiveStatus(loan) !== 'atrasado') return 0
  const due = new Date(loan.due_date)
  due.setHours(23, 59, 59, 0)
  const diffMs = Date.now() - due.getTime()
  return Math.max(0, Math.floor(diffMs / (24 * 60 * 60 * 1000)))
}
