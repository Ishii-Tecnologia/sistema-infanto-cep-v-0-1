migrate(
  (app) => {
    const families = app.findCollectionByNameOrId('families')

    if (!families.fields.getByName('bairro')) {
      families.fields.add(
        new TextField({
          name: 'bairro',
          required: false,
          max: 200,
        }),
      )
    }

    app.save(families)
  },
  (app) => {
    try {
      const families = app.findCollectionByNameOrId('families')

      if (families.fields.getByName('bairro')) {
        families.fields.removeByName('bairro')
        app.save(families)
      }
    } catch (_) {}
  },
)
