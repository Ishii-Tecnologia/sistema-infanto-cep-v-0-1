// pocketbase/hooks/audit_deletion.pb.js
// Auditoria automática de exclusões no Sistema Infanto-CEP

// 1. Famílias
onRecordDelete((e) => {
  try {
    const rec = e.record
    const authRecord = e.auth
    const logsCol = e.app.findCollectionByNameOrId('logs_exclusao')
    const logRec = new Record(logsCol)

    if (authRecord) {
      logRec.set('user_id', authRecord.id)
      logRec.set(
        'operator_name',
        authRecord.getString('name') || authRecord.getString('email') || 'Operador',
      )
      logRec.set('operator_role', authRecord.getString('role') || 'operador')
    } else {
      logRec.set('operator_name', 'Sistema (Interno)')
      logRec.set('operator_role', 'sistema')
    }

    logRec.set('record_type', 'Família')
    logRec.set('record_identifier', rec.getString('reference_name') || rec.id)
    logRec.set('details', `Ficha de família excluída (ID: ${rec.id})`)
    e.app.save(logRec)
  } catch (err) {
    console.error('Erro ao auditar exclusão de família:', err)
  }
  e.next()
}, 'families')

// 2. Anos Letivos
onRecordDelete((e) => {
  try {
    const rec = e.record
    const authRecord = e.auth
    const logsCol = e.app.findCollectionByNameOrId('logs_exclusao')
    const logRec = new Record(logsCol)

    if (authRecord) {
      logRec.set('user_id', authRecord.id)
      logRec.set(
        'operator_name',
        authRecord.getString('name') || authRecord.getString('email') || 'Operador',
      )
      logRec.set('operator_role', authRecord.getString('role') || 'operador')
    } else {
      logRec.set('operator_name', 'Sistema (Interno)')
      logRec.set('operator_role', 'sistema')
    }

    const ano = rec.getInt('ano') || rec.id
    const status = rec.getString('status')
    logRec.set('record_type', 'Ano Letivo')
    logRec.set('record_identifier', `Ano Letivo ${ano}`)
    logRec.set('details', `Status anterior: ${status || 'N/A'}`)
    e.app.save(logRec)
  } catch (err) {
    console.error('Erro ao auditar exclusão de ano letivo:', err)
  }
  e.next()
}, 'ano_letivo')

// 3. Janelas de Feriado / Recesso
onRecordDelete((e) => {
  try {
    const rec = e.record
    const authRecord = e.auth
    const logsCol = e.app.findCollectionByNameOrId('logs_exclusao')
    const logRec = new Record(logsCol)

    if (authRecord) {
      logRec.set('user_id', authRecord.id)
      logRec.set(
        'operator_name',
        authRecord.getString('name') || authRecord.getString('email') || 'Operador',
      )
      logRec.set('operator_role', authRecord.getString('role') || 'operador')
    } else {
      logRec.set('operator_name', 'Sistema (Interno)')
      logRec.set('operator_role', 'sistema')
    }

    const nome = rec.getString('nome') || rec.id
    const start = rec.getString('data_inicio')
    const end = rec.getString('data_fim')
    logRec.set('record_type', 'Janela de Recesso/Feriado')
    logRec.set('record_identifier', nome)
    logRec.set('details', `Período: ${start} até ${end}`)
    e.app.save(logRec)
  } catch (err) {
    console.error('Erro ao auditar exclusão de janela de feriado:', err)
  }
  e.next()
}, 'janela_feriado')

// 4. Operadores (users)
onRecordDelete((e) => {
  try {
    const rec = e.record
    const authRecord = e.auth
    const logsCol = e.app.findCollectionByNameOrId('logs_exclusao')
    const logRec = new Record(logsCol)

    if (authRecord) {
      logRec.set('user_id', authRecord.id)
      logRec.set(
        'operator_name',
        authRecord.getString('name') || authRecord.getString('email') || 'Operador',
      )
      logRec.set('operator_role', authRecord.getString('role') || 'operador')
    } else {
      logRec.set('operator_name', 'Sistema (Interno)')
      logRec.set('operator_role', 'sistema')
    }

    const name = rec.getString('name') || rec.getString('email') || rec.id
    const role = rec.getString('role') || 'N/A'
    logRec.set('record_type', 'Operador')
    logRec.set('record_identifier', name)
    logRec.set('details', `Papel do operador removido: ${role} | Email: ${rec.getString('email')}`)
    e.app.save(logRec)
  } catch (err) {
    console.error('Erro ao auditar exclusão de operador:', err)
  }
  e.next()
}, 'users')

