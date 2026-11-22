import { useCallback, useEffect, useMemo, useState } from 'react'
import pb from '@/lib/pocketbase/client'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/hooks/use-toast'
import { getErrorMessage, isAuthExpiredError } from '@/lib/pocketbase/errors'
import { cn } from '@/lib/utils'
import { formatDate } from '@/lib/academic'
import { DidacticBook, DidacticLoan, DidacticRequest } from '@/types'
import {
  didacticLibraryService,
  didacticLoanDaysOverdue,
  didacticLoanEffectiveStatus,
} from '@/services/didacticLibrary'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  GraduationCap,
  HandCoins,
  Loader2,
  Pencil,
  Plus,
  Search,
  Send,
  Trash2,
  XCircle,
} from 'lucide-react'

type LibraryProfile = 'bibliotecario' | 'professor'
type DidacticTab = 'acervo' | 'solicitacoes' | 'emprestimos'

const EMPTY_BOOK_FORM = {
  title: '',
  author: '',
  category: '',
  synopsis: '',
  totalCopies: 1,
}

const REQUEST_STATUS_LABEL: Record<DidacticRequest['status'], string> = {
  pendente: 'Pendente',
  aprovada: 'Aprovada',
  recusada: 'Recusada',
  devolvida: 'Devolvida',
}

const REQUEST_STATUS_BADGE: Record<DidacticRequest['status'], string> = {
  pendente: 'bg-amber-100 text-amber-800 border-amber-200',
  aprovada: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  recusada: 'bg-red-100 text-red-800 border-red-200',
  devolvida: 'bg-slate-100 text-slate-700 border-slate-200',
}

