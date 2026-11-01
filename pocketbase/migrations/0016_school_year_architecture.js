migrate(
  (app) => {
    // 1. Criar Coleção ano_letivo
    let anoLetivoCol
    try {
      anoLetivoCol = app.findCollectionByNameOrId('ano_letivo')
    } catch (_) {
      anoLetivoCol = new Collection({
        name: 'ano_letivo',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.id != ''",
        deleteRule: "@request.auth.id != ''",
        fields: [
          { name: 'ano', type: 'number', required: true, onlyInt: true },
          { name: 'data_inicio', type: 'date', required: true },
          { name: 'data_fim', type: 'date' },
          {
            name: 'status',
            type: 'select',
            required: true,
            values: ['planejado', 'ativo', 'encerrado'],
            maxSelect: 1,
          },
          { name: 'age_base_date', type: 'date' },
          { name: 'winter_break_start', type: 'date' },
          { name: 'winter_break_end', type: 'date' },
          { name: 'christmas_date', type: 'date' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: ['CREATE UNIQUE INDEX idx_ano_letivo_ano ON ano_letivo (ano)'],
      })
      app.save(anoLetivoCol)
    }

    // Adicionar campo auto-relacional replicado_de
    const anoLetivoId = app.findCollectionByNameOrId('ano_letivo').id
    const updatedAnoCol = app.findCollectionByNameOrId('ano_letivo')
    if (!updatedAnoCol.fields.getByName('replicado_de')) {
      updatedAnoCol.fields.add(
        new RelationField({
          name: 'replicado_de',
          collectionId: anoLetivoId,
          maxSelect: 1,
        }),
      )
      app.save(updatedAnoCol)
    }

    // 2. Criar Coleção sabado_letivo
    let sabadoCol
    try {
      sabadoCol = app.findCollectionByNameOrId('sabado_letivo')
    } catch (_) {
      const lessonsId = app.findCollectionByNameOrId('lessons').id
      sabadoCol = new Collection({
        name: 'sabado_letivo',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.id != ''",
        deleteRule: "@request.auth.id != ''",
        fields: [
          {
            name: 'ano_letivo_id',
            type: 'relation',
            required: true,
            collectionId: anoLetivoId,
            cascadeDelete: true,
            maxSelect: 1,
          },
          { name: 'data', type: 'date', required: true },
          {
            name: 'tipo',
            type: 'select',
            required: true,
            values: ['letivo', 'feriado', 'recesso', 'evento'],
            maxSelect: 1,
          },
          { name: 'descricao', type: 'text', max: 120 },
          { name: 'revisado', type: 'bool' },
          { name: 'conflito_motivo', type: 'text' },
          {
            name: 'lesson_id',
            type: 'relation',
            collectionId: lessonsId,
            maxSelect: 1,
          },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE UNIQUE INDEX idx_sabado_letivo_ano_data ON sabado_letivo (ano_letivo_id, data)',
          'CREATE INDEX idx_sabado_letivo_data ON sabado_letivo (data)',
        ],
      })
      app.save(sabadoCol)
    }

    // 3. Criar Coleção janela_feriado
    let janelaCol
    try {
      janelaCol = app.findCollectionByNameOrId('janela_feriado')
    } catch (_) {
      janelaCol = new Collection({
        name: 'janela_feriado',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.id != ''",
        deleteRule: "@request.auth.id != ''",
        fields: [
          {
            name: 'ano_letivo_id',
            type: 'relation',
            required: true,
            collectionId: anoLetivoId,
            cascadeDelete: true,
            maxSelect: 1,
          },
          { name: 'data_inicio', type: 'date', required: true },
          { name: 'data_fim', type: 'date', required: true },
          { name: 'nome', type: 'text', required: true, max: 120 },
          { name: 'revisado', type: 'bool' },
          { name: 'conflito_motivo', type: 'text' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: ['CREATE INDEX idx_janela_feriado_ano ON janela_feriado (ano_letivo_id)'],
      })
      app.save(janelaCol)
    }

    // 4. Criar Coleção auditoria_sabados
    let auditCol
    try {
      auditCol = app.findCollectionByNameOrId('auditoria_sabados')
    } catch (_) {
      auditCol = new Collection({
        name: 'auditoria_sabados',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: "@request.auth.id != ''",
        updateRule: null,
        deleteRule: null,
        fields: [
          {
            name: 'user_id',
            type: 'relation',
            collectionId: '_pb_users_auth_',
            maxSelect: 1,
          },
          { name: 'user_name', type: 'text' },
          { name: 'ano', type: 'number', onlyInt: true },
          { name: 'acao', type: 'text', required: true },
          { name: 'detalhes', type: 'text' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE INDEX idx_auditoria_sabados_ano ON auditoria_sabados (ano, created DESC)',
        ],
      })
      app.save(auditCol)
    }

    // 5. Migrar dados existentes idempotentemente
    const anoCollection = app.findCollectionByNameOrId('ano_letivo')
    const sabadoCollection = app.findCollectionByNameOrId('sabado_letivo')
    const janelaCollection = app.findCollectionByNameOrId('janela_feriado')

    // Buscar ano ativo das configurações atuais
    let schoolYearSetting = null
    try {
      const rec = app.findFirstRecordByData('system_settings', 'key', 'school_year')
      schoolYearSetting = JSON.parse(rec.getString('value'))
    } catch (_) {}

    const activeYearNum =
      schoolYearSetting && schoolYearSetting.year ? schoolYearSetting.year : 2026

    // Migrar 2026
    let rec2026 = null
    try {
      rec2026 = app.findFirstRecordByData('ano_letivo', 'ano', 2026)
    } catch (_) {
      rec2026 = new Record(anoCollection)
      rec2026.set('ano', 2026)
      rec2026.set(
        'data_inicio',
        (schoolYearSetting && schoolYearSetting.startDate) || '2026-03-07 00:00:00.000Z',
      )
      rec2026.set(
        'data_fim',
        (schoolYearSetting && schoolYearSetting.endDate) || '2026-11-28 00:00:00.000Z',
      )
      rec2026.set('status', activeYearNum === 2026 ? 'ativo' : 'planejado')
      rec2026.set(
        'age_base_date',
        (schoolYearSetting && schoolYearSetting.ageBaseDate) || '2026-03-01 00:00:00.000Z',
      )
      rec2026.set(
        'winter_break_start',
        (schoolYearSetting && schoolYearSetting.winterBreakStart) || '2026-06-28 00:00:00.000Z',
      )
      rec2026.set(
        'winter_break_end',
        (schoolYearSetting && schoolYearSetting.winterBreakEnd) || '2026-08-08 00:00:00.000Z',
      )
      rec2026.set(
        'christmas_date',
        (schoolYearSetting && schoolYearSetting.christmasDate) || '2026-12-06 00:00:00.000Z',
      )
      app.save(rec2026)
    }

    // Migrar 2027 se houver aulas ou feriados de 2027
    let rec2027 = null
    try {
      rec2027 = app.findFirstRecordByData('ano_letivo', 'ano', 2027)
    } catch (_) {
      rec2027 = new Record(anoCollection)
      rec2027.set('ano', 2027)
      rec2027.set('data_inicio', '2027-03-06 00:00:00.000Z')
      rec2027.set('data_fim', '2027-12-04 00:00:00.000Z')
      rec2027.set('status', activeYearNum === 2027 ? 'ativo' : 'planejado')
      rec2027.set('age_base_date', '2027-03-01 00:00:00.000Z')
      rec2027.set('winter_break_start', '2027-07-04 00:00:00.000Z')
      rec2027.set('winter_break_end', '2027-07-18 00:00:00.000Z')
      rec2027.set('christmas_date', '2027-12-11 00:00:00.000Z')
      rec2027.set('replicado_de', rec2026.id)
      app.save(rec2027)
    }

    // Migrar janelas de feriado de 2026
    try {
      const hol2026Rec = app.findFirstRecordByData('system_settings', 'key', 'holidays_2026')
      const hol2026 = JSON.parse(hol2026Rec.getString('value')) ?? []
      if (Array.isArray(hol2026)) {
        for (const h of hol2026) {
          if (!h.date) continue
          const hDate = h.date.split('T')[0]
          const existing = app.findRecordsByFilter(
            'janela_feriado',
            `ano_letivo_id = '${rec2026.id}' && data_inicio ~ '${hDate}'`,
            '',
            1,
            0,
          )
          if (existing.length === 0) {
            const jRec = new Record(janelaCollection)
            jRec.set('ano_letivo_id', rec2026.id)
            jRec.set('data_inicio', `${hDate} 00:00:00.000Z`)
            jRec.set('data_fim', `${hDate} 23:59:59.000Z`)
            jRec.set('nome', (h.name || 'Feriado / Recesso').substring(0, 120))
            jRec.set('revisado', true)
            app.save(jRec)
          }
        }
      }
    } catch (_) {}

    // Migrar janelas de feriado de 2027
    try {
      const hol2027Rec = app.findFirstRecordByData('system_settings', 'key', 'holidays_2027')
      const hol2027 = JSON.parse(hol2027Rec.getString('value')) ?? []
      if (Array.isArray(hol2027)) {
        for (const h of hol2027) {
          if (!h.date) continue
          const hDate = h.date.split('T')[0]
          const existing = app.findRecordsByFilter(
            'janela_feriado',
            `ano_letivo_id = '${rec2027.id}' && data_inicio ~ '${hDate}'`,
            '',
            1,
            0,
          )
          if (existing.length === 0) {
            const jRec = new Record(janelaCollection)
            jRec.set('ano_letivo_id', rec2027.id)
            jRec.set('data_inicio', `${hDate} 00:00:00.000Z`)
            jRec.set('data_fim', `${hDate} 23:59:59.000Z`)
            jRec.set('nome', (h.name || 'Feriado / Recesso').substring(0, 120))
            jRec.set('revisado', true)
            app.save(jRec)
          }
        }
      }
    } catch (_) {}

    // Migrar sábados letivos a partir da tabela lessons
    const allLessons = app.findRecordsByFilter('lessons', '', 'date', 200, 0)
    for (const lesson of allLessons) {
      const rawDate = lesson.getString('date')
      if (!rawDate) continue
      const dateStr = rawDate.split('T')[0].split(' ')[0]
      const year = lesson.getInt('year') || parseInt(dateStr.split('-')[0], 10)
      let anoTarget = null
      if (year === 2026) anoTarget = rec2026
      else if (year === 2027) anoTarget = rec2027
      else {
        try {
          anoTarget = app.findFirstRecordByData('ano_letivo', 'ano', year)
        } catch (_) {
          anoTarget = new Record(anoCollection)
          anoTarget.set('ano', year)
          anoTarget.set('data_inicio', `${year}-03-01 00:00:00.000Z`)
          anoTarget.set('data_fim', `${year}-12-01 00:00:00.000Z`)
          anoTarget.set('status', 'planejado')
          anoTarget.set('age_base_date', `${year}-03-01 00:00:00.000Z`)
          app.save(anoTarget)
        }
      }

      if (!anoTarget) continue

      const existingSab = app.findRecordsByFilter(
        'sabado_letivo',
        `ano_letivo_id = '${anoTarget.id}' && data ~ '${dateStr}'`,
        '',
        1,
        0,
      )
      if (existingSab.length === 0) {
        const sRec = new Record(sabadoCollection)
        sRec.set('ano_letivo_id', anoTarget.id)
        sRec.set('data', `${dateStr} 00:00:00.000Z`)
        sRec.set('tipo', 'letivo')
        sRec.set(
          'descricao',
          (
            lesson.getString('central_theme') ||
            `Encontro Letivo #${lesson.getInt('session_number')}`
          ).substring(0, 120),
        )
        sRec.set('revisado', true)
        sRec.set('lesson_id', lesson.id)
        app.save(sRec)
      } else {
        // Se não tinha lesson_id vinculado, vincula para rastreabilidade
        const sRec = existingSab[0]
        if (!sRec.getString('lesson_id')) {
          sRec.set('lesson_id', lesson.id)
          app.save(sRec)
        }
      }
    }
  },
  (app) => {
    try {
      const audit = app.findCollectionByNameOrId('auditoria_sabados')
      app.delete(audit)
    } catch (_) {}
    try {
      const janela = app.findCollectionByNameOrId('janela_feriado')
      app.delete(janela)
    } catch (_) {}
    try {
      const sabado = app.findCollectionByNameOrId('sabado_letivo')
      app.delete(sabado)
    } catch (_) {}
    try {
      const ano = app.findCollectionByNameOrId('ano_letivo')
      app.delete(ano)
    } catch (_) {}
  },
)
