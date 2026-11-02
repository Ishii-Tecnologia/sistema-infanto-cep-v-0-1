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
    roles: ['admin', 'dirigente', 'professor', 'auxiliar', 'bibliotecario'],
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
    roles: ['admin', 'dirigente', 'professor', 'auxiliar'],
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
          'Cadastre um ou mais responsáveis (Mãe, Pai, Avó, Tutor etc.) com nome completo, parentesco, data de nascimento, telefone, e-mail e foto. Marque quem é o contato preferencial de emergência.',
        tips: [
          'Você pode adicionar quantos responsáveis forem necessários clicando em "Adicionar Outro Responsável".',
        ],
      },
      {
        title: 'Etapa 3: Crianças e Classificação Automática',
        description:
          'Cadastre os alunos informando o nome completo, data de nascimento (a sala A, B, C ou D é calculada imediatamente com base na idade completa em 1º de março do ano letivo vigente), tamanhos de roupa e calçado (para campanhas fraternas e uniformes), alergias alimentares, observações médicas e autorização do uso de imagem para fins pedagógicos internos.',
        tips: [
          'A sala é reclassificada na hora em que a data de nascimento é preenchida.',
          'Cada criança pode ter sua foto anexada por câmera, upload ou colar imagem.',
        ],
      },
      {
        title: 'Etapa 4: Revisão Geral e Gravação',
        description:
          'Confira o resumo completo de todos os dados preenchidos. Para salvar, clique em "Confirmar e Salvar Cadastro". Se precisar corrigir algo, clique em "Voltar".',
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
    ],
    faqs: [
      {
        question: 'Como funciona a data de corte de 1º de março?',
        answer:
          'O sistema calcula a idade que a criança completa até 01/03 do ano letivo configurado: Sala A (3 a 5 anos), Sala B (6 a 8 anos), Sala C (9 a 11 anos) e Sala D (12 a 14 anos).',
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
    roles: ['admin', 'dirigente', 'professor', 'auxiliar'],
    summary:
      'Planejamento de todos os sábados letivos do ano, temas centrais, blocos temáticos e planos de aula específicos para cada sala.',
    steps: [
      {
        title: 'Visão dos sábados letivos',
        description:
          'Consulte a linha do tempo com todos os sábados de atividade espírita infantil previstos para o ano, com contagem sequencial (ex.: Encontro 01, Encontro 02...) e indicação de feriados/recessos excluídos.',
      },
      {
        title: 'Definição de temas centrais',
        description:
          'Cada encontro possui um Tema Central e Bloco Temático (ex.: "Deus e a Criação", "Evangelho no Lar", "Parábolas de Jesus"). Os temas podem ser editados pelos coordenadores e professores.',
      },
      {
        title: 'Planos pedagógicos por sala (A, B, C e D)',
        description:
          'Em cada sábado, abra os detalhes do encontro para preencher o plano específico de cada turma: título da aula, objetivo moral e abordagem prática adaptada para cada faixa etária.',
      },
      {
        title: 'Cancelamento e Reativação de encontros',
        description:
          'Se por algum imprevisto ou evento institucional um sábado não tiver aula, o operador pode clicar em "Cancelar Encontro" e registrar o motivo. Caso a situação mude, o encontro pode ser reativado a qualquer momento.',
        tips: [
          'Encontros cancelados ficam sinalizados em vermelho no calendário e não permitem registro indevido de chamada.',
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
      'Acompanhamento de assiduidade escolar, lista nominal de alunos por sala com data de aniversário e conferência de tamanhos de roupa e calçado com filtro de pendências.',
    steps: [
      {
        title: 'Relatório de Frequência das Chamadas',
        description:
          'Filtre os dados por Sala A, B, C, D ou Todas, e selecione períodos letivos para analisar tendências de comparecimento, faltas consecutivas e sábado crítico.',
      },
      {
        title: 'Relatório de Alunos por Sala (com Aniversário)',
        description:
          'Lista nominal com agrupamento por sala (Salas A–D), data de nascimento completa no padrão brasileiro (dd/mm/aaaa), dia e mês de aniversário, além de destaque para aniversariantes do mês corrente.',
      },
      {
        title: 'Relatório de Tamanhos de Roupa e Calçado',
        description:
          'Exibe o tamanho de roupa e calçado de cada aluno por sala, com filtro rápido para ver alunos sem informação preenchida (sem roupa, sem calçado ou sem ambos).',
      },
      {
        title: 'Impressão Institucional Limpa e PDF',
        description:
          'Todos os relatórios contam com cabeçalho oficial da CEP-Coligação Espírita Progressista e rodapé padronizado para assinatura da coordenação.',
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
    roles: ['admin', 'dirigente', 'bibliotecario', 'professor'],
    summary:
      'Cadastro de obras literárias infantis, múltiplos exemplares com código tombo, controle rigoroso de empréstimos, devoluções e alertas de atraso.',
    steps: [
      {
        title: 'Cadastro de Livros no Acervo',
        description:
          'Cadastre títulos espíritas e infanto-juvenis com título, autor, editora, faixa etária recomendada, sinopse e foto da capa.',
      },
      {
        title: 'Controle de Exemplares Físicos',
        description:
          'Um livro pode ter vários exemplares físicos na estante. Cada exemplar recebe um código único (ex.: PP-1, PP-2), estado de conservação (novo, bom, gasto, danificado) e disponibilidade.',
        tips: [
          'Você pode adicionar novos exemplares ou editar o estado de conservação a qualquer momento.',
        ],
      },
      {
        title: 'Empréstimos para Alunos',
        description:
          'Para emprestar, selecione um exemplar disponível e a criança matriculada. O sistema calcula a data de devolução com base no prazo cadastrado nas configurações (ex.: 14 dias) e impede que o aluno ultrapasse o limite máximo permitido de livros simultâneos.',
      },
      {
        title: 'Devolução e Baixa',
        description:
          'Na aba de Empréstimos Ativos, localize o empréstimo e clique em "Registrar Devolução". O exemplar retorna imediatamente para o status "Disponível".',
        tips: [
          'Empréstimos com prazo vencido recebem destaque visual de atraso para cobrança fraterna.',
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
    badge: 'Apenas Coordenação',
    icon: Settings,
    colorClass: {
      bg: 'bg-rose-50 dark:bg-rose-950/40',
      text: 'text-rose-700 dark:text-rose-300',
      border: 'border-rose-200 dark:border-rose-800',
      accent: 'bg-rose-600',
    },
    roles: ['admin', 'dirigente'],
    summary:
      'Gestão de operadores e senhas, faixas etárias das salas, janelas de feriados do ano letivo, planos pedagógicos padrão e regras da biblioteca.',
    steps: [
      {
        title: 'Gestão de Operadores e Papéis',
        description:
          'Cadastre novos operadores (professores, evangelizadores, bibliotecários e dirigentes) com e-mail, nome e papel de acesso. É possível redefinir senhas e ativar/inativar usuários.',
      },
      {
        title: 'Salas e Faixas Etárias (A a D)',
        description:
          'Configure a idade mínima e máxima de cada turma. A data de corte de 1º de março é respeitada em todos os cálculos automáticos.',
      },
      {
        title: 'Ano Letivo e Janelas de Feriados',
        description:
          'Defina as datas de início e término das aulas, feriados nacionais, recessos escolares e feriados móveis (Carnaval, Páscoa, Corpus Christi) que devem ser excluídos do calendário de sábados.',
      },
      {
        title: 'Regras da Biblioteca e DimDim',
        description:
          'Ajuste o prazo padrão de devolução de livros (ex.: 14 dias), o limite máximo de livros emprestados por criança e os parâmetros de bonificação do DimDim.',
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
    roles: ['admin', 'dirigente', 'professor', 'auxiliar', 'bibliotecario'],
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
