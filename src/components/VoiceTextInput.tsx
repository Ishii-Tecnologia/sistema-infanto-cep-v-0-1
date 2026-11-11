import { useEffect, useId, useMemo, useRef, useState, type ComponentProps } from 'react'
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
   * Sugestões de preenchimento (dropdown próprio): aparecem ao focar/digitar,
   * mas o campo continua aceitando texto livre e ditado por voz.
   */
  suggestions?: string[]
  /**
   * Comportamento do ditado: 'append' anexa o texto falado ao conteúdo atual
   * (padrão); 'replace' apaga o que está no campo e coloca o texto falado
   * (campos de valor único, ex. Grau de Parentesco).
   */
  voiceMode?: VoiceTextInputMode
}

export type VoiceTextInputMode = 'append' | 'replace'

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
  voiceMode = 'append',
  ...rest
}: VoiceTextInputProps) {
  const suggestionsId = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  // Dropdown próprio de sugestões (substitui o datalist nativo do navegador,
  // cujo ícone cobre o botão do microfone no Chrome/Android)
  const [suggestionsOpen, setSuggestionsOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)
  // Fecha o dropdown ao clicar/tocar fora dele
  useEffect(() => {
    if (!suggestionsOpen) return
    const close = (event: PointerEvent) => {
      if (!wrapRef.current?.contains(event.target as Node)) setSuggestionsOpen(false)
    }
    document.addEventListener('pointerdown', close)
    return () => document.removeEventListener('pointerdown', close)
  }, [suggestionsOpen])
  // Filtra as sugestões pelo que já está digitado (ignora acentos/caixa)
  const filteredSuggestions = useMemo(() => {
    if (!suggestions || suggestions.length === 0) return []
    const norm = (s: string) =>
      s
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
    const current = norm(value.trim())
    if (!current) return suggestions
    return suggestions.filter((s) => norm(s).includes(current))
  }, [suggestions, value])
  const openSuggestions = () => {
    if (!suggestions || suggestions.length === 0 || disabled) return
    setSuggestionsOpen(true)
  }
  const applySuggestion = (s: string) => {
    setSuggestionsOpen(false)
    if (onChange) onChange({ target: { value: s } })
  }
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

  const { listening, toggle } = useVoiceInput({
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
      // Modo 'replace' (campos com valor único, ex. Grau de Parentesco): o
      // enunciado SUBSTITUI o conteúdo atual do campo, sem anexar.
      if (voiceMode === 'replace') {
        const next = spoken
        cap.text = next
        lastAppliedLenRef.current = next.length
        draftRef.current = ''
        onChange({ target: { value: next } })
        return next
      }
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
      // FOCO NO CAMPO: ao ativar o microfone, o input correspondente recebe o
      // foco (visual/real). preventScroll evita salto de rolagem no modal.
      inputRef.current?.focus({ preventScroll: true })
    }
    toggle()
  }

  return (
    <div className="relative" ref={wrapRef}>
      <Input
        ref={inputRef}
        {...rest}
        disabled={disabled}
        value={value}
        onFocus={openSuggestions}
        onInput={(e) => {
          // Abrir as sugestões durante a digitação manual (e não por voz)
          if (!listening) openSuggestions()
          rest.onInput?.(e)
        }}
        onChange={(e) => onChange({ target: { value: e.target.value } })}
        list={undefined}
        className={cn('pr-9', className)}
      />
      {/* Dropdown PRÓPRIO de sugestões (substitui o datalist nativo, cujo
          ícone do navegador cobria o botão do microfone no Chrome/Android) */}
      {suggestionsOpen && filteredSuggestions.length > 0 && (
        <ul
          className="absolute z-50 mt-1 w-full max-h-56 overflow-auto rounded-md border bg-popover py-1 shadow-md"
          role="listbox"
        >
          {filteredSuggestions.map((s) => (
            <li key={s}>
              <button
                type="button"
                role="option"
                aria-selected={s === value}
                className="w-full px-3 py-2 text-left text-sm hover:bg-accent hover:text-accent-foreground"
                // pointerdown antes do blur do input
                onPointerDown={(e) => {
                  e.preventDefault()
                  applySuggestion(s)
                }}
              >
                {s}
              </button>
            </li>
          ))}
        </ul>
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
