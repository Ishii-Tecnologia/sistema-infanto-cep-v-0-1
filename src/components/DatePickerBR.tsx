import React, { useState, useEffect, useRef } from 'react'
import { Calendar as CalendarIcon, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import { useVoiceInput } from '@/hooks/useVoiceInput'
import { VoiceMicButton } from '@/components/VoiceMicButton'
import { parseSpokenDate } from '@/lib/spokenDate'

/**
 * Fallback numérico para datas ditas que o parseSpokenDate não reconheceu
 * completamente. Extrai os três primeiros números "soltos" do texto (um número
 * por extenso, ex. "noventa", conta como UMA informação; dígitos individuais
 * transcritos separados, ex. "1 5 0 6 1 9 8 5", também se agrupam como um
 * único número) e monta dd/mm/aaaa, ignorando o resto da fala. Assim o campo
 * nunca exibe texto dito — sempre data numérica (padrão dd/mm/aaaa pedido).
 */
function extractNumericDate(spoken: string): string | null {
  const normalize = (s: string) =>
    s
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')

  const WORD_NUMBERS: Record<string, number> = {
    zero: 0,
    um: 1,
    uma: 1,
    dois: 2,
    duas: 2,
    tres: 3,
    quatro: 4,
    cinco: 5,
    seis: 6,
    sete: 7,
    oito: 8,
    nove: 9,
    dez: 10,
    onze: 11,
    doze: 12,
    treze: 13,
    catorze: 14,
    quatorze: 14,
    quinze: 15,
    dezesseis: 16,
    dezessete: 17,
    dezoito: 18,
    dezenove: 19,
    vinte: 20,
    trinta: 30,
    quarenta: 40,
    cinquenta: 50,
    sessenta: 60,
    setenta: 70,
    oitenta: 80,
    noventa: 90,
    cem: 100,
    cento: 100,
    duzentos: 200,
    trezentos: 300,
    quatrocentos: 400,
    quinhentos: 500,
    seiscentos: 600,
    setecentos: 700,
    oitocentos: 800,
    novecentos: 900,
    mil: 1000,
  }
  const STOP_WORDS = new Set(['e', 'de', 'do', 'da', 'barra', 'dias', 'mes', 'ano'])
  const TENS_UNITS: Record<string, number> = { ...WORD_NUMBERS }

  const tokens = normalize(spoken)
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)

  // Caso 1: sequência contínua de dígitos isolados (8 no total) => ddmmyyyy
  const digitRun: string[] = []
  for (const t of tokens) {
    if (/^\d$/.test(t)) digitRun.push(t)
    else if (digitRun.length > 0) break
  }
  if (digitRun.length === 8) {
    const s = digitRun.join('')
    return `${s.slice(0, 2)}/${s.slice(2, 4)}/${s.slice(4)}`
  }

  // Caso 2: agrupa tokens numéricos em "números" (palavras que se somam ou
  // dígitos literais); STOP_WORDS são ignoradas, o resto encerra a varredura.
  const groups: string[] = []
  let current: number | null = null
  let currentIsDigits = false
  const flush = () => {
    if (current !== null) {
      groups.push(currentIsDigits ? String(current).padStart(2, '0') : String(current))
      current = null
    }
  }
  for (const t of tokens) {
    if (/^\d+$/.test(t)) {
      flush()
      current = parseInt(t, 10)
      currentIsDigits = true
      continue
    }
    if (t in WORD_NUMBERS) {
      if (currentIsDigits) flush()
      if (current === null) {
        current = TENS_UNITS[t]
        currentIsDigits = false
      } else if (!currentIsDigits) {
        current += WORD_NUMBERS[t] // "noventa e cinco" -> 95
      } else {
        current += WORD_NUMBERS[t]
      }
      continue
    }
    if (STOP_WORDS.has(t)) continue
    flush()
  }
  flush()

  // Precisa de dia, mês e ano: 3 grupos, na ordem d/m/a.
  if (groups.length < 3) return null
  const [d, m, y] = groups
  if (d.length > 2 || m.length > 2 || y.length !== 4) return null
  return `${d}/${m}/${y}`
}

