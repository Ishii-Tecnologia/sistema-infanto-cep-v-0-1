// Adiciona o campo booleano cesta_basica à coleção families
// ("Cadastro Cesta Básica" — checkbox na ficha da família em /familias).
// Padrão das migrações anteriores: idempotente, no-op em banco vazio ou
// quando o campo já existe.
migrate(
  (app) => {
    try {
      const col = app.findCollectionByNameOrId('families')
      if (col.fields.getByName('cesta_basica')) {
        console.log('[0030] families.cesta_basica já existe — no-op')
        return
      }
      col.fields.add(
        new BoolField({
          name: 'cesta_basica',
        }),
      )
      app.save(col)
      console.log('[0030] campo cesta_basica adicionado a families')
    } catch (e) {
      // coleção não existe (banco vazio) — no-op
      console.log(`[0030] coleção families não encontrada: ${e}`)
    }
  },
  (app) => {
    try {
      const col = app.findCollectionByNameOrId('families')
      if (!col.fields.getByName('cesta_basica')) return
      col.fields.removeByName('cesta_basica')
      app.save(col)
      console.log('[0030 down] campo cesta_basica removido de families')
    } catch (e) {
      console.log(`[0030 down] families: ${e}`)
    }
  },
)
