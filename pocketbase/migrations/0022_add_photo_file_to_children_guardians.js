migrate(
  (app) => {
    // Campo de ARQUIVO para foto (mesmo padrão de natal_entregas.photo).
    // O campo antigo photo_url (texto) é mantido durante a transição.
    const children = app.findCollectionByNameOrId('children')
    if (!children.fields.getByName('photo')) {
      children.fields.add(
        new FileField({
          name: 'photo',
          required: false,
          maxSelect: 1,
          maxSize: 5242880,
          mimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
          thumbs: ['100x100', '300x300'],
        }),
      )
      app.save(children)
    }

    const guardians = app.findCollectionByNameOrId('guardians')
    if (!guardians.fields.getByName('photo')) {
      guardians.fields.add(
        new FileField({
          name: 'photo',
          required: false,
          maxSelect: 1,
          maxSize: 5242880,
          mimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
          thumbs: ['100x100', '300x300'],
        }),
      )
      app.save(guardians)
    }
  },
  (app) => {
    const children = app.findCollectionByNameOrId('children')
    if (children.fields.getByName('photo')) {
      children.fields.removeByName('photo')
      app.save(children)
    }
    const guardians = app.findCollectionByNameOrId('guardians')
    if (guardians.fields.getByName('photo')) {
      guardians.fields.removeByName('photo')
      app.save(guardians)
    }
  },
)
