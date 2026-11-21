// pocketbase/hooks/cascade_delete_family.pb.js
//
// Exclusão em cascata server-side da FAMÍLIA, com auditoria completa.
//
// Motivação: excluir uma família que tem responsáveis, crianças, presenças,
// lançamentos DimDim, empréstimos ou entregas da sacolinha falhava com o erro
// cru do PocketBase "Failed to delete record. Make sure that the record is not
// part of a required relation reference." A cascata do banco cobre as relações
// (migração 0026), mas cada exclusão em cascata não passa pelas regras de API
// nem grava log — e o padrão do sistema é registrar TODA exclusão em
// logs_exclusao (ver audit_deletion.pb.js). Este hook garante os dois pontos:
//
// 1. Antes de qualquer criança ser excluída (direta ou em cascata via família),
//    os registros dependentes dela são removidos com log individual:
//    book_loans, attendances, dimdim_transactions.
// 2. Antes de qualquer família ser excluída, as entregas de sacolinha
//    (natal_entregas) dela são removidas com log individual.
// 3. A própria família e seus filhos diretos (guardians, children) seguem
//    gerando log pelo hook padrão de auditoria (audit_deletion.pb.js).
//
// Registros de OUTRAS famílias nunca são afetados: os filtros usam sempre o
// family_id/child_id do registro que está sendo excluído.
//
// NOTA: a JSVM executa cada callback em um pool separado — TODA a lógica fica
// inline dentro dos callbacks (sem funções/constantes de nível superior).

// Crianças: limpa dependentes antes da exclusão
onRecordBeforeDelete((e) => {
  try {
    const app = e.app
    const childRec = e.record
    const authRecord = e.auth
    const childId = childRec.id
    const childName = childRec.getString('name') || childId

    const alvos = [
      {
        collection: 'book_loans',
        filter: `child_id = "${childId}"`,
        type: 'Empréstimo',
        identifier: (rec) => `Empréstimo #${rec.id}`,
        details: (rec) => `Status: ${rec.getString('status')}`,
      },
      {
        collection: 'attendances',
        filter: `child_id = "${childId}"`,
        type: 'Presença',
        identifier: (rec) => `Presença #${rec.id}`,
        details: (rec) =>
          `Status: ${rec.getString('status')} | Sala: ${rec.getString('classroom')}`,
      },
      {
        collection: 'dimdim_transactions',
        filter: `child_id = "${childId}"`,
        type: 'Lançamento DimDim',
        identifier: (rec) =>
          `${(rec.getString('type') || '').toUpperCase()} de ${rec.getFloat('amount')} DD`,
        details: (rec) => `Motivo: ${rec.getString('reason') || 'Sem motivo'}`,
      },
    ]

    for (const alvo of alvos) {
      let records = []
      try {
        records = app.findRecordsByFilter(alvo.collection, alvo.filter, '-created', 5000, 0)
      } catch (err) {
        console.error(`Falha ao listar ${alvo.collection} de ${childId}:`, err)
        continue
      }
      for (const rec of records) {
        try {
          app.delete(rec)
        } catch (err) {
          console.error(`Falha ao excluir ${alvo.collection} ${rec.id}:`, err)
          continue
        }
        try {
          const logsCol = app.findCollectionByNameOrId('logs_exclusao')
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
          logRec.set('record_type', alvo.type)
          logRec.set('record_identifier', alvo.identifier(rec))
          logRec.set('details', `${alvo.details(rec)} | Criança vinculada: ${childName}`)
          app.save(logRec)
        } catch (err) {
          console.error('Falha ao gravar log de exclusão em cascata:', err)
        }
      }
    }
  } catch (err) {
    console.error('Erro na cascata de dependentes da criança:', err)
  }
  e.next()
}, 'children')

// Famílias: remove as entregas de sacolinha antes da exclusão
onRecordBeforeDelete((e) => {
  try {
    const app = e.app
    const familyRec = e.record
    const authRecord = e.auth
    const familyId = familyRec.id
    const familyName = familyRec.getString('reference_name') || familyId

    let entregas = []
    try {
      entregas = app.findRecordsByFilter(
        'natal_entregas',
        `family_id = "${familyId}"`,
        '-created',
        5000,
        0,
      )
    } catch (err) {
      console.error(`Falha ao listar natal_entregas de ${familyId}:`, err)
      entregas = []
    }

    for (const rec of entregas) {
      try {
        app.delete(rec)
      } catch (err) {
        console.error(`Falha ao excluir natal_entregas ${rec.id}:`, err)
        continue
      }
      try {
        const logsCol = app.findCollectionByNameOrId('logs_exclusao')
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
        logRec.set('record_type', 'Entrega Sacolinha de Natal')
        logRec.set('record_identifier', rec.getString('person_name') || rec.id)
        logRec.set(
          'details',
          `Entrega de ${rec.getString('delivered_at')} | Família: ${familyName}`,
        )
        app.save(logRec)
      } catch (err) {
        console.error('Falha ao gravar log de exclusão de entrega de sacolinha:', err)
      }
    }
  } catch (err) {
    console.error('Erro na cascata de entregas da sacolinha:', err)
  }
  e.next()
}, 'families')
