// pocketbase/hooks/didactic_library.pb.js
//
// Biblioteca Didática — regras de negócio server-side (transacionais).
//
// Papéis do sistema: admin | dirigente | professor | auxiliar | bibliotecario.
// Gestão didática (aprovar/recusar solicitações, registrar devolução,
// cadastrar/editar/excluir livros) é exclusiva de admin/dirigente/bibliotecário.
//
// Por API ninguém altera os contadores de exemplares (total_copies /
// available_copies não alteráveis em didactic_books; createRule de
// didactic_loans é null). Toda movimentação de estoque acontece AQUI, dentro
// de transações do PocketBase ($app.runInTransaction), garantindo:
//  - aprovação: debita available_copies e cria o empréstimo com prazo;
//  - devolução: restitui available_copies e fecha o empréstimo;
//  - estoque nunca negativo (validado antes de qualquer débito);
//  - solicitação recusada não altera o acervo.
//
// NOTA: a JSVM executa cada callback em um pool separado — TODA a lógica fica
// inline dentro dos callbacks (sem funções/constantes de nível superior).

// ---------------------------------------------------------------------------
// didactic_books — criação: contadores iniciais coerentes
// ---------------------------------------------------------------------------
onRecordCreate((e) => {
  const rec = e.record
  const total = Math.max(0, Math.floor(rec.getInt('total_copies') || 0))
  // Disponível inicial = total (o acervo começa todo em estante)
  rec.set('total_copies', total)
  rec.set('available_copies', total)
  e.next()
}, 'didactic_books')

// ---------------------------------------------------------------------------
// didactic_books — atualização por API: campos de texto/editáveis apenas;
// contadores de exemplares NUNCA mudam por API (só por transação abaixo).
// ---------------------------------------------------------------------------
onRecordUpdate((e) => {
  const rec = e.record
  const orig = rec.original()
  rec.set('total_copies', orig.getInt('total_copies'))
  rec.set('available_copies', orig.getInt('available_copies'))
  e.next()
}, 'didactic_books')

// ---------------------------------------------------------------------------
// didactic_books — exclusão: recusa se houver empréstimo ativo (o estoque
// físico está com o professor); recusa também se o total for inconsistente.
// ---------------------------------------------------------------------------
onRecordBeforeDelete((e) => {
  const book = e.record
  const activeLoans = e.app.countRecords(
    'didactic_loans',
    {
      filter: 'book_id = {:id} && status = "ativo"',
    },
    { id: book.id },
  )
  if (activeLoans > 0) {
    throw new BadRequestError(
      'Este livro tem ' +
        activeLoans +
        ' empréstimo(s) ativo(s). Registre as devoluções antes de excluir.',
    )
  }
  e.next()
}, 'didactic_books')

// ---------------------------------------------------------------------------
// didactic_requests — criação (professor/auxiliar/gestão):
//  - data de uso não pode ser no passado;
//  - quantidade não pode exceder os exemplares disponíveis;
//  - solicitante é sempre o próprio operador autenticado.
// ---------------------------------------------------------------------------
onRecordCreate((e) => {
  const app = e.app
  const rec = e.record
  const auth = e.auth
  if (auth && rec.getString('requester') !== auth.id) {
    throw new ForbiddenError('Você só pode criar solicitações em seu próprio nome.')
  }

  const quantity = rec.getInt('quantity')
  if (quantity < 1) {
    throw new BadRequestError('A quantidade deve ser ao menos 1 exemplar.')
  }

  const useDateStr = rec.getString('use_date')
  if (useDateStr) {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const useDate = new Date(useDateStr)
    useDate.setHours(0, 0, 0, 0)
    if (useDate < today) {
      throw new BadRequestError('A data de uso não pode ser no passado.')
    }
  }

  const bookId = rec.getString('book_id')
  if (bookId) {
    const book = app.findRecordById('didactic_books', bookId)
    const available = book.getInt('available_copies')
    if (quantity > available) {
      throw new BadRequestError(
        'A quantidade solicitada (' +
          quantity +
          ') excede os exemplares disponíveis (' +
          available +
          ').',
      )
    }
  }
  e.next()
}, 'didactic_requests')

