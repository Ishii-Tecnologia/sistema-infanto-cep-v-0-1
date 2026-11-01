import React, { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { MANUAL_MODULES, ManualModule } from '@/data/manualData'
import { UserRole } from '@/types'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import {
  BookOpen,
  Search,
  Shield,
  HelpCircle,
  CheckCircle2,
  Lightbulb,
  ExternalLink,
} from 'lucide-react'
import { Link } from 'react-router-dom'

interface SystemManualProps {
  onNavigateToSection?: (path: string) => void
}

const ROLE_DISPLAY: Record<UserRole, { label: string; desc: string; badgeColor: string }> = {
  admin: {
    label: 'Administrador',
    desc: 'Acesso irrestrito a todos os módulos, operadores e configurações do sistema.',
    badgeColor: 'bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950/40 dark:text-rose-300',
  },
  dirigente: {
    label: 'Dirigente',
    desc: 'Gestão pedagógica completa, turmas, operadores, relatórios e biblioteca.',
    badgeColor:
      'bg-indigo-100 text-indigo-800 border-indigo-300 dark:bg-indigo-950/40 dark:text-indigo-300',
  },
  professor: {
    label: 'Professor(a) / Evangelizador(a)',
    desc: 'Painel, cadastro e consulta de famílias, calendário, chamada no celular, relatórios, biblioteca e DimDim.',
    badgeColor:
      'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300',
  },
  auxiliar: {
    label: 'Auxiliar de Sala',
    desc: 'Painel, consulta de famílias, chamada de presença no celular, calendário e DimDim.',
    badgeColor:
      'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300',
  },
  bibliotecario: {
    label: 'Bibliotecário(a)',
    desc: 'Painel geral, acervo de livros, gestão de exemplares e controle de empréstimos/devoluções.',
    badgeColor: 'bg-sky-100 text-sky-800 border-sky-300 dark:bg-sky-950/40 dark:text-sky-300',
  },
}

// Mapeamento opcional de links para seções do app
const MODULE_ROUTES: Record<string, string> = {
  painel: '/',
  familias: '/familias',
  calendario: '/calendario',
  presenca: '/presenca',
  relatorios: '/relatorios',
  biblioteca: '/biblioteca',
  dimdim: '/dimdim',
  configuracoes: '/configuracoes',
}

export const SystemManual: React.FC<SystemManualProps> = () => {
  const { user } = useAuth()
  const userRole: UserRole = user?.role || 'professor'
  const roleInfo = ROLE_DISPLAY[userRole]

  const [search, setSearch] = useState('')
  const [selectedModuleId, setSelectedModuleId] = useState<string>('all')

  // Filtra os módulos aos quais o papel do operador logado tem acesso
  const allowedModules = MANUAL_MODULES.filter((mod) => mod.roles.includes(userRole))

  // Filtro adicional por busca de texto (título, sumário ou passos)
  const filteredModules = allowedModules.filter((mod) => {
    if (selectedModuleId !== 'all' && mod.id !== selectedModuleId) {
      return false
    }
    if (!search.trim()) return true
    const term = search.toLowerCase()
    const matchHeader =
      mod.title.toLowerCase().includes(term) ||
      mod.summary.toLowerCase().includes(term) ||
      mod.badge.toLowerCase().includes(term)
    const matchSteps = mod.steps.some(
      (s) =>
        s.title.toLowerCase().includes(term) ||
        s.description.toLowerCase().includes(term) ||
        (s.tips && s.tips.some((t) => t.toLowerCase().includes(term))),
    )
    const matchFaqs =
      mod.faqs &&
      mod.faqs.some(
        (f) => f.question.toLowerCase().includes(term) || f.answer.toLowerCase().includes(term),
      )
    return matchHeader || matchSteps || matchFaqs
  })

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Cabeçalho Institucional do Manual */}
      <div className="bg-gradient-to-r from-sky-800 via-sky-700 to-indigo-800 rounded-2xl p-6 text-white shadow-md relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md text-xs font-semibold tracking-wide border border-white/20">
              <BookOpen className="h-3.5 w-3.5 text-sky-200" />
              <span>Manual do Sistema • CEP-Coligação Espírita Progressista</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Manual do Sistema Operacional
            </h1>
            <p className="text-xs sm:text-sm text-sky-100 max-w-2xl leading-relaxed">
              Guia prático passo a passo de todas as etapas e módulos do Sistema Infanto-CEP,
              personalizado de acordo com o seu perfil de acesso.
            </p>
          </div>

          {/* Cartão do Perfil do Operador */}
          <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-3.5 flex items-center gap-3 shrink-0">
            <div className="h-10 w-10 rounded-lg bg-white/20 flex items-center justify-center shrink-0">
              <Shield className="h-5 w-5 text-sky-200" />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] text-sky-200 uppercase tracking-wider font-semibold block">
                Seu Papel de Acesso
              </span>
              <p className="text-sm font-bold truncate text-white">{roleInfo.label}</p>
              <p className="text-[11px] text-sky-100/90 truncate max-w-[200px]">
                {allowedModules.length} módulos disponíveis
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Caixa de Aviso de Contexto de Papel */}
      <div className="bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-start gap-2.5">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0" />
          <div>
            <strong className="text-slate-800 dark:text-slate-200">
              Visualização filtrada para {roleInfo.label}:
            </strong>
            <p className="text-muted-foreground mt-0.5">{roleInfo.desc}</p>
          </div>
        </div>
        <Badge variant="outline" className={`shrink-0 ${roleInfo.badgeColor}`}>
          Apenas módulos autorizados
        </Badge>
      </div>

      {/* Barra de Busca e Filtro Rápido */}
      <Card>
        <CardContent className="p-4 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Pesquisar instrução, dúvida, etapa ou termo no manual..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 text-xs sm:text-sm"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            <button
              type="button"
              onClick={() => setSelectedModuleId('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                selectedModuleId === 'all'
                  ? 'bg-sky-600 text-white font-semibold shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              Todos ({allowedModules.length})
            </button>
            {allowedModules.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setSelectedModuleId(m.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                  selectedModuleId === m.id
                    ? 'bg-sky-600 text-white font-semibold shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                {m.shortTitle}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Lista de Módulos do Manual */}
      <div className="space-y-6">
        {filteredModules.map((mod) => {
          const Icon = mod.icon
          const route = MODULE_ROUTES[mod.id]

          return (
            <Card
              key={mod.id}
              id={`manual-${mod.id}`}
              className="overflow-hidden border border-slate-200 dark:border-slate-800 shadow-xs"
            >
              <CardHeader className={`${mod.colorClass.bg} border-b ${mod.colorClass.border} pb-4`}>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="flex items-start sm:items-center gap-3">
                    <div
                      className={`h-10 w-10 rounded-xl ${mod.colorClass.accent} text-white flex items-center justify-center shadow-xs shrink-0`}
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <CardTitle className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100">
                          {mod.title}
                        </CardTitle>
                        <Badge
                          variant="outline"
                          className={`text-[10px] font-semibold ${mod.colorClass.text} ${mod.colorClass.border} bg-white dark:bg-slate-900`}
                        >
                          {mod.badge}
                        </Badge>
                      </div>
                      <CardDescription className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1">
                        {mod.summary}
                      </CardDescription>
                    </div>
                  </div>

                  {route && (
                    <Link
                      to={route}
                      className="inline-flex items-center gap-1.5 text-xs font-medium text-sky-700 dark:text-sky-300 hover:underline shrink-0 bg-white/70 dark:bg-slate-900/70 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 self-start sm:self-auto"
                    >
                      <span>Acessar tela</span>
                      <ExternalLink className="h-3.5 w-3.5" />
                    </Link>
                  )}
                </div>
              </CardHeader>

              <CardContent className="p-4 sm:p-6 space-y-4">
                {/* Passo a passo das etapas do módulo */}
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3 flex items-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5 text-slate-500" />
                    <span>Passo a Passo e Como Operar</span>
                  </h4>

                  <div className="grid grid-cols-1 gap-3">
                    {mod.steps.map((step, idx) => (
                      <div
                        key={idx}
                        className="p-3.5 rounded-xl border border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/50 space-y-1.5 text-xs"
                      >
                        <div className="flex items-start gap-2.5">
                          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-sky-100 dark:bg-sky-950 text-sky-800 dark:text-sky-300 font-bold text-[11px] mt-0.5">
                            {idx + 1}
                          </span>
                          <div className="flex-1 space-y-1">
                            <p className="font-bold text-slate-900 dark:text-slate-100 text-xs sm:text-sm">
                              {step.title}
                            </p>
                            <p className="text-slate-700 dark:text-slate-300 leading-relaxed text-xs">
                              {step.description}
                            </p>

                            {step.tips && step.tips.length > 0 && (
                              <div className="mt-2 space-y-1 pt-1.5 border-t border-slate-200/60 dark:border-slate-800">
                                {step.tips.map((tip, tIdx) => (
                                  <div
                                    key={tIdx}
                                    className="flex items-start gap-1.5 text-[11px] text-amber-800 dark:text-amber-300 bg-amber-50/70 dark:bg-amber-950/30 p-2 rounded-md border border-amber-200/60 dark:border-amber-900/40"
                                  >
                                    <Lightbulb className="h-3.5 w-3.5 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
                                    <span>{tip}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Perguntas e Respostas / Dúvidas frequentes do módulo */}
                {mod.faqs && mod.faqs.length > 0 && (
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2 flex items-center gap-1.5">
                      <HelpCircle className="h-3.5 w-3.5 text-slate-500" />
                      <span>Dúvidas Frequentes da Etapa</span>
                    </h4>

                    <Accordion type="single" collapsible className="w-full">
                      {mod.faqs.map((faq, fIdx) => (
                        <AccordionItem
                          key={fIdx}
                          value={`faq-${mod.id}-${fIdx}`}
                          className="border-slate-200 dark:border-slate-800"
                        >
                          <AccordionTrigger className="text-xs font-semibold text-slate-800 dark:text-slate-200 hover:no-underline py-2.5">
                            {faq.question}
                          </AccordionTrigger>
                          <AccordionContent className="text-xs text-muted-foreground leading-relaxed">
                            {faq.answer}
                          </AccordionContent>
                        </AccordionItem>
                      ))}
                    </Accordion>
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })}

        {filteredModules.length === 0 && (
          <div className="py-12 text-center text-muted-foreground bg-slate-50 dark:bg-slate-900 rounded-xl border border-dashed">
            <BookOpen className="h-10 w-10 mx-auto text-slate-400 mb-2" />
            <p className="font-semibold text-sm">Nenhuma instrução encontrada.</p>
            <p className="text-xs text-muted-foreground mt-1">
              Tente pesquisar com outros termos ou selecione outro módulo.
            </p>
          </div>
        )}
      </div>

      {/* Rodapé Institucional com Suporte Fraterno */}
      <div className="text-center text-xs text-muted-foreground pt-4 border-t border-slate-200 dark:border-slate-800 space-y-1">
        <p className="font-semibold text-slate-700 dark:text-slate-300">
          CEP-Coligação Espírita Progressista • Educação Espírita Infantil & Juventude
        </p>
        <p className="text-[11px]">
          Sistema Infanto-CEP — Desenvolvido com carinho para o acolhimento fraterno e pedagógico de
          famílias, professores e crianças.
        </p>
      </div>
    </div>
  )
}

export default SystemManual
