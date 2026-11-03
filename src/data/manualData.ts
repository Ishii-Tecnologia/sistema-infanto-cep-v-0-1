import {
  LucideIcon,
  LayoutDashboard,
  Users,
  Calendar,
  ClipboardCheck,
  BarChart3,
  BookMarked,
  Coins,
  Settings,
  Camera,
  KeyRound,
  Sparkles,
} from 'lucide-react'
import { UserRole } from '@/types'

export interface ManualModule {
  id: string
  title: string
  shortTitle: string
  badge: string
  icon: LucideIcon
  colorClass: {
    bg: string
    text: string
    border: string
    accent: string
  }
  roles: UserRole[]
  summary: string
  steps: {
    title: string
    description: string
    tips?: string[]
  }[]
  faqs?: {
    question: string
    answer: string
  }[]
}

export const MANUAL_MODULES: ManualModule[] = [
  {
    id: 'painel',
    title: 'Painel Geral e Visão Geral',
    shortTitle: 'Painel',
    badge: 'Visão Geral',
    icon: LayoutDashboard,
    colorClass: {
      bg: 'bg-sky-50 dark:bg-sky-950/40',
      text: 'text-sky-700 dark:text-sky-300',
      border: 'border-sky-200 dark:border-sky-800',
      accent: 'bg-sky-600',
    },
    roles: ['admin', 'dirigente', 'professor', 'auxiliar'],
    summary:
      'Painel de boas-vindas com indicadores imediatos de matrículas, distribuição por salas, avisos e atalhos rápidos do dia a dia.',
    steps: [
      {
        title: 'Indicadores rápidos',
        description:
          'Visualize o total de crianças matriculadas no ano letivo atual, quantidade de famílias atendidas, livros emprestados e circulação da moeda DimDim.',
        tips: [
          'Os dados são atualizados de acordo com as alterações feitas em cada módulo.',
          'Operadores têm visão contextualizada da sua sala ou área de atuação.',
        ],
      },
      {
        title: 'Distribuição pelas salas A, B, C e D',
        description:
          'Acompanhe rapidamente o número de crianças alocadas em cada faixa etária da educação espírita infantil.',
      },
      {
        title: 'Navegação rápida',
        description:
          'Utilize os atalhos de ações rápidas para ir diretamente à chamada do dia, consulta de famílias ou empréstimo de livros.',
      },
    ],
  },
  {
    id: 'familias',
    title: 'Famílias e Alunos (Cadastro em 4 Etapas)',
    shortTitle: 'Famílias & Alunos',
    badge: '4 Etapas',
    icon: Users,
    colorClass: {
      bg: 'bg-indigo-50 dark:bg-indigo-950/40',
      text: 'text-indigo-700 dark:text-indigo-300',
      border: 'border-indigo-200 dark:border-indigo-800',
      accent: 'bg-indigo-600',
    },
    roles: ['admin', 'dirigente'],
    summary:
      'Gestão de cadastros de famílias, responsáveis e crianças com classificação etária automática nas salas A a D.',
    steps: [
      {
        title: 'Etapa 1: Dados da Família',
        description:
          'Informe o Nome de Referência da Família (obrigatório, como a família é identificada em listas e relatórios), telefone principal/WhatsApp, e-mail, endereço residencial completo e observações gerais.',
        tips: ['O nome de referência facilita a busca rápida (ex.: Família Silva Santos).'],
      },
      {
        title: 'Etapa 2: Responsáveis Legais',
        description:
          'Cadastre um ou mais responsáveis (Mãe, Pai, Avó, Tutor etc.) com nome completo, parentesco, data de nascimento no formato brasileiro dd/mm/aaaa, telefone, e-mail e foto. Marque quem é o contato preferencial de emergência. O cadastro inicia com a data de nascimento em branco e sem sugestão de foto prévia para preenchimento limpo.',
        tips: [
          'Você pode adicionar quantos responsáveis forem necessários clicando em "Adicionar Outro Responsável".',
        ],
      },
      {
        title: 'Etapa 3: Crianças, Tamanhos e Sala Sugerida',
        description:
          'Cadastre os alunos informando o nome completo, data de nascimento em dd/mm/aaaa (inicia em branco e calcula imediatamente a sala sugerida por idade em 1º de março do ano letivo configurado), campos específicos "Tamanho de roupa" e "Tamanho de calçado" (para campanhas fraternas e uniformes), alergias alimentares, observações médicas e autorização do uso de imagem para fins pedagógicos internos.',
        tips: [
          'A sala sugerida (Salas A a D) é calculada com base na idade completa em 1º de março do ano letivo configurado.',
          'Cada criança pode ter sua foto anexada por câmera, upload ou colar imagem com Ctrl+V, sem sugestão prévia.',
        ],
      },
      {
        title: 'Etapa 4: Revisão Geral e Gravação',
        description:
          'Confira o resumo completo de todos os dados preenchidos das 4 etapas. Para salvar, clique em "Confirmar e Salvar Cadastro". Se precisar corrigir algo, clique em "Voltar".',
      },
      {
        title: 'Edição de Ficha e Botão Cancelar',
        description:
          'Ao consultar uma família existente, clique em "Editar Informações" para abrir o formulário com os dados carregados. Caso decida não modificar nada, clique no botão "Cancelar" para sair sem salvar nenhuma alteração.',
        tips: [
          'Os modais de cadastro e edição não fecham por clique fora ou ESC, prevenindo perda acidental de dados.',
          'Use o botão Cancelar ou o X no topo para descartar sem gravar.',
        ],
      },
      {
        title: 'Ampliação de Fotos em Tela Cheia (Lightbox Seguro)',
        description:
          'Ao clicar na foto ou avatar de qualquer criança ou responsável na listagem ou na ficha, a imagem se abre ampliada em tela cheia (lightbox) para conferência detalhada. O fechamento é feito exclusivamente pelo botão "X" no canto superior ou pressionando a tecla ESC, sem botão de download público, resguardando a privacidade da imagem dos menores.',
      },
      {
        title: 'Exclusão de Família com Exclusão em Cascata (Admin e Dirigente)',
        description:
          'Na ficha detalhada de cada família, operadores com papel Administrador ou Dirigente contam com o botão "Excluir Família". A ação exige confirmação em modal de segurança e executa a exclusão completa em cascata de todos os responsáveis, crianças matriculadas, históricos e vínculos associados àquela família.',
        tips: [
          'Essa opção só aparece para Admin e Dirigente; professores e auxiliares não têm permissão para excluir famílias.',
        ],
      },
    ],
    faqs: [
      {
        question: 'Como funciona a sala sugerida por idade em 1º de março?',
        answer:
          'O sistema calcula a idade que a criança completa até 01/03 do ano letivo configurado: Sala A (3 a 5 anos), Sala B (6 a 8 anos), Sala C (9 a 11 anos) e Sala D (12 a 14 anos). O evangelizador pode ajustar a sala manualmente caso haja recomendação pedagógica.',
      },
      {
        question: 'Por que o cadastro de família possui 4 etapas?',
        answer:
          'O fluxo em 4 etapas (Dados da Família, Responsáveis, Crianças e Revisão) garante conferência gradual e evita que cadastros incompletos sejam salvos, iniciando sempre com campos em branco e validações em tempo real.',
      },
    ],
  },
  {
    id: 'calendario',
    title: 'Calendário Letivo e Planos Pedagógicos',
    shortTitle: 'Calendário',
    badge: 'Aulas & Temas',
    icon: Calendar,
    colorClass: {
      bg: 'bg-emerald-50 dark:bg-emerald-950/40',
      text: 'text-emerald-700 dark:text-emerald-300',
      border: 'border-emerald-200 dark:border-emerald-800',
      accent: 'bg-emerald-600',
    },
    roles: ['admin', 'dirigente'],
    summary:
      'Planejamento de todos os sábados letivos do ano, temas centrais, blocos temáticos e planos de aula específicos para cada sala.',
    steps: [
      {
        title: 'Seletor de Ano Letivo e Lista Derivada',
        description:
          'No topo da tela de Calendário, selecione o Ano Letivo desejado no seletor dinâmico. A lista de sábados, estatísticas de encontros e planos pedagógicos são imediatamente derivados do ano selecionado. Se o ano não possuir sábados cadastrados, o sistema exibe um estado vazio informativo com o botão CTA "Configurar em Ano Letivo {ano}".',
        tips: [
          'Ao clicar no CTA, você é redirecionado diretamente à ficha de configurações do respectivo ano.',
        ],
      },
      {
        title: 'Controle Manual do Status do Ano (Ativo, Planejado, Encerrado)',
        description:
          'Administradores e Dirigentes contam com controle manual exclusivo do status de cada ano letivo diretamente no cabeçalho do Calendário (e nas Configurações): "Ativo" (ano letivo corrente em andamento), "Planejado" (em preparação futura) ou "Encerrado" (concluído/histórico). Ao marcar um ano como Ativo, todos os demais anos passam automaticamente para Encerrado no backend PocketBase.',
        tips: ['Apenas um ano letivo pode estar Ativo simultaneamente no Sistema Infanto-CEP.'],
      },
      {
        title: 'Exclusão de Ano Não Ativo e Proteção do Ano Corrente',
        description:
          'A exclusão de um ano letivo é restrita a Admin e Dirigente e fica rigorosamente bloqueada enquanto o ano estiver com status "Ativo". Para remover anos em planejamento ou históricos obsoletos, o operador clica no botão "Excluir Ano", que abre um modal de confirmação exibindo o ano e a quantidade exata de sábados a serem removidos. A exclusão é realizada em cascata segura, removendo os sábados letivos, janelas de feriado, aulas, planos pedagógicos e presenças vinculadas.',
      },
      {
        title: 'Edição de Assunto na Lista de Sábados (#1 07/03/2026)',
        description:
          'Na Lista de Sábados Letivos, cada linha exibe o número sequencial e a data no formato brasileiro, por exemplo: "#1 07/03/2026", acompanhado do tema/assunto da aula. O botão "Editar Assunto" fica visível para Professores e Administradores para atualizar rapidamente o assunto do encontro.',
      },
      {
        title: 'Itens de Evento Institucional (ex.: Bingo) sem Chamada',
        description:
          'Encontros destinados a eventos institucionais especiais (como Bingo Fraterno, Festa da Família ou Mostra Pedagógica) podem ser marcados com o tipo "Evento". Esses sábados recebem destaque próprio na programação e não abrem chamada de presença regular, evitando distorções na assiduidade.',
      },
      {
        title: 'Modal Somente Leitura e Badge "Herdado de {ano}"',
        description:
          'No calendário operacional, a consulta aos encontros funciona em modo de visualização segura (as alterações estruturais de datas são concentradas na ficha de Ano Letivo em Configurações). Quando os encontros ou temas são replicados de um ano anterior, o sistema exibe o badge informativo "herdado de {ano}".',
      },
      {
        title: 'Cancelamento e Reativação de Encontros',
        description:
          'Se por algum imprevisto um sábado não tiver aula, o operador pode clicar em "Cancelar Encontro" e registrar o motivo. Caso a situação mude, o encontro pode ser reativado a qualquer momento, mantendo todo o histórico.',
        tips: [
          'Encontros cancelados ficam sinalizados em vermelho no calendário e bloqueiam o registro de chamada.',
        ],
      },
    ],
  },
  {
    id: 'presenca',
    title: 'Presença / Chamada no Celular',
    shortTitle: 'Presença',
    badge: 'Otimizada para Celular',
    icon: ClipboardCheck,
    colorClass: {
      bg: 'bg-amber-50 dark:bg-amber-950/40',
      text: 'text-amber-700 dark:text-amber-300',
      border: 'border-amber-200 dark:border-amber-800',
      accent: 'bg-amber-600',
    },
    roles: ['admin', 'dirigente', 'professor', 'auxiliar'],
    summary:
      'Registro prático da frequência da sala diretamente pelo smartphone ou computador, com gravação segura no servidor.',
    steps: [
      {
        title: 'Seleção do encontro e da sala',
        description:
          'O sistema seleciona automaticamente o sábado mais próximo. Escolha a sua sala (A, B, C ou D) no seletor do topo.',
      },
      {
        title: 'Registro ágil com toques grandes',
        description:
          'Cada cartão de aluno exibe a foto ampliada da criança, nome e botões grandes de fácil toque: "Presente" (verde), "Ausente" (cinza) e "Justificado" (âmbar).',
        tips: [
          'Você pode usar os botões rápidos "Marcar Todos Presentes" ou "Marcar Todos Ausentes" e depois ajustar apenas as exceções.',
        ],
      },
      {
        title: 'Justificativas e notas de observação',
        description:
          'Ao marcar "Justificado", um campo de texto é exibido para anotar o motivo da ausência (ex.: motivo de saúde, viagem da família).',
      },
      {
        title: 'Salvamento da chamada',
        description:
          'Clique no botão fixo "Salvar Chamada" no rodapé para consolidar a lista. Uma notificação do Sistema Infanto-CEP confirmará a gravação.',
      },
    ],
  },
  {
    id: 'relatorios',
    title: 'Relatórios: Frequência, Aniversários e Tamanhos',
    shortTitle: 'Relatórios',
    badge: 'Estatísticas & Listagens',
    icon: BarChart3,
    colorClass: {
      bg: 'bg-teal-50 dark:bg-teal-950/40',
      text: 'text-teal-700 dark:text-teal-300',
      border: 'border-teal-200 dark:border-teal-800',
      accent: 'bg-teal-600',
    },
    roles: ['admin', 'dirigente', 'professor'],
    summary:
      'Acompanhamento de assiduidade escolar, lista nominal de alunos por sala com data de aniversário, conferência de tamanhos de roupa e calçado com filtro de pendências e logs de exclusão e auditoria.',
    steps: [
      {
        title: 'Relatório de Alunos por Sala (com Aniversário)',
        description:
          'Lista nominal com agrupamento por sala (Salas A–D), data de nascimento completa no padrão brasileiro (dd/mm/aaaa), dia e mês de aniversário, cálculo de idade exata e destaque visual imediato para os aniversariantes do mês corrente.',
      },
      {
        title: 'Relatório de Tamanhos de Roupa e Calçado',
        description:
          'Exibe o tamanho de roupa e calçado de cada aluno por sala, com filtros rápidos por sala específica e destaque de alunos sem informação (filtro para exibir quem está sem roupa, sem calçado ou sem ambos), agilizando a arrecadação de uniformes e campanhas de final de ano.',
      },
      {
        title: 'Logs de Exclusão e Auditoria (Exclusivo Administrador)',
        description:
          'Disponível exclusivamente para o papel Administrador na barra de relatórios. Registra de forma indelével cada exclusão feita no sistema (data/hora, operador autenticado, papel, tipo de registro, identificação e detalhes, incluindo contagens em exclusões em cascata). Possui ordenação clicável em todas as colunas. Demais perfis (Dirigente e Professor) não visualizam esta aba.',
        tips: [
          'Qualquer exclusão de família, aluno, responsável, exemplar de livro, ano letivo, janela de recesso ou operador é automaticamente registrada.',
          'A coleção PocketBase logs_exclusao garante a rastreabilidade com operador autenticado e data/hora.',
        ],
      },
      {
        title: 'Rotina de Expurgo Seguro de Logs por Data Limite (Admin)',
        description:
          'Dentro do relatório de Logs de Exclusão, o Administrador pode executar o expurgo de registros antigos selecionando uma data limite. Um modal de confirmação irreversível com mensagem explicativa previne exclusões acidentais (o botão Cancelar mantém tudo intacto). A própria operação de expurgo gera um registro permanente de auditoria no Sistema Infanto-CEP.',
        tips: [
          'O expurgo permanente remove apenas registros anteriores à data estipulada.',
          'Um log de auditoria do próprio expurgo é gravado informando quantos registros foram removidos.',
        ],
      },
      {
        title: 'Ordenação Clicável nas Colunas de Todas as Tabelas',
        description:
          'Todas as tabelas de relatórios possuem cabeçalhos clicáveis com indicação visual de seta: o primeiro clique ordena de forma crescente (A-Z ou menor para maior), o segundo clique inverte para decrescente (Z-A), facilitando localizar crianças rapidamente por ordem alfabética ou data.',
      },
      {
        title: 'Cores e Identidade Visual da Barra de Relatórios',
        description:
          'A barra de seleção de categorias e botões de relatórios adota tons de cerceta/esmeralda institucionais harmonizados com o tema do sistema, com badges de contagem de registros e indicação clara de filtros ativos.',
      },
      {
        title: 'Relatório de Frequência das Chamadas e Assiduidade',
        description:
          'Filtre os dados por Sala A, B, C, D ou Todas, e selecione períodos letivos para analisar tendências de comparecimento, faltas consecutivas e percentual de assiduidade por aluno e turma.',
      },
      {
        title: 'Impressão Institucional Limpa e Exportação',
        description:
          'Todos os relatórios contam com cabeçalho oficial da CEP-Coligação Espírita Progressista, data/hora da emissão e rodapé padronizado pronto para impressão limpa ou exportação em PDF.',
      },
    ],
    faqs: [
      {
        question: 'Quem pode visualizar o relatório Logs de Exclusão?',
        answer:
          'Apenas o Administrador. O botão correspondente não é exibido para Dirigentes, Professores ou outros operadores, e tentativas de acesso direto são revertidas automaticamente para o relatório de Frequência.',
      },
      {
        question: 'Como funciona a rotina de expurgo de logs?',
        answer:
          'O Administrador clica em "Expurgar Logs por Data", informa a data de corte desejada e confirma a operação. Os logs anteriores a essa data são permanentemente removidos e um novo registro de auditoria é criado detalhando a ação.',
      },
    ],
  },
  {
    id: 'biblioteca',
    title: 'Biblioteca Infantil e Controle de Acervo',
    shortTitle: 'Biblioteca',
    badge: 'Acervo & Empréstimos',
    icon: BookMarked,
    colorClass: {
      bg: 'bg-purple-50 dark:bg-purple-950/40',
      text: 'text-purple-700 dark:text-purple-300',
      border: 'border-purple-200 dark:border-purple-800',
      accent: 'bg-purple-600',
    },
    roles: ['admin', 'dirigente', 'bibliotecario'],
    summary:
      'Cadastro de obras literárias infantis, múltiplos exemplares com código automático, controle de empréstimos, devoluções e alertas de atraso.',
    steps: [
      {
        title: 'Cadastro com Botão "+ Novo Livro" Verde Claro',
        description:
          'O acesso ao cadastro de obras é feito pelo botão de destaque "+ Novo Livro" em tom verde claro no topo da biblioteca. Ao digitar o título do livro no formulário, o sistema exibe imediatamente em tempo real o código do livro sugerido (iniciais das palavras principais).',
      },
      {
        title: 'Código Automático do Exemplar (Iniciais + Sequencial)',
        description:
          'Ao adicionar exemplares físicos à estante, o sistema gera o código de forma 100% automática a partir das iniciais do título seguidas de hífen e número sequencial (por exemplo: para "O Pequeno Príncipe", gera "PP-1", "PP-2", "PP-3"). Não é necessário digitar o código manualmente.',
      },
      {
        title: 'Seção "Exemplares" (Padronização Terminológica)',
        description:
          'A gestão de cópias físicas foi padronizada na seção "Exemplares" (eliminando o termo arcaico "Tombos"). Cada exemplar registra seu número identificador, localização física, estado de conservação (novo, bom, gasto, danificado) e disponibilidade imediata.',
        tips: [
          'Você pode adicionar novos exemplares ou atualizar o estado de conservação de qualquer exemplar cadastrado.',
        ],
      },
      {
        title: 'Prazo de Empréstimo Integrado às Configurações',
        description:
          'Ao registrar um empréstimo para uma criança matriculada, a data limite de devolução é calculada automaticamente com base no prazo de empréstimo (dias) configurado na aba de Configurações do sistema, respeitando também o limite máximo de livros simultâneos por aluno.',
      },
      {
        title: 'Devolução e Baixa Ágil',
        description:
          'Na aba de Empréstimos Ativos, localize o empréstimo da criança e clique em "Registrar Devolução". O exemplar retorna imediatamente para o status "Disponível" na estante.',
        tips: [
          'Empréstimos com prazo vencido recebem destaque visual em vermelho/âmbar para facilidade de cobrança fraterna.',
        ],
      },
    ],
  },
  {
    id: 'dimdim',
    title: 'Moeda DimDim (Incentivo Pedagógico)',
    shortTitle: 'Moeda DimDim',
    badge: 'Incentivo Fraterno',
    icon: Coins,
    colorClass: {
      bg: 'bg-emerald-50 dark:bg-emerald-950/40',
      text: 'text-emerald-700 dark:text-emerald-300',
      border: 'border-emerald-200 dark:border-emerald-800',
      accent: 'bg-emerald-600',
    },
    roles: ['admin', 'dirigente', 'professor', 'auxiliar'],
    summary:
      'Sistema de pontuação pedagógica fraterna para incentivar assiduidade, pontualidade, colaboração e tarefas.',
    steps: [
      {
        title: 'Saldo da criança',
        description:
          'Acompanhe o saldo atual de DimDim de cada aluno por sala. A moeda incentiva a participação nas aulas, a devolução pontual de livros e as boas atitudes coletivas.',
      },
      {
        title: 'Crédito de DimDim',
        description:
          'Lance créditos individuais ou por sala, informando o valor em DimDim, a categoria (presença, tarefa de evangelho, pontualidade, colaboração) e o motivo pedagógico.',
      },
      {
        title: 'Débito / Resgate na Feirinha',
        description:
          'No dia da feirinha fraterna ou troca de brindes/livros, lance os débitos para debitar do saldo da criança os itens adquiridos.',
      },
      {
        title: 'Estorno de lançamentos incorretos',
        description:
          'Se algum lançamento for feito por engano, você pode realizar o estorno diretamente pelo extrato da criança, mantendo a trilha de auditoria transparente.',
      },
    ],
  },

  {
    id: 'configuracoes',
    title: 'Operadores, Ano Letivo e Configurações',
    shortTitle: 'Operadores & Config.',
    badge: 'Apenas Administrador',
    icon: Settings,
    colorClass: {
      bg: 'bg-rose-50 dark:bg-rose-950/40',
      text: 'text-rose-700 dark:text-rose-300',
      border: 'border-rose-200 dark:border-rose-800',
      accent: 'bg-rose-600',
    },
    roles: ['admin'],
    summary:
      'Acesso restrito exclusivamente ao Administrador (/configuracoes). Gestão de contas de operadores e senhas, ficha dinâmica do ano letivo, janelas de feriados com botão Alterar, replicação inteligente de anos anteriores e planos pedagógicos.',
    steps: [
      {
        title: 'Acesso Restrito ao Administrador',
        description:
          'A rota /configuracoes e o menu "Operadores e Configurações" são protegidos e visíveis somente para o papel Administrador. Demais operadores não visualizam o item no menu e, se tentarem o acesso direto, são barrados pela guarda de rota com tela de acesso restrito.',
      },
      {
        title: 'Ficha "Ano Letivo {ano} e Janelas de Feriados": Seleção Dinâmica e Refetch',
        description:
          'A seleção do ano letivo na tela de Configurações é feita através de uma lista dinâmica (select) dos anos existentes cadastrados no sistema, eliminando a digitação manual. Ao trocar o ano selecionado, a aplicação executa refetch imediato carregando os sábados, status e janelas de feriado daquele ano específico.',
      },
      {
        title: 'Botão "Replicar do ano anterior" com Tratamento Inteligente de Datas',
        description:
          'Para agilizar o planejamento de um novo ciclo, o botão "Replicar do ano anterior" clona automaticamente a estrutura de sábados e janelas do ano precedente. O algoritmo inteligente ajusta datas: caso uma data replicada caia em domingo, é deslocada para o sábado imediatamente anterior; sinaliza conflitos com feriados nacionais móveis (Carnaval, Sexta-feira Santa, Páscoa, Corpus Christi) e marca essas ocorrências com status pendente de revisão para validação humana da coordenação.',
      },
      {
        title: 'Janelas de Recesso e Botão "Alterar"',
        description:
          'Cada recesso ou feriado cadastrado na lista possui agora o botão "Alterar" (exclusivo para Administrador e Dirigente). Ao clicar, um modal abre os campos preenchidos com o nome, data de início e data de fim, utilizando o seletor brasileiro (dd/mm/aaaa com máscara e calendário clicável). O sistema valida que a data final não seja anterior à data de início e repassa avisos de sobreposição com outras janelas diretamente do backend em toast. Para aplicar o novo intervalo ao calendário, o operador clica em "Sincronizar Calendário de Sábados".',
      },
      {
        title: 'Planos Pedagógicos por Sala Configuráveis (A, B, C e D)',
        description:
          'A coordenação pode personalizar os planos pedagógicos de cada sala (título e linha de atividades) diretamente na seção de configurações. Essas diretrizes são refletidas imediatamente no painel principal e nas fichas dos encontros.',
      },
      {
        title: 'Padronização de Datas do Ano Letivo em dd/mm/aaaa',
        description:
          'Todas as datas de início e término das aulas, primeiro e segundo semestre e recessos utilizam o padrão brasileiro dd/mm/aaaa com máscara de digitação e calendário integrado.',
      },
      {
        title: 'Gestão de Operadores e Papéis de Acesso',
        description:
          'Cadastre operadores (professores, evangelizadores, bibliotecários e dirigentes) com e-mail, nome e papel de acesso. É possível redefinir senhas e ativar/inativar contas de acesso.',
      },
      {
        title: 'Regras da Biblioteca e Moeda DimDim',
        description:
          'Configure o prazo padrão de devolução de livros (dias), o limite máximo de livros por criança e as regras de bonificação da Moeda DimDim.',
      },
    ],
    faqs: [
      {
        question: 'Quem pode acessar o menu Operadores e Configurações (/configuracoes)?',
        answer:
          'Exclusivamente o Administrador. Os papéis Dirigente, Professor, Auxiliar e Bibliotecário não visualizam a opção na navegação e têm o acesso bloqueado com tela de permissão insuficiente.',
      },
      {
        question: 'Onde encontro os Logs de Exclusão e a rotina de expurgo?',
        answer:
          'O relatório de Logs de Exclusão e a rotina de expurgo seguro ficam localizados no módulo de Relatórios (/relatorios), visíveis apenas quando o usuário logado possui perfil de Administrador.',
      },
    ],
  },
  {
    id: 'recursos_gerais',
    title: 'Recursos Gerais: Fotos e Troca de Senha',
    shortTitle: 'Fotos & Senha',
    badge: 'Ferramentas Comuns',
    icon: Sparkles,
    colorClass: {
      bg: 'bg-blue-50 dark:bg-blue-950/40',
      text: 'text-blue-700 dark:text-blue-300',
      border: 'border-blue-200 dark:border-blue-800',
      accent: 'bg-blue-600',
    },
    roles: ['admin', 'dirigente'],
    summary:
      'Como usar a captura de fotos (câmera, Ctrl+V, upload), ampliação em tela cheia (lightbox) e como alterar sua própria senha de acesso.',
    steps: [
      {
        title: 'Como tirar foto pela câmera do celular ou notebook',
        description:
          'No campo de foto (responsáveis, crianças ou livros), clique no botão "Tirar Foto". Autorize a câmera no navegador e clique em "Capturar Foto". É possível alternar entre a câmera frontal e traseira no celular.',
      },
      {
        title: 'Como colar foto diretamente com Ctrl+V (Clipboard)',
        description:
          'Copie uma imagem para a área de transferência (print de tela ou foto do WhatsApp) e aperte Ctrl+V em qualquer lugar da tela ou dentro do campo de foto. O sistema detecta a imagem e faz a compressão automática.',
      },
      {
        title: 'Como enviar arquivo de imagem do computador',
        description:
          'Clique em "Escolher Arquivo" para selecionar fotos JPEG, PNG ou WEBP salvas no seu dispositivo.',
      },
      {
        title: 'Ampliação de foto em tela cheia (Lightbox)',
        description:
          'Ao clicar no avatar de uma criança, responsável ou capa de livro nas listagens e fichas, a imagem é aberta em tela cheia (lightbox). Para fechar, clique no botão "X" no canto superior direito ou aperte a tecla ESC do teclado.',
        tips: ['No celular você pode tocar no botão "ESC para fechar" ou no "X".'],
      },
      {
        title: 'Como alterar sua própria senha de operador',
        description:
          'Em qualquer tela do sistema, clique no menu do usuário ou no botão "Mudar papel / Minha Conta" no cabeçalho superior e escolha "Alterar minha senha". Digite sua nova senha com no mínimo 8 caracteres e confirme.',
        tips: [
          'A troca entra em vigor imediatamente e é confirmada por mensagem do Sistema Infanto-CEP.',
        ],
      },
    ],
  },
]