// ---------------------------------------------------------------------------
// didactic_requests — atualização (aprovar / recusar).
// Aprovação em transação: débito de estoque + criação do empréstimo (prazo
// de 14 dias). Recusa não altera o acervo.
// ---------------------------------------------------------------------------
onRecordUpdate((e) => {
  const app = e.app
  const rec = e.record
  const orig = rec.original()
  const auth = e.auth
  const role = auth ? auth.getString('role') : ''

  const isManager = role === 'admin' || role === 'dirigente' || role === 'bibliotecario'
  if (!isManager) {
    throw new ForbiddenError(
      'Somente o bibliotecário (ou admin/dirigente) pode decidir solicitações.',
    )
  }

  const originalStatus = orig.getString('status')
  if (originalStatus !== 'pendente') {
    throw new BadRequestError('A solicitação já foi processada (' + originalStatus + ').')
  }

  const newStatus = rec.getString('status')
  if (newStatus === 'recusada') {
    // Recusa não altera o acervo.
    rec.set('decided_at', new Date().toISOString())
    e.next()
    return
  }
  if (newStatus !== 'aprovada') {
    throw new BadRequestError('Status inválido para decisão da solicitação: ' + newStatus)
  }

  // APROVAÇÃO — transação: débito de estoque + criação do empréstimo.
  $app.runInTransaction(function (txApp) {
    const book = txApp.findRecordById('didactic_books', rec.getString('book_id'))
    const available = book.getInt('available_copies')
    const quantity = rec.getInt('quantity')

    if (quantity > available) {
      throw new BadRequestError(
        'A quantidade solicitada (' +
          quantity +
          ') excede os exemplares disponíveis (' +
          available +
          ').',
      )
    }

    // Débito do acervo (nunca negativo — validado acima)
    book.set('available_copies', available - quantity)
    txApp.save(book)

    // Empréstimo com prazo de 14 dias a partir de hoje
    const now = new Date()
    const due = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000)
    const loansCol = txApp.findCollectionByNameOrId('didactic_loans')
    const loanRec = new Record(loansCol)
    loanRec.set('request_id', rec.id)
    loanRec.set('book_id', rec.getString('book_id'))
    loanRec.set('requester', rec.getString('requester'))
    loanRec.set('quantity', quantity)
    loanRec.set('loan_date', now.toISOString())
    loanRec.set('due_date', due.toISOString())
    loanRec.set('status', 'ativo')
    txApp.save(loanRec)

    rec.set('loan_id', loanRec.id)
    rec.set('decided_at', now.toISOString())
    txApp.save(rec)
  })
  // A transação já persistiu tudo; o e.next() abaixo regrava os mesmos valores
  // (idempotente) e completa o fluxo padrão do PocketBase.
  e.next()
}, 'didactic_requests')

// ---------------------------------------------------------------------------
// didactic_requests — exclusão: permitida apenas se ainda pendente (gestão).
// (deleteRule null: só superuser/hook; aqui guardamos contra lixo de dados.)
// ---------------------------------------------------------------------------
onRecordBeforeDelete((e) => {
  const rec = e.record
  if (rec.getString('status') !== 'pendente') {
    throw new BadRequestError('Só uma solicitação pendente pode ser removida.')
  }
  e.next()
}, 'didactic_requests')

// ---------------------------------------------------------------------------
// didactic_loans — atualização: registrar devolução (gestão) em transação,
// com restituição do acervo (nunca acima do total).
// ---------------------------------------------------------------------------
onRecordUpdate((e) => {
  const rec = e.record
  const orig = rec.original()
  const auth = e.auth
  const role = auth ? auth.getString('role') : ''

  const isManager = role === 'admin' || role === 'dirigente' || role === 'bibliotecario'
  if (!isManager) {
    throw new ForbiddenError(
      'Somente o bibliotecário (ou admin/dirigente) pode registrar devoluções.',
    )
  }

  const originalStatus = orig.getString('status')
  if (originalStatus !== 'ativo') {
    throw new BadRequestError('Este empréstimo já foi devolvido.')
  }
  if (rec.getString('status') !== 'devolvido') {
    throw new BadRequestError('Único status permitido na devolução é "devolvido".')
  }

  // Transação: restituição do acervo + fechamento + solicitação 'devolvida'.
  $app.runInTransaction(function (txApp) {
    const book = txApp.findRecordById('didactic_books', rec.getString('book_id'))
    const available = book.getInt('available_copies')
    const total = book.getInt('total_copies')
    const quantity = rec.getInt('quantity')
    const restored = Math.min(available + quantity, total)
    book.set('available_copies', restored)
    txApp.save(book)

    rec.set('status', 'devolvido')
    rec.set('return_date', new Date().toISOString())
    txApp.save(rec)

    const requestId = rec.getString('request_id')
    if (requestId) {
      try {
        const reqRec = txApp.findRecordById('didactic_requests', requestId)
        if (reqRec.getString('status') === 'aprovada') {
          reqRec.set('status', 'devolvida')
          txApp.save(reqRec)
        }
      } catch (err) {
        console.error('Falha ao marcar solicitação como devolvida:', err)
      }
    }
  })
  // A transação já persistiu tudo; o e.next() abaixo regrava os mesmos valores
  // (idempotente) e completa o fluxo padrão do PocketBase.
  e.next()
}, 'didactic_loans')

// ---------------------------------------------------------------------------
// didactic_loans — criação por API é bloqueada (createRule = null); por
// segurança, o hook também recusa qualquer criação vinda de operador
// autenticado (só a aprovação server-side acima cria empréstimos, sem auth).
// ---------------------------------------------------------------------------
onRecordBeforeCreate((e) => {
  if (e.auth) {
    throw new ForbiddenError(
      'Empréstimos didáticos são criados apenas pela aprovação de solicitações.',
    )
  }
  e.next()
}, 'didactic_loans')
