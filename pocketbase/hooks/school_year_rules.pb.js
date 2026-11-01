/// <reference path="../pb_data/types.d.ts" />

// Validação de sobreposição de janelas de feriado no backend
// ATENÇÃO: Todo o código deve estar inline em cada callback para evitar scoping error no JSVM do PocketBase.

onRecordCreate((e) => {
  const record = e.record
  const anoLetivoId = record.getString('ano_letivo_id')
  const dataInicio = record.getString('data_inicio')
  const dataFim = record.getString('data_fim')
  const recordId = record.id || ''

  if (anoLetivoId && dataInicio && dataFim) {
    const existing = e.app.findRecordsByFilter(
      'janela_feriado',
      `ano_letivo_id = '${anoLetivoId}' && data_inicio <= '${dataFim}' && data_fim >= '${dataInicio}'`,
      '',
      10,
      0,
    )
    for (const other of existing) {
      if (other.id !== recordId) {
        const otherNome = other.getString('nome') || 'Janela existente'
        throw new BadRequestError(
          `Sobreposição detectada: o período informado coincide com a janela de feriado "${otherNome}" já cadastrada neste ano letivo.`,
        )
      }
    }
  }

  e.next()
}, 'janela_feriado')

onRecordUpdate((e) => {
  const record = e.record
  const anoLetivoId = record.getString('ano_letivo_id')
  const dataInicio = record.getString('data_inicio')
  const dataFim = record.getString('data_fim')
  const recordId = record.id || ''

  if (anoLetivoId && dataInicio && dataFim) {
    const existing = e.app.findRecordsByFilter(
      'janela_feriado',
      `ano_letivo_id = '${anoLetivoId}' && data_inicio <= '${dataFim}' && data_fim >= '${dataInicio}'`,
      '',
      10,
      0,
    )
    for (const other of existing) {
      if (other.id !== recordId) {
        const otherNome = other.getString('nome') || 'Janela existente'
        throw new BadRequestError(
          `Sobreposição detectada: o período informado coincide com a janela de feriado "${otherNome}" já cadastrada neste ano letivo.`,
        )
      }
    }
  }

  e.next()
}, 'janela_feriado')

// Validação de duplicidade de sábados letivos
onRecordCreate((e) => {
  const record = e.record
  const anoLetivoId = record.getString('ano_letivo_id')
  const rawDate = record.getString('data')
  const recordId = record.id || ''

  if (anoLetivoId && rawDate) {
    const datePrefix = rawDate.split('T')[0].split(' ')[0]
    const existing = e.app.findRecordsByFilter(
      'sabado_letivo',
      `ano_letivo_id = '${anoLetivoId}' && data ~ '${datePrefix}'`,
      '',
      5,
      0,
    )
    for (const other of existing) {
      if (other.id !== recordId) {
        throw new BadRequestError(
          `Sábado letivo duplicado: já existe um registro cadastrado para a data ${datePrefix} neste ano letivo.`,
        )
      }
    }
  }

  e.next()
}, 'sabado_letivo')

onRecordUpdate((e) => {
  const record = e.record
  const anoLetivoId = record.getString('ano_letivo_id')
  const rawDate = record.getString('data')
  const recordId = record.id || ''

  if (anoLetivoId && rawDate) {
    const datePrefix = rawDate.split('T')[0].split(' ')[0]
    const existing = e.app.findRecordsByFilter(
      'sabado_letivo',
      `ano_letivo_id = '${anoLetivoId}' && data ~ '${datePrefix}'`,
      '',
      5,
      0,
    )
    for (const other of existing) {
      if (other.id !== recordId) {
        throw new BadRequestError(
          `Sábado letivo duplicado: já existe um registro cadastrado para a data ${datePrefix} neste ano letivo.`,
        )
      }
    }
  }

  e.next()
}, 'sabado_letivo')

