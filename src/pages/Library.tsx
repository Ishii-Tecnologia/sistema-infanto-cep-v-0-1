import React, { useEffect, useState } from 'react'
import { libraryService } from '@/services/library'
import { childService } from '@/services/families'
import { Book, BookCopy, BookLoan, Child } from '@/types'
import { formatDate } from '@/lib/academic'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  BookOpen,
  BookMarked,
  Plus,
  Search,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ArrowRightLeft,
  Barcode,
  Library,
  Pencil,
  Trash2,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { ImageCaptureInput } from '@/components/ImageCaptureInput'

export default function LibraryPage() {
  const { toast } = useToast()
  const [books, setBooks] = useState<Book[]>([])
  const [loans, setLoans] = useState<BookLoan[]>([])
  const [children, setChildren] = useState<Child[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  // Modal de Novo Livro / Edição de Livro
  const initialEmptyBookForm = {
    title: '',
    author: '',
    publisher: '',
    target_audience: '',
    category: '',
    description: '',
    cover_url: '',
    initialCopies: 1,
  }

  const [newBookOpen, setNewBookOpen] = useState(false)
  const [editingBook, setEditingBook] = useState<Book | null>(null)
  const [bookForm, setBookForm] = useState(initialEmptyBookForm)

  // Regras da Biblioteca (carregadas das configurações do sistema)
  const [libraryRules, setLibraryRules] = useState({
    maxLoansPerChild: 2,
    loanDurationDays: 7,
  })

  // Modal de Edição de Exemplar (código, estado, status e notas)
  const [copyEditOpen, setCopyEditOpen] = useState(false)
  const [editingCopy, setEditingCopy] = useState<BookCopy | null>(null)
  const [copyForm, setCopyForm] = useState({
    copy_number: '',
    condition: 'bom',
    status: 'disponivel',
    notes: '',
  })
  const [savingCopy, setSavingCopy] = useState(false)

  // Modal de Adição de Novo Exemplar para livro existente
  const [addCopyOpen, setAddCopyOpen] = useState(false)
  const [bookForNewCopy, setBookForNewCopy] = useState<Book | null>(null)
  const [newCopyCode, setNewCopyCode] = useState('')
  const [addingCopy, setAddingCopy] = useState(false)

  // Modal de Novo Empréstimo
  const [loanOpen, setLoanOpen] = useState(false)
  const [selectedCopyId, setSelectedCopyId] = useState('')
  const [selectedChildId, setSelectedChildId] = useState('')

  useEffect(() => {
    loadLibraryData()
  }, [])

  const loadLibraryData = async () => {
    try {
      setLoading(true)
      const [allBooks, allLoans, allChildren, rules] = await Promise.all([
        libraryService.getAllBooks(),
        libraryService.getAllLoans(),
        childService.getAll(),
        libraryService.getLibraryRules(),
      ])

      setBooks(allBooks)
      setLoans(allLoans)
      setChildren(allChildren)
      setLibraryRules(rules)
    } catch (err) {
      console.error('Erro ao carregar dados da biblioteca:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleOpenNewBook = () => {
    setEditingBook(null)
    setBookForm({
      title: '',
      author: '',
      publisher: '',
      target_audience: '',
      category: '',
      description: '',
      cover_url: '',
      initialCopies: 1,
    })
    setNewBookOpen(true)
  }

  const handleOpenEditBook = (book: Book) => {
    setEditingBook(book)
    setBookForm({
      title: book.title || '',
      author: book.author || '',
      publisher: book.publisher || '',
      target_audience: book.target_audience || '',
      category: book.category || '',
      description: book.description || '',
      cover_url: book.cover_url || '',
      initialCopies: 1,
    })
    setNewBookOpen(true)
  }

  const handleSaveBookEdit = async () => {
    if (!editingBook || !bookForm.title.trim()) {
      toast({
        title: 'Atenção',
        description: 'O título do livro é obrigatório.',
        variant: 'destructive',
      })
      return
    }

    try {
      await libraryService.updateBook(editingBook.id, {
        title: bookForm.title,
        author: bookForm.author,
        publisher: bookForm.publisher,
        target_audience: bookForm.target_audience,
        category: bookForm.category,
        description: bookForm.description,
        cover_url: bookForm.cover_url,
      })
      toast({
        title: 'Ficha do livro atualizada!',
        description: 'As informações da obra foram salvas com sucesso.',
      })
      setNewBookOpen(false)
      setEditingBook(null)
      loadLibraryData()
    } catch (err: any) {
      toast({
        title: 'Erro ao salvar alterações',
        description: err?.message,
        variant: 'destructive',
      })
    }
  }

  const handleOpenEditCopy = (copy: BookCopy, book: Book) => {
    setEditingCopy({ ...copy, expand: { book_id: book } as any })
    setCopyForm({
      copy_number: copy.copy_number || '',
      condition: copy.condition || 'bom',
      status: copy.status || 'disponivel',
      notes: copy.notes || '',
    })
    setCopyEditOpen(true)
  }

  const handleSaveCopyEdit = async () => {
    if (!editingCopy || !copyForm.copy_number.trim()) {
      toast({
        title: 'Atenção',
        description: 'O código do exemplar é obrigatório.',
        variant: 'destructive',
      })
      return
    }

    try {
      setSavingCopy(true)
      await libraryService.updateCopy(editingCopy.id, {
        copy_number: copyForm.copy_number.trim(),
        condition: copyForm.condition as any,
        status: copyForm.status as any,
        notes: copyForm.notes,
      })
      toast({
        title: 'Exemplar atualizado!',
        description: 'Código, estado de conservação e disponibilidade foram salvos.',
      })
      setCopyEditOpen(false)
      setEditingCopy(null)
      loadLibraryData()
    } catch (err: any) {
      toast({
        title: 'Erro ao salvar exemplar',
        description: err?.message,
        variant: 'destructive',
      })
    } finally {
      setSavingCopy(false)
    }
  }

  const handleOpenAddCopy = async (book: Book) => {
    setBookForNewCopy(book)
    try {
      const generatedCode = await libraryService.getNextCopyCode(book.id, book.title)
      setNewCopyCode(generatedCode)
    } catch (_) {
      const prefix = libraryService.generateTitleInitials(book.title || '')
      setNewCopyCode(`${prefix}-${(book.copies?.length || 0) + 1}`)
    }
    setAddCopyOpen(true)
  }

  const handleConfirmAddCopy = async () => {
    if (!bookForNewCopy) return
    try {
      setAddingCopy(true)
      await libraryService.addCopy(bookForNewCopy.id, newCopyCode)
      toast({
        title: 'Exemplar adicionado!',
        description: `O exemplar ${newCopyCode} foi cadastrado com sucesso.`,
      })
      setAddCopyOpen(false)
      setBookForNewCopy(null)
      setNewCopyCode('')
      loadLibraryData()
    } catch (err: any) {
      toast({
        title: 'Erro ao adicionar exemplar',
        description: err?.message,
        variant: 'destructive',
      })
    } finally {
      setAddingCopy(false)
    }
  }

  const handleDeleteCopy = async (copy: BookCopy) => {
    if (copy.status !== 'disponivel') {
      toast({
        title: 'Atenção',
        description:
          'Só é possível excluir exemplares que estejam disponíveis (sem empréstimo ativo).',
        variant: 'destructive',
      })
      return
    }

    if (
      !window.confirm(
        `Excluir o exemplar de código ${copy.copy_number}? Esta ação não pode ser desfeita.`,
      )
    ) {
      return
    }

    try {
      await libraryService.deleteCopy(copy.id)
      toast({
        title: 'Exemplar excluído',
        description: `O código ${copy.copy_number} foi removido do acervo.`,
      })
      loadLibraryData()
    } catch (err: any) {
      toast({ title: 'Erro ao excluir', description: err?.message, variant: 'destructive' })
    }
  }

  const handleCreateBook = async () => {
    if (!bookForm.title.trim()) {
      toast({
        title: 'Atenção',
        description: 'O título do livro é obrigatório.',
        variant: 'destructive',
      })
      return
    }

    try {
      await libraryService.createBook(bookForm, bookForm.initialCopies)
      toast({
        title: 'Livro cadastrado!',
        description: 'O título e seus exemplares foram criados com códigos sequenciais.',
      })
      setNewBookOpen(false)
      setBookForm({
        title: '',
        author: '',
        publisher: '',
        target_audience: '',
        category: '',
        description: '',
        cover_url: '',
        initialCopies: 1,
      })
      loadLibraryData()
    } catch (err: any) {
      toast({ title: 'Erro ao cadastrar', description: err?.message, variant: 'destructive' })
    }
  }

  const handleCreateLoan = async () => {
    if (!selectedCopyId || !selectedChildId) {
      toast({
        title: 'Atenção',
        description: 'Selecione o exemplar e a criança.',
        variant: 'destructive',
      })
      return
    }

    try {
      const days = libraryRules.loanDurationDays || 7
      await libraryService.borrowBook(selectedCopyId, selectedChildId, days)
      toast({
        title: 'Empréstimo realizado!',
        description: `Prazo de devolução de ${days} dias registrado com sucesso.`,
      })
      setLoanOpen(false)
      setSelectedCopyId('')
      setSelectedChildId('')
      loadLibraryData()
    } catch (err: any) {
      toast({
        title: 'Não foi possível emprestar',
        description: err?.message || 'Verifique as regras de empréstimo.',
        variant: 'destructive',
      })
    }
  }

  const handleReturnBook = async (loanId: string) => {
    try {
      await libraryService.returnBook(loanId, 'bom')
      toast({
        title: 'Livro devolvido com sucesso!',
        description: 'O exemplar está disponível novamente no acervo.',
      })
      loadLibraryData()
    } catch (err: any) {
      toast({ title: 'Erro ao devolver', description: err?.message, variant: 'destructive' })
    }
  }

  // Coleta exemplares disponíveis para o select de empréstimo
  const availableCopies = books.flatMap((b) =>
    (b.copies || [])
      .filter((c) => c.status === 'disponivel')
      .map((c) => ({
        copyId: c.id,
        code: c.copy_number,
        bookTitle: b.title,
      })),
  )

  const filteredBooks = books.filter(
    (b) =>
      b.title.toLowerCase().includes(search.toLowerCase()) ||
      (b.author || '').toLowerCase().includes(search.toLowerCase()),
  )

  const activeLoans = loans.filter((l) => l.status === 'active')
  const overdueLoans = loans.filter((l) => l.status === 'overdue')

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Biblioteca Infantil
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Acervo de literatura espírita infantil, controle de exemplares e empréstimos (limite:{' '}
            {libraryRules.maxLoansPerChild}{' '}
            {libraryRules.maxLoansPerChild === 1 ? 'livro' : 'livros'} por criança, prazo de{' '}
            {libraryRules.loanDurationDays} dias conforme configurações).
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={() => setLoanOpen(true)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white"
          >
            <ArrowRightLeft className="h-4 w-4 mr-2" />
            Novo Empréstimo
          </Button>

          <Button
            onClick={handleOpenNewBook}
            className="bg-emerald-500 hover:bg-emerald-600 text-white border-emerald-400 font-medium shadow-xs"
          >
            <Plus className="h-4 w-4 mr-2" />+ Novo Livro
          </Button>
        </div>
      </div>

      {/* Abas: Acervo de Livros vs Empréstimos Ativos / Atrasados */}
      <Tabs defaultValue="acervo" className="space-y-4">
        <TabsList className="grid grid-cols-3 max-w-md">
          <TabsTrigger value="acervo">Acervo ({books.length})</TabsTrigger>
          <TabsTrigger value="ativos">Ativos ({activeLoans.length})</TabsTrigger>
          <TabsTrigger value="atrasados" className="text-rose-600">
            Atrasados ({overdueLoans.length})
          </TabsTrigger>
        </TabsList>

        {/* ABA 1: ACERVO */}
        <TabsContent value="acervo" className="space-y-4">
          <Card>
            <CardContent className="p-4">
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Pesquisar por título ou autor..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredBooks.map((book) => {
              const totalCopies = book.copies?.length || 0
              const available = (book.copies || []).filter((c) => c.status === 'disponivel').length

              return (
                <Card
                  key={book.id}
                  className="hover:border-indigo-200 transition-all flex flex-col justify-between"
                >
                  <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-start gap-3">
                      {/* Capa do Livro (se houver, com visual de lombada) */}
                      <div className="w-14 h-20 rounded-md overflow-hidden bg-slate-100 dark:bg-slate-800 border shrink-0 flex items-center justify-center shadow-xs">
                        {book.cover_url ? (
                          <img
                            src={book.cover_url}
                            alt={`Capa de ${book.title}`}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="flex flex-col items-center justify-center p-1 text-slate-400 text-center">
                            <BookOpen className="h-5 w-5 mb-0.5 opacity-40 text-indigo-500" />
                            <span className="text-[8px] font-semibold uppercase tracking-wider opacity-60">
                              Sem capa
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="space-y-1 flex-1 min-w-0">
                        <Badge
                          variant="outline"
                          className="text-[10px] bg-slate-100 dark:bg-slate-800"
                        >
                          {book.category || 'Geral'}
                        </Badge>
                        <CardTitle className="text-base font-bold text-slate-900 dark:text-slate-100 leading-snug line-clamp-2">
                          {book.title}
                        </CardTitle>
                        <CardDescription className="text-xs truncate">
                          {book.author ? `Por ${book.author}` : 'Autor não informado'} •{' '}
                          {book.publisher}
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="pt-3 space-y-3 text-xs flex-1">
                    <p className="text-muted-foreground line-clamp-2">
                      {book.description ||
                        'História evangélica com valores de amor e solidariedade.'}
                    </p>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-[11px] font-semibold text-muted-foreground uppercase">
                          Exemplares:
                        </p>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleOpenAddCopy(book)}
                          className="h-5 px-1.5 text-[10px] text-indigo-600 hover:text-indigo-800"
                          title="Adicionar novo exemplar físico para esta obra"
                        >
                          <Plus className="h-3 w-3 mr-0.5" />
                          Novo Exemplar
                        </Button>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {(book.copies || []).map((cp) => (
                          <Badge
                            key={cp.id}
                            variant="outline"
                            className={`text-[10px] cursor-pointer hover:opacity-80 ${
                              cp.status === 'disponivel'
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                                : cp.status === 'emprestado'
                                  ? 'bg-amber-50 text-amber-800 border-amber-300'
                                  : 'bg-slate-100 text-slate-800'
                            }`}
                            onClick={() => handleOpenEditCopy(cp, book)}
                            title="Clique para editar o exemplar"
                          >
                            <Barcode className="h-3 w-3 mr-1" />
                            {cp.copy_number} ({cp.status})
                            <Pencil className="h-2.5 w-2.5 ml-1 opacity-60" />
                          </Badge>
                        ))}
                        {(book.copies || []).length === 0 && (
                          <span className="text-[11px] text-muted-foreground italic">
                            Nenhum exemplar cadastrado.
                          </span>
                        )}
                      </div>
                    </div>
                  </CardContent>

                  <div className="p-3 bg-slate-50 dark:bg-slate-900/60 border-t flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">
                      Disponíveis:{' '}
                      <strong className="text-slate-800 dark:text-slate-200">
                        {available} de {totalCopies}
                      </strong>
                    </span>
                    <div className="flex items-center gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleOpenEditBook(book)}
                        className="text-xs text-indigo-600 hover:text-indigo-800 h-7 px-2"
                        title="Editar dados e capa da obra"
                      >
                        <Pencil className="h-3.5 w-3.5 mr-1" />
                        Editar Ficha
                      </Button>

                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          const firstAvail = (book.copies || []).find(
                            (c) => c.status === 'disponivel',
                          )
                          if (firstAvail) {
                            setSelectedCopyId(firstAvail.id)
                            setLoanOpen(true)
                          } else {
                            toast({
                              title: 'Atenção',
                              description: 'Nenhum exemplar disponível deste livro no momento.',
                            })
                          }
                        }}
                        className="text-xs text-indigo-600 hover:text-indigo-800 h-7 px-2"
                      >
                        Emprestar
                      </Button>
                    </div>
                  </div>
                </Card>
              )
            })}
          </div>
        </TabsContent>

        {/* ABA 2: EMPRÉSTIMOS ATIVOS */}
        <TabsContent value="ativos" className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {activeLoans.map((loan) => (
              <Card key={loan.id} className="p-4 space-y-2 text-xs">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                      {loan.expand?.copy_id?.expand?.book_id?.title || 'Título do Livro'}
                    </h3>
                    <p className="text-muted-foreground text-[11px]">
                      Código: <strong>{loan.expand?.copy_id?.copy_number}</strong>
                    </p>
                  </div>
                  <Badge
                    variant="outline"
                    className="bg-sky-50 text-sky-800 border-sky-200 text-[10px]"
                  >
                    Emprestado
                  </Badge>
                </div>

                <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900 space-y-1">
                  <p>
                    Aluno(a): <strong>{loan.expand?.child_id?.name || 'Criança'}</strong>
                  </p>
                  <p className="text-muted-foreground">
                    Retirada: {formatDate(loan.loan_date)} • Devolução prevista:{' '}
                    <strong>{formatDate(loan.due_date)}</strong>
                  </p>
                </div>

                <div className="pt-2 flex justify-end">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleReturnBook(loan.id)}
                    className="text-xs h-8 text-emerald-600 border-emerald-200 hover:bg-emerald-50"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                    Registrar Devolução
                  </Button>
                </div>
              </Card>
            ))}

            {activeLoans.length === 0 && (
              <div className="col-span-full py-12 text-center text-muted-foreground text-xs">
                Nenhum empréstimo ativo no momento.
              </div>
            )}
          </div>
        </TabsContent>

        {/* ABA 3: EMPRÉSTIMOS ATRASADOS */}
        <TabsContent value="atrasados" className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {overdueLoans.map((loan) => (
              <Card
                key={loan.id}
                className="p-4 space-y-2 text-xs border-rose-200 dark:border-rose-900 bg-rose-50/20"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                      {loan.expand?.copy_id?.expand?.book_id?.title || 'Título do Livro'}
                    </h3>
                    <p className="text-muted-foreground text-[11px]">
                      Código: <strong>{loan.expand?.copy_id?.copy_number}</strong>
                    </p>
                  </div>
                  <Badge
                    variant="outline"
                    className="bg-rose-100 text-rose-800 border-rose-300 text-[10px]"
                  >
                    Atrasado
                  </Badge>
                </div>

                <div className="p-2.5 rounded-lg bg-rose-50/50 dark:bg-rose-950/30 space-y-1">
                  <p>
                    Aluno(a): <strong>{loan.expand?.child_id?.name || 'Criança'}</strong>
                  </p>
                  <p className="text-rose-700 dark:text-rose-300 font-semibold">
                    Vencido em: {formatDate(loan.due_date)}
                  </p>
                </div>

                <div className="pt-2 flex justify-end">
                  <Button
                    size="sm"
                    onClick={() => handleReturnBook(loan.id)}
                    className="text-xs h-8 bg-rose-600 hover:bg-rose-700 text-white"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                    Receber com Atraso
                  </Button>
                </div>
              </Card>
            ))}

            {overdueLoans.length === 0 && (
              <div className="col-span-full py-12 text-center text-muted-foreground text-xs">
                <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto mb-2" />
                Nenhum empréstimo atrasado. Todos os prazos de devolução estão respeitados!
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Modal: Novo Livro / Editar Livro */}
      <Dialog
        open={newBookOpen}
        onOpenChange={(open) => {
          setNewBookOpen(open)
          if (!open) {
            setEditingBook(null)
            setBookForm({
              title: '',
              author: '',
              publisher: '',
              target_audience: '',
              category: '',
              description: '',
              cover_url: '',
              initialCopies: 1,
            })
          }
        }}
      >
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingBook ? 'Editar Ficha do Livro' : 'Cadastrar Livro no Acervo'}
            </DialogTitle>
            <DialogDescription className="text-xs">
              {editingBook
                ? 'Altere os dados da obra. Os exemplares físicos continuam vinculados.'
                : 'Nova inclusão no acervo. Preencha os dados da obra e veja o código automático gerado para os exemplares.'}
            </DialogDescription>
          </DialogHeader>

          {/* Form com autocomplete desligado para neutralizar sugestões indesejadas do navegador */}
          <form
            autoComplete="off"
            onSubmit={(e) => {
              e.preventDefault()
              if (editingBook) {
                handleSaveBookEdit()
              } else {
                handleCreateBook()
              }
            }}
            className="py-2 space-y-3 text-xs"
          >
            <div className="space-y-1">
              <Label htmlFor="book_title">Título da Obra *</Label>
              <Input
                id="book_title"
                name="book_title_field_no_ac"
                autoComplete="off"
                data-lpignore="true"
                data-form-type="other"
                placeholder="Digite o título do livro..."
                value={bookForm.title}
                onChange={(e) => setBookForm({ ...bookForm, title: e.target.value })}
                autoFocus
              />
            </div>

            {/* Exibição em tempo real do código automático após preenchimento do nome do livro */}
            {!editingBook && bookForm.title.trim().length > 0 && (
              <div className="p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex items-start gap-2 animate-in fade-in-50 duration-200">
                <Barcode className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <div className="space-y-1 flex-1 min-w-0">
                  <div className="flex items-center justify-between flex-wrap gap-1">
                    <span className="font-semibold text-[11px] text-emerald-800 dark:text-emerald-300">
                      Código automático do exemplar:
                    </span>
                    <span className="text-[10px] text-emerald-700 dark:text-emerald-400">
                      {bookForm.initialCopies > 1
                        ? `${bookForm.initialCopies} códigos previstos`
                        : '1 código previsto'}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 pt-0.5">
                    {libraryService
                      .previewNewBookCopyCodes(bookForm.title, bookForm.initialCopies)
                      .map((code) => (
                        <Badge
                          key={code}
                          variant="outline"
                          className="bg-white dark:bg-slate-900 border-emerald-300 text-emerald-800 dark:text-emerald-200 font-mono font-bold text-xs px-2 py-0.5"
                        >
                          {code}
                        </Badge>
                      ))}
                  </div>
                  <p className="text-[10px] text-emerald-700/80 dark:text-emerald-400/80">
                    Gerado automaticamente a partir das iniciais do título (
                    {libraryService.generateTitleInitials(bookForm.title)}) + sequencial.
                  </p>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="book_author">Autor / Psicografia</Label>
                <Input
                  id="book_author"
                  name="book_author_field_no_ac"
                  autoComplete="off"
                  data-lpignore="true"
                  placeholder="Nome do autor..."
                  value={bookForm.author}
                  onChange={(e) => setBookForm({ ...bookForm, author: e.target.value })}
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="book_publisher">Editora</Label>
                <Input
                  id="book_publisher"
                  name="book_publisher_field_no_ac"
                  autoComplete="off"
                  data-lpignore="true"
                  placeholder="Nome da editora..."
                  value={bookForm.publisher}
                  onChange={(e) => setBookForm({ ...bookForm, publisher: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="book_audience">Público / Sala</Label>
                <Input
                  id="book_audience"
                  name="book_audience_field_no_ac"
                  autoComplete="off"
                  data-lpignore="true"
                  placeholder="Ex: Sala A / B, Infantil..."
                  value={bookForm.target_audience}
                  onChange={(e) => setBookForm({ ...bookForm, target_audience: e.target.value })}
                />
              </div>

              {!editingBook && (
                <div className="space-y-1">
                  <Label htmlFor="book_copies">Quantidade de Exemplares</Label>
                  <Input
                    id="book_copies"
                    type="number"
                    min={1}
                    max={20}
                    value={bookForm.initialCopies}
                    onChange={(e) =>
                      setBookForm({ ...bookForm, initialCopies: parseInt(e.target.value) || 1 })
                    }
                  />
                </div>
              )}
            </div>

            <div className="space-y-1">
              <Label htmlFor="book_description">Breve Sinopse</Label>
              <Input
                id="book_description"
                name="book_description_field_no_ac"
                autoComplete="off"
                data-lpignore="true"
                placeholder="Descrição dos temas abordados..."
                value={bookForm.description}
                onChange={(e) => setBookForm({ ...bookForm, description: e.target.value })}
              />
            </div>

            {/* Captura da Capa do Livro (Câmera, Colar ou Enviar Arquivo) */}
            <div className="pt-1 border-t">
              <ImageCaptureInput
                label="Capa do Livro"
                description="Tirar foto da capa, colar imagem ou enviar arquivo"
                placeholder="Cole a imagem da capa, envie arquivo ou tire uma foto com a câmera..."
                value={bookForm.cover_url}
                aspectRatio="portrait"
                previewShape="rounded"
                onChange={(cover) => setBookForm({ ...bookForm, cover_url: cover })}
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setNewBookOpen(false)}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {editingBook ? 'Salvar Alterações' : 'Salvar Livro'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal: Editar Exemplar (Código, Estado, Status, Notas) */}
      <Dialog open={copyEditOpen} onOpenChange={setCopyEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Exemplar</DialogTitle>
            <DialogDescription className="text-xs">
              Ajuste o código, o estado de conservação e a disponibilidade do exemplar físico.
            </DialogDescription>
          </DialogHeader>

          <div className="py-2 space-y-3 text-xs">
            <div className="space-y-1">
              <Label>Código do Exemplar *</Label>
              <Input
                placeholder="Ex: PP-1"
                value={copyForm.copy_number}
                onChange={(e) => setCopyForm({ ...copyForm, copy_number: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Estado de Conservação</Label>
                <Select
                  value={copyForm.condition}
                  onValueChange={(v) => setCopyForm({ ...copyForm, condition: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Estado..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="novo">Novo</SelectItem>
                    <SelectItem value="bom">Bom</SelectItem>
                    <SelectItem value="gasto">Gasto</SelectItem>
                    <SelectItem value="danificado">Danificado</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label>Disponibilidade</Label>
                <Select
                  value={copyForm.status}
                  onValueChange={(v) => setCopyForm({ ...copyForm, status: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Status..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="disponivel">Disponível</SelectItem>
                    <SelectItem value="emprestado">Emprestado</SelectItem>
                    <SelectItem value="extraviado">Extraviado</SelectItem>
                    <SelectItem value="descartado">Descartado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1">
              <Label>Observações do Exemplar</Label>
              <Input
                placeholder="Ex: capa amassada, página 12 rasgada..."
                value={copyForm.notes}
                onChange={(e) => setCopyForm({ ...copyForm, notes: e.target.value })}
              />
            </div>
          </div>

          <DialogFooter className="flex items-center justify-between gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => editingCopy && handleDeleteCopy(editingCopy)}
              className="text-rose-600 hover:bg-rose-50 hover:text-rose-700"
            >
              <Trash2 className="h-3.5 w-3.5 mr-1" />
              Excluir
            </Button>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setCopyEditOpen(false)}>
                Cancelar
              </Button>
              <Button
                size="sm"
                onClick={handleSaveCopyEdit}
                disabled={savingCopy}
                className="bg-indigo-600 hover:bg-indigo-700 text-white"
              >
                {savingCopy ? 'Salvando...' : 'Salvar Exemplar'}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal: Novo Exemplar para Livro Existente */}
      <Dialog open={addCopyOpen} onOpenChange={setAddCopyOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar Novo Exemplar</DialogTitle>
            <DialogDescription className="text-xs">
              Cadastre um novo exemplar físico para a obra <strong>{bookForNewCopy?.title}</strong>.
            </DialogDescription>
          </DialogHeader>

          <div className="py-2 space-y-3 text-xs">
            <div className="space-y-1">
              <Label>Código do Exemplar *</Label>
              <Input
                placeholder="Ex: PP-1"
                value={newCopyCode}
                onChange={(e) => setNewCopyCode(e.target.value)}
              />
              <p className="text-[11px] text-muted-foreground">
                Código gerado automaticamente com as iniciais do título + sequencial.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setAddCopyOpen(false)}>
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={handleConfirmAddCopy}
              disabled={addingCopy}
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              {addingCopy ? 'Adicionando...' : 'Cadastrar Exemplar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal: Novo Empréstimo */}
      <Dialog open={loanOpen} onOpenChange={setLoanOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar Empréstimo de Livro</DialogTitle>
            <DialogDescription className="text-xs">
              Selecione o exemplar e a criança. O sistema valida automaticamente o limite de{' '}
              {libraryRules.maxLoansPerChild}{' '}
              {libraryRules.maxLoansPerChild === 1 ? 'livro' : 'livros'} por aluno e o prazo de{' '}
              {libraryRules.loanDurationDays} dias configurado.
            </DialogDescription>
          </DialogHeader>

          <div className="py-2 space-y-3 text-xs">
            <div className="space-y-1">
              <Label>Exemplar Disponível (Código)</Label>
              <Select value={selectedCopyId} onValueChange={setSelectedCopyId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um exemplar..." />
                </SelectTrigger>
                <SelectContent>
                  {availableCopies.map((cp) => (
                    <SelectItem key={cp.copyId} value={cp.copyId} className="text-xs">
                      {cp.code} — {cp.bookTitle}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label>Criança / Aluno(a)</Label>
              <Select value={selectedChildId} onValueChange={setSelectedChildId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a criança..." />
                </SelectTrigger>
                <SelectContent>
                  {children.map((c) => (
                    <SelectItem key={c.id} value={c.id} className="text-xs">
                      {c.name} (Sala {c.classroom})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setLoanOpen(false)}>
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={handleCreateLoan}
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              Confirmar Empréstimo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
