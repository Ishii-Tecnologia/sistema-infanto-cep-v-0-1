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
    onTranscript: (spoken, isFinal) => {
      const iso = parseSpokenDate(spoken)
      if (!iso) {
        // Enunciado ainda incompleto ("doze de") ou inválido: em `interim`
        // aguarda o próximo evento; em `final`, mostra o bruto para o usuário.
        if (isFinal) setTextValue(spoken)
        return
      }
      setTextValue(isoToBR(iso))
      onChange(iso)
    },
    // Comando "limpar" ditado: esvazia a data
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

  // GUARDA DE FOCO: o microfone para quando o foco sai do campo (mesmo
  // contrato do VoiceTextInput). O clique no botão de microfone não rouba o
  // foco (preventDefault no VoiceMicButton), então o toggle não dispara isto.
  useEffect(() => {
    if (!listening) return
    const t = window.setTimeout(() => {
      const active = document.activeElement
      if (active !== inputRef.current) {
        toggle()
      }
    }, 200)
    return () => window.clearTimeout(t)
  }, [listening, toggle])

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
            onToggle={toggle}
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
