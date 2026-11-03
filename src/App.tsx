import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from '@/components/ui/toaster'
import { Toaster as Sonner } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { AuthProvider } from './contexts/AuthContext'
import { AcademicProvider } from './contexts/AcademicContext'

import Layout from './components/Layout'
import RoleRoute from './components/RoleRoute'
import Index from './pages/Index'
import Login from './pages/Login'
import FamiliesPage from './pages/Families'
import CalendarPage from './pages/Calendar'
import AttendancePage from './pages/Attendance'
import AttendanceReportsPage from './pages/AttendanceReports'
import LibraryPage from './pages/Library'
import DimDimPage from './pages/DimDim'
import SettingsPage from './pages/Settings'
import ManualPage from './pages/Manual'
import NotFound from './pages/NotFound'

const App = () => (
  <BrowserRouter>
    <AuthProvider>
      <AcademicProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <Routes>
            <Route path="/login" element={<Login />} />

            <Route element={<Layout />}>
              {/* Painel: todos os papéis autenticados */}
              <Route path="/" element={<Index />} />

              {/* Manual do Sistema: todos os operadores autenticados (conteúdo filtrado pelo papel) */}
              <Route path="/manual" element={<ManualPage />} />

              {/* Famílias & Crianças: Admin, Dirigente, Professor, Auxiliar */}
              <Route
                element={
                  <RoleRoute
                    allowedRoles={['admin', 'dirigente', 'professor', 'auxiliar']}
                    rolesDescription="Admin, Dirigente, Professor, Auxiliar"
                  />
                }
              >
                <Route path="/familias" element={<FamiliesPage />} />
              </Route>

              {/* Calendário & Planos: Admin, Dirigente, Professor, Auxiliar */}
              <Route
                element={
                  <RoleRoute
                    allowedRoles={['admin', 'dirigente', 'professor', 'auxiliar']}
                    rolesDescription="Admin, Dirigente, Professor, Auxiliar"
                  />
                }
              >
                <Route path="/calendario" element={<CalendarPage />} />
              </Route>

              {/* Chamada / Presença: Admin, Dirigente, Professor, Auxiliar */}
              <Route
                element={
                  <RoleRoute
                    allowedRoles={['admin', 'dirigente', 'professor', 'auxiliar']}
                    rolesDescription="Admin, Dirigente, Professor, Auxiliar"
                  />
                }
              >
                <Route path="/presenca" element={<AttendancePage />} />
              </Route>

              {/* Relatórios de Frequência: Admin, Dirigente, Professor */}
              <Route
                element={
                  <RoleRoute
                    allowedRoles={['admin', 'dirigente', 'professor']}
                    rolesDescription="Admin, Dirigente, Professor"
                  />
                }
              >
                <Route path="/relatorios" element={<AttendanceReportsPage />} />
              </Route>

              {/* Biblioteca Infantil: Admin, Dirigente, Bibliotecário, Professor */}
              <Route
                element={
                  <RoleRoute
                    allowedRoles={['admin', 'dirigente', 'bibliotecario', 'professor']}
                    rolesDescription="Admin, Dirigente, Bibliotecário, Professor"
                  />
                }
              >
                <Route path="/biblioteca" element={<LibraryPage />} />
              </Route>

              {/* Moeda DimDim: Admin, Dirigente, Professor, Auxiliar */}
              <Route
                element={
                  <RoleRoute
                    allowedRoles={['admin', 'dirigente', 'professor', 'auxiliar']}
                    rolesDescription="Admin, Dirigente, Professor, Auxiliar"
                  />
                }
              >
                <Route path="/dimdim" element={<DimDimPage />} />
              </Route>

              {/* Configurações e Operadores: Exclusivo Administrador */}
              <Route
                element={<RoleRoute allowedRoles={['admin']} rolesDescription="Administrador" />}
              >
                <Route path="/configuracoes" element={<SettingsPage />} />
              </Route>
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
        </TooltipProvider>
      </AcademicProvider>
    </AuthProvider>
  </BrowserRouter>
)

export default App
