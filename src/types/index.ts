export type UserRole = 'admin' | 'dirigente' | 'professor' | 'auxiliar' | 'bibliotecario'

export interface User {
  id: string
  email: string
  name: string
  role: UserRole
  active: boolean
  avatar?: string
  /** Sala alocada quando o papel é professor (escopo de acesso às famílias/alunos). */
  assigned_classroom?: ClassroomId | ''
  created?: string
  updated?: string
}

export type ClassroomId = 'A' | 'B' | 'C' | 'D'

export interface PedagogicalPlanSetting {
  title: string
  activities: string
}

export type PedagogicalPlansMap = Record<ClassroomId, PedagogicalPlanSetting>

export interface ClassroomInfo {
  id: ClassroomId
  name: string
  minAge: number
  maxAge: number
  description: string
}

export const CLASSROOMS: ClassroomInfo[] = [
  {
    id: 'A',
    name: 'Sala A',
    minAge: 3,
    maxAge: 5,
    description: 'Maternal e Jardim (3 a 5 anos completos até 01/03)',
  },
  {
    id: 'B',
    name: 'Sala B',
    minAge: 6,
    maxAge: 8,
    description: 'Ciclo 1 (6 a 8 anos completos até 01/03)',
  },
  {
    id: 'C',
    name: 'Sala C',
    minAge: 9,
    maxAge: 11,
    description: 'Ciclo 2 (9 a 11 anos completos até 01/03)',
  },
  {
    id: 'D',
    name: 'Sala D',
    minAge: 12,
    maxAge: 14,
    description: 'Juventude 1 (12 a 14 anos completos até 01/03)',
  },
]

export interface SystemSetting {
  id: string
  key: string
  value: any
  description?: string
}

export interface Family {
  id: string
  reference_name: string
  primary_phone?: string
  address?: string
  bairro?: string
  notes?: string
  /** "Cadastro Cesta Básica" — checkbox persistido na ficha da família. */
  cesta_basica?: boolean
  created?: string
  updated?: string
  guardians?: Guardian[]
  children?: Child[]
}

export interface Guardian {
  id: string
  family_id: string
  name: string
  relationship?: string
  birth_date?: string
  phone?: string
  is_emergency_contact?: boolean
  /** Participa da Sala de Aula da Família (Sala D) — checkbox do wizard. */
  participa_sala_aula?: boolean
  photo_url?: string
  /** Nome do arquivo de foto armazenado no backend (novo padrão, como em natal_entregas). */
  photo?: string | File
  created?: string
  updated?: string
}

export interface Child {
  id: string
  family_id: string
  name: string
  birth_date: string
  classroom: ClassroomId
  photo_url?: string
  /** Nome do arquivo de foto armazenado no backend (novo padrão, como em natal_entregas). */
  photo?: string | File
  clothing_size?: string
  shoe_size?: string
  allergies?: string
  medical_notes?: string
  image_authorized?: boolean
  dimdim_balance?: number
  active?: boolean
  created?: string
  updated?: string
  expand?: {
    family_id?: Family
  }
}

export type LessonStatus = 'scheduled' | 'completed' | 'canceled'

export interface Lesson {
  id: string
  date: string
  year: number
  session_number?: number
  central_theme: string
  thematic_block?: string
  status: LessonStatus
  cancel_reason?: string
  notes?: string
  created?: string
  updated?: string
  plans?: LessonPlan[]
}

export interface LessonPlan {
  id: string
  lesson_id: string
  classroom: ClassroomId
  title: string
  objective?: string
  approach?: string
  materials?: string
  notes?: string
  created?: string
  updated?: string
}

export type AttendanceStatus = 'present' | 'absent' | 'justified'

export type AttendancePersonKind = 'child' | 'guardian'

export interface Attendance {
  id: string
  lesson_id: string
  /** Criança — null quando a chamada registra um RESPONSÁVEL (Sala D). */
  child_id: string | null
  /** Responsável — só preenchido quando person_kind = 'guardian'. */
  guardian_id?: string | null
  /** 'child' (padrão) ou 'guardian' (responsável participante da Sala D). */
  person_kind?: AttendancePersonKind
  classroom: ClassroomId
  status: AttendanceStatus
  justification?: string
  notes?: string
  created?: string
  updated?: string
  expand?: {
    child_id?: Child
    guardian_id?: Guardian
    lesson_id?: Lesson
  }
}

