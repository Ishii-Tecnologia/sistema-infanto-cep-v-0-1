import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Heart, CheckCircle2 } from 'lucide-react'
import { settingsService } from '@/services/settings'
import { useAcademic } from '@/contexts/AcademicContext'

export default function Login() {
  const navigate = useNavigate()
  const { login } = useAuth()
  const { schoolYear, loading: academicLoading } = useAcademic()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [resetSent, setResetSent] = useState(false)
  const [isResetting, setIsResetting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      await login(email, password)
      navigate('/')
    } catch (err: any) {
      setError(err?.message || 'E-mail ou senha incorretos. Verifique suas credenciais.')
    } finally {
      setIsLoading(false)
    }
  }

  const handlePasswordReset = async () => {
    if (!email) {
      setError('Por favor, digite seu e-mail para solicitar a recuperação de senha.')
      return
    }
    setIsResetting(true)
    setError(null)
    try {
      await settingsService.requestPasswordReset(email)
      setResetSent(true)
    } catch (err: any) {
      setError('Não foi possível enviar o e-mail de redefinição. Verifique se o endereço é válido.')
    } finally {
      setIsResetting(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-slate-50 dark:bg-slate-950">
      {/* Banner lateral institucional */}
      <div className="md:w-5/12 bg-gradient-to-br from-indigo-900 via-indigo-800 to-sky-900 text-white p-8 md:p-12 flex flex-col justify-between">
        <div>
          <div className="flex items-center space-x-3 mb-6">
            <div className="h-11 w-11 rounded-lg bg-sky-800/80 p-1.5 flex items-center justify-center shadow-inner border border-sky-600/50 shrink-0">
              <img
                src="/favicon.ico"
                alt="Ícone CEP-Coligação Espírita Progressista"
                className="h-full w-full object-contain"
              />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Educação Espírita Infantil</h1>
              <p className="text-xs text-sky-200 font-medium">
                CEP-Coligação Espírita Progressista
              </p>
            </div>
          </div>

          <div className="mt-8 space-y-4">
            <p className="text-lg font-medium text-sky-100">
              "Evangelizar a criança é semear a luz do Cristo no coração do futuro."
            </p>
            <p className="text-sm text-sky-200/80 leading-relaxed">
              Sistema integral de gestão: salas A a D, chamada pedagógica no celular, calendário de
              sábados letivos, biblioteca espírita e moeda educativa DimDim.
            </p>
          </div>
        </div>

        <div className="mt-12 pt-6 border-t border-white/10 text-xs text-sky-200/60 flex items-center justify-between">
          <span>{academicLoading ? 'Ano Letivo' : `Ano Letivo ${schoolYear.year}`}</span>
          <span className="flex items-center gap-1">
            <Heart className="h-3 w-3 text-rose-400" /> Amor & Educação
          </span>
        </div>
      </div>

      {/* Formulário de Login */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-12">
        <Card className="w-full max-w-md shadow-lg border-slate-200/80 dark:border-slate-800">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold tracking-tight">Acesso ao Sistema</CardTitle>
            <CardDescription>
              Entre com seu e-mail e senha cadastrados para acessar suas funções.
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {resetSent && (
                <Alert className="bg-emerald-50 text-emerald-900 border-emerald-200">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  <AlertDescription>
                    Instruções para recuperação de senha foram enviadas para seu e-mail.
                  </AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="email">E-mail</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="seu.email@cep.org.br"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Senha</Label>
                  <button
                    type="button"
                    onClick={handlePasswordReset}
                    disabled={isResetting}
                    className="text-xs text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 hover:underline"
                  >
                    Esqueceu a senha?
                  </button>
                </div>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </CardContent>

            <CardFooter className="flex flex-col space-y-2">
              <Button
                type="submit"
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white"
                disabled={isLoading}
              >
                {isLoading ? 'Autenticando...' : 'Entrar no Sistema'}
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  )
}
