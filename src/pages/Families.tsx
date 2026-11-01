import React, { useEffect, useState } from 'react'
import { familyService, childService } from '@/services/families'
import { Family, Guardian, Child, ClassroomId } from '@/types'
import { Pencil } from 'lucide-react'
import {
  calculateAgeOnCutoffDate,
  classifyClassroomByBirthDate,
  formatDate,
  getClassroomBadge,
} from '@/lib/academic'
import { useAcademic } from '@/contexts/AcademicContext'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
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
  Users,
  UserPlus,
  Search,
  Phone,
  Mail,
  MapPin,
  Heart,
  AlertCircle,
  Camera,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  Trash2,
  Plus,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { ImageCaptureInput } from '@/components/ImageCaptureInput'
import { DatePickerBR } from '@/components/DatePickerBR'
import { ImageLightbox } from '@/components/ImageLightbox'
import { getErrorMessage, isAuthExpiredError } from '@/lib/pocketbase/errors'
import pb from '@/lib/pocketbase/client'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'

export default function FamiliesPage() {
  const navigate = useNavigate()
  const { logout } = useAuth()
  const { toast } = useToast()
  const {
    classrooms,
    schoolYear,
    loading: academicLoading,
    classifyChild,
    calculateAge,
  } = useAcademic()
  const [families, setFamilies] = useState<Family[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [classroomFilter, setClassroomFilter] = useState<string>('all')
  const [selectedFamily, setSelectedFamily] = useState<Family | null>(null)
  const [lightboxImage, setLightboxImage] = useState<{
    src: string
    title?: string
    description?: string
  } | null>(null)

  // Estado do Wizard de Cadastro em 4 etapas
  const [wizardOpen, setWizardOpen] = useState(false)
  const [editingFamily, setEditingFamily] = useState<Family | null>(null)
  const [currentStep, setCurrentStep] = useState(1)
  const [saving, setSaving] = useState(false)

  // Dados do Wizard
  const [wizardFamily, setWizardFamily] = useState<{
    reference_name: string
    primary_phone: string
    email: string
    address: string
    notes: string
  }>({
    reference_name: '',
    primary_phone: '',
    email: '',
    address: '',
    notes: '',
  })

  const [wizardGuardians, setWizardGuardians] = useState<
    Array<{
      id?: string
      name: string
      relationship: string
      birth_date?: string
      phone: string
      email: string
      is_emergency_contact: boolean
      photo_url: string
    }>
  >([
    {
      name: '',
      relationship: 'Mãe',
      birth_date: '',
      phone: '',
      email: '',
      is_emergency_contact: true,
      photo_url: '',
    },
  ])

  const [wizardChildren, setWizardChildren] = useState<
    Array<{
      id?: string
      name: string
      birth_date: string
      classroom: ClassroomId
      allergies: string
      medical_notes: string
      image_authorized: boolean
      photo_url: string
    }>
  >([
    {
      name: '',
      birth_date: '',
      classroom: 'A',
      allergies: '',
      medical_notes: '',
      image_authorized: true,
      photo_url: '',
    },
  ])

  useEffect(() => {
    loadFamilies()
  }, [])

  const checkAuthAndHandleExpired = (err: unknown): boolean => {
    if (!pb.authStore.isValid || isAuthExpiredError(err)) {
      toast({
        title: 'Sessão Expirada',
        description:
          'Sua sessão no Sistema Infanto-CEP expirou. Você está sendo redirecionado para a tela de login.',
        variant: 'destructive',
      })
      logout()
      navigate('/login')
      return true
    }
    return false
  }

  const loadFamilies = async () => {
    try {
      setLoading(true)
      const data = await familyService.getAll()
      setFamilies(data)
    } catch (err) {
      console.error('Erro ao carregar famílias:', err)
      if (checkAuthAndHandleExpired(err)) return
      toast({
        title: 'Erro ao carregar famílias',
        description: getErrorMessage(err),
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleOpenWizard = () => {
    setEditingFamily(null)
    setCurrentStep(1)
    setWizardFamily({
      reference_name: '',
      primary_phone: '',
      email: '',
      address: '',
      notes: '',
    })
    setWizardGuardians([
      {
        name: '',
        relationship: 'Mãe',
        birth_date: '',
        phone: '',
        email: '',
        is_emergency_contact: true,
        photo_url: '',
      },
    ])
    setWizardChildren([
      {
        name: '',
        birth_date: '',
        classroom: 'A',
        allergies: '',
        medical_notes: '',
        image_authorized: true,
        photo_url: '',
      },
    ])
    setWizardOpen(true)
  }

  const handleBirthDateChange = (index: number, dateStr: string) => {
    const updated = [...wizardChildren]
    const autoClass = dateStr ? classifyChild(dateStr) : undefined
    updated[index] = {
      ...updated[index],
      birth_date: dateStr,
      classroom: autoClass || updated[index].classroom || 'A',
    }
    setWizardChildren(updated)
  }

  const handleAddGuardian = () => {
    setWizardGuardians([
      ...wizardGuardians,
      {
        name: '',
        relationship: 'Pai',
        birth_date: '',
        phone: '',
        email: '',
        is_emergency_contact: false,
        photo_url: '',
        id: undefined,
      },
    ])
  }

  const handleRemoveGuardian = (index: number) => {
    if (wizardGuardians.length > 1) {
      setWizardGuardians(wizardGuardians.filter((_, i) => i !== index))
    }
  }

  const handleAddChild = () => {
    setWizardChildren([
      ...wizardChildren,
      {
        name: '',
        birth_date: '',
        classroom: 'A',
        allergies: '',
        medical_notes: '',
        image_authorized: true,
        photo_url: '',
        id: undefined,
      },
    ])
  }

  const handleRemoveChild = (index: number) => {
    if (wizardChildren.length > 1) {
      setWizardChildren(wizardChildren.filter((_, i) => i !== index))
    }
  }

  const handleSaveWizard = async () => {
    if (!wizardFamily.reference_name.trim()) {
      toast({
        title: 'Atenção',
        description: 'O nome da família é obrigatório.',
        variant: 'destructive',
      })
      return
    }

    if (!pb.authStore.isValid) {
      checkAuthAndHandleExpired(new Error('Sessão expirada'))
      return
    }

    try {
      setSaving(true)
      if (editingFamily) {
        await familyService.updateComplete(
          editingFamily.id,
          wizardFamily,
          wizardGuardians,
          wizardChildren,
        )
        toast({
          title: 'Ficha atualizada com sucesso!',
          description:
            'As informações da família, responsáveis e crianças foram salvas no Sistema Infanto-CEP.',
        })
      } else {
        await familyService.create(wizardFamily, wizardGuardians, wizardChildren)
        toast({
          title: 'Família cadastrada com sucesso!',
          description:
            'Os responsáveis e crianças foram vinculados e classificados no Sistema Infanto-CEP.',
        })
      }
      setWizardOpen(false)
      setSelectedFamily(null)
      loadFamilies()
    } catch (err: any) {
      if (checkAuthAndHandleExpired(err)) return
      toast({
        title: editingFamily ? 'Erro ao salvar alterações' : 'Erro ao cadastrar',
        description: getErrorMessage(err),
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  // Abre o wizard em MODO EDIÇÃO preenchido com os dados da ficha da família
  const handleOpenEditWizard = (fam: Family) => {
    setEditingFamily(fam)
    setCurrentStep(1)
    setWizardFamily({
      reference_name: fam.reference_name || '',
      primary_phone: fam.primary_phone || '',
      email: fam.email || '',
      address: fam.address || '',
      notes: fam.notes || '',
    })
    setWizardGuardians(
      (fam.guardians || []).length > 0
        ? fam.guardians!.map((g) => ({
            id: g.id,
            name: g.name || '',
            relationship: g.relationship || '',
            birth_date: (g.birth_date || '').slice(0, 10),
            phone: g.phone || '',
            email: g.email || '',
            is_emergency_contact: !!g.is_emergency_contact,
            photo_url: g.photo_url || '',
          }))
        : [
            {
              id: undefined,
              name: '',
              relationship: 'Mãe',
              birth_date: '',
              phone: '',
              email: '',
              is_emergency_contact: true,
              photo_url: '',
            },
          ],
    )
    setWizardChildren(
      (fam.children || []).length > 0
        ? fam.children!.map((c) => {
            const rawBirth = (c.birth_date || '').slice(0, 10)
            const autoClass = rawBirth ? classifyChild(rawBirth) : undefined
            return {
              id: c.id,
              name: c.name || '',
              birth_date: rawBirth,
              classroom: (autoClass || c.classroom || 'A') as ClassroomId,
              allergies: c.allergies || '',
              medical_notes: c.medical_notes || '',
              image_authorized: c.image_authorized !== false,
              photo_url: c.photo_url || '',
            }
          })
        : [
            {
              id: undefined,
              name: '',
              birth_date: '',
              classroom: 'A',
              allergies: '',
              medical_notes: '',
              image_authorized: true,
              photo_url: '',
            },
          ],
    )
    setWizardOpen(true)
  }

  // Filtragem de famílias
  const filteredFamilies = families.filter((f) => {
    const searchLower = search.toLowerCase()
    const matchName = f.reference_name.toLowerCase().includes(searchLower)
    const matchPhone = (f.primary_phone || '').includes(search)
    const matchChild = (f.children || []).some((c) => c.name.toLowerCase().includes(searchLower))

    const matchesSearch = matchName || matchPhone || matchChild

    if (classroomFilter === 'all') return matchesSearch
    const hasClassroom = (f.children || []).some((c) => c.classroom === classroomFilter)
    return matchesSearch && hasClassroom
  })

  return (
    <div className="space-y-6">
      {/* Cabeçalho da página */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Famílias e Alunos
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Cadastro de famílias, responsáveis, crianças e classificação automática nas salas A a D.
          </p>
        </div>

        <Button onClick={handleOpenWizard} className="bg-indigo-600 hover:bg-indigo-700 text-white">
          <UserPlus className="h-4 w-4 mr-2" />
          Cadastrar Família (4 Etapas)
        </Button>
      </div>

      {/* Barra de Busca e Filtros */}
      <Card>
        <CardContent className="p-4 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome da família, responsável ou aluno..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          <div className="w-full sm:w-48">
            <Select value={classroomFilter} onValueChange={setClassroomFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filtrar por sala" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as Salas</SelectItem>
                {classrooms.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name} ({c.minAge} a {c.maxAge} anos)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Lista de Famílias */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredFamilies.map((fam) => (
          <Card
            key={fam.id}
            className="hover:border-indigo-300 transition-all cursor-pointer shadow-xs"
            onClick={() => setSelectedFamily(fam)}
          >
            <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-base font-bold text-slate-900 dark:text-slate-100">
                    {fam.reference_name}
                  </CardTitle>
                  <CardDescription className="text-xs mt-1 flex items-center gap-1.5">
                    <Phone className="h-3 w-3 text-indigo-500" />
                    {fam.primary_phone || 'Sem telefone registrado'}
                  </CardDescription>
                </div>
                <Badge variant="outline" className="text-xs bg-slate-100 dark:bg-slate-800">
                  {fam.children?.length || 0} criança(s)
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="pt-3 space-y-3">
              {/* Responsáveis */}
              <div>
                <p className="text-[11px] font-semibold text-muted-foreground uppercase mb-1">
                  Responsáveis
                </p>
                <div className="space-y-1">
                  {(fam.guardians || []).map((g) => (
                    <div
                      key={g.id}
                      className="text-xs flex items-center justify-between text-slate-700 dark:text-slate-300"
                    >
                      <span className="font-medium truncate">
                        {g.name} ({g.relationship})
                      </span>
                      {g.is_emergency_contact && (
                        <span className="text-[10px] text-rose-600 bg-rose-50 dark:bg-rose-950/40 px-1.5 py-0.2 rounded font-semibold">
                          Emergência
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Crianças */}
              <div>
                <p className="text-[11px] font-semibold text-muted-foreground uppercase mb-1">
                  Crianças Matriculadas
                </p>
                <div className="space-y-1.5">
                  {(fam.children || []).map((c) => {
                    const badge = getClassroomBadge(c.classroom, classrooms)
                    const age = calculateAge(c.birth_date)
                    return (
                      <div
                        key={c.id}
                        className="flex items-center justify-between p-1.5 rounded-md bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-xs"
                      >
                        <div className="flex items-center space-x-2">
                          <button
                            type="button"
                            onClick={(e) => {
                              if (c.photo_url) {
                                e.stopPropagation()
                                setLightboxImage({
                                  src: c.photo_url,
                                  title: c.name,
                                  description: `Sala ${c.classroom} • ${age} anos`,
                                })
                              }
                            }}
                            className={`h-6 w-6 rounded-full overflow-hidden bg-slate-200 shrink-0 transition-transform ${
                              c.photo_url
                                ? 'cursor-pointer hover:scale-110 hover:ring-2 hover:ring-indigo-500'
                                : ''
                            }`}
                            title={
                              c.photo_url ? `Clique para ampliar foto de ${c.name}` : undefined
                            }
                          >
                            {c.photo_url ? (
                              <img
                                src={c.photo_url}
                                alt={c.name}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <span className="text-[10px] flex items-center justify-center h-full text-slate-600 font-bold">
                                {c.name.charAt(0)}
                              </span>
                            )}
                          </button>
                          <span className="font-medium truncate max-w-[130px]">{c.name}</span>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <span className="text-[11px] text-muted-foreground">{age} anos</span>
                          <Badge
                            variant="outline"
                            className={`text-[10px] px-1.5 py-0 ${badge.color}`}
                          >
                            {c.classroom}
                          </Badge>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {filteredFamilies.length === 0 && !loading && (
          <div className="col-span-full py-12 text-center text-muted-foreground">
            <Users className="h-10 w-10 mx-auto text-slate-400 mb-2" />
            <p className="font-medium text-sm">
              Nenhuma família encontrada para os critérios informados.
            </p>
          </div>
        )}
      </div>

      {/* Modal: Detalhes da Família Selecionada */}
      <Dialog open={!!selectedFamily} onOpenChange={(open) => !open && setSelectedFamily(null)}>
        <DialogContent
          className="max-w-2xl max-h-[90vh] overflow-y-auto"
          onInteractOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
        >
          {selectedFamily && (
            <div>
              <DialogHeader className="border-b pb-3">
                <DialogTitle className="text-xl font-bold flex items-center justify-between">
                  <span>{selectedFamily.reference_name}</span>
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  Ficha completa da família cadastrada no sistema
                </DialogDescription>
              </DialogHeader>

              <div className="py-4 space-y-5">
                {/* Contatos da família */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs bg-slate-50 dark:bg-slate-900 p-3 rounded-lg">
                  <div>
                    <span className="text-muted-foreground block">Telefone Principal:</span>
                    <strong className="text-slate-800 dark:text-slate-200">
                      {selectedFamily.primary_phone || 'Não informado'}
                    </strong>
                  </div>
                  <div>
                    <span className="text-muted-foreground block">E-mail:</span>
                    <strong className="text-slate-800 dark:text-slate-200">
                      {selectedFamily.email || 'Não informado'}
                    </strong>
                  </div>
                  <div className="sm:col-span-2">
                    <span className="text-muted-foreground block">Endereço Residencial:</span>
                    <strong className="text-slate-800 dark:text-slate-200">
                      {selectedFamily.address || 'Não informado'}
                    </strong>
                  </div>
                </div>

                {/* Responsáveis */}
                <div>
                  <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-2">
                    Responsáveis
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {(selectedFamily.guardians || []).map((g) => (
                      <div
                        key={g.id}
                        className="p-3 border rounded-lg flex items-center space-x-3 text-xs"
                      >
                        <button
                          type="button"
                          onClick={(e) => {
                            if (g.photo_url) {
                              e.stopPropagation()
                              setLightboxImage({
                                src: g.photo_url,
                                title: g.name,
                                description: `${g.relationship}${g.phone ? ` • ${g.phone}` : ''}`,
                              })
                            }
                          }}
                          className={`h-10 w-10 rounded-full overflow-hidden bg-slate-200 shrink-0 transition-transform ${
                            g.photo_url
                              ? 'cursor-pointer hover:scale-105 hover:ring-2 hover:ring-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500'
                              : ''
                          }`}
                          title={g.photo_url ? `Clique para ampliar foto de ${g.name}` : undefined}
                        >
                          {g.photo_url ? (
                            <img
                              src={g.photo_url}
                              alt={g.name}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="h-full w-full flex items-center justify-center font-bold text-slate-600">
                              {g.name.slice(0, 2).toUpperCase()}
                            </div>
                          )}
                        </button>
                        <div className="flex-1 truncate">
                          <p className="font-bold text-slate-900 dark:text-slate-100 truncate">
                            {g.name}
                          </p>
                          <p className="text-muted-foreground">
                            {g.relationship} • {g.phone || 'Sem tel'}
                            {g.birth_date ? ` • Nasc: ${formatDate(g.birth_date)}` : ''}
                          </p>
                          {g.is_emergency_contact && (
                            <Badge
                              variant="outline"
                              className="text-[10px] bg-rose-50 text-rose-700 border-rose-200 mt-1"
                            >
                              Contato de Emergência
                            </Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Crianças e observações médicas */}
                <div>
                  <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-2">
                    Crianças Matriculadas
                  </h4>
                  <div className="space-y-3">
                    {(selectedFamily.children || []).map((c) => {
                      const badge = getClassroomBadge(c.classroom, classrooms)
                      const age = calculateAge(c.birth_date)
                      return (
                        <div
                          key={c.id}
                          className="p-3.5 border rounded-xl bg-white dark:bg-slate-900 space-y-2 text-xs"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2.5">
                              <button
                                type="button"
                                onClick={(e) => {
                                  if (c.photo_url) {
                                    e.stopPropagation()
                                    setLightboxImage({
                                      src: c.photo_url,
                                      title: c.name,
                                      description: `${badge.name} • ${age} anos • Nasc: ${formatDate(c.birth_date)}`,
                                    })
                                  }
                                }}
                                className={`h-9 w-9 rounded-full overflow-hidden bg-slate-200 shrink-0 transition-transform ${
                                  c.photo_url
                                    ? 'cursor-pointer hover:scale-105 hover:ring-2 hover:ring-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500'
                                    : ''
                                }`}
                                title={
                                  c.photo_url ? `Clique para ampliar foto de ${c.name}` : undefined
                                }
                              >
                                {c.photo_url ? (
                                  <img
                                    src={c.photo_url}
                                    alt={c.name}
                                    className="h-full w-full object-cover"
                                  />
                                ) : (
                                  <span className="text-xs flex items-center justify-center h-full text-slate-600 font-bold">
                                    {c.name.charAt(0)}
                                  </span>
                                )}
                              </button>
                              <div>
                                <p className="font-bold text-sm text-slate-900 dark:text-slate-100">
                                  {c.name}
                                </p>
                                <p className="text-muted-foreground text-[11px]">
                                  Nasc: {formatDate(c.birth_date)} ({age} anos em 01/03/
                                  {academicLoading ? '...' : schoolYear.year})
                                </p>
                              </div>
                            </div>

                            <Badge variant="outline" className={`font-semibold ${badge.color}`}>
                              {badge.name}
                            </Badge>
                          </div>

                          <div className="grid grid-cols-2 gap-2 pt-2 border-t text-[11px]">
                            <div>
                              <span className="text-muted-foreground">Alergias:</span>
                              <p className="font-medium text-rose-600">
                                {c.allergies || 'Nenhuma alergia relatada'}
                              </p>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Uso de Imagem:</span>
                              <p className="font-medium">
                                {c.image_authorized ? 'Autorizado' : 'Não autorizado'}
                              </p>
                            </div>
                            {c.medical_notes && (
                              <div className="col-span-2">
                                <span className="text-muted-foreground">Observações Médicas:</span>
                                <p className="font-medium text-slate-700 dark:text-slate-300">
                                  {c.medical_notes}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>

              <DialogFooter>
                <Button
                  variant="outline"
                  className="border-indigo-300 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/40"
                  onClick={() => handleOpenEditWizard(selectedFamily)}
                >
                  <Pencil className="h-4 w-4 mr-2" />
                  Editar Informações
                </Button>
                <Button variant="outline" onClick={() => setSelectedFamily(null)}>
                  Fechar Ficha
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* WIZARD DE CADASTRO EM 4 ETAPAS */}
      <Dialog open={wizardOpen} onOpenChange={setWizardOpen}>
        <DialogContent
          className="max-w-2xl max-h-[92vh] overflow-y-auto"
          onInteractOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
        >
          <DialogHeader className="border-b pb-3">
            <div className="flex items-center justify-between">
              <DialogTitle className="text-lg font-bold">
                {editingFamily ? 'Editar Ficha da Família' : 'Cadastro de Família'}
              </DialogTitle>
              <Badge
                variant="outline"
                className="text-xs bg-indigo-50 text-indigo-700 border-indigo-200"
              >
                Etapa {currentStep} de 4
              </Badge>
            </div>
            <DialogDescription className="text-xs">
              {editingFamily && 'Editando ficha existente — altere os campos e salve.'}
              {currentStep === 1 && 'Etapa 1: Dados de referência e contato da família'}
              {currentStep === 2 && 'Etapa 2: Responsáveis legais e contatos de emergência'}
              {currentStep === 3 && 'Etapa 3: Crianças, data de nascimento e classificação de sala'}
              {currentStep === 4 && 'Etapa 4: Revisão geral e confirmação do cadastro'}
            </DialogDescription>
          </DialogHeader>

          {/* Indicador de passos */}
          <div className="flex items-center justify-between px-2 pt-2 pb-1 border-b text-xs font-medium">
            <span
              className={currentStep === 1 ? 'text-indigo-600 font-bold' : 'text-muted-foreground'}
            >
              1. Família
            </span>
            <span className="text-slate-300">›</span>
            <span
              className={currentStep === 2 ? 'text-indigo-600 font-bold' : 'text-muted-foreground'}
            >
              2. Responsáveis
            </span>
            <span className="text-slate-300">›</span>
            <span
              className={currentStep === 3 ? 'text-indigo-600 font-bold' : 'text-muted-foreground'}
            >
              3. Crianças
            </span>
            <span className="text-slate-300">›</span>
            <span
              className={currentStep === 4 ? 'text-indigo-600 font-bold' : 'text-muted-foreground'}
            >
              4. Revisão
            </span>
          </div>

          <div className="py-4">
            {/* ETAPA 1: FAMÍLIA */}
            {currentStep === 1 && (
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="ref_name">Nome de Referência da Família *</Label>
                  <Input
                    id="ref_name"
                    placeholder="Ex: Família Silva Santos"
                    value={wizardFamily.reference_name}
                    onChange={(e) =>
                      setWizardFamily({ ...wizardFamily, reference_name: e.target.value })
                    }
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Como a família será identificada nas listas e relatórios.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="fam_phone">Telefone Principal / WhatsApp</Label>
                    <Input
                      id="fam_phone"
                      placeholder="(11) 98765-4321"
                      value={wizardFamily.primary_phone}
                      onChange={(e) =>
                        setWizardFamily({ ...wizardFamily, primary_phone: e.target.value })
                      }
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="fam_email">E-mail da Família</Label>
                    <Input
                      id="fam_email"
                      type="email"
                      placeholder="familia@email.com"
                      value={wizardFamily.email}
                      onChange={(e) => setWizardFamily({ ...wizardFamily, email: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="fam_address">Endereço Completo</Label>
                  <Input
                    id="fam_address"
                    placeholder="Rua, número, complemento, bairro e cidade"
                    value={wizardFamily.address}
                    onChange={(e) => setWizardFamily({ ...wizardFamily, address: e.target.value })}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="fam_notes">Observações Gerais</Label>
                  <Input
                    id="fam_notes"
                    placeholder="Notas adicionais sobre a família..."
                    value={wizardFamily.notes}
                    onChange={(e) => setWizardFamily({ ...wizardFamily, notes: e.target.value })}
                  />
                </div>
              </div>
            )}

            {/* ETAPA 2: RESPONSÁVEIS */}
            {currentStep === 2 && (
              <div className="space-y-4">
                {wizardGuardians.map((guardian, index) => (
                  <div
                    key={index}
                    className="p-3 border rounded-lg space-y-3 bg-slate-50/50 dark:bg-slate-900/50 relative"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        Responsável #{index + 1}
                      </span>
                      {wizardGuardians.length > 1 && (
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleRemoveGuardian(index)}
                          className="h-6 w-6 text-rose-500 hover:bg-rose-50"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs">Nome Completo *</Label>
                        <Input
                          placeholder="Nome do responsável"
                          value={guardian.name}
                          onChange={(e) => {
                            const updated = [...wizardGuardians]
                            updated[index].name = e.target.value
                            setWizardGuardians(updated)
                          }}
                        />
                      </div>

                      <div className="space-y-1">
                        <Label className="text-xs">Grau de Parentesco</Label>
                        <Input
                          placeholder="Mãe, Pai, Avô, Tutora..."
                          value={guardian.relationship}
                          onChange={(e) => {
                            const updated = [...wizardGuardians]
                            updated[index].relationship = e.target.value
                            setWizardGuardians(updated)
                          }}
                        />
                      </div>

                      <div className="space-y-1">
                        <Label className="text-xs">Data de Nascimento</Label>
                        <DatePickerBR
                          value={guardian.birth_date}
                          onChange={(isoDate) => {
                            const updated = [...wizardGuardians]
                            updated[index].birth_date = isoDate
                            setWizardGuardians(updated)
                          }}
                          placeholder="dd/mm/aaaa"
                        />
                      </div>

                      <div className="space-y-1">
                        <Label className="text-xs">Telefone</Label>
                        <Input
                          placeholder="(11) 99999-9999"
                          value={guardian.phone}
                          onChange={(e) => {
                            const updated = [...wizardGuardians]
                            updated[index].phone = e.target.value
                            setWizardGuardians(updated)
                          }}
                        />
                      </div>

                      <div className="space-y-1 sm:col-span-2">
                        <Label className="text-xs">E-mail</Label>
                        <Input
                          type="email"
                          placeholder="email@exemplo.com"
                          value={guardian.email}
                          onChange={(e) => {
                            const updated = [...wizardGuardians]
                            updated[index].email = e.target.value
                            setWizardGuardians(updated)
                          }}
                        />
                      </div>

                      <div className="space-y-1 sm:col-span-2">
                        <ImageCaptureInput
                          label="Foto do Responsável"
                          description="Câmera do celular, colar ou upload"
                          placeholder="Cole uma imagem, envie arquivo ou tire uma foto..."
                          value={guardian.photo_url}
                          previewShape="circle"
                          aspectRatio="square"
                          onChange={(newPhoto) => {
                            const updated = [...wizardGuardians]
                            updated[index].photo_url = newPhoto
                            setWizardGuardians(updated)
                          }}
                        />
                      </div>
                    </div>

                    <div className="flex items-center space-x-2 pt-1">
                      <input
                        type="checkbox"
                        id={`emerg_${index}`}
                        checked={guardian.is_emergency_contact}
                        onChange={(e) => {
                          const updated = [...wizardGuardians]
                          updated[index].is_emergency_contact = e.target.checked
                          setWizardGuardians(updated)
                        }}
                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                      />
                      <Label
                        htmlFor={`emerg_${index}`}
                        className="text-xs cursor-pointer font-medium"
                      >
                        Marcar como contato preferencial para emergências
                      </Label>
                    </div>
                  </div>
                ))}

                <Button
                  type="button"
                  variant="outline"
                  onClick={handleAddGuardian}
                  className="w-full text-xs border-dashed"
                >
                  <Plus className="h-3.5 w-3.5 mr-1" />
                  Adicionar Outro Responsável
                </Button>
              </div>
            )}

            {/* ETAPA 3: CRIANÇAS COM FOTO E CLASSIFICAÇÃO AUTOMÁTICA */}
            {currentStep === 3 && (
              <div className="space-y-4">
                <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 p-2.5 rounded-lg text-xs text-amber-900 dark:text-amber-200">
                  <strong>Classificação Automática:</strong> A sala é calculada imediatamente a
                  partir da idade completa em 1º de março do ano letivo (
                  {academicLoading ? '...' : schoolYear.year}) e das faixas configuradas.
                </div>

                {wizardChildren.map((child, index) => {
                  const calculatedAge = calculateAge(child.birth_date)
                  const badge = getClassroomBadge(child.classroom, classrooms)

                  return (
                    <div
                      key={index}
                      className="p-3.5 border rounded-xl space-y-3 bg-white dark:bg-slate-900 shadow-xs relative"
                    >
                      <div className="flex items-center justify-between border-b pb-2">
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                          Criança #{index + 1}
                        </span>

                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className={`text-xs ${badge.color}`}>
                            {badge.name}
                            {child.birth_date ? ` (${calculatedAge} anos)` : ''}
                          </Badge>
                          {wizardChildren.length > 1 && (
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => handleRemoveChild(index)}
                              className="h-6 w-6 text-rose-500 hover:bg-rose-50"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label className="text-xs">Nome da Criança *</Label>
                          <Input
                            placeholder="Nome completo do aluno"
                            value={child.name}
                            onChange={(e) => {
                              const updated = [...wizardChildren]
                              updated[index].name = e.target.value
                              setWizardChildren(updated)
                            }}
                          />
                        </div>

                        <div className="space-y-1">
                          <div className="flex items-center justify-between">
                            <Label className="text-xs">Data de Nascimento *</Label>
                            {child.birth_date && (
                              <span className="text-[10px] text-indigo-600 font-mono font-medium">
                                {formatDate(child.birth_date)}
                              </span>
                            )}
                          </div>
                          <DatePickerBR
                            value={child.birth_date}
                            onChange={(isoDate) => handleBirthDateChange(index, isoDate)}
                            placeholder="dd/mm/aaaa"
                          />
                        </div>

                        <div className="space-y-1">
                          <Label className="text-xs">Alergias ou Restrições Alimentares</Label>
                          <Input
                            placeholder="Ex: Amendoim, Lactose, Nenhuma..."
                            value={child.allergies}
                            onChange={(e) => {
                              const updated = [...wizardChildren]
                              updated[index].allergies = e.target.value
                              setWizardChildren(updated)
                            }}
                          />
                        </div>

                        <div className="space-y-1">
                          <Label className="text-xs">Observações Médicas / Remédios</Label>
                          <Input
                            placeholder="Ex: Usa bombinha, atenção para..."
                            value={child.medical_notes}
                            onChange={(e) => {
                              const updated = [...wizardChildren]
                              updated[index].medical_notes = e.target.value
                              setWizardChildren(updated)
                            }}
                          />
                        </div>

                        <div className="space-y-1 sm:col-span-2">
                          <ImageCaptureInput
                            label="Foto da Criança"
                            description="Câmera do celular, colar ou upload"
                            placeholder="Cole uma imagem, envie arquivo ou tire uma foto..."
                            value={child.photo_url}
                            previewShape="circle"
                            aspectRatio="square"
                            onChange={(newPhoto) => {
                              const updated = [...wizardChildren]
                              updated[index].photo_url = newPhoto
                              setWizardChildren(updated)
                            }}
                          />
                        </div>
                      </div>

                      <div className="flex items-center space-x-2 pt-1 border-t">
                        <input
                          type="checkbox"
                          id={`img_auth_${index}`}
                          checked={child.image_authorized}
                          onChange={(e) => {
                            const updated = [...wizardChildren]
                            updated[index].image_authorized = e.target.checked
                            setWizardChildren(updated)
                          }}
                          className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                        />
                        <Label
                          htmlFor={`img_auth_${index}`}
                          className="text-xs cursor-pointer font-medium"
                        >
                          Autorização de uso de imagem para mural pedagógico e atividades internas
                        </Label>
                      </div>
                    </div>
                  )
                })}

                <Button
                  type="button"
                  variant="outline"
                  onClick={handleAddChild}
                  className="w-full text-xs border-dashed"
                >
                  <Plus className="h-3.5 w-3.5 mr-1" />
                  Adicionar Outra Criança
                </Button>
              </div>
            )}

            {/* ETAPA 4: REVISÃO E CONFIRMAÇÃO */}
            {currentStep === 4 && (
              <div className="space-y-4 text-xs">
                <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-lg space-y-1">
                  <p className="font-bold text-sm text-slate-900 dark:text-slate-100">
                    {wizardFamily.reference_name || 'Nome não preenchido'}
                  </p>
                  <p className="text-muted-foreground">
                    {wizardFamily.primary_phone || 'Sem telefone'} •{' '}
                    {wizardFamily.email || 'Sem e-mail'}
                  </p>
                  <p className="text-muted-foreground">{wizardFamily.address || 'Sem endereço'}</p>
                </div>

                <div>
                  <p className="font-bold text-slate-800 dark:text-slate-200 mb-1">Responsáveis:</p>
                  <div className="space-y-1">
                    {wizardGuardians.map((g, i) => (
                      <div
                        key={i}
                        className="p-2 border rounded bg-white dark:bg-slate-900 flex justify-between items-center"
                      >
                        <div>
                          <span>
                            {g.name || 'Sem nome'} ({g.relationship})
                          </span>
                          {g.birth_date && (
                            <span className="text-muted-foreground ml-2">
                              • Nasc: {formatDate(g.birth_date)}
                            </span>
                          )}
                        </div>
                        <span className="text-muted-foreground">{g.phone}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="font-bold text-slate-800 dark:text-slate-200 mb-1">
                    Crianças e Salas Definidas:
                  </p>
                  <div className="space-y-1.5">
                    {wizardChildren.map((c, i) => {
                      const badge = getClassroomBadge(c.classroom, classrooms)
                      const age = calculateAge(c.birth_date)
                      return (
                        <div
                          key={i}
                          className="p-2 border rounded bg-white dark:bg-slate-900 flex items-center justify-between"
                        >
                          <div>
                            <span className="font-bold">{c.name || 'Sem nome'}</span>
                            {c.birth_date && (
                              <span className="text-muted-foreground ml-2">
                                • Nasc: {formatDate(c.birth_date)} ({age} anos)
                              </span>
                            )}
                          </div>
                          <Badge variant="outline" className={badge.color}>
                            {badge.name}
                          </Badge>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="flex items-center justify-between gap-2 border-t pt-3">
            {currentStep > 1 ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setCurrentStep(currentStep - 1)}
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Voltar
              </Button>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-2">
              {currentStep < 4 ? (
                <Button
                  type="button"
                  size="sm"
                  onClick={() => setCurrentStep(currentStep + 1)}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white"
                >
                  Avançar
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              ) : (
                <Button
                  type="button"
                  size="sm"
                  onClick={handleSaveWizard}
                  disabled={saving}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  {saving
                    ? 'Gravando...'
                    : editingFamily
                      ? 'Salvar Alterações'
                      : 'Confirmar e Salvar Cadastro'}
                </Button>
              )}
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Lightbox para fotos ampliadas de responsáveis e crianças */}
      {lightboxImage && (
        <ImageLightbox
          src={lightboxImage.src}
          title={lightboxImage.title}
          description={lightboxImage.description}
          onClose={() => setLightboxImage(null)}
        />
      )}
    </div>
  )
}
