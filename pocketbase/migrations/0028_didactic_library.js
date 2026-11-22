// 0028: Biblioteca Didática — solicitação de livros didáticos por professores
// e auxiliares, com gestão exclusiva do bibliotecário.
//
// Coleções:
//  - didactic_books   → acervo didático (título, autor, categoria, sinopse,
//    exemplares totais/disponíveis como contadores).
//  - didactic_requests → solicitação de empréstimo feita por professor/auxiliar
//    (status: pendente/aprovada/recusada/devolvida).
//  - didactic_loans   → empréstimo gerado pela aprovação da solicitação
//    (status: active/returned; "atrasado" é calculado pela prazo).
//
// Regras de API: leitura para qualquer autenticado; escrita:
//  - didactic_books      → admin, dirigente, bibliotecário (gestão do acervo).
//  - didactic_requests   → criação por professor/auxiliar (solicitante é o
//    próprio operador, imutável); mudanças de status (aprovar/recusar) são
//    exclusivas de admin/dirigente/bibliotecário; devolvida também é só da
//    gestão (é consequência da devolução do empréstimo).
//  - didactic_loans      → criados APENAS server-side (hooks, superuser);
//    devolução apenas pela gestão.
//
// O débito/crédito de exemplares e a criação do empréstimo são transacionais
// e ficam no hook didactic_library.pb.js — por API ninguém mexe nos contadores
// diretamente (updateRule de didactic_books é null para todos os papéis
// operacionais).
migrate(
  (app) => {
    const usersColId = '_pb_users_auth_'

    const canManage =
      "@request.auth.id != '' && (@request.auth.role = 'admin' || @request.auth.role = 'dirigente' || @request.auth.role = 'bibliotecario')"
    const canSee = "@request.auth.id != ''"

    const books = new Collection({
      name: 'didactic_books',
      type: 'base',
      listRule: canSee,
      viewRule: canSee,
      // Criação apenas pela gestão do acervo (bibliotecário/admin/dirigente).
      createRule: canManage,
      // Contadores de exemplares só mudam via hook server-side (transação):
      // qualquer update por API zera os contadores (não alteráveis).
      updateRule:
        canManage + ' && @request.body.total_copies = 0 && @request.body.available_copies = 0',
      deleteRule: canManage,
      fields: [
        { name: 'title', type: 'text', required: true, max: 300 },
        { name: 'author', type: 'text', max: 200 },
        { name: 'category', type: 'text', max: 120 },
        { name: 'synopsis', type: 'text', max: 2000 },
        { name: 'total_copies', type: 'number', onlyInt: true, min: 0 },
        { name: 'available_copies', type: 'number', onlyInt: true, min: 0 },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: ['CREATE INDEX idx_didactic_books_title ON didactic_books (title)'],
    })
    app.save(books)

    const requests = new Collection({
      name: 'didactic_requests',
      type: 'base',
      listRule: canSee,
      viewRule: canSee,
      createRule:
        "@request.auth.id != '' && (@request.auth.role = 'professor' || @request.auth.role = 'auxiliar' || @request.auth.role = 'admin' || @request.auth.role = 'dirigente' || @request.auth.role = 'bibliotecario') && requester = @request.auth.id && status = 'pendente'",
      // Mudança de status (aprovar/recusar) só pela gestão; o hook didactic_library
      // faz a validação de estoque/data e cria o empréstimo em transação.
      updateRule:
        canManage +
        " && @request.body.requester = '' && @request.body.book_id = '' && @request.body.quantity = 0 && @request.body.use_date = '' && @request.body.notes = '' && @request.body.decided_at = '' && @request.body.loan_id = ''",
      deleteRule: null,
      fields: [
        { name: 'book_id', type: 'relation', required: true, collectionId: books.id, maxSelect: 1 },
        {
          name: 'requester',
          type: 'relation',
          required: true,
          collectionId: usersColId,
          maxSelect: 1,
        },
        { name: 'quantity', type: 'number', required: true, onlyInt: true, min: 1, max: 50 },
        { name: 'use_date', type: 'date', required: true },
        { name: 'notes', type: 'text', max: 1000 },
        {
          name: 'status',
          type: 'select',
          required: true,
          values: ['pendente', 'aprovada', 'recusada', 'devolvida'],
          maxSelect: 1,
        },
        { name: 'decision_note', type: 'text', max: 500 },
        { name: 'decided_at', type: 'date' },
        { name: 'loan_id', type: 'text', max: 50 },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_didactic_requests_book ON didactic_requests (book_id)',
        'CREATE INDEX idx_didactic_requests_requester ON didactic_requests (requester)',
        'CREATE INDEX idx_didactic_requests_status ON didactic_requests (status)',
      ],
    })
    app.save(requests)

    const loans = new Collection({
      name: 'didactic_loans',
      type: 'base',
      listRule: canSee,
      viewRule: canSee,
      // Empréstimo nasce somente da aprovação server-side (hook).
      createRule: null,
      // Devolução apenas pela gestão (hook zera/dá baixa no acervo).
      updateRule: canManage,
      deleteRule: null,
      fields: [
        {
          name: 'request_id',
          type: 'relation',
          required: true,
          collectionId: requests.id,
          maxSelect: 1,
        },
        { name: 'book_id', type: 'relation', required: true, collectionId: books.id, maxSelect: 1 },
        {
          name: 'requester',
          type: 'relation',
          required: true,
          collectionId: usersColId,
          maxSelect: 1,
        },
        { name: 'quantity', type: 'number', required: true, onlyInt: true, min: 1 },
        { name: 'loan_date', type: 'date', required: true },
        { name: 'due_date', type: 'date', required: true },
        { name: 'return_date', type: 'date' },
        {
          name: 'status',
          type: 'select',
          required: true,
          values: ['ativo', 'devolvido'],
          maxSelect: 1,
        },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_didactic_loans_request ON didactic_loans (request_id)',
        'CREATE INDEX idx_didactic_loans_book ON didactic_loans (book_id)',
        'CREATE INDEX idx_didactic_loans_status ON didactic_loans (status)',
      ],
    })
    app.save(loans)
  },
  (app) => {
    for (const name of ['didactic_loans', 'didactic_requests', 'didactic_books']) {
      try {
        const col = app.findCollectionByNameOrId(name)
        app.delete(col)
      } catch (_) {
        // já removida
      }
    }
  },
)
