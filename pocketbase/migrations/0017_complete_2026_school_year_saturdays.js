migrate(
  (app) => {
    // 1. Encontrar coleções necessárias
    const anoCol = app.findCollectionByNameOrId('ano_letivo')
    const sabadoCol = app.findCollectionByNameOrId('sabado_letivo')
    const janelaCol = app.findCollectionByNameOrId('janela_feriado')
    const lessonsCol = app.findCollectionByNameOrId('lessons')
    const lessonPlansCol = app.findCollectionByNameOrId('lesson_plans')

    // 2. Buscar o registro de ano_letivo para 2026
    let rec2026 = null
    try {
      rec2026 = app.findFirstRecordByData('ano_letivo', 'ano', 2026)
    } catch (_) {
      // Se não existir, cria
      rec2026 = new Record(anoCol)
      rec2026.set('ano', 2026)
      rec2026.set('data_inicio', '2026-03-07 00:00:00.000Z')
      rec2026.set('data_fim', '2026-11-28 23:59:59.000Z')
      rec2026.set('status', 'ativo')
      rec2026.set('age_base_date', '2026-03-01 00:00:00.000Z')
      rec2026.set('winter_break_start', '2026-06-28 00:00:00.000Z')
      rec2026.set('winter_break_end', '2026-08-08 23:59:59.000Z')
      rec2026.set('christmas_date', '2026-12-06 00:00:00.000Z')
      app.save(rec2026)
    }

    // Garante que a data de encerramento do ano 2026 seja pelo menos 28/11/2026
    const curEnd = rec2026.getString('data_fim')
    if (!curEnd || curEnd < '2026-11-28') {
      rec2026.set('data_fim', '2026-11-28 23:59:59.000Z')
      app.save(rec2026)
    }

    // 3. Garantir a janela "Bingo da Noite Italiana" em 14/11/2026 na coleção janela_feriado
    let janelaBingo = null
    try {
      const jRecords = app.findRecordsByFilter(
        'janela_feriado',
        `ano_letivo_id = '${rec2026.id}' && data_inicio ~ '2026-11-14'`,
        '',
        1,
        0,
      )
      if (jRecords.length > 0) {
        janelaBingo = jRecords[0]
      }
    } catch (_) {}

    if (!janelaBingo) {
      janelaBingo = new Record(janelaCol)
      janelaBingo.set('ano_letivo_id', rec2026.id)
      janelaBingo.set('data_inicio', '2026-11-14 00:00:00.000Z')
      janelaBingo.set('data_fim', '2026-11-14 23:59:59.000Z')
      janelaBingo.set('nome', 'Bingo da Noite Italiana')
      janelaBingo.set('revisado', true)
      app.save(janelaBingo)
    }

    // 4. Garantir registro de sabado_letivo para 14/11/2026 como tipo 'evento' (Bingo da Noite Italiana)
    let sabado14Nov = null
    try {
      const s14Records = app.findRecordsByFilter(
        'sabado_letivo',
        `ano_letivo_id = '${rec2026.id}' && data ~ '2026-11-14'`,
        '',
        1,
        0,
      )
      if (s14Records.length > 0) {
        sabado14Nov = s14Records[0]
      }
    } catch (_) {}

    if (sabado14Nov) {
      sabado14Nov.set('tipo', 'evento')
      sabado14Nov.set('descricao', 'Bingo da Noite Italiana')
      sabado14Nov.set('revisado', true)
      sabado14Nov.set('lesson_id', '') // Evento não tem lesson
      app.save(sabado14Nov)
    } else {
      sabado14Nov = new Record(sabadoCol)
      sabado14Nov.set('ano_letivo_id', rec2026.id)
      sabado14Nov.set('data', '2026-11-14 00:00:00.000Z')
      sabado14Nov.set('tipo', 'evento')
      sabado14Nov.set('descricao', 'Bingo da Noite Italiana')
      sabado14Nov.set('revisado', true)
      app.save(sabado14Nov)
    }

    // 5. Garantir Aula #31 em 21/11/2026 (lessons + lesson_plans)
    let lesson31 = null
    try {
      const l31Records = app.findRecordsByFilter(
        'lessons',
        `year = 2026 && date ~ '2026-11-21'`,
        '',
        1,
        0,
      )
      if (l31Records.length > 0) {
        lesson31 = l31Records[0]
      }
    } catch (_) {}

    if (!lesson31) {
      try {
        const lByNum = app.findRecordsByFilter(
          'lessons',
          `year = 2026 && session_number = 31`,
          '',
          1,
          0,
        )
        if (lByNum.length > 0) {
          lesson31 = lByNum[0]
          lesson31.set('date', '2026-11-21 00:00:00.000Z')
          app.save(lesson31)
        }
      } catch (_) {}
    }

    if (!lesson31) {
      lesson31 = new Record(lessonsCol)
      lesson31.set('date', '2026-11-21 00:00:00.000Z')
      lesson31.set('year', 2026)
      lesson31.set('session_number', 31)
      lesson31.set('central_theme', 'Gratidão e Esperança para o Futuro')
      lesson31.set('thematic_block', 'Encerramento e Confraternização')
      lesson31.set('status', 'scheduled')
      app.save(lesson31)

      // Criar planos de aula para as salas A, B, C, D
      const defaultPlans31 = [
        {
          classroom: 'A',
          title: 'Linguagem Lúdica: Gratidão e Esperança para o Futuro',
          objective: 'Agradecer as amizades e aprendizados do ano com alegria.',
          approach: 'Roda de agradecimento, pintura coletiva e canção da paz.',
          materials: 'Papel kraft grande, tintas atóxicas, aparelho de som.',
        },
        {
          classroom: 'B',
          title: 'Compreensão Ativa: Gratidão e Esperança para o Futuro',
          objective: 'Identificar momentos de superação e gestos fraternos vivenciados.',
          approach: 'Árvore da gratidão com folhas coloridas e relatos dos alunos.',
          materials: 'Mural, cartolinas coloridas em formato de folha, canetas.',
        },
        {
          classroom: 'C',
          title: 'Reflexão Moral e Evangélica: Gratidão e Esperança para o Futuro',
          objective: 'Compreender o sentimento evangélico da gratidão sincera a Deus.',
          approach: 'Leitura comentada de passagens do Evangelho e redação de preces.',
          materials: 'O Evangelho Segundo o Espiritismo, cartões para mensagens.',
        },
        {
          classroom: 'D',
          title: 'Juventude e Vivência: Gratidão e Esperança para o Futuro',
          objective: 'Refletir sobre o papel do jovem no mundo e projetos de vida no bem.',
          approach: 'Círculo de reflexão, retrospectiva das ações fraternas e metas futuras.',
          materials: 'Caderno de reflexões, fichas de compromisso moral.',
        },
      ]

      for (const p of defaultPlans31) {
        const pRec = new Record(lessonPlansCol)
        pRec.set('lesson_id', lesson31.id)
        pRec.set('classroom', p.classroom)
        pRec.set('title', p.title)
        pRec.set('objective', p.objective)
        pRec.set('approach', p.approach)
        pRec.set('materials', p.materials)
        app.save(pRec)
      }
    }

    // 6. Garantir Aula #32 em 28/11/2026 (lessons + lesson_plans)
    let lesson32 = null
    try {
      const l32Records = app.findRecordsByFilter(
        'lessons',
        `year = 2026 && date ~ '2026-11-28'`,
        '',
        1,
        0,
      )
      if (l32Records.length > 0) {
        lesson32 = l32Records[0]
      }
    } catch (_) {}

    if (!lesson32) {
      try {
        const lByNum = app.findRecordsByFilter(
          'lessons',
          `year = 2026 && session_number = 32`,
          '',
          1,
          0,
        )
        if (lByNum.length > 0) {
          lesson32 = lByNum[0]
          lesson32.set('date', '2026-11-28 00:00:00.000Z')
          app.save(lesson32)
        }
      } catch (_) {}
    }

    if (!lesson32) {
      lesson32 = new Record(lessonsCol)
      lesson32.set('date', '2026-11-28 00:00:00.000Z')
      lesson32.set('year', 2026)
      lesson32.set('session_number', 32)
      lesson32.set('central_theme', 'Celebração de Encerramento e Fraternidade Viva')
      lesson32.set('thematic_block', 'Encerramento e Confraternização')
      lesson32.set('status', 'scheduled')
      app.save(lesson32)

      // Criar planos de aula para as salas A, B, C, D
      const defaultPlans32 = [
        {
          classroom: 'A',
          title: 'Linguagem Lúdica: Celebração de Encerramento e Fraternidade Viva',
          objective: 'Celebrar a fraternidade e a união da turma.',
          approach: 'Apresentação de músicas infantis espíritas e entrega de lembrancinhas.',
          materials: 'Lembrancinhas com mensagens fraternas, som ambiente.',
        },
        {
          classroom: 'B',
          title: 'Compreensão Ativa: Celebração de Encerramento e Fraternidade Viva',
          objective: 'Compartilhar aprendizados do ano com a família e colegas.',
          approach: 'Exposição de desenhos e trabalhos pedagógicos produzidos no ano.',
          materials: 'Varal de artes, painéis ilustrados, crachás.',
        },
        {
          classroom: 'C',
          title: 'Reflexão Moral e Evangélica: Celebração de Encerramento e Fraternidade Viva',
          objective: 'Fortalecer os laços fraternos e a prática da caridade constante.',
          approach:
            'Painel colaborativo de compromissos para o próximo ano e prece de encerramento.',
          materials: 'Mural de metas, folhas decoradas, canetas coloridas.',
        },
        {
          classroom: 'D',
          title: 'Juventude e Vivência: Celebração de Encerramento e Fraternidade Viva',
          objective: 'Integrar a juventude no trabalho voluntário e continuidade nos estudos.',
          approach:
            'Mesa redonda sobre vivência cristã diária e abraço fraterno de confraternização.',
          materials: 'Textos de Kardec e Emmanuel, certificados de participação.',
        },
      ]

      for (const p of defaultPlans32) {
        const pRec = new Record(lessonPlansCol)
        pRec.set('lesson_id', lesson32.id)
        pRec.set('classroom', p.classroom)
        pRec.set('title', p.title)
        pRec.set('objective', p.objective)
        pRec.set('approach', p.approach)
        pRec.set('materials', p.materials)
        app.save(pRec)
      }
    }

    // 7. Sincronizar todos os registros de sabado_letivo para 2026:
    // Buscar todas as aulas de 2026
    const all2026Lessons = app.findRecordsByFilter(
      'lessons',
      'year = 2026',
      'session_number',
      100,
      0,
    )

    for (const l of all2026Lessons) {
      const lDate = l.getString('date').split('T')[0].split(' ')[0]
      if (!lDate) continue

      let matchedSab = null
      try {
        const sByLesson = app.findRecordsByFilter(
          'sabado_letivo',
          `ano_letivo_id = '${rec2026.id}' && lesson_id = '${l.id}'`,
          '',
          1,
          0,
        )
        if (sByLesson.length > 0) matchedSab = sByLesson[0]
      } catch (_) {}

      if (!matchedSab) {
        try {
          const sByDate = app.findRecordsByFilter(
            'sabado_letivo',
            `ano_letivo_id = '${rec2026.id}' && data ~ '${lDate}'`,
            '',
            1,
            0,
          )
          if (sByDate.length > 0) matchedSab = sByDate[0]
        } catch (_) {}
      }

      const lTheme = l.getString('central_theme') || `Aula #${l.getInt('session_number')}`

      if (matchedSab) {
        matchedSab.set('lesson_id', l.id)
        matchedSab.set('tipo', 'letivo')
        if (!matchedSab.getString('descricao')) {
          matchedSab.set('descricao', lTheme.substring(0, 120))
        }
        matchedSab.set('revisado', true)
        app.save(matchedSab)
      } else {
        const newSab = new Record(sabadoCol)
        newSab.set('ano_letivo_id', rec2026.id)
        newSab.set('data', `${lDate} 00:00:00.000Z`)
        newSab.set('tipo', 'letivo')
        newSab.set('descricao', lTheme.substring(0, 120))
        newSab.set('revisado', true)
        newSab.set('lesson_id', l.id)
        app.save(newSab)
      }
    }
  },
  (app) => {
    // Reversão limpa
    try {
      const sabCol = app.findCollectionByNameOrId('sabado_letivo')
      const rec2026 = app.findFirstRecordByData('ano_letivo', 'ano', 2026)
      const extraSabs = app.findRecordsByFilter(
        'sabado_letivo',
        `ano_letivo_id = '${rec2026.id}' && (data ~ '2026-11-21' || data ~ '2026-11-28')`,
        '',
        10,
        0,
      )
      for (const s of extraSabs) {
        app.delete(s)
      }
    } catch (_) {}
  },
)
