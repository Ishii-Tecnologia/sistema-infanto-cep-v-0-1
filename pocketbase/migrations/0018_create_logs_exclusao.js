migrate(
  (app) => {
    try {
      app.findCollectionByNameOrId('logs_exclusao')
      return // Já existe
    } catch (_) {}

    const logs = new Collection({
      name: 'logs_exclusao',
      type: 'base',
      listRule: "@request.auth.id != '' && @request.auth.role = 'admin'",
      viewRule: "@request.auth.id != '' && @request.auth.role = 'admin'",
      createRule: "@request.auth.id != ''",
      updateRule: null, // Logs são imutáveis
      deleteRule: "@request.auth.id != '' && @request.auth.role = 'admin'", // Expurgo permitido ao administrador
      fields: [
        {
          name: 'user_id',
          type: 'relation',
          collectionId: '_pb_users_auth_',
          maxSelect: 1,
          required: false,
        },
        { name: 'operator_name', type: 'text', required: true },
        { name: 'operator_role', type: 'text', required: true },
        { name: 'record_type', type: 'text', required: true },
        { name: 'record_identifier', type: 'text', required: true },
        { name: 'details', type: 'text' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_logs_exclusao_created ON logs_exclusao (created)',
        'CREATE INDEX idx_logs_exclusao_type ON logs_exclusao (record_type)',
        'CREATE INDEX idx_logs_exclusao_operator ON logs_exclusao (operator_name)',
      ],
    })

    app.save(logs)
  },
  (app) => {
    try {
      const logs = app.findCollectionByNameOrId('logs_exclusao')
      app.delete(logs)
    } catch (_) {}
  },
)
