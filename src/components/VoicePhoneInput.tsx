import { useEffect, useRef } from 'react'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { VoiceMicButton } from '@/components/VoiceMicButton'
import { useVoiceInput } from '@/hooks/useVoiceInput'
import { formatPhoneBR, onlyDigits } from '@/lib/phoneBR'

interface VoicePhoneInputProps extends Omit<
  React.ComponentProps<typeof Input>,
  'value' | 'onChange' | 'type'
> {
  value: string
  onChange: (e: { target: { value: string } }) => void
}

/**
 * Campo de telefone brasileiro com máscara (nn) nnnnn-nnnn e ditado por voz.
 * - Digitação: aceita SOMENTE dígitos (inputMode numeric) e formata na hora.
 * - Ditado: os dígitos são extraídos da fala ("nove oito..." ou "9 8 7...")
 *   e a máscara é aplicada; o que não é dígito é descartado.
 * A fala SUBSTITUI o rascunho pendente (mesmo contrato do VoiceTextInput):
 * nunca duplica no Chrome/Android.
 */
export function VoicePhoneInput({
  value,
  onChange,
  className,
  disabled,
  ...rest
}: VoicePhoneInputProps) {
  const genRef = useRef(0)
  const capturedRef = useRef<{ gen: number; text: string } | null>(null)
  const draftRef = useRef('')
  const lastSpokenRef = useRef('')
  const lastAppliedLenRef = useRef(0)

  const beginGeneration = () => {
    genRef.current += 1
    capturedRef.current = null
    draftRef.current = ''
    lastSpokenRef.current = ''
    lastAppliedLenRef.current = 0
  }

  const { listening, toggle } = useVoiceInput({
    onTranscript: (spoken, isFinal) => {
      if (!spoken) return
      // Nova geração (microfone recém-ligado ou pós-"limpar"): rascunho zerado.
      if (capturedRef.current === null || capturedRef.current.gen !== genRef.current) {
        capturedRef.current = { gen: genRef.current, text: '' }
        draftRef.current = ''
        lastSpokenRef.current = ''
        lastAppliedLenRef.current = 0
      }
      // Guarda de reemissão: o MESMO texto falado nunca entra duas vezes.
      if (spoken === lastSpokenRef.current && isFinal) return
      if (spoken === lastSpokenRef.current && !isFinal) return
      lastSpokenRef.current = spoken

      const cap = capturedRef.current
      // Usuário editou o campo à mão depois da última aplicação: reancora.
      if (cap.text && value.length !== lastAppliedLenRef.current) {
        cap.text = value
      }
      // SUBSTITUI o rascunho pendente; extrai só os dígitos da fala.
      const base = stripPendingDraft(cap.text, draftRef.current)
      const spokenDigits = onlyDigits(spoken)
      if (!spokenDigits) {
        // Nada reconhecível como dígito: apenas limpa o rascunho inválido.
        if (isFinal) {
          draftRef.current = ''
          onChange({ target: { value: formatPhoneBR(base) } })
        }
        return base
      }
      const next = formatPhoneBR(onlyDigits(base) + spokenDigits)
      cap.text = next
      lastAppliedLenRef.current = next.length
      if (isFinal) {
        draftRef.current = ''
      } else {
        draftRef.current = next
      }
      onChange({ target: { value: next } })
      return next
    },
    // Comando "limpar": esvazia o campo e abre uma nova geração.
    onClear: () => {
      beginGeneration()
      onChange({ target: { value: '' } })
    },
  })

  const handleToggle = () => {
    if (!listening) {
      // Ditadura nova: nova geração, rascunho zerado. O texto-base será
      // capturado de forma lazy na primeira aplicação de voz.
      beginGeneration()
    }
    toggle()
  }

  // GUARDA DE FOCO: o microfone para quando o foco sai do campo (mesmo
  // contrato do VoiceTextInput). O clique no botão de microfone não rouba o
  // foco (preventDefault no VoiceMicButton), então o toggle não dispara isto.
  useEffect(() => {
    if (!listening) return
    const fieldId = rest.id
    if (!fieldId) return
    const t = window.setTimeout(() => {
      const active = document.activeElement
      if (active && active.id !== fieldId) {
        stop()
      }
    }, 200)
    return () => window.clearTimeout(t)
  }, [listening, rest.id])

  return (
    <div className="relative">
      <Input
        {...rest}
        type="tel"
        inputMode="numeric"
        disabled={disabled}
        value={value}
        onChange={(e) => onChange({ target: { value: formatPhoneBR(e.target.value) } })}
        className={cn('pr-9 font-mono', className)}
      />
      <VoiceMicButton
        listening={listening}
        onToggle={handleToggle}
        label={typeof rest.placeholder === 'string' ? rest.placeholder : 'campo'}
        disabled={disabled}
        className="absolute right-1 top-1/2 -translate-y-1/2"
      />
    </div>
  )
}

// Remove o rascunho pendente (a cauda do texto) antes de aplicar o próximo
function stripPendingDraft(base: string, draft: string): string {
  if (!draft) return base
  const trimmedBase = base.trimEnd()
  if (trimmedBase === draft) return ''
  if (trimmedBase.endsWith(draft)) {
    const head = trimmedBase.slice(0, trimmedBase.length - draft.length).trimEnd()
    return head
  }
  return trimmedBase
}