// 5. Exemplares de Livros
onRecordDelete((e) => {
  try {
    const rec = e.record
    const authRecord = e.auth
    const logsCol = e.app.findCollectionByNameOrId('logs_exclusao')
    const logRec = new Record(logsCol)

    if (authRecord) {
      logRec.set('user_id', authRecord.id)
      logRec.set(
        'operator_name',
        authRecord.getString('name') || authRecord.getString('email') || 'Operador',
      )
      logRec.set('operator_role', authRecord.getString('role') || 'operador')
    } else {
      logRec.set('operator_name', 'Sistema (Interno)')
      logRec.set('operator_role', 'sistema')
    }

    const copyNum = rec.getString('copy_number') || rec.id
    let bookTitle = ''
    try {
      const bookId = rec.getString('book_id')
      if (bookId) {
        const book = e.app.findRecordById('books', bookId)
        bookTitle = book.getString('title')
      }
    } catch (_) {}
    const details = bookTitle
      ? `Obra vinculada: "${bookTitle}"`
      : `Condição: ${rec.getString('condition')}`

    logRec.set('record_type', 'Exemplar')
    logRec.set('record_identifier', `Exemplar ${copyNum}`)
    logRec.set('details', details)
    e.app.save(logRec)
  } catch (err) {
    console.error('Erro ao auditar exclusão de exemplar:', err)
  }
  e.next()
}, 'book_copies')

// 6. Livros / Obras
onRecordDelete((e) => {
  try {
    const rec = e.record
    const authRecord = e.auth
    const logsCol = e.app.findCollectionByNameOrId('logs_exclusao')
    const logRec = new Record(logsCol)

    if (authRecord) {
      logRec.set('user_id', authRecord.id)
      logRec.set(
        'operator_name',
        authRecord.getString('name') || authRecord.getString('email') || 'Operador',
      )
      logRec.set('operator_role', authRecord.getString('role') || 'operador')
    } else {
      logRec.set('operator_name', 'Sistema (Interno)')
      logRec.set('operator_role', 'sistema')
    }

    const title = rec.getString('title') || rec.id
    logRec.set('record_type', 'Livro (Obra)')
    logRec.set('record_identifier', title)
    logRec.set('details', `Autor: ${rec.getString('author') || 'N/A'}`)
    e.app.save(logRec)
  } catch (err) {
    console.error('Erro ao auditar exclusão de livro:', err)
  }
  e.next()
}, 'books')

// 7. Empréstimos
onRecordDelete((e) => {
  try {
    const rec = e.record
    const authRecord = e.auth
    const logsCol = e.app.findCollectionByNameOrId('logs_exclusao')
    const logRec = new Record(logsCol)

    if (authRecord) {
      logRec.set('user_id', authRecord.id)
      logRec.set(
        'operator_name',
        authRecord.getString('name') || authRecord.getString('email') || 'Operador',
      )
      logRec.set('operator_role', authRecord.getString('role') || 'operador')
    } else {
      logRec.set('operator_name', 'Sistema (Interno)')
      logRec.set('operator_role', 'sistema')
    }

    logRec.set('record_type', 'Empréstimo')
    logRec.set('record_identifier', `Empréstimo #${rec.id}`)
    logRec.set('details', `Status: ${rec.getString('status')}`)
    e.app.save(logRec)
  } catch (err) {
    console.error('Erro ao auditar exclusão de empréstimo:', err)
  }
  e.next()
}, 'book_loans')

// 8. Transações / Lançamentos DimDim
onRecordDelete((e) => {
  try {
    const rec = e.record
    const authRecord = e.auth
    const logsCol = e.app.findCollectionByNameOrId('logs_exclusao')
    const logRec = new Record(logsCol)

    if (authRecord) {
      logRec.set('user_id', authRecord.id)
      logRec.set(
        'operator_name',
        authRecord.getString('name') || authRecord.getString('email') || 'Operador',
      )
      logRec.set('operator_role', authRecord.getString('role') || 'operador')
    } else {
      logRec.set('operator_name', 'Sistema (Interno)')
      logRec.set('operator_role', 'sistema')
    }

    const reason = rec.getString('reason') || 'Sem motivo'
    const amount = rec.getFloat('amount')
    const type = rec.getString('type')
    logRec.set('record_type', 'Lançamento DimDim')
    logRec.set('record_identifier', `${type.toUpperCase()} de ${amount} DD`)
    logRec.set('details', `Motivo: ${reason}`)
    e.app.save(logRec)
  } catch (err) {
    console.error('Erro ao auditar exclusão de transação DimDim:', err)
  }
  e.next()
}, 'dimdim_transactions')

