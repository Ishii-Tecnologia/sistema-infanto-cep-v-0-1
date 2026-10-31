migrate(
  (app) => {
    const guardians = app.findCollectionByNameOrId('guardians')
    if (!guardians.fields.getByName('birth_date')) {
      guardians.fields.add(
        new DateField({
          name: 'birth_date',
          required: false,
        }),
      )
      app.save(guardians)
    }
  },
  (app) => {
    try {
      const guardians = app.findCollectionByNameOrId('guardians')
      const field = guardians.fields.getByName('birth_date')
      if (field) {
        guardians.fields.removeByName('birth_date')
        app.save(guardians)
      }
    } catch (_) {}
  },
)