function normalize(text: string): string {
  return (text || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
}

/** Hoje por dia (00:00 local), para comparação com a data de uso. */
function todayStart(): Date {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d
}

export const DidacticLibrary: React.FC<{ className?: string }> = ({ className }) => {
  const { user, hasRole } = useAuth()
  const { toast } = useToast()

  const isManagerReal = hasRole(['bibliotecario', 'dirigente']) // papel real do banco

  // Seletor de perfil no cabeçalho: gestão pode enxergar como professor.
  const [profile, setProfile] = useState<LibraryProfile>(
    isManagerReal ? 'bibliotecario' : 'professor',
  )
  useEffect(() => {
    setProfile(isManagerReal ? 'bibliotecario' : 'professor')
  }, [isManagerReal])

  const viewProfile: LibraryProfile = isManagerReal ? profile : 'professor'
  const canManage = viewProfile === 'bibliotecario'

  const [tab, setTab] = useState<DidacticTab>('acervo')
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState<string | null>(null)

  const [books, setBooks] = useState<DidacticBook[]>([])
  const [requests, setRequests] = useState<DidacticRequest[]>([])
  const [loans, setLoans] = useState<DidacticLoan[]>([])

  const [search, setSearch] = useState('')

  // ---- formulário de livro (novo/editar) ----
  const [bookDialogOpen, setBookDialogOpen] = useState(false)
  const [bookEditing, setBookEditing] = useState<DidacticBook | null>(null)
  const [bookForm, setBookForm] = useState({ ...EMPTY_BOOK_FORM })
  const [bookSaving, setBookSaving] = useState(false)

  // ---- formulário de solicitação ----
  const [reqDialogOpen, setReqDialogOpen] = useState(false)
  const [reqBookId, setReqBookId] = useState('')
  const [reqQuantity, setReqQuantity] = useState(1)
  const [reqUseDate, setReqUseDate] = useState('')
  const [reqNotes, setReqNotes] = useState('')
  const [reqSaving, setReqSaving] = useState(false)

  // ---- confirmação de exclusão ----
  const [deleteTarget, setDeleteTarget] = useState<DidacticBook | null>(null)

  const loadAll = useCallback(async () => {
    setLoading(true)
    try {
      const [b, r, l] = await Promise.all([
        didacticLibraryService.listBooks(),
        didacticLibraryService.listRequests(),
        didacticLibraryService.listLoans(),
      ])
      setBooks(b)
      setRequests(r)
      setLoans(l)
    } catch (err) {
      if (isAuthExpiredError(err)) {
        toast({
          title: 'Sessão expirada',
          description: 'Faça login novamente para usar a Biblioteca Didática.',
          variant: 'destructive',
        })
        return
      }
      console.error('Falha ao carregar Biblioteca Didática:', err)
      toast({
        title: 'Erro ao carregar Biblioteca Didática',
        description: getErrorMessage(err),
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    loadAll()
  }, [loadAll])

  const filteredBooks = useMemo(() => {
    const q = normalize(search.trim())
    if (!q) return books
    return books.filter((b) =>
      [b.title, b.author, b.category].some((f) => normalize(f || '').includes(q)),
    )
  }, [books, search])

  const requesterName = (r: DidacticRequest | DidacticLoan): string =>
    r.expand?.requester?.name ||
    (r.expand?.requester as unknown as { email?: string } | undefined)?.email ||
    'Operador'

  const bookTitle = (id: string): string => books.find((b) => b.id === id)?.title || 'Livro'

  const myRequests = useMemo(() => {
    const uid = user?.id
    if (!uid) return requests
    return requests.filter((r) => r.requester === uid)
  }, [requests, user?.id])

  // ---------------- Ações do bibliotecário ----------------
  const openNewBook = () => {
    setBookEditing(null)
    setBookForm({ ...EMPTY_BOOK_FORM })
    setBookDialogOpen(true)
  }

  const openEditBook = (book: DidacticBook) => {
    setBookEditing(book)
    setBookForm({
      title: book.title || '',
      author: book.author || '',
      category: book.category || '',
      synopsis: book.synopsis || '',
      totalCopies: book.total_copies ?? 0,
    })
    setBookDialogOpen(true)
  }

  const saveBook = async () => {
    if (!bookForm.title.trim()) {
      toast({
        title: 'Informe o título do livro',
        variant: 'destructive',
      })
      return
    }
    setBookSaving(true)
    try {
      if (bookEditing) {
        await didacticLibraryService.updateBook(bookEditing.id, {
          title: bookForm.title,
          author: bookForm.author,
          category: bookForm.category,
          synopsis: bookForm.synopsis,
        })
        toast({ title: 'Livro atualizado' })
      } else {
        await didacticLibraryService.createBook({
          title: bookForm.title,
          author: bookForm.author,
          category: bookForm.category,
          synopsis: bookForm.synopsis,
          totalCopies: Number(bookForm.totalCopies) || 0,
        })
        toast({ title: 'Livro cadastrado no acervo didático' })
      }
      setBookDialogOpen(false)
      await loadAll()
    } catch (err) {
      toast({
        title: bookEditing ? 'Erro ao atualizar livro' : 'Erro ao cadastrar livro',
        description: getErrorMessage(err),
        variant: 'destructive',
      })
    } finally {
      setBookSaving(false)
    }
  }

  const confirmDeleteBook = async () => {
    if (!deleteTarget) return
    setBusyId(deleteTarget.id)
    try {
      await didacticLibraryService.deleteBook(deleteTarget.id)
      toast({ title: 'Livro excluído do acervo' })
      setDeleteTarget(null)
      await loadAll()
    } catch (err) {
      toast({
        title: 'Erro ao excluir livro',
        description: getErrorMessage(err),
        variant: 'destructive',
      })
    } finally {
      setBusyId(null)
    }
  }

  const decideRequest = async (req: DidacticRequest, decision: 'aprovada' | 'recusada') => {
    setBusyId(req.id)
    try {
      if (decision === 'aprovada') {
        await didacticLibraryService.approveRequest(req.id)
        toast({
          title: 'Solicitação aprovada',
          description: 'Exemplares debitados do acervo e empréstimo gerado.',
        })
      } else {
        await didacticLibraryService.rejectRequest(req.id)
        toast({ title: 'Solicitação recusada' })
      }
      await loadAll()
    } catch (err) {
      toast({
        title:
          decision === 'aprovada' ? 'Erro ao aprovar solicitação' : 'Erro ao recusar solicitação',
        description: getErrorMessage(err),
        variant: 'destructive',
      })
    } finally {
      setBusyId(null)
    }
  }

  const registerReturn = async (loan: DidacticLoan) => {
    setBusyId(loan.id)
    try {
      await didacticLibraryService.returnLoan(loan.id)
      toast({ title: 'Devolução registrada', description: 'Exemplares restituídos ao acervo.' })
      await loadAll()
    } catch (err) {
      toast({
        title: 'Erro ao registrar devolução',
        description: getErrorMessage(err),
        variant: 'destructive',
      })
    } finally {
      setBusyId(null)
    }
  }

  // ---------------- Ação do professor ----------------
  const submitRequest = async () => {
    if (!reqBookId) {
      toast({ title: 'Escolha um livro do acervo', variant: 'destructive' })
      return
    }
    if (!reqUseDate) {
      toast({ title: 'Informe a data de uso', variant: 'destructive' })
      return
    }
    const [y, m, d] = reqUseDate.split('-').map(Number)
    const useDate = new Date(y, (m || 1) - 1, d || 1)
    if (useDate < todayStart()) {
      toast({ title: 'A data de uso não pode ser no passado', variant: 'destructive' })
      return
    }
    const book = books.find((b) => b.id === reqBookId)
    const qty = Number(reqQuantity) || 0
    if (book && qty > book.available_copies) {
      toast({
        title: 'Quantidade indisponível',
        description: `O livro tem apenas ${book.available_copies} exemplar(es) disponível(is).`,
        variant: 'destructive',
      })
      return
    }
    setReqSaving(true)
    try {
      await didacticLibraryService.createRequest({
        bookId: reqBookId,
        quantity: qty,
        useDate,
        notes: reqNotes,
      })
      toast({ title: 'Solicitação enviada', description: 'Aguarde a decisão do bibliotecário.' })
      setReqDialogOpen(false)
      setReqBookId('')
      setReqQuantity(1)
      setReqUseDate('')
      setReqNotes('')
      await loadAll()
    } catch (err) {
      toast({
        title: 'Erro ao enviar solicitação',
        description: getErrorMessage(err),
        variant: 'destructive',
      })
    } finally {
      setReqSaving(false)
    }
  }

  const selectedBook = books.find((b) => b.id === reqBookId)

  // ---------------- Render ----------------
  return (
    <div className={cn('space-y-4', className)}>
      {/* Cabeçalho com seletor de perfil */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <GraduationCap className="h-5 w-5 text-primary" />
          <div>
            <h3 className="text-lg font-semibold leading-tight">Biblioteca Didática</h3>
            <p className="text-sm text-muted-foreground">
              Solicitações e empréstimos de livros didáticos para uso em sala de aula.
            </p>
          </div>
        </div>
        {isManagerReal && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Visualizar como:</span>
            <Select value={viewProfile} onValueChange={(v) => setProfile(v as LibraryProfile)}>
              <SelectTrigger className="w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="bibliotecario">Bibliotecário(a) — gestão</SelectItem>
                <SelectItem value="professor">Professor/Auxiliar — consulta</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as DidacticTab)}>
        <TabsList>
          <TabsTrigger value="acervo">Acervo Didático</TabsTrigger>
          <TabsTrigger value="solicitacoes">Solicitações</TabsTrigger>
          <TabsTrigger value="emprestimos">Empréstimos Didáticos</TabsTrigger>
        </TabsList>

        {/* ---------------- ABA ACERVO ---------------- */}
        <TabsContent value="acervo" className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="relative w-full max-w-sm">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por título, autor ou categoria..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8"
              />
            </div>
            {canManage && (
              <Button onClick={openNewBook}>
                <Plus className="mr-2 h-4 w-4" /> Novo livro
              </Button>
            )}
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Título</TableHead>
                    <TableHead>Autor</TableHead>
                    <TableHead className="hidden md:table-cell">Categoria</TableHead>
                    <TableHead className="hidden lg:table-cell">Sinopse</TableHead>
                    <TableHead className="text-center">Totais</TableHead>
                    <TableHead className="text-center">Disponíveis</TableHead>
                    {canManage && <TableHead className="text-right">Ações</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredBooks.length === 0 && (
                    <TableRow>
                      <TableCell
                        colSpan={canManage ? 7 : 6}
                        className="py-8 text-center text-muted-foreground"
                      >
                        Nenhum livro didático encontrado.
                      </TableCell>
                    </TableRow>
                  )}
                  {filteredBooks.map((book) => (
                    <TableRow key={book.id}>
                      <TableCell className="font-medium">{book.title}</TableCell>
                      <TableCell>{book.author || '—'}</TableCell>
                      <TableCell className="hidden md:table-cell">{book.category || '—'}</TableCell>
                      <TableCell className="hidden lg:table-cell max-w-[280px]">
                        <span className="line-clamp-2 text-sm text-muted-foreground">
                          {book.synopsis || '—'}
                        </span>
                      </TableCell>
                      <TableCell className="text-center">{book.total_copies}</TableCell>
                      <TableCell className="text-center">
                        <Badge
                          variant="outline"
                          className={cn(
                            book.available_copies === 0
                              ? 'border-red-200 bg-red-50 text-red-700'
                              : 'border-emerald-200 bg-emerald-50 text-emerald-700',
                          )}
                        >
                          {book.available_copies}
                        </Badge>
                      </TableCell>
                      {canManage && (
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => openEditBook(book)}
                              title="Editar"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="text-red-600 hover:text-red-700"
                              onClick={() => setDeleteTarget(book)}
                              title="Excluir"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>

        {/* ---------------- ABA SOLICITAÇÕES ---------------- */}
        <TabsContent value="solicitacoes" className="space-y-4">
          {viewProfile === 'professor' && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Nova solicitação de empréstimo</CardTitle>
              </CardHeader>
              <CardContent>
                <Button
                  onClick={() => {
                    setReqBookId('')
                    setReqQuantity(1)
                    setReqUseDate('')
                    setReqNotes('')
                    setReqDialogOpen(true)
                  }}
                >
                  <Send className="mr-2 h-4 w-4" /> Solicitar empréstimo
                </Button>
                <p className="mt-2 text-sm text-muted-foreground">
                  O bibliotecário(a) decidirá sua solicitação; o prazo de devolução é de {14} dias a
                  partir da aprovação.
                </p>
              </CardContent>
            </Card>
          )}

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Livro</TableHead>
                  <TableHead className="text-center">Qtd.</TableHead>
                  <TableHead>Data de uso</TableHead>
                  {canManage && <TableHead>Solicitante</TableHead>}
                  <TableHead>Status</TableHead>
                  {canManage && <TableHead className="text-right">Ações</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {(canManage ? requests : myRequests).length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={canManage ? 6 : 4}
                      className="py-8 text-center text-muted-foreground"
                    >
                      {canManage
                        ? 'Nenhuma solicitação pendente ou decidida.'
                        : 'Você ainda não fez solicitações.'}
                    </TableCell>
                  </TableRow>
                )}
                {(canManage ? requests : myRequests).map((req) => (
                  <TableRow key={req.id}>
                    <TableCell className="font-medium">
                      {req.expand?.book_id?.title || bookTitle(req.book_id)}
                    </TableCell>
                    <TableCell className="text-center">{req.quantity}</TableCell>
                    <TableCell>{formatDate(req.use_date)}</TableCell>
                    {canManage && <TableCell>{requesterName(req)}</TableCell>}
                    <TableCell>
                      <Badge variant="outline" className={REQUEST_STATUS_BADGE[req.status]}>
                        {REQUEST_STATUS_LABEL[req.status]}
                      </Badge>
                      {req.status === 'recusada' && req.decision_note && (
                        <p className="mt-1 text-xs text-muted-foreground">{req.decision_note}</p>
                      )}
                    </TableCell>
                    {canManage && (
                      <TableCell className="text-right">
                        {req.status === 'pendente' ? (
                          <div className="flex justify-end gap-1">
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-emerald-700 border-emerald-200 hover:bg-emerald-50"
                              disabled={busyId === req.id}
                              onClick={() => decideRequest(req, 'aprovada')}
                            >
                              {busyId === req.id ? (
                                <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                              ) : (
                                <CheckCircle2 className="mr-1 h-3 w-3" />
                              )}
                              Aprovar
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-red-700 border-red-200 hover:bg-red-50"
                              disabled={busyId === req.id}
                              onClick={() => decideRequest(req, 'recusada')}
                            >
                              <XCircle className="mr-1 h-3 w-3" />
                              Recusar
                            </Button>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            {req.decided_at ? formatDate(req.decided_at) : '—'}
                          </span>
                        )}
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* ---------------- ABA EMPRÉSTIMOS ---------------- */}
        <TabsContent value="emprestimos" className="space-y-4">
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Solicitante</TableHead>
                  <TableHead>Livro</TableHead>
                  <TableHead className="text-center">Qtd.</TableHead>
                  <TableHead className="hidden md:table-cell">Empréstimo</TableHead>
                  <TableHead>Prazo</TableHead>
                  <TableHead>Status</TableHead>
                  {canManage && <TableHead className="text-right">Ações</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {loans.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={canManage ? 7 : 6}
                      className="py-8 text-center text-muted-foreground"
                    >
                      Nenhum empréstimo didático registrado.
                    </TableCell>
                  </TableRow>
                )}
                {loans.map((loan) => {
                  const eff = didacticLoanEffectiveStatus(loan)
                  const days = didacticLoanDaysOverdue(loan)
                  const overdue = eff === 'atrasado'
                  return (
                    <TableRow key={loan.id} className={cn(overdue && 'bg-red-50/60')}>
                      <TableCell>{requesterName(loan)}</TableCell>
                      <TableCell className="font-medium">
                        {loan.expand?.book_id?.title || bookTitle(loan.book_id)}
                      </TableCell>
                      <TableCell className="text-center">{loan.quantity}</TableCell>
                      <TableCell className="hidden md:table-cell">
                        {formatDate(loan.loan_date)}
                      </TableCell>
                      <TableCell>{formatDate(loan.due_date)}</TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={cn(
                            eff === 'ativo' && 'border-emerald-200 bg-emerald-50 text-emerald-700',
                            overdue && 'border-red-300 bg-red-100 text-red-800',
                            eff === 'devolvido' && 'border-slate-200 bg-slate-100 text-slate-700',
                          )}
                        >
                          {overdue ? (
                            <>
                              <AlertTriangle className="mr-1 h-3 w-3" /> Atrasado
                            </>
                          ) : eff === 'ativo' ? (
                            <>
                              <Clock className="mr-1 h-3 w-3" /> Ativo
                            </>
                          ) : (
                            <>
                              <CheckCircle2 className="mr-1 h-3 w-3" /> Devolvido
                            </>
                          )}
                        </Badge>
                        {overdue && (
                          <p className="mt-1 text-xs font-medium text-red-700">
                            {days} {days === 1 ? 'dia' : 'dias'} em atraso
                          </p>
                        )}
                        {eff === 'devolvido' && loan.return_date && (
                          <p className="mt-1 text-xs text-muted-foreground">
                            Devolvido em {formatDate(loan.return_date)}
                          </p>
                        )}
                      </TableCell>
                      {canManage && (
                        <TableCell className="text-right">
                          {loan.status === 'ativo' ? (
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={busyId === loan.id}
                              onClick={() => registerReturn(loan)}
                            >
                              {busyId === loan.id ? (
                                <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                              ) : (
                                <HandCoins className="mr-1 h-3 w-3" />
                              )}
                              Registrar devolução
                            </Button>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </TableCell>
                      )}
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>

      {/* ---------------- Diálogo de livro (novo/editar) ---------------- */}
      <Dialog open={bookDialogOpen} onOpenChange={setBookDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {bookEditing ? 'Editar livro didático' : 'Novo livro didático'}
            </DialogTitle>
            <DialogDescription>
              {bookEditing
                ? 'Os contadores de exemplares não são editáveis aqui (mudam por empréstimo/devolução).'
                : 'O acervo inicialmente fica totalmente disponível para solicitação.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="didactic-book-title">Título *</Label>
              <Input
                id="didactic-book-title"
                value={bookForm.title}
                onChange={(e) => setBookForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="Ex.: Matemática e Realidade"
              />
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="didactic-book-author">Autor</Label>
                <Input
                  id="didactic-book-author"
                  value={bookForm.author}
                  onChange={(e) => setBookForm((f) => ({ ...f, author: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="didactic-book-category">Categoria</Label>
                <Input
                  id="didactic-book-category"
                  value={bookForm.category}
                  onChange={(e) => setBookForm((f) => ({ ...f, category: e.target.value }))}
                  placeholder="Ex.: Pedagogia"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="didactic-book-synopsis">Sinopse</Label>
              <Textarea
                id="didactic-book-synopsis"
                rows={3}
                value={bookForm.synopsis}
                onChange={(e) => setBookForm((f) => ({ ...f, synopsis: e.target.value }))}
              />
            </div>
            {!bookEditing && (
              <div className="space-y-1.5">
                <Label htmlFor="didactic-book-copies">Exemplares totais</Label>
                <Input
                  id="didactic-book-copies"
                  type="number"
                  min={0}
                  value={bookForm.totalCopies}
                  onChange={(e) =>
                    setBookForm((f) => ({ ...f, totalCopies: Number(e.target.value) }))
                  }
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBookDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={saveBook} disabled={bookSaving}>
              {bookSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ---------------- Diálogo de solicitação (professor) ---------------- */}
      <Dialog open={reqDialogOpen} onOpenChange={setReqDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Solicitar empréstimo didático</DialogTitle>
            <DialogDescription>
              A solicitação será avaliada pelo bibliotecário(a). O estoque só é debitado na
              aprovação.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Livro *</Label>
              <Select value={reqBookId} onValueChange={setReqBookId}>
                <SelectTrigger>
                  <SelectValue placeholder="Escolha um livro" />
                </SelectTrigger>
                <SelectContent>
                  {books.map((b) => (
                    <SelectItem key={b.id} value={b.id} disabled={b.available_copies === 0}>
                      {b.title} ({b.available_copies} disp.)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="didactic-req-qty">Exemplares *</Label>
                <Input
                  id="didactic-req-qty"
                  type="number"
                  min={1}
                  max={selectedBook ? Math.max(1, selectedBook.available_copies) : undefined}
                  value={reqQuantity}
                  onChange={(e) => setReqQuantity(Number(e.target.value))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="didactic-req-date">Data de uso *</Label>
                <Input
                  id="didactic-req-date"
                  type="date"
                  min={new Date().toISOString().slice(0, 10)}
                  value={reqUseDate}
                  onChange={(e) => setReqUseDate(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="didactic-req-notes">Observação</Label>
              <Textarea
                id="didactic-req-notes"
                rows={2}
                value={reqNotes}
                onChange={(e) => setReqNotes(e.target.value)}
                placeholder="Ex.: para a aula de sábado sobre parábolas"
              />
            </div>
            {selectedBook && (
              <p className="text-xs text-muted-foreground">
                Disponíveis neste livro: {selectedBook.available_copies} de{' '}
                {selectedBook.total_copies}
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReqDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={submitRequest} disabled={reqSaving}>
              {reqSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <Send className="mr-2 h-4 w-4" /> Enviar solicitação
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ---------------- Confirmação de exclusão de livro ---------------- */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Excluir livro didático</DialogTitle>
            <DialogDescription>
              Excluir “{deleteTarget?.title}” do acervo? A ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              disabled={busyId === deleteTarget?.id}
              onClick={confirmDeleteBook}
            >
              {busyId === deleteTarget?.id && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default DidacticLibrary
