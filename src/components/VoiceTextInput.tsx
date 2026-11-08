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
  const baseRef = useRef('')

  const { listening, toggle } = useVoiceInput({
    onTranscript: (spoken) => {
      if (!spoken) return
      onChange({ target: { value: appendSpokenText(baseRef.current, spoken) } })
    },
    // Comando "limpar": esvazia o campo por completo, inclusive o texto-base
    onClear: () => {
      baseRef.current = ''
      onChange({ target: { value: '' } })
    },
  })

  const handleToggle = () => {
    if (!listening) baseRef.current = value
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
