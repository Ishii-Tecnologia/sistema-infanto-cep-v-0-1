// 0026: cascata de exclusão garantida no banco.
//
// A exclusão de família falhava com "Failed to delete record. Make sure that
// the record is not part of a required relation reference." porque:
//  - book_loans.child_id aponta para children SEM cascadeDelete (empréstimo
//    ativo trava a exclusão da criança e, com ela, da família);
//  - natal_entregas.family_id aponta para families SEM cascadeDelete (lançamento
//    da sacolinha trava a exclusão da própria família).
// Aqui as duas relações passam a ter cascadeDelete; guardians/children,
// attendances e dimdim_transactions já tinham cascata desde 0001.
//
// down: restaura o estado anterior (sem cascadeDelete).
migrate(
  (app) => {
    const loans = app.findCollectionByNameOrId('book_loans')
    if (!loans.fields.getByName('child_id')) {
      throw new Error('book_loans.child_id não encontrado')
    }
    loans.fields.getByName('child_id').cascadeDelete = true
    app.save(loans)

    const entregas = app.findCollectionByNameOrId('natal_entregas')
    if (!entregas.fields.getByName('family_id')) {
      throw new Error('natal_entregas.family_id não encontrado')
    }
    entregas.fields.getByName('family_id').cascadeDelete = true
    app.save(entregas)
  },
  (app) => {
    const loans = app.findCollectionByNameOrId('book_loans')
    loans.fields.getByName('child_id').cascadeDelete = false
    app.save(loans)

    const entregas = app.findCollectionByNameOrId('natal_entregas')
    entregas.fields.getByName('family_id').cascadeDelete = false
    app.save(entregas)
  },
)
