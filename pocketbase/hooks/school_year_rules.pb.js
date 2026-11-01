/// <reference path="../pb_data/types.d.ts" />

// Validação de sobreposição de janelas de feriado no backend
function checkJanelaOverlap(app, record) {
  const anoLetivoId = record.getString('ano_letivo_id')
  const dataInicio = record.getString('data_inicio')
  const dataFim = record.getString('data_fim')
  const recordId = record.id || ''

  if (!anoLetivoId || !dataInicio || !dataFim) return

  // ISO string comparisons: se nova janela [A_start, A_end] sobrepõe com [B_start, B_end]:
  // A_start <= B_end && A_end >= B_start
  const existing = app.findRecordsByFilter(
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

onRecordCreate((e) => {
  checkJanelaOverlap(e.app, e.record)
  e.next()
}, 'janela_feriado')

onRecordUpdate((e) => {
  checkJanelaOverlap(e.app, e.record)
  e.next()
}, 'janela_feriado')

// Validação de duplicidade de sábados letivos com mensagem clara no backend
function checkSabadoDuplicate(app, record) {
  const anoLetivoId = record.getString('ano_letivo_id')
  const rawDate = record.getString('data')
  const recordId = record.id || ''

  if (!anoLetivoId || !rawDate) return

  const datePrefix = rawDate.split('T')[0].split(' ')[0]
  const existing = app.findRecordsByFilter(
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

onRecordCreate((e) => {
  checkSabadoDuplicate(e.app, e.record)
  e.next()
}, 'sabado_letivo')

onRecordUpdate((e) => {
  checkSabadoDuplicate(e.app, e.record)
  e.next()
}, 'sabado_letivo')

// Auditoria automática de alterações em sábados letivos
function auditSabadoChange(app, authRecord, acao, record, anoNum) {
  try {
    const auditCol = app.findCollectionByNameOrId('auditoria_sabados')
    const auditRec = new Record(auditCol)
    if (authRecord) {
      auditRec.set('user_id', authRecord.id)
      auditRec.set(
        'user_name',
        authRecord.getString('name') || authRecord.getString('email') || 'Operador',
      )
    } else {
      auditRec.set('user_name', 'Sistema Infanto-CEP')
    }
    auditRec.set('ano', anoNum || 0)
    auditRec.set('acao', acao)
    const dataStr = record.getString('data') ? record.getString('data').split('T')[0] : ''
    const desc = record.getString('descricao') || ''
    const tipo = record.getString('tipo') || ''
    auditRec.set('detalhes', `${acao}: Data=${dataStr}, Tipo=${tipo}, Descrição="${desc}"`)
    app.save(auditRec)
  } catch (err) {
    console.warn('Falha ao gravar auditoria_sabados:', err)
  }
}

function getAnoFromRecord(app, record) {
  try {
    const anoLetivoId = record.getString('ano_letivo_id')
    if (anoLetivoId) {
      const anoRec = app.findRecordById('ano_letivo', anoLetivoId)
      return anoRec.getInt('ano')
    }
  } catch (_) {}
  return 0
}

onRecordAfterCreateSuccess((e) => {
  const ano = getAnoFromRecord(e.app, e.record)
  auditSabadoChange(e.app, e.auth, 'Criação de Sábado Letivo', e.record, ano)
  e.next()
}, 'sabado_letivo')

onRecordAfterUpdateSuccess((e) => {
  const ano = getAnoFromRecord(e.app, e.record)
  auditSabadoChange(e.app, e.auth, 'Atualização de Sábado Letivo', e.record, ano)
  e.next()
}, 'sabado_letivo')

onRecordAfterDeleteSuccess((e) => {
  const ano = getAnoFromRecord(e.app, e.record)
  auditSabadoChange(e.app, e.auth, 'Exclusão de Sábado Letivo', e.record, ano)
  e.next()
}, 'sabado_letivo')
