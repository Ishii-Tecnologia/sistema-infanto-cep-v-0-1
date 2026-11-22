// 0027: alocação de sala para operadores com papel de professor.
//
// O operador professor passa a ter um campo opcional `assigned_classroom`
// (select A/B/C/D) que indica a única sala cujas famílias e alunos ele pode
// ver. O escopo é aplicado em DUAS camadas:
//
//  1. Regras de API (list/view) das coleções de dados: para role professor,
//     famílias só aparecem quando têm criança na sua sala e crianças só
//     aparecem quando estão na sua sala. Professor SEM sala definida fica
//     com lista vazia (falha segura). Admin/dirigente/auxiliar/bibliotecário
//     continuam vendo tudo.
//  2. Frontend: helper `getClassroomScope` (src/services/classroomScope.ts)
//     aplica o mesmo filtro na UI, esconde o seletor de sala na Chamada e
//     restringe a busca nas demais telas.
//
// down: restaura as regras amplas e remove o campo.
migrate(
  (app) => {
    // 1. Campo assigned_classroom no users (idempotente)
    const users = app.findCollectionByNameOrId('users')
    if (!users.fields.getByName('assigned_classroom')) {
      users.fields.add(
        new SelectField({ name: 'assigned_classroom', values: ['A', 'B', 'C', 'D'], maxSelect: 1 }),
      )
      app.save(users)
    }

    // 2. families: professor só vê famílias com criança na sua sala
    const families = app.findCollectionByNameOrId('families')
    const professorFamily =
      "@request.auth.id != '' && (@request.auth.role != 'professor' || children_via_family_id.classroom = @request.auth.assigned_classroom)"
    families.listRule = professorFamily
    families.viewRule = professorFamily
    app.save(families)

    // 3. guardians: segue a sala das famílias
    const guardians = app.findCollectionByNameOrId('guardians')
    const professorGuardian =
      "@request.auth.id != '' && (@request.auth.role != 'professor' || family_id.children_via_family_id.classroom = @request.auth.assigned_classroom)"
    guardians.listRule = professorGuardian
    guardians.viewRule = professorGuardian
    app.save(guardians)

    // 4. children: professor só vê crianças da sua sala
    const children = app.findCollectionByNameOrId('children')
    const professorChild =
      "@request.auth.id != '' && (@request.auth.role != 'professor' || classroom = @request.auth.assigned_classroom)"
    children.listRule = professorChild
    children.viewRule = professorChild
    app.save(children)
  },
  (app) => {
    const users = app.findCollectionByNameOrId('users')
    if (users.fields.getByName('assigned_classroom')) {
      users.fields.removeByName('assigned_classroom')
      app.save(users)
    }

    const families = app.findCollectionByNameOrId('families')
    families.listRule = "@request.auth.id != ''"
    families.viewRule = "@request.auth.id != ''"
    app.save(families)

    const guardians = app.findCollectionByNameOrId('guardians')
    guardians.listRule = "@request.auth.id != ''"
    guardians.viewRule = "@request.auth.id != ''"
    app.save(guardians)

    const children = app.findCollectionByNameOrId('children')
    children.listRule = "@request.auth.id != ''"
    children.viewRule = "@request.auth.id != ''"
    app.save(children)
  },
)
