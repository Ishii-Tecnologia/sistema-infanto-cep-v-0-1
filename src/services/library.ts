import pb from '@/lib/pocketbase/client'
import { Book, BookCopy, BookLoan, LoanStatus } from '@/types'

export const libraryService = {
  async getAllBooks(): Promise<Book[]> {
    const books = await pb.collection('books').getFullList<Book>({
      sort: 'title',
    })

    const copies = await pb.collection('book_copies').getFullList<BookCopy>()
    const copyMap = new Map<string, BookCopy[]>()
    for (const c of copies) {
      const list = copyMap.get(c.book_id) || []
      list.push(c)
      copyMap.set(c.book_id, list)
    }

    return books.map((b) => ({
      ...b,
      copies: copyMap.get(b.id) || [],
    }))
  },

  async getCopies(): Promise<BookCopy[]> {
    return pb.collection('book_copies').getFullList<BookCopy>({
      expand: 'book_id',
      sort: 'copy_number',
    })
  },

  /**
   * Extrai as iniciais significativas do título da obra (ex.: "Pequeno Príncipe" -> "PP" ou palavras com 3 letras se palavra única)
   */
  generateTitleInitials(title: string): string {
    if (!title || typeof title !== 'string') return 'EX'
    const clean = title
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9\s]/g, ' ')
      .trim()

    if (!clean) return 'EX'

    const stopWords = new Set([
      'A',
      'O',
      'AS',
      'OS',
      'UM',
      'UMA',
      'UNS',
      'UMAS',
      'DE',
      'DO',
      'DA',
      'DOS',
      'DAS',
      'EM',
      'NO',
      'NA',
      'NOS',
      'NAS',
      'POR',
      'PARA',
      'COM',
      'E',
      'QUE',
    ])

    const words = clean.split(/\s+/).filter(Boolean)
    const meaningful = words.filter((w) => !stopWords.has(w.toUpperCase()))
    const chosen = meaningful.length > 0 ? meaningful : words

    // Se temos 1 palavra apenas, pegamos até as 3 primeiras letras (ex.: "Evangelho" -> "EVA")
    if (chosen.length === 1) {
      const letters = chosen[0].slice(0, 3).toUpperCase()
      return letters || 'EX'
    }

    const initials = chosen
      .slice(0, 4)
      .map((w) => w[0].toUpperCase())
      .join('')

    return initials || 'EX'
  },

  /**
   * Gera a lista de códigos previstos para uma nova obra com N exemplares iniciais
   */
  previewNewBookCopyCodes(title: string, copiesCount = 1): string[] {
    const trimmed = (title || '').trim()
    if (!trimmed) return []
    const prefix = this.generateTitleInitials(trimmed)
    const total = Math.max(1, copiesCount)
    const codes: string[] = []
    for (let i = 1; i <= total; i++) {
      codes.push(`${prefix}-${i}`)
    }
    return codes
  },

  /**
   * Gera o próximo código de exemplar para a obra (ex: PP-1, PP-2)
   */
  async getNextCopyCode(bookId: string, bookTitle?: string): Promise<string> {
    let title = bookTitle
    if (!title) {
      const book = await pb.collection('books').getOne<Book>(bookId)
      title = book.title
    }

    const prefix = this.generateTitleInitials(title || '')
    const existingCopies = await pb.collection('book_copies').getFullList<BookCopy>({
      filter: `book_id = "${bookId}"`,
      fields: 'copy_number',
    })

    let maxSeq = 0
    for (const copy of existingCopies) {
      const num = copy.copy_number || ''
      // Formato esperado: PREFIXO-SEQUENCIAL
      const parts = num.split('-')
      if (parts.length >= 2) {
        const lastPart = parseInt(parts[parts.length - 1], 10)
        if (!isNaN(lastPart) && lastPart > maxSeq) {
          maxSeq = lastPart
        }
      }
    }

    return `${prefix}-${maxSeq + 1}`
  },

  /**
   * Obtém as regras configuradas da biblioteca (prazo em dias e limite de livros)
   */
  async getLibraryRules(): Promise<{ maxLoansPerChild: number; loanDurationDays: number }> {
    try {
      const record = await pb
        .collection('system_settings')
        .getFirstListItem<any>('key = "rules_library"')
      const val = typeof record.value === 'string' ? JSON.parse(record.value) : record.value
      return {
        maxLoansPerChild: Number(val?.maxLoansPerChild) || 2,
        loanDurationDays: Number(val?.loanDurationDays) || 7,
      }
    } catch (_) {
      return {
        maxLoansPerChild: 2,
        loanDurationDays: 7,
      }
    }
  },

  async createBook(
    bookData: Partial<Book> & { initialCopies?: number },
    initialCopies = 1,
  ): Promise<Book> {
    // Sanitizar payload da obra: remover campos não pertencentes à coleção books
    // (como initialCopies do form) e tratar strings vazias
    const sanitizedPayload: Record<string, any> = {
      title: (bookData.title || '').trim(),
    }

    if (bookData.author !== undefined) sanitizedPayload.author = (bookData.author || '').trim()
    if (bookData.publisher !== undefined)
      sanitizedPayload.publisher = (bookData.publisher || '').trim()
    if (bookData.target_audience !== undefined)
      sanitizedPayload.target_audience = (bookData.target_audience || '').trim()
    if (bookData.category !== undefined)
      sanitizedPayload.category = (bookData.category || '').trim()
    if (bookData.description !== undefined)
      sanitizedPayload.description = (bookData.description || '').trim()
    if (bookData.cover_url !== undefined)
      sanitizedPayload.cover_url = (bookData.cover_url || '').trim()

    const book = await pb.collection('books').create<Book>(sanitizedPayload)
    const prefix = this.generateTitleInitials(book.title || '')

    const totalCopies = Math.max(1, bookData.initialCopies || initialCopies)
    const copies: BookCopy[] = []
    for (let i = 1; i <= totalCopies; i++) {
      const copyCode = `${prefix}-${i}`
      const copy = await pb.collection('book_copies').create<BookCopy>({
        book_id: book.id,
        copy_number: copyCode,
        condition: 'novo',
        status: 'disponivel',
      })
      copies.push(copy)
    }

    return { ...book, copies }
  },

  async addCopy(
    bookId: string,
    copyNumber?: string,
    condition: 'novo' | 'bom' | 'regular' | 'danificado' = 'novo',
  ): Promise<BookCopy> {
    const finalCode = copyNumber?.trim() || (await this.getNextCopyCode(bookId))
    return pb.collection('book_copies').create<BookCopy>({
      book_id: bookId,
      copy_number: finalCode,
      condition,
      status: 'disponivel',
    })
  },

  async updateBook(id: string, data: Partial<Book>): Promise<Book> {
    const sanitizedPayload: Record<string, any> = {}
    if (data.title !== undefined) sanitizedPayload.title = data.title.trim()
    if (data.author !== undefined) sanitizedPayload.author = (data.author || '').trim()
    if (data.publisher !== undefined) sanitizedPayload.publisher = (data.publisher || '').trim()
    if (data.target_audience !== undefined)
      sanitizedPayload.target_audience = (data.target_audience || '').trim()
    if (data.category !== undefined) sanitizedPayload.category = (data.category || '').trim()
    if (data.description !== undefined)
      sanitizedPayload.description = (data.description || '').trim()
    if (data.cover_url !== undefined) sanitizedPayload.cover_url = (data.cover_url || '').trim()

    return pb.collection('books').update<Book>(id, sanitizedPayload)
  },

  async updateCopy(id: string, data: Partial<BookCopy>): Promise<BookCopy> {
    const sanitized: Record<string, any> = {}
    if (data.book_id !== undefined && data.book_id) sanitized.book_id = data.book_id
    if (data.copy_number !== undefined) sanitized.copy_number = data.copy_number.trim()
    if (data.condition !== undefined) sanitized.condition = data.condition
    if (data.status !== undefined) sanitized.status = data.status
    if (data.notes !== undefined) sanitized.notes = (data.notes || '').trim()

    return pb.collection('book_copies').update<BookCopy>(id, sanitized)
  },

  async deleteCopy(id: string): Promise<boolean> {
    await pb.collection('book_copies').delete(id)
    return true
  },

  async deleteBook(id: string): Promise<boolean> {
    await pb.collection('books').delete(id)
    return true
  },

  async getAllLoans(): Promise<BookLoan[]> {
    const loans = await pb.collection('book_loans').getFullList<BookLoan>({
      sort: '-created',
      expand: 'copy_id.book_id,child_id',
    })

    // Atualiza status se vencido
    const now = new Date()
    for (const l of loans) {
      if (l.status === 'active' && l.due_date && new Date(l.due_date) < now) {
        l.status = 'overdue'
      }
    }

    return loans
  },

  async getActiveLoansForChild(childId: string): Promise<BookLoan[]> {
    return pb.collection('book_loans').getFullList<BookLoan>({
      filter: `child_id = "${childId}" && (status = "active" || status = "overdue")`,
      expand: 'copy_id.book_id',
    })
  },

  async borrowBook(copyId: string, childId: string, durationDays?: number): Promise<BookLoan> {
    // 0. Obter parâmetros das configurações do sistema caso não informado
    const rules = await this.getLibraryRules()
    const limit = rules.maxLoansPerChild || 2
    const days = durationDays && durationDays > 0 ? durationDays : rules.loanDurationDays || 7

    // 1. Verificar se a criança já atingiu o limite de empréstimos configurado
    const activeLoans = await this.getActiveLoansForChild(childId)
    if (activeLoans.length >= limit) {
      throw new Error(
        `A criança já possui o limite máximo de ${limit} ${
          limit === 1 ? 'livro emprestado' : 'livros emprestados'
        } simultaneamente.`,
      )
    }

    // 2. Verificar disponibilidade do exemplar
    const copy = await pb.collection('book_copies').getOne<BookCopy>(copyId)
    if (copy.status !== 'disponivel') {
      throw new Error(`Este exemplar não está disponível (situação atual: ${copy.status}).`)
    }

    const loanDate = new Date()
    const dueDate = new Date()
    dueDate.setDate(loanDate.getDate() + days)

    const loan = await pb.collection('book_loans').create<BookLoan>({
      copy_id: copyId,
      child_id: childId,
      loan_date: loanDate.toISOString(),
      due_date: dueDate.toISOString(),
      status: 'active',
    })

    // Atualizar status do exemplar
    await pb.collection('book_copies').update(copyId, {
      status: 'emprestado',
    })

    return loan
  },

  async returnBook(
    loanId: string,
    condition?: 'novo' | 'bom' | 'regular' | 'danificado',
  ): Promise<BookLoan> {
    const loan = await pb.collection('book_loans').getOne<BookLoan>(loanId)
    const returnDate = new Date().toISOString()

    const updatedLoan = await pb.collection('book_loans').update<BookLoan>(loanId, {
      return_date: returnDate,
      status: 'returned',
    })

    if (loan.copy_id) {
      const copyUpdate: Record<string, any> = { status: 'disponivel' }
      if (condition) copyUpdate.condition = condition
      await pb.collection('book_copies').update(loan.copy_id, copyUpdate)
    }

    return updatedLoan
  },
}