// 9. Crianças
onRecordDelete((e) => {
  try {
    const rec = e.record
    const authRecord = e.auth
    const logsCol = e.app.findCollectionByNameOrId('logs_exclusao')
    const logRec = new Record(logsCol)

    if (authRecord) {
      logRec.set('user_id', authRecord.id)
      logRec.set(
        'operator_name',
        authRecord.getString('name') || authRecord.getString('email') || 'Operador',
      )
      logRec.set('operator_role', authRecord.getString('role') || 'operador')
    } else {
      logRec.set('operator_name', 'Sistema (Interno)')
      logRec.set('operator_role', 'sistema')
    }

    const name = rec.getString('name') || rec.id
    const sala = rec.getString('classroom')
    logRec.set('record_type', 'Criança/Aluno')
    logRec.set('record_identifier', name)
    logRec.set('details', `Sala: ${sala || 'N/A'}`)
    e.app.save(logRec)
  } catch (err) {
    console.error('Erro ao auditar exclusão de criança:', err)
  }
  e.next()
}, 'children')

// 10. Responsáveis
onRecordDelete((e) => {
  try {
    const rec = e.record
    const authRecord = e.auth
    const logsCol = e.app.findCollectionByNameOrId('logs_exclusao')
    const logRec = new Record(logsCol)

    if (authRecord) {
      logRec.set('user_id', authRecord.id)
      logRec.set(
        'operator_name',
        authRecord.getString('name') || authRecord.getString('email') || 'Operador',
      )
      logRec.set('operator_role', authRecord.getString('role') || 'operador')
    } else {
      logRec.set('operator_name', 'Sistema (Interno)')
      logRec.set('operator_role', 'sistema')
    }

    const name = rec.getString('name') || rec.id
    const rel = rec.getString('relationship')
    logRec.set('record_type', 'Responsável')
    logRec.set('record_identifier', name)
    logRec.set('details', `Parentesco: ${rel || 'N/A'}`)
    e.app.save(logRec)
  } catch (err) {
    console.error('Erro ao auditar exclusão de responsável:', err)
  }
  e.next()
}, 'guardians')

// Rota customizada para expurgo de logs por data segura pelo Administrador
routerAdd('POST', '/backend/v1/infanto-cep/expurgo-logs', (e) => {
  const authRecord = e.auth
  if (!authRecord || authRecord.getString('role') !== 'admin') {
    throw new ForbiddenError(
      'Apenas Administradores possuem permissão para executar o expurgo de logs no Sistema Infanto-CEP.',
    )
  }

  const body = e.requestInfo().body
  const cutoffDate = body.cutoffDate

  if (!cutoffDate || typeof cutoffDate !== 'string') {
    throw new BadRequestError('Data limite de expurgo inválida ou não informada.')
  }

  const logsCol = e.app.findCollectionByNameOrId('logs_exclusao')
  const limitDateStr = cutoffDate.includes('T')
    ? cutoffDate.replace('T', ' ')
    : `${cutoffDate} 00:00:00`

  // Buscar registros para contar quantos serão excluídos
  const recordsToDelete = e.app.findRecordsByFilter(
    'logs_exclusao',
    `created < {:cutoff}`,
    '-created',
    5000,
    0,
    { cutoff: limitDateStr },
  )

  const deletedCount = recordsToDelete.length

  for (const logRec of recordsToDelete) {
    e.app.delete(logRec)
  }

  // Grava o log da própria operação de expurgo
  try {
    const auditRec = new Record(logsCol)
    auditRec.set('user_id', authRecord.id)
    auditRec.set(
      'operator_name',
      authRecord.getString('name') || authRecord.getString('email') || 'Administrador',
    )
    auditRec.set('operator_role', authRecord.getString('role') || 'admin')
    auditRec.set('record_type', 'Expurgo de Logs')
    auditRec.set('record_identifier', `Expurgo anterior a ${cutoffDate.slice(0, 10)}`)
    auditRec.set(
      'details',
      `Operação de expurgo permanente: ${deletedCount} registro(s) de log removido(s) do Sistema Infanto-CEP.`,
    )
    e.app.save(auditRec)
  } catch (err) {
    console.error('Erro ao gravar log do expurgo:', err)
  }

  return e.json(200, {
    success: true,
    deletedCount,
    cutoffDate,
    message: `${deletedCount} registro(s) de log anteriores a ${cutoffDate} foram expurgados permanentemente no Sistema Infanto-CEP.`,
  })
})
