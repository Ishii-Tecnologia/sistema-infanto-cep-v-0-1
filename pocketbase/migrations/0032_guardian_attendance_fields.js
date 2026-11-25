// Presença de RESPONSÁVEL na chamada da Sala D.
//
// Modelo: attendances ganha person_kind ("child" | "guardian") e guardian_id
// (relation para guardians); child_id deixa de ser required. Presenças
// existentes de crianças continuam válidas (person_kind vazio ≡ "child").
// O índice único (lesson_id, child_id) vira (lesson_id, person_kind, child_id,
// guardian_id) — em SQLite, NULL é distinto em índices únicos, então registros
// de responsável (child_id NULL) nunca colidem entre si nem com crianças.
// Padrão do projeto: idempotente, no-op em banco vazio ou campo já aplicado.
migrate(
  (app) => {
    try {
      const col = app.findCollectionByNameOrId('attendances')
      const kindField = col.fields.getByName('person_kind')
      const guardianField = col.fields.getByName('guardian_id')

      if (!kindField) {
        col.fields.add(
          new SelectField({
            name: 'person_kind',
            values: ['child', 'guardian'],
            maxSelect: 1,
          }),
        )
        console.log('[0032] campo person_kind adicionado a attendances')
      }
      if (!guardianField) {
        col.fields.add(
          new RelationField({
            name: 'guardian_id',
            collectionId: app.findCollectionByNameOrId('guardians').id,
            maxSelect: 1,
          }),
        )
        console.log('[0032] campo guardian_id adicionado a attendances')
      }

      // child_id deixa de ser obrigatório (presença de responsável não tem criança)
      const childField = col.fields.getByName('child_id')
      if (childField && childField.required) {
        childField.required = false
        console.log('[0032] attendances.child_id tornou-se opcional')
      }

      // Índice único: (lesson_id, child_id) -> (lesson_id, person_kind, child_id, guardian_id)
      const oldIdx = 'idx_attendances_lesson_child'
      const newIdx = 'idx_attendances_lesson_person'
      try {
        app.deleteIndex(col.name, oldIdx)
        console.log(`[0032] índice ${oldIdx} removido`)
      } catch (e) {
        console.log(`[0032 down] índice ${oldIdx} já ausente: ${e}`)
      }
      try {
        app.deleteIndex(col.name, newIdx)
        console.log(`[0032] índice ${newIdx} já existia — recriando`)
      } catch (_) {
        // não existe — ok
      }
      app.addIndex(col.name, newIdx, [
        'CREATE UNIQUE INDEX `idx_attendances_lesson_person` ON `attendances` (`lesson_id`, `person_kind`, `child_id`, `guardian_id`)',
      ])
      console.log(`[0032] índice ${newIdx} criado`)

      app.save(col)
      console.log('[0032] attendances atualizada (person_kind, guardian_id, child_id opcional)')
    } catch (e) {
      console.log(`[0032] coleção attendances não encontrada: ${e}`)
    }
  },
  (app) => {
    try {
      const col = app.findCollectionByNameOrId('attendances')
      // restaura índice antigo e remove campos
      try {
        app.deleteIndex(col.name, 'idx_attendances_lesson_person')
      } catch (_) {
        // ausente
      }
      try {
        app.addIndex(col.name, 'idx_attendances_lesson_child', [
          'CREATE UNIQUE INDEX `idx_attendances_lesson_child` ON `attendances` (`lesson_id`, `child_id`)',
        ])
      } catch (_) {
        // já existente
      }
      try {
        col.fields.removeByName('person_kind')
      } catch (_) {
        // ausente
      }
      try {
        col.fields.removeByName('guardian_id')
      } catch (_) {
        // ausente
      }
      const childField = col.fields.getByName('child_id')
      if (childField) childField.required = true
      app.save(col)
      console.log('[0032 down] attendances revertida')
    } catch (e) {
      console.log(`[0032 down] attendances: ${e}`)
    }
  },
)
