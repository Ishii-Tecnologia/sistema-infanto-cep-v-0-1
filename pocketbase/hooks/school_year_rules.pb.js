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

// Rota custom para replicação do ano letivo anterior: POST /backend/v1/school-year/replicate
routerAdd('POST', '/backend/v1/school-year/replicate', (c) => {
  const authRecord = c.auth
  if (!authRecord) {
    throw new ForbiddenError('Acesso não autenticado no Sistema Infanto-CEP.')
  }

  const role = authRecord.getString('role')
  if (role !== 'admin' && role !== 'dirigente') {
    throw new ForbiddenError('Apenas Administrador e Dirigente podem replicar anos letivos.')
  }

  let body = {}
  try {
    body = c.bindBody() || {}
  } catch (_) {
    body = {}
  }

  const sourceAnoId = body.source_ano_letivo_id
  const targetAnoId = body.target_ano_letivo_id
  const targetYearNum = parseInt(body.target_year, 10)

  if (!sourceAnoId || !targetAnoId || !targetYearNum) {
    throw new BadRequestError(
      'Parâmetros obrigatórios ausentes: source_ano_letivo_id, target_ano_letivo_id, target_year.',
    )
  }

  const targetAnoRec = c.app.findRecordById('ano_letivo', targetAnoId)
  const sourceAnoRec = c.app.findRecordById('ano_letivo', sourceAnoId)

  // Algoritmo de Meeus/Jones/Butcher para computar Domingo de Páscoa
  const a = targetYearNum % 19
  const b = Math.floor(targetYearNum / 100)
  const d = Math.floor(b / 4)
  const g = Math.floor((b - Math.floor((b + 8) / 25) + 1) / 3)
  const h = (19 * a + b - d - g + 15) % 30
  const i = Math.floor((targetYearNum % 100) / 4)
  const k = (targetYearNum % 100) % 4
  const l = (32 + 2 * (b % 4) + 2 * i - h - k) % 7
  const m = Math.floor((a + 11 * h + 22 * l) / 451)
  const easterMonth = Math.floor((h + l - 7 * m + 114) / 31)
  const easterDay = ((h + l - 7 * m + 114) % 31) + 1

  const easterDate = new Date(Date.UTC(targetYearNum, easterMonth - 1, easterDay, 12, 0, 0))

  const addDaysToEaster = (days) => {
    const cp = new Date(easterDate.getTime())
    cp.setUTCDate(cp.getUTCDate() + days)
    const y = cp.getUTCFullYear()
    const mn = String(cp.getUTCMonth() + 1).padStart(2, '0')
    const dy = String(cp.getUTCDate()).padStart(2, '0')
    return `${y}-${mn}-${dy}`
  }

  const movableHolidays = [
    { nome: 'Sábado de Carnaval', dateStr: addDaysToEaster(-50) },
    { nome: 'Segunda-feira de Carnaval', dateStr: addDaysToEaster(-48) },
    { nome: 'Terça-feira de Carnaval', dateStr: addDaysToEaster(-47) },
    { nome: 'Quarta-feira de Cinzas', dateStr: addDaysToEaster(-46) },
    { nome: 'Sexta-feira Santa', dateStr: addDaysToEaster(-2) },
    { nome: 'Sábado de Aleluia', dateStr: addDaysToEaster(-1) },
    { nome: 'Domingo de Páscoa', dateStr: addDaysToEaster(0) },
    { nome: 'Corpus Christi', dateStr: addDaysToEaster(60) },
    { nome: 'Sábado após Corpus Christi', dateStr: addDaysToEaster(62) },
  ]

  const shiftDatePreserving = (dateStr) => {
    const clean = dateStr.split('T')[0].split(' ')[0]
    const parts = clean.split('-')
    const origM = parseInt(parts[1], 10)
    let origD = parseInt(parts[2], 10)

    if (origM === 2 && origD === 29) {
      const isLeap =
        (targetYearNum % 4 === 0 && targetYearNum % 100 !== 0) || targetYearNum % 400 === 0
      if (!isLeap) origD = 28
    }

    const dt = new Date(Date.UTC(targetYearNum, origM - 1, origD, 12, 0, 0))
    let shiftedSunday = false
    if (dt.getUTCDay() === 0) {
      dt.setUTCDate(dt.getUTCDate() - 1)
      shiftedSunday = true
    }

    const y = dt.getUTCFullYear()
    const mn = String(dt.getUTCMonth() + 1).padStart(2, '0')
    const dy = String(dt.getUTCDate()).padStart(2, '0')
    return {
      dateStr: `${y}-${mn}-${dy}`,
      shiftedSunday: shiftedSunday,
    }
  }

  // Grava replicado_de no ano de destino
  targetAnoRec.set('replicado_de', sourceAnoRec.id)
  c.app.save(targetAnoRec)

  const sourceJanelas = c.app.findRecordsByFilter(
    'janela_feriado',
    `ano_letivo_id = '${sourceAnoId}'`,
    'data_inicio',
    100,
    0,
  )
  const sourceSabados = c.app.findRecordsByFilter(
    'sabado_letivo',
    `ano_letivo_id = '${sourceAnoId}'`,
    'data',
    200,
    0,
  )

  const janelaCol = c.app.findCollectionByNameOrId('janela_feriado')
  const sabadoCol = c.app.findCollectionByNameOrId('sabado_letivo')

  let janelasClonadas = 0
  let sabadosClonados = 0
  let domingosDeslocados = 0
  const shiftedSundayDates = []
  const conflitosList = []

  // 1. Clona janelas de feriado
  for (const j of sourceJanelas) {
    const origStart = j.getString('data_inicio')
    const origEnd = j.getString('data_fim')
    const nome = j.getString('nome') || 'Feriado / Recesso'

    const shiftS = shiftDatePreserving(origStart)
    const shiftE = shiftDatePreserving(origEnd)

    if (shiftS.shiftedSunday) {
      domingosDeslocados++
      shiftedSundayDates.push(`${nome}: ${origStart.split('T')[0]} -> ${shiftS.dateStr}`)
    }

    let conflitoMotivo = ''
    const matchH = movableHolidays.find((h) => h.dateStr === shiftS.dateStr)
    if (matchH) {
      conflitoMotivo = `Conflito com feriado móvel: ${matchH.nome}`
      conflitosList.push(`${nome} em ${shiftS.dateStr} (${matchH.nome})`)
    }

    // Valida sobreposição antes de inserir
    const existing = c.app.findRecordsByFilter(
      'janela_feriado',
      `ano_letivo_id = '${targetAnoId}' && data_inicio <= '${shiftE.dateStr} 23:59:59.000Z' && data_fim >= '${shiftS.dateStr} 00:00:00.000Z'`,
      '',
      1,
      0,
    )

    if (existing.length === 0) {
      const rec = new Record(janelaCol)
      rec.set('ano_letivo_id', targetAnoId)
      rec.set('data_inicio', `${shiftS.dateStr} 00:00:00.000Z`)
      rec.set('data_fim', `${shiftE.dateStr} 23:59:59.000Z`)
      rec.set('nome', nome)
      rec.set('revisado', false)
      rec.set(
        'conflito_motivo',
        conflitoMotivo || (shiftS.shiftedSunday ? 'Deslocado de domingo para sábado' : ''),
      )
      try {
        c.app.save(rec)
        janelasClonadas++
      } catch (err) {
        console.warn('Erro ao salvar janela replicada:', err)
      }
    }
  }

  // 2. Clona sábados letivos
  for (const s of sourceSabados) {
    const origData = s.getString('data')
    const tipo = s.getString('tipo') || 'letivo'
    const desc = s.getString('descricao') || ''

    const shift = shiftDatePreserving(origData)
    if (shift.shiftedSunday) {
      domingosDeslocados++
      shiftedSundayDates.push(`${desc || 'Sábado'}: ${origData.split('T')[0]} -> ${shift.dateStr}`)
    }

    let conflitoMotivo = ''
    const matchH = movableHolidays.find((h) => h.dateStr === shift.dateStr)
    if (matchH) {
      conflitoMotivo = `Possível conflito com feriado móvel: ${matchH.nome}`
      conflitosList.push(`Data ${shift.dateStr}: ${matchH.nome}`)
    }

    // Verifica se já existe sábado nesta data para este ano
    const existingSab = c.app.findRecordsByFilter(
      'sabado_letivo',
      `ano_letivo_id = '${targetAnoId}' && data ~ '${shift.dateStr}'`,
      '',
      1,
      0,
    )

    if (existingSab.length === 0) {
      const sRec = new Record(sabadoCol)
      sRec.set('ano_letivo_id', targetAnoId)
      sRec.set('data', `${shift.dateStr} 00:00:00.000Z`)
      sRec.set('tipo', tipo)
      sRec.set('descricao', desc)
      sRec.set('revisado', false)
      sRec.set(
        'conflito_motivo',
        conflitoMotivo ||
          (shift.shiftedSunday
            ? 'Data original caía em domingo; deslocado para sábado anterior'
            : ''),
      )
      try {
        c.app.save(sRec)
        sabadosClonados++
      } catch (err) {
        console.warn('Erro ao salvar sábado replicado:', err)
      }
    }
  }

  // Auditoria
  try {
    const auditCol = c.app.findCollectionByNameOrId('auditoria_sabados')
    const auditRec = new Record(auditCol)
    auditRec.set('user_id', authRecord.id)
    auditRec.set(
      'user_name',
      authRecord.getString('name') || authRecord.getString('email') || 'Operador',
    )
    auditRec.set('ano', targetYearNum)
    auditRec.set('acao', 'Replicação do Ano Anterior')
    auditRec.set(
      'detalhes',
      `Replicado de ${sourceAnoRec.getInt('ano')} para ${targetYearNum}: ${sabadosClonados} sábados e ${janelasClonadas} janelas. Domingos deslocados: ${domingosDeslocados}. Conflitos móveis: ${conflitosList.length}.`,
    )
    c.app.save(auditRec)
  } catch (err) {
    console.warn('Falha ao gravar auditoria_sabados na replicação:', err)
  }

  return c.json(200, {
    success: true,
    sourceYear: sourceAnoRec.getInt('ano'),
    targetYear: targetYearNum,
    sabadosClonados: sabadosClonados,
    janelasClonadas: janelasClonadas,
    domingosDeslocados: domingosDeslocados,
    shiftedSundayDates: shiftedSundayDates,
    conflitosList: conflitosList,
    conflitosDetectados: conflitosList.length,
  })
})
