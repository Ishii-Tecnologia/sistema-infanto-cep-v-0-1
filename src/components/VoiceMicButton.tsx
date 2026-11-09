import { Mic } from 'lucide-react'
import { cn } from '@/lib/utils'

interface VoiceMicButtonProps {
  listening: boolean
  onToggle: () => void
  label: string
  disabled?: boolean
  className?: string
}

// Botão de microfone usado ao lado dos campos com ditado por voz
export function VoiceMicButton({
  listening,
  onToggle,
  label,
  disabled,
  className,
}: VoiceMicButtonProps) {
  return (
    <button
      type="button"
      onPointerDown={(e) => e.preventDefault()}
      onClick={onToggle}
      disabled={disabled}
      aria-pressed={listening}
      aria-label={listening ? `Parar ditado: ${label}` : `Ditar por voz: ${label}`}
      title={listening ? 'Gravando… clique para parar' : 'Ditar por voz'}
      className={cn(
        'inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md transition-colors disabled:opacity-50',
        listening
          ? 'bg-red-500 text-white animate-pulse hover:bg-red-600'
          : 'text-muted-foreground hover:text-indigo-600 hover:bg-indigo-50',
        className,
      )}
    >
      <Mic className="h-4 w-4" />
    </button>
  )
}
