migrate(
  (app) => {
    const settings = app.findCollectionByNameOrId('system_settings')

    // Verifica se já existe a chave pedagogical_plans
    try {
      app.findFirstRecordByData('system_settings', 'key', 'pedagogical_plans')
      return // Já existe
    } catch (_) {}

    const defaultPlans = {
      A: {
        title: 'Linguagem Lúdica: Deus, Pai e Criador de Todas as Coisas',
        activities: 'Roda de acolhimento, contação com figuras coloridas e pintura.',
      },
      B: {
        title: 'Compreensão Ativa: Deus, Pai e Criador de Todas as Coisas',
        activities: 'Leitura participativa, perguntas disparadoras e dramatização curta.',
      },
      C: {
        title: 'Reflexão Moral e Evangélica: Deus, Pai e Criador de Todas as Coisas',
        activities: 'Debate mediado, análise evangélica e dinâmica reflexiva em duplas.',
      },
      D: {
        title: 'Juventude e Vivência: Deus, Pai e Criador de Todas as Coisas',
        activities: 'Roda de conversa aberta, estudo de caso e debate mediado.',
      },
    }

    const record = new Record(settings)
    record.set('key', 'pedagogical_plans')
    record.set('value', JSON.stringify(defaultPlans))
    record.set(
      'description',
      'Parâmetros dos planos pedagógicos por sala para o painel de apresentação',
    )
    app.save(record)
  },
  (app) => {
    try {
      const record = app.findFirstRecordByData('system_settings', 'key', 'pedagogical_plans')
      app.delete(record)
    } catch (_) {}
  },
)
