migrate(
  (app) => {
    try {
      app.findCollectionByNameOrId('natal_entregas')
      return // Já existe
    } catch (_) {}

    const families = app.findCollectionByNameOrId('families')

    const entregas = new Collection({
      name: 'natal_entregas',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: null, // Lançamentos são imutáveis
      deleteRule: "@request.auth.id != '' && @request.auth.role = 'admin'",
      fields: [
        {
          name: 'family_id',
          type: 'relation',
          collectionId: families.id,
          maxSelect: 1,
          required: true,
        },
        { name: 'person_name', type: 'text', required: true, max: 200 },
        { name: 'delivered_at', type: 'date', required: true },
        {
          name: 'photo',
          type: 'file',
          maxSelect: 1,
          maxSize: 10485760,
          mimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'],
          thumbs: ['400x400'],
        },
        {
          name: 'created_by',
          type: 'relation',
          collectionId: '_pb_users_auth_',
          maxSelect: 1,
          required: false,
        },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: ['CREATE INDEX idx_natal_entregas_family ON natal_entregas (family_id)'],
    })

    app.save(entregas)
  },
  (app) => {
    try {
      const entregas = app.findCollectionByNameOrId('natal_entregas')
      app.delete(entregas)
    } catch (_) {}
  },
)
