// Remove de vez o campo de e-mail da FAMÍLIA do sistema:
// - families.email (o e-mail da família já não aparece na UI desde a v0.0.172)
// - guardians.email (residual — a coluna do responsável também saiu da UI e
//   nunca recebeu valores no banco)
//
// Verificado antes com consulta ao banco: nenhuma linha tem email preenchido
// em families ou guardians — nada é perdido. Idempotente: em um banco vazio
// (sem as coleções ou sem o campo) é no-op.
migrate(
  (app) => {
    for (const name of ['families', 'guardians']) {
      try {
        const col = app.findCollectionByNameOrId(name)
        const field = col.fields.getByName('email')
        if (!field) continue // já removido — no-op
        col.fields.removeByName('email')
        app.save(col)
        console.log(`[0029] campo email removido de ${name}`)
      } catch (e) {
        // coleção não existe (banco vazio) — no-op
        console.log(`[0029] coleção ${name} não encontrada: ${e}`)
      }
    }
  },
  (app) => {
    // Reverte: recria os campos como opcionais e vazios (nenhum valor existia)
    try {
      const fam = app.findCollectionByNameOrId('families')
      if (!fam.fields.getByName('email')) {
        fam.fields.add(new EmailField({ name: 'email' }))
        app.save(fam)
      }
    } catch (e) {
      console.log(`[0029 down] families: ${e}`)
    }
    try {
      const guard = app.findCollectionByNameOrId('guardians')
      if (!guard.fields.getByName('email')) {
        guard.fields.add(new EmailField({ name: 'email' }))
        app.save(guard)
      }
    } catch (e) {
      console.log(`[0029 down] guardians: ${e}`)
    }
  },
)