// Auditoria automática de alterações em sábados letivos
onRecordAfterCreateSuccess((e) => {
  try {
    let anoNum = 0
    const anoLetivoId = e.record.getString('ano_letivo_id')
    if (anoLetivoId) {
      try {
        const anoRec = e.app.findRecordById('ano_letivo', anoLetivoId)
        anoNum = anoRec.getInt('ano')
      } catch (_) {}
    }

    const auditCol = e.app.findCollectionByNameOrId('auditoria_sabados')
    const auditRec = new Record(auditCol)
    if (e.auth) {
      auditRec.set('user_id', e.auth.id)
      auditRec.set('user_name', e.auth.getString('name') || e.auth.getString('email') || 'Operador')
    } else {
      auditRec.set('user_name', 'Sistema Infanto-CEP')
    }
    auditRec.set('ano', anoNum)
    auditRec.set('acao', 'Criação de Sábado Letivo')
    const dataStr = e.record.getString('data') ? e.record.getString('data').split('T')[0] : ''
    const desc = e.record.getString('descricao') || ''
    const tipo = e.record.getString('tipo') || ''
    auditRec.set('detalhes', `Criação: Data=${dataStr}, Tipo=${tipo}, Descrição="${desc}"`)
    e.app.save(auditRec)
  } catch (err) {
    console.warn('Falha ao gravar auditoria_sabados (create):', err)
  }
  e.next()
}, 'sabado_letivo')

onRecordAfterUpdateSuccess((e) => {
  try {
    let anoNum = 0
    const anoLetivoId = e.record.getString('ano_letivo_id')
    if (anoLetivoId) {
      try {
        const anoRec = e.app.findRecordById('ano_letivo', anoLetivoId)
        anoNum = anoRec.getInt('ano')
      } catch (_) {}
    }

    const auditCol = e.app.findCollectionByNameOrId('auditoria_sabados')
    const auditRec = new Record(auditCol)
    if (e.auth) {
      auditRec.set('user_id', e.auth.id)
      auditRec.set('user_name', e.auth.getString('name') || e.auth.getString('email') || 'Operador')
    } else {
      auditRec.set('user_name', 'Sistema Infanto-CEP')
    }
    auditRec.set('ano', anoNum)
    auditRec.set('acao', 'Atualização de Sábado Letivo')
    const dataStr = e.record.getString('data') ? e.record.getString('data').split('T')[0] : ''
    const desc = e.record.getString('descricao') || ''
    const tipo = e.record.getString('tipo') || ''
    auditRec.set('detalhes', `Atualização: Data=${dataStr}, Tipo=${tipo}, Descrição="${desc}"`)
    e.app.save(auditRec)
  } catch (err) {
    console.warn('Falha ao gravar auditoria_sabados (update):', err)
  }
  e.next()
}, 'sabado_letivo')

onRecordAfterDeleteSuccess((e) => {
  try {
    let anoNum = 0
    const anoLetivoId = e.record.getString('ano_letivo_id')
    if (anoLetivoId) {
      try {
        const anoRec = e.app.findRecordById('ano_letivo', anoLetivoId)
        anoNum = anoRec.getInt('ano')
      } catch (_) {}
    }

    const auditCol = e.app.findCollectionByNameOrId('auditoria_sabados')
    const auditRec = new Record(auditCol)
    if (e.auth) {
      auditRec.set('user_id', e.auth.id)
      auditRec.set('user_name', e.auth.getString('name') || e.auth.getString('email') || 'Operador')
    } else {
      auditRec.set('user_name', 'Sistema Infanto-CEP')
    }
    auditRec.set('ano', anoNum)
    auditRec.set('acao', 'Exclusão de Sábado Letivo')
    const dataStr = e.record.getString('data') ? e.record.getString('data').split('T')[0] : ''
    const desc = e.record.getString('descricao') || ''
    const tipo = e.record.getString('tipo') || ''
    auditRec.set('detalhes', `Exclusão: Data=${dataStr}, Tipo=${tipo}, Descrição="${desc}"`)
    e.app.save(auditRec)
  } catch (err) {
    console.warn('Falha ao gravar auditoria_sabados (delete):', err)
  }
  e.next()
}, 'sabado_letivo')