interface DatePickerBRProps {
  value?: string // Formato YYYY-MM-DD (ISO)
  onChange: (isoDate: string) => void
  placeholder?: string
  className?: string
  disabled?: boolean
  id?: string
  name?: string
  /** Mostra o botão de microfone para ditar a data em português */
  enableVoice?: boolean
}

// Converte YYYY-MM-DD para DD/MM/AAAA
function isoToBR(iso?: string): string {
  if (!iso) return ''
  const clean = iso.trim().split('T')[0].split(' ')[0]
  const match = clean.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!match) return ''
  const [, y, m, d] = match
  return `${d}/${m}/${y}`
}

// Converte DD/MM/AAAA para YYYY-MM-DD com validação
function brToIso(br?: string): string | null {
  if (!br) return ''
  const clean = br.trim()
  const match = clean.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
  if (!match) return null

  const [, dStr, mStr, yStr] = match
  const day = parseInt(dStr, 10)
  const month = parseInt(mStr, 10)
  const year = parseInt(yStr, 10)

  if (year < 1900 || year > 2100) return null
  if (month < 1 || month > 12) return null

  // Dias no mês
  const daysInMonth = new Date(year, month, 0).getDate()
  if (day < 1 || day > daysInMonth) return null

  const d = String(day).padStart(2, '0')
  const m = String(month).padStart(2, '0')
  const y = String(year).padStart(4, '0')

  return `${y}-${m}-${d}`
}

