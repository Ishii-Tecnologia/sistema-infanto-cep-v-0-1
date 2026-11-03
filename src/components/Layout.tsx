import React, { useState } from 'react'
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { ChangePasswordDialog } from '@/components/ChangePasswordDialog'
import {
  LayoutDashboard,
  Users,
  Calendar,
  ClipboardCheck,
  BarChart3,
  BookMarked,
  Coins,
  Settings,
  LogOut,
  Menu,
  ChevronDown,
  UserCheck,
  KeyRound,
  HelpCircle,
  BookOpen,
} from 'lucide-react'
import { UserRole } from '@/types'

export default function Layout() {
  const { user, logout, hasRole } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [ownPasswordModalOpen, setOwnPasswordModalOpen] = useState(false)

  // Se não estiver logado e não estiver no login, redireciona
  React.useEffect(() => {
    if (!user && location.pathname !== '/login') {
      navigate('/login')
    }
  }, [user, location.pathname, navigate])

  if (!user && location.pathname === '/login') {
    return <Outlet />
  }

  const navItems = [
    {
      title: 'Painel',
      shortTitle: 'Painel',
      path: '/',
      icon: LayoutDashboard,
      roles: ['admin', 'dirigente', 'professor', 'auxiliar', 'bibliotecario'] as UserRole[],
    },
    {
      title: 'Famílias & Crianças',
      shortTitle: 'Famílias',
      path: '/familias',
      icon: Users,
      roles: ['admin', 'dirigente', 'professor', 'auxiliar'] as UserRole[],
    },
    {
      title: 'Calendário & Planos',
      shortTitle: 'Calendário',
      path: '/calendario',
      icon: Calendar,
      roles: ['admin', 'dirigente', 'professor', 'auxiliar'] as UserRole[],
    },
    {
      title: 'Chamada / Presença',
      shortTitle: 'Presença',
      path: '/presenca',
      icon: ClipboardCheck,
      roles: ['admin', 'dirigente', 'professor', 'auxiliar'] as UserRole[],
    },
    {
      title: 'Relatórios',
      shortTitle: 'Relatórios',
      path: '/relatorios',
      icon: BarChart3,
      roles: ['admin', 'dirigente', 'professor'] as UserRole[],
    },
    {
      title: 'Biblioteca',
      shortTitle: 'Biblioteca',
      path: '/biblioteca',
      icon: BookMarked,
      roles: ['admin', 'dirigente', 'bibliotecario', 'professor'] as UserRole[],
    },
    {
      title: 'Moeda DimDim',
      shortTitle: 'DimDim',
      path: '/dimdim',
      icon: Coins,
      roles: ['admin', 'dirigente', 'professor', 'auxiliar'] as UserRole[],
    },
    {
      title: 'Operadores e Configurações',
      shortTitle: 'Operadores e Config.',
      path: '/configuracoes',
      icon: Settings,
      roles: ['admin'] as UserRole[],
    },
    {
      title: 'Manual do Sistema',
      shortTitle: 'Manual',
      path: '/manual',
      icon: HelpCircle,
      roles: ['admin', 'dirigente', 'professor', 'auxiliar', 'bibliotecario'] as UserRole[],
    },
  ]

  const filteredNavItems = navItems.filter((item) => hasRole(item.roles))

  const roleLabels: Record<UserRole, { label: string; color: string }> = {
    admin: { label: 'Administrador', color: 'bg-rose-100 text-rose-800 border-rose-200' },
    dirigente: { label: 'Dirigente', color: 'bg-indigo-100 text-indigo-800 border-indigo-200' },
    professor: {
      label: 'Professor(a)',
      color: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    },
    auxiliar: { label: 'Auxiliar', color: 'bg-amber-100 text-amber-800 border-amber-200' },
    bibliotecario: { label: 'Bibliotecário(a)', color: 'bg-sky-100 text-sky-800 border-sky-200' },
  }

  const currentRoleInfo = user ? roleLabels[user.role] : { label: 'Usuário', color: '' }

  const MobileDrawerContent = () => (
    <div className="flex flex-col h-full bg-sky-900 text-sky-50">
      {/* Topo / Logotipo no menu móvel */}
      <div className="p-4 border-b border-sky-800/60 flex items-center space-x-3 bg-sky-800/50">
        <div className="h-9 w-9 rounded-lg bg-sky-700/80 p-1.5 flex items-center justify-center shadow-inner border border-sky-500/40 shrink-0">
          <img
            src="/favicon.ico"
            alt="Ícone CEP-Coligação Espírita Progressista"
            className="h-full w-full object-contain"
          />
        </div>
        <div className="min-w-0">
          <h2 className="font-bold text-sm leading-tight text-white truncate">
            CEP-Coligação Espírita Progressista
          </h2>
          <p className="text-[11px] text-sky-200/90 leading-tight">
            Educação Espírita Infantil & Juventude
          </p>
        </div>
      </div>

      {/* Navegação principal */}
      <div className="flex-1 py-3 px-3 space-y-1 overflow-y-auto">
        {filteredNavItems.map((item) => {
          const Icon = item.icon
          return (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) =>
                `flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-sky-600 text-white shadow-sm font-semibold'
                    : 'text-sky-100 hover:bg-sky-800/60 hover:text-white'
                }`
              }
            >
              <Icon className="h-4 w-4 shrink-0 text-sky-200" />
              <span>{item.title}</span>
            </NavLink>
          )
        })}
      </div>

      {/* Rodapé do usuário e troca de papel */}
      <div className="p-4 border-t border-sky-800/60 bg-sky-950/80">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2.5 overflow-hidden">
            <div className="h-8 w-8 rounded-full bg-sky-700 border border-sky-500/40 flex items-center justify-center text-white text-xs font-bold uppercase shrink-0">
              {user?.name?.slice(0, 2) || 'US'}
            </div>
            <div className="truncate">
              <p className="text-xs font-medium text-white truncate">{user?.name}</p>
              <Badge
                variant="outline"
                className={`text-[10px] px-1.5 py-0 h-4 border ${currentRoleInfo.color}`}
              >
                {currentRoleInfo.label}
              </Badge>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-1.5 pt-1">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="flex-1 justify-between text-xs h-8 text-sky-100 hover:text-white hover:bg-sky-800/60 px-2 border border-sky-700/50"
              >
                <span className="flex items-center gap-1.5 truncate">
                  <UserCheck className="h-3.5 w-3.5 text-sky-300 shrink-0" />
                  Minha Conta
                </span>
                <ChevronDown className="h-3 w-3 opacity-70 shrink-0" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuLabel className="text-xs">Minha Conta</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => {
                  setMobileOpen(false)
                  navigate('/manual')
                }}
                className="text-xs"
              >
                <BookOpen className="h-3.5 w-3.5 mr-2 text-sky-600" />
                Manual do Sistema
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  setMobileOpen(false)
                  setOwnPasswordModalOpen(true)
                }}
                className="text-xs"
              >
                <KeyRound className="h-3.5 w-3.5 mr-2" />
                Alterar minha senha
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            variant="ghost"
            size="icon"
            onClick={logout}
            className="h-8 w-8 text-sky-200 hover:text-rose-300 hover:bg-sky-800/60 shrink-0"
            title="Sair"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950">
      {/* Barra de Navegação Superior (Menu Superior Horizontal em tom de azul mais claro / sky-700) */}
      <header className="sticky top-0 z-40 bg-sky-700 text-white shadow-md border-b border-sky-800">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6">
          <div className="flex items-center justify-between min-h-[3.75rem] py-2 gap-2 sm:gap-3">
            {/* Lado Esquerdo: Identidade Institucional CEP com ícone do app */}
            <NavLink
              to="/"
              className="flex items-center space-x-2.5 shrink-0 hover:opacity-95 transition-opacity"
              title="Página Inicial - CEP-Coligação Espírita Progressista"
            >
              <div className="h-9 w-9 rounded-lg bg-sky-800/80 p-1.5 flex items-center justify-center shadow-inner border border-sky-600/50 shrink-0">
                <img
                  src="/favicon.ico"
                  alt="Ícone CEP-Coligação Espírita Progressista"
                  className="h-full w-full object-contain"
                />
              </div>
              <div className="min-w-0">
                <h1 className="font-bold text-xs sm:text-sm leading-tight text-white tracking-tight">
                  CEP-Coligação Espírita Progressista
                </h1>
                <p className="text-[10px] sm:text-[11px] text-sky-200/90 leading-tight hidden xs:block">
                  Educação Espírita Infantil & Juventude
                </p>
              </div>
            </NavLink>

            {/* Centro / Itens de Navegação no Desktop (sem rolagem horizontal, sempre visíveis) */}
            <nav
              aria-label="Menu principal"
              className="hidden lg:flex items-center flex-wrap justify-center gap-0.5 xl:gap-1.5 py-1"
            >
              {filteredNavItems.map((item) => {
                const Icon = item.icon
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    title={item.title}
                    className={({ isActive }) =>
                      `flex items-center space-x-1 xl:space-x-1.5 px-2 xl:px-2.5 2xl:px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
                        isActive
                          ? 'bg-sky-800 text-white shadow-sm font-semibold ring-1 ring-sky-400/50'
                          : 'text-sky-100 hover:bg-sky-600/70 hover:text-white'
                      }`
                    }
                  >
                    <Icon className="h-3.5 w-3.5 shrink-0 text-sky-200" />
                    {/* Em telas menores de 1280px (lg), exibe título conciso para caber com folga; em 2xl+, exibe completo */}
                    <span className="hidden 2xl:inline">{item.title}</span>
                    <span className="inline 2xl:hidden">{item.shortTitle}</span>
                  </NavLink>
                )
              })}
            </nav>

            {/* Lado Direito: Usuário, Papel, Minha Conta e Sair (Desktop & Mobile) */}
            <div className="flex items-center space-x-1.5 sm:space-x-2 shrink-0">
              {/* Usuário e Perfil em telas médias/grandes */}
              <div className="hidden md:flex items-center space-x-2 pr-1 border-r border-sky-800">
                <div className="h-7 w-7 rounded-full bg-sky-800 border border-sky-500/50 flex items-center justify-center text-white text-xs font-bold uppercase shrink-0">
                  {user?.name?.slice(0, 2) || 'US'}
                </div>
                <div className="text-right max-w-[110px] xl:max-w-[130px] truncate">
                  <p className="text-xs font-medium text-white truncate leading-none">
                    {user?.name}
                  </p>
                  <Badge
                    variant="outline"
                    className={`text-[9px] px-1 py-0 h-3.5 mt-0.5 border ${currentRoleInfo.color}`}
                  >
                    {currentRoleInfo.label}
                  </Badge>
                </div>
              </div>

              {/* Menu da Conta (Manual do Sistema, Alterar senha) */}
              <div className="hidden sm:block">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs h-8 text-sky-100 hover:text-white hover:bg-sky-600/70 px-2 gap-1.5 border border-transparent hover:border-sky-500/60"
                      title="Menu da minha conta"
                    >
                      <UserCheck className="h-3.5 w-3.5 text-sky-300" />
                      <span className="hidden 2xl:inline">Conta</span>
                      <ChevronDown className="h-3 w-3 opacity-70" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-52">
                    <DropdownMenuLabel className="text-xs">Minha Conta</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => navigate('/manual')} className="text-xs">
                      <BookOpen className="h-3.5 w-3.5 mr-2 text-sky-600" />
                      Manual do Sistema
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => setOwnPasswordModalOpen(true)}
                      className="text-xs"
                    >
                      <KeyRound className="h-3.5 w-3.5 mr-2" />
                      Alterar minha senha
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {/* Botão Atalho Rápido para Manual */}
              <NavLink
                to="/manual"
                className={({ isActive }) =>
                  `hidden sm:inline-flex items-center justify-center h-8 w-8 rounded-md transition-colors ${
                    isActive
                      ? 'bg-sky-800 text-white ring-1 ring-sky-400/50'
                      : 'text-sky-200 hover:text-white hover:bg-sky-600/70'
                  }`
                }
                title="Manual do Sistema (Guia por Papel)"
              >
                <HelpCircle className="h-4 w-4" />
              </NavLink>

              {/* Botão de Logout */}
              <Button
                variant="ghost"
                size="icon"
                onClick={logout}
                className="hidden sm:inline-flex h-8 w-8 text-sky-200 hover:text-rose-300 hover:bg-sky-600/70"
                title="Sair do sistema"
              >
                <LogOut className="h-4 w-4" />
              </Button>

              {/* Botão Hamburguer para Mobile e Tablets pequenos (abaixo de md) */}
              <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
                <SheetTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="md:hidden text-white hover:bg-sky-600/70 h-9 w-9"
                    aria-label="Abrir menu de navegação"
                  >
                    <Menu className="h-5 w-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent
                  side="top"
                  className="p-0 max-h-[85vh] border-b-sky-800 bg-sky-900 text-sky-50"
                >
                  <MobileDrawerContent />
                </SheetContent>
              </Sheet>
            </div>
          </div>

          {/* Sub-barra de navegação para telas intermediárias (md até lg):
              Flex-wrap para exibir TODAS as opções de uma vez, organizadas sem qualquer barra de rolagem horizontal */}
          <nav
            aria-label="Menu de opções secundário em telas intermediárias"
            className="hidden md:flex lg:hidden flex-wrap items-center justify-center gap-1.5 py-2 border-t border-sky-800/70"
          >
            {filteredNavItems.map((item) => {
              const Icon = item.icon
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive }) =>
                    `flex items-center space-x-1.5 px-2.5 py-1.5 rounded text-xs font-medium transition-colors whitespace-nowrap ${
                      isActive
                        ? 'bg-sky-800 text-white font-semibold shadow-sm ring-1 ring-sky-400/50'
                        : 'text-sky-100 hover:bg-sky-600/70 hover:text-white'
                    }`
                  }
                >
                  <Icon className="h-3.5 w-3.5 shrink-0 text-sky-200" />
                  <span>{item.title}</span>
                </NavLink>
              )
            })}
          </nav>
        </div>
      </header>

      {/* Conteúdo Principal ocupando toda a largura abaixo do menu superior */}
      <main className="flex-1 w-full max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
        <Outlet />
      </main>

      {/* Modal global: alterar a própria senha (disponível em qualquer tela pelo menu superior) */}
      <ChangePasswordDialog open={ownPasswordModalOpen} onOpenChange={setOwnPasswordModalOpen} />
    </div>
  )
}
