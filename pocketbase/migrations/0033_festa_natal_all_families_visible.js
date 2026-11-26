// 0033: Festa de Natal — todas as famílias visíveis para qualquer usuário autenticado.
//
// Relato do usuário: na tela /festa-natal nem todas as famílias apareciam.
// Causa: a migração 0027 restringiu as regras de API (list/view) de families,
// guardians e children por sala para o papel professor — a lista da Festa de
// Natal herda esse filtro do servidor e famílias "sumiam".
//
// Esta migração devolve as regras list/view ao padrão amplo de 0008: qualquer
// operador autenticado lê famílias, responsáveis e alunos. A restrição por
// sala deixa de existir no SERVIDOR (o helper getClassroomScope do frontend
// continua aplicando o escopo nas telas de chamada/caderno, como já fazia).
// Escritas (create/update/delete) permanecem restritas aos papéis
// admin/dirigente/professor/auxiliar. O controle de quem LANÇA a sacolinha
// segue na chave festa_natal_roles de system_settings — nunca na leitura.
migrate(
  (app) => {
    const readAll = "@request.auth.id != ''"
    const writeStaff =
      "@request.auth.id != '' && (@request.auth.role = 'admin' || @request.auth.role = 'dirigente' || @request.auth.role = 'professor' || @request.auth.role = 'auxiliar')"

    const collections = ['families', 'guardians', 'children']
    for (const name of collections) {
      const col = app.findCollectionByNameOrId(name)
      col.listRule = readAll
      col.viewRule = readAll
      col.createRule = writeStaff
      col.updateRule = writeStaff
      col.deleteRule = writeStaff
      app.save(col)
    }
  },
  (app) => {
    // Reversão: restaura as regras por sala da migração 0027.
    const professorFamily =
      "@request.auth.id != '' && (@request.auth.role != 'professor' || children_via_family_id.classroom = @request.auth.assigned_classroom)"
    const professorGuardian =
      "@request.auth.id != '' && (@request.auth.role != 'professor' || family_id.children_via_family_id.classroom = @request.auth.assigned_classroom)"
    const professorChild =
      "@request.auth.id != '' && (@request.auth.role != 'professor' || classroom = @request.auth.assigned_classroom)"
    const writeStaff =
      "@request.auth.id != '' && (@request.auth.role = 'admin' || @request.auth.role = 'dirigente' || @request.auth.role = 'professor' || @request.auth.role = 'auxiliar')"

    const families = app.findCollectionByNameOrId('families')
    families.listRule = professorFamily
    families.viewRule = professorFamily
    families.createRule = writeStaff
    families.updateRule = writeStaff
    families.deleteRule = writeStaff
    app.save(families)

    const guardians = app.findCollectionByNameOrId('guardians')
    guardians.listRule = professorGuardian
    guardians.viewRule = professorGuardian
    guardians.createRule = writeStaff
    guardians.updateRule = writeStaff
    guardians.deleteRule = writeStaff
    app.save(guardians)

    const children = app.findCollectionByNameOrId('children')
    children.listRule = professorChild
    children.viewRule = professorChild
    children.createRule = writeStaff
    children.updateRule = writeStaff
    children.deleteRule = writeStaff
    app.save(children)
  },
)
