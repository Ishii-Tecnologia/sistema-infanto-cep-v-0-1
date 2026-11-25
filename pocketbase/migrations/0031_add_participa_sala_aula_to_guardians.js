// Adiciona o campo booleano participa_sala_aula à coleção guardians
// (checkbox "Participa da Sala de Aula da Família (Sala D)" na ficha de
// cadastro do responsável no wizard "Cadastro da Família" em /familias).
// Padrão das migrações anteriores: idempotente, no-op em banco vazio ou
// quando o campo já existe.
migrate(
  (app) => {
    try {
      const col = app.findCollectionByNameOrId('guardians')
      if (col.fields.getByName('participa_sala_aula')) {
        console.log('[0031] guardians.participa_sala_aula já existe — no-op')
        return
      }
      col.fields.add(
        new BoolField({
          name: 'participa_sala_aula',
        }),
      )
      app.save(col)
      console.log('[0031] campo participa_sala_aula adicionado a guardians')
    } catch (e) {
      // coleção não existe (banco vazio) — no-op
      console.log(`[0031] coleção guardians não encontrada: ${e}`)
    }
  },
  (app) => {
    try {
      const col = app.findCollectionByNameOrId('guardians')
      if (!col.fields.getByName('participa_sala_aula')) return
      col.fields.removeByName('participa_sala_aula')
      app.save(col)
      console.log('[0031 down] campo participa_sala_aula removido de guardians')
    } catch (e) {
      console.log(`[0031 down] guardians: ${e}`)
    }
  },
)