// Aplica máscara dd/mm/aaaa na digitação
function applyDateMask(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 8)
  if (digits.length <= 2) return digits
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`
}

// Converte YYYY-MM-DD para objeto Date local sem desvio de fuso horário
function parseLocalDate(isoStr?: string): Date | undefined {
  if (!isoStr) return undefined
  const parts = isoStr.split('-')
  if (parts.length !== 3) return undefined
  const year = parseInt(parts[0], 10)
  const month = parseInt(parts[1], 10) - 1
  const day = parseInt(parts[2], 10)
  const date = new Date(year, month, day)
  return isNaN(date.getTime()) ? undefined : date
}

// Converte objeto Date local para YYYY-MM-DD
function formatLocalDate(date?: Date): string {
  if (!date || isNaN(date.getTime())) return ''
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function DatePickerBR({
  value,
  onChange,
  placeholder = 'dd/mm/aaaa',
  className,
  disabled = false,
  id,
  name,
  enableVoice = false,
}: DatePickerBRProps) {
  const [textValue, setTextValue] = useState<string>(() => isoToBR(value))
  const [open, setOpen] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // Sincroniza texto quando valor externo muda
  useEffect(() => {
    setTextValue(isoToBR(value))
  }, [value])

  // Ditado: aplica a data falada assim que ela estiver completa e válida.
  // O enunciado SUBSTITUI o valor anterior (idempotente): se o navegador
  // reemitir o mesmo enunciado, `parseSpokenDate` devolve a MESMA data e
  // `setTextValue`/`onChange` recebem o mesmo valor — nunca é anexado ao texto
  // já aplicado, então data não duplica (padrão "logo de uma vez" do Android).
  const { listening, toggle } = useVoiceInput({
    // Contrato v0.0.113: o hook entrega APENAS o texto FECHADO do enunciado
    // (último result final novo, dedup por índice+transcript no hook) — o
    // interim nunca é gravado, o que eliminou a duplicação no Chrome/Android.
    onTranscript: (spoken, isFinal) => {
      if (!isFinal) return
      const iso = parseSpokenDate(spoken) ?? extractNumericDate(spoken)
      if (!iso) {
        // Nada reconhecível (nem dd/mm/aaaa nem por extenso): reverte para o
        // último valor válido — o texto dito bruto NUNCA aparece como valor
        // (o campo permanece sempre no formato numérico dd/mm/aaaa).
        setTextValue(isoToBR(value))
        return
      }
      // O parser devolve "YYYY-MM-DD" (ou "DD/MM/AAAA" no fallback); normaliza
      // para ISO antes de gravar, para que o campo e o valor sejam numéricos.
      const normalizedIso = brToIso(iso) ?? iso
      setTextValue(isoToBR(normalizedIso))
      onChange(normalizedIso)
    },
    // Comando "limpar" ditado: esvazia a data. A escuta NÃO é interrompida: o
    // hook segue ativo no mesmo campo (o reinício de 250ms do onend cobre o
    // Android) e a próxima informação ditada entra em sequência.
    onClear: () => {
      setTextValue('')
      onChange('')
    },
  })

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const masked = applyDateMask(e.target.value)
    setTextValue(masked)

    if (masked.length === 10) {
      const iso = brToIso(masked)
      if (iso) {
        onChange(iso)
      }
    } else if (masked.length === 0) {
      onChange('')
    }
  }

  const handleBlur = () => {
    if (!textValue) {
      if (value) onChange('')
      return
    }

    if (textValue.length === 10) {
      const iso = brToIso(textValue)
      if (iso) {
        onChange(iso)
        return
      }
    }

    // Se estiver incompleto ou inválido, reverte para o último valor válido
    setTextValue(isoToBR(value))
  }

  const handleSelectDate = (date?: Date) => {
    if (!date) {
      onChange('')
      setTextValue('')
      setOpen(false)
      return
    }
    const iso = formatLocalDate(date)
    onChange(iso)
    setTextValue(isoToBR(iso))
    setOpen(false)
  }

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation()
    onChange('')
    setTextValue('')
  }

  // FOCO NO CAMPO: ao ativar o microfone, o input correspondente recebe o foco
  // (visual/real). preventScroll evita salto de rolagem no modal.
  const handleVoiceToggle = () => {
    if (!listening) {
      inputRef.current?.focus({ preventScroll: true })
    }
    toggle()
  }

  // Sem guarda de foco (mesmo contrato dos demais campos de voz): a escuta só
  // desliga quando OUTRO campo com microfone é ativado (exclusividade global do
  // useVoiceInput assume a vez e notifica este dono via onForeignStop) ou quando
  // o usuário toca no mic deste campo de novo. Focar/tocar em outro controle do
  // modal não mata o ditado contínuo.

  const selectedDate = parseLocalDate(value)

  return (
    <div className={cn('relative flex items-center', className)}>
      <Input
        ref={inputRef}
        id={id}
        name={name}
        type="text"
        inputMode="numeric"
        placeholder={placeholder}
        value={textValue}
        onChange={handleInputChange}
        onBlur={handleBlur}
        disabled={disabled}
        maxLength={10}
        className={enableVoice ? 'pr-24 font-mono text-xs h-9' : 'pr-16 font-mono text-xs h-9'}
      />

      <div className="absolute right-1 flex items-center gap-0.5">
        {enableVoice && (
          <VoiceMicButton
            listening={listening}
            onToggle={handleVoiceToggle}
            label={placeholder}
            disabled={disabled}
          />
        )}

        {textValue && !disabled && (
          <button
            type="button"
            onClick={handleClear}
            className="p-1 text-muted-foreground hover:text-slate-800 dark:hover:text-slate-200 transition-colors rounded"
            title="Limpar data"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}

        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              disabled={disabled}
              className="h-7 w-7 text-muted-foreground hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40"
              title="Abrir calendário"
            >
              <CalendarIcon className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent
            className="w-auto p-0"
            align="end"
            onInteractOutside={(e) => {
              // Permite clicar fora do popover para fechar o calendário sem fechar o modal pai
              e.stopPropagation()
            }}
          >
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={handleSelectDate}
              defaultMonth={selectedDate || (value ? undefined : new Date())}
              captionLayout="dropdown"
              fromYear={1920}
              toYear={new Date().getFullYear() + 2}
              initialFocus
            />
          </PopoverContent>
        </Popover>
      </div>
    </div>
  )
}
