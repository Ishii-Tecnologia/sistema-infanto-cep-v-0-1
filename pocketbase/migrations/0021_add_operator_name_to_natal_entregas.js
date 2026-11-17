migrate(
  (app) => {
    const entregas = app.findCollectionByNameOrId('natal_entregas')
    if (!entregas.fields.getByName('operator_name')) {
      entregas.fields.add(new TextField({ name: 'operator_name', required: false, max: 200 }))
      app.save(entregas)
    }
  },
  (app) => {
    const entregas = app.findCollectionByNameOrId('natal_entregas')
    if (entregas.fields.getByName('operator_name')) {
      entregas.fields.removeByName('operator_name')
      app.save(entregas)
    }
  },
)