export interface Book {
  id: string
  title: string
  author?: string
  publisher?: string
  target_audience?: string
  category?: string
  description?: string
  cover_url?: string
  created?: string
  updated?: string
  copies?: BookCopy[]
}

export type BookCondition = 'novo' | 'bom' | 'regular' | 'danificado'
export type CopyStatus = 'disponivel' | 'emprestado' | 'extraviado' | 'manutencao'

export interface BookCopy {
  id: string
  book_id: string
  copy_number: string
  condition: BookCondition
  status: CopyStatus
  notes?: string
  created?: string
  updated?: string
  expand?: {
    book_id?: Book
  }
}

export type LoanStatus = 'active' | 'returned' | 'overdue'

export interface BookLoan {
  id: string
  copy_id: string
  child_id: string
  loan_date: string
  due_date: string
  return_date?: string
  status: LoanStatus
  notes?: string
  created?: string
  updated?: string
  expand?: {
    copy_id?: BookCopy & { expand?: { book_id?: Book } }
    child_id?: Child
  }
}

// ---------------------------------------------------------------------------
// Biblioteca Didática
// ---------------------------------------------------------------------------

export interface DidacticBook {
  id: string
  title: string
  author?: string
  category?: string
  synopsis?: string
  total_copies: number
  available_copies: number
  created?: string
  updated?: string
}

export type DidacticRequestStatus = 'pendente' | 'aprovada' | 'recusada' | 'devolvida'

export interface DidacticRequest {
  id: string
  book_id: string
  requester: string
  quantity: number
  use_date: string
  notes?: string
  status: DidacticRequestStatus
  decision_note?: string
  decided_at?: string
  loan_id?: string
  created?: string
  updated?: string
  expand?: {
    book_id?: DidacticBook
    requester?: User
  }
}

export interface DidacticLoan {
  id: string
  request_id: string
  book_id: string
  requester: string
  quantity: number
  loan_date: string
  due_date: string
  return_date?: string
  status: 'ativo' | 'devolvido'
  created?: string
  updated?: string
  expand?: {
    book_id?: DidacticBook
    requester?: User
    request_id?: DidacticRequest
  }
}

export type DimDimTransactionType = 'credit' | 'debit' | 'reversal'
export type DimDimCategory = 'presenca' | 'tarefa' | 'comportamento' | 'premiacao' | 'outros'

export interface DimDimTransaction {
  id: string
  child_id: string
  type: DimDimTransactionType
  amount: number
  reason: string
  category?: DimDimCategory
  reversal_of_id?: string
  notes?: string
  created?: string
  updated?: string
  expand?: {
    child_id?: Child
  }
}

export type SchoolYearStatus = 'planejado' | 'ativo' | 'encerrado'

export interface AnoLetivo {
  id: string
  ano: number
  data_inicio: string
  data_fim?: string
  status: SchoolYearStatus
  age_base_date?: string
  winter_break_start?: string
  winter_break_end?: string
  christmas_date?: string
  replicado_de?: string
  created?: string
  updated?: string
  expand?: {
    replicado_de?: AnoLetivo
  }
}

export type SabadoLetivoTipo = 'letivo' | 'feriado' | 'recesso' | 'evento'

export interface SabadoLetivo {
  id: string
  ano_letivo_id: string
  data: string
  tipo: SabadoLetivoTipo
  descricao?: string
  revisado?: boolean
  conflito_motivo?: string
  lesson_id?: string
  created?: string
  updated?: string
  expand?: {
    ano_letivo_id?: AnoLetivo
    lesson_id?: Lesson
  }
}

export interface JanelaFeriado {
  id: string
  ano_letivo_id: string
  data_inicio: string
  data_fim: string
  nome: string
  revisado?: boolean
  conflito_motivo?: string
  created?: string
  updated?: string
  expand?: {
    ano_letivo_id?: AnoLetivo
  }
}

export interface AuditoriaSabado {
  id: string
  user_id?: string
  user_name?: string
  ano?: number
  acao: string
  detalhes?: string
  created?: string
  updated?: string
}
