import { useEffect, useId, useRef, type ComponentProps } from 'react'
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
  /**
   * Sugestões de preenchimento (datalist nativo): aparecem ao focar/digitar,
   * mas o campo continua aceitando texto livre e ditado por voz.
   */
  suggestions?: string[]
}

// Anexa o texto falado ao final do que já estava no campo
export function appendSpokenText(base: string, spoken: string): string {
  if (!spoken) return base
  const trimmedBase = base.trimEnd()
  return trimmedBase ? `${trimmedBase} ${spoken}` : spoken
}

/**
 * Remove o ÚLTIMO rascunho pendente do texto-base. O campo guarda o texto-base
 * como "antes do rascunho", então o rascunho pendente é SEMPRE a cauda do
 * texto: se a cauda terminar com ele (com um espaço entre os dois), é removido
 * — evita que o interim já aplicado vise duplicação quando o final chega
 * ("João" aplicado; final "João Silva" chega: remove "João", aplica "João
 * Silva" — e não "João João Silva").
 */
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

// Input de texto com botão de microfone (ditado por voz pt-BR)
export function VoiceTextInput({
  value,
  onChange,
  className,
  disabled,
  suggestions,
  ...rest
}: VoiceTextInputProps) {
  const suggestionsId = useId()
  // "Geração" da ditadura: incrementada a cada microfone ligado e a cada comando
  // "limpar". O texto-base de cada geração é capturado de forma LAZY (na
  // primeira aplicação de voz) em vez de no toggle — é o mesmo texto do campo.
  const genRef = useRef(0)
  // Texto-base válido para a geração atual: o campo SEM o rascunho pendente.
  const capturedRef = useRef<{ gen: number; text: string } | null>(null)
  // Rascunho pendente aplicado no campo (interim ou final pendente): a cauda do
  // texto. É removido antes de aplicar o próximo texto — nunca se anexa depois
  // dele (causa da duplicação "frasefrase" imediata no Chrome/Android).
  const draftRef = useRef('')
  // Último texto falado (guarda de reemissão do navegador, p.ex. o mesmo
  // enunciado final entregue duas vezes): nunca entra duas vezes.
  const lastSpokenRef = useRef('')
  // Comprimento do texto após a última aplicação — se o usuário editou à mão
  // (tamanho diferente), a próxima aplicação reancora no texto atual do campo.
  const lastAppliedLenRef = useRef(0)

  const beginGeneration = () => {
    genRef.current += 1
    capturedRef.current = null
    draftRef.current = ''
    lastSpokenRef.current = ''
    lastAppliedLenRef.current = 0
  }

  const {
    listening,
    toggle,
    stop: stopListening,
  } = useVoiceInput({
    // Contrato v0.0.113: o hook entrega APENAS o texto FECHADO do enunciado
    // (último result final novo, dedup por índice+transcript no hook) — o
    // interim nunca é gravado, o que eliminou a duplicação no Chrome/Android.
    onTranscript: (spoken, isFinal) => {
      if (!spoken || !isFinal) return
      // Nova geração (microfone recém-ligado ou pós-"limpar"): base zerado.
      if (capturedRef.current === null || capturedRef.current.gen !== genRef.current) {
        capturedRef.current = { gen: genRef.current, text: '' }
        lastSpokenRef.current = ''
        lastAppliedLenRef.current = 0
      }
      // Guarda de reemissão: o MESMO enunciado nunca entra duas vezes.
      if (spoken === lastSpokenRef.current) return
      lastSpokenRef.current = spoken

      const cap = capturedRef.current
      // Usuário editou o campo à mão depois da última aplicação: reancora.
      if (cap.text && value.length !== lastAppliedLenRef.current) {
        cap.text = value
      }
      // SUBSTITUI o rascunho pendente: o texto-base nunca cresce com o rascunho.
      const base = stripPendingDraft(cap.text, draftRef.current)
      const next = appendSpokenText(base, spoken)
      cap.text = next
      lastAppliedLenRef.current = next.length
      // Final confirmado: o texto entra como base — nenhum rascunho pendente.
      draftRef.current = ''
      onChange({ target: { value: next } })
      return next
    },
    // Comando "limpar": esvazia o campo por completo, inclusive o texto-base,
    // e abre uma nova geração — a fala seguinte entra como texto novo.
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

  // GUARDA DE FOCO (comportamento pedido: "desative quando mudar de campo"):
  // se o campo estiver ouvindo e o foco do documento sair dele — usuário
  // tocou/entrou em OUTRO campo ou em outro controle do modal — a escuta
  // termina. O clique no botão de microfone (onPointerDown é prevenido no
  // VoiceMicButton) não tira o foco do campo, então ligar/desligar não
  // dispara este guard.
  useEffect(() => {
    if (!listening) return
    const fieldId = rest.id
    if (!fieldId) return
    const t = window.setTimeout(() => {
      const active = document.activeElement
      if (active && active.id !== fieldId) {
        stopListening()
      }
    }, 200)
    return () => window.clearTimeout(t)
  }, [listening, rest.id, stopListening])

  return (
    <div className="relative">
      <Input
        {...rest}
        disabled={disabled}
        value={value}
        onChange={(e) => onChange({ target: { value: e.target.value } })}
        list={suggestions && suggestions.length > 0 ? suggestionsId : undefined}
        className={cn('pr-9', className)}
      />
      {suggestions && suggestions.length > 0 && (
        <datalist id={suggestionsId}>
          {suggestions.map((s) => (
            <option key={s} value={s} />
          ))}
        </datalist>
      )}
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
