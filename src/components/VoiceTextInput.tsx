import { useRef, type ComponentProps } from 'react'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { useVoiceInput } from '@/hooks/useVoiceInput'
import { VoiceMicButton } from '@/components/VoiceMicButton'

// Evento simplificado: os handlers do modal só leem e.target.value
export interface VoiceChangeEvent {
  target: { value: string }
}

interface VoiceTextInputProps extends Omit<ComponentProps<typeof Input>, 'value' | 'onChange'> {
  value: string
  onChange: (e: VoiceChangeEvent) => void
}

// Anexa o texto falado ao final do que já estava no campo
export function appendSpokenText(base: string, spoken: string): string {
  if (!spoken) return base
  const trimmedBase = base.trimEnd()
  return trimmedBase ? `${trimmedBase} ${spoken}` : spoken
}

// Input de texto com botão de microfone (ditado por voz pt-BR)
export function VoiceTextInput({
  value,
  onChange,
  className,
  disabled,
  ...rest
}: VoiceTextInputProps) {
  // "Geração" da ditadura: incrementada a cada microfone ligado e a cada comando
  // "limpar". O texto-base de cada geração é capturado de forma LAZY (na
  // primeira aplicação de voz) em vez de no toggle — é o mesmo texto do campo.
  const genRef = useRef(0)
  // Texto-base válido para a geração atual.
  const capturedRef = useRef<{ gen: number; text: string } | null>(null)
  // Último texto integral aplicado: o navegador (Android) às vezes reemite o
  // MESMO texto mais de uma vez — evento de resultado duplicado ou reemissão
  // após encerrar/retomar o stream. Sem esta guarda o trecho entra duplicado.
  const lastSpokenRef = useRef('')
  // Comprimento do texto após a última aplicação — se o usuário editou à mão
  // (tamanho diferente), a próxima aplicação reancora no texto atual do campo.
  const lastAppliedLenRef = useRef(0)

  const { listening, toggle } = useVoiceInput({
    onTranscript: (spoken) => {
      if (!spoken) return
      // Nova geração (microfone recém-ligado ou pós-"limpar"): zera o rascunho.
      if (capturedRef.current === null || capturedRef.current.gen !== genRef.current) {
        capturedRef.current = { gen: genRef.current, text: '' }
        lastSpokenRef.current = ''
        lastAppliedLenRef.current = 0
      }
      const cap = capturedRef.current
      // Usuário editou o campo à mão depois da última aplicação: reancora.
      if (cap.text && value.length !== lastAppliedLenRef.current) {
        cap.text = value
      }
      // Idempotência: o mesmo texto integral nunca entra duas vezes no campo,
      // mesmo que o navegador reemita os resultados.
      if (spoken === lastSpokenRef.current) return
      lastSpokenRef.current = spoken
      const next = appendSpokenText(cap.text, spoken)
      cap.text = next
      lastAppliedLenRef.current = next.length
      onChange({ target: { value: next } })
    },
    // Comando "limpar": esvazia o campo por completo, inclusive o texto-base,
    // e abre uma nova geração — a fala seguinte entra como texto novo.
    onClear: () => {
      genRef.current += 1
      capturedRef.current = { gen: genRef.current, text: '' }
      lastSpokenRef.current = ''
      lastAppliedLenRef.current = 0
      onChange({ target: { value: '' } })
    },
  })

  const handleToggle = () => {
    if (!listening) {
      // Ditadura nova: nova geração, rascunho zerado. O texto-base será
      // capturado de forma LAZY na primeira aplicação de voz.
      genRef.current += 1
      capturedRef.current = null
      lastSpokenRef.current = ''
      lastAppliedLenRef.current = 0
    }
    toggle()
  }

  return (
    <div className="relative">
      <Input
        {...rest}
        disabled={disabled}
        value={value}
        onChange={(e) => onChange({ target: { value: e.target.value } })}
        className={cn('pr-9', className)}
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
