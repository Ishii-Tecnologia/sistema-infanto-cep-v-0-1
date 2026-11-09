import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from '@/hooks/use-toast'

// Tipos mínimos da Web Speech API (o lib.dom do TypeScript não os traz completos)
interface SpeechAlternativeLike {
  transcript: string
}
interface SpeechResultLike {
  readonly length: number
  readonly isFinal: boolean
  [index: number]: SpeechAlternativeLike
}
interface SpeechResultListLike {
  readonly length: number
  [index: number]: SpeechResultLike
}
interface SpeechResultEventLike {
  readonly resultIndex: number
  readonly results: SpeechResultListLike
}
interface SpeechErrorEventLike {
  error: string
}
interface SpeechRecognitionLike {
  lang: string
  continuous: boolean
  interimResults: boolean
  maxAlternatives: number
  onresult: ((event: SpeechResultEventLike) => void) | null
  onerror: ((event: SpeechErrorEventLike) => void) | null
  onend: (() => void) | null
  start: () => void
  stop: () => void
  abort: () => void
}
type SpeechRecognitionCtor = new () => SpeechRecognitionLike

type VoiceWindow = Window & {
  SpeechRecognition?: SpeechRecognitionCtor
  webkitSpeechRecognition?: SpeechRecognitionCtor
}

function getSpeechRecognitionCtor(): SpeechRecognitionCtor | null {
  if (typeof window === 'undefined') return null
  const w = window as VoiceWindow
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null
}

export function isVoiceInputSupported(): boolean {
  return getSpeechRecognitionCtor() !== null
}

/**
 * Comando de voz "limpar": se a fala contém a palavra, devolve o texto dito
 * depois da última ocorrência (ou '' se nada veio depois); null se não há comando.
 */
function textAfterClearCommand(text: string): string | null {
  const re = /\blimpar\b/gi
  let last: RegExpExecArray | null = null
  let match: RegExpExecArray | null
  while ((match = re.exec(text)) !== null) last = match
  if (!last) return null
  return text.slice(last.index + last[0].length).trim()
}

interface UseVoiceInputOptions {
  /**
   * Recebe o texto do enunciado atual. Em `interim` a fala ainda pode mudar
   * (substitui o rascunho pendente); em `final` é o texto fechado do enunciado.
   */
  onTranscript: (text: string, isFinal: boolean) => (string | void) | void
  /** Chamado quando a fala contém o comando "limpar": o campo deve ser esvaziado. */
  onClear?: () => void
  /** Chamado quando a escuta termina de vez (microfone desligado). */
  onEnd?: () => void
}

// ---------------------------------------------------------------------------
// SINGLETON GLOBAL DE RECONHECIMENTO
// Uma única instância de SpeechRecognition pode existir no app inteiro a
// qualquer momento. No Android, duas instâncias ativas em paralelo reemitem os
// MESMOS resultados (uma a partir da lista antiga, outra da nova) — é a causa
// clássica de texto duplicado/triplicado "logo de uma vez". Cada campo cria o
// seu hook; antes de ligar o microfone de um campo, a escuta de qualquer outro
// campo é abortada e desregistrada aqui. O registro `onForeignStop` permite que
// a escuta abortada AVISE o dono para que o botão de microfone do campo
// anterior volte ao estado "parado" (um campo ouvindo por vez, inclusive no
// visual).
// ---------------------------------------------------------------------------
const singleton: {
  active: SpeechRecognitionLike | null
  onForeignStop: (() => void) | null
  abortCurrent: () => void
} = {
  active: null,
  onForeignStop: null,
  abortCurrent() {
    const current = singleton.active
    singleton.active = null
    const notify = singleton.onForeignStop
    singleton.onForeignStop = null
    if (current) {
      current.onresult = null
      current.onend = null
      current.onerror = null
      try {
        current.abort()
      } catch {
        // ignora
      }
    }
    // Avisa o dono da escuta abortada APÓS o abort (pode chamar stop() do
    // outro hook, que toca neste singleton já com active = null — sem efeito).
    notify?.()
  },
}

/**
 * Reconhecimento de voz em pt-BR via Web Speech API, em ciclo POR ENUNCIADO.
 *
 * Design (redesign v0.0.108, substitui o modelo "contínuo + acumulado"):
 * - `continuous = false` (single-utterance): o Chrome/Android entrega UM
 *   resultado final por enunciado e encerra o stream — muito mais estável.
 * - O interim nunca é confirmado: enquanto é falado, é entregue como rascunho
 *   substitutivo; no final, o enunciado é entregue uma única vez com
 *   `isFinal = true`. O CONSUMIDOR (campo) decide o que fazer com o rascunho.
 * - Processa APENAS `results[event.resultIndex]` quando `isFinal` — nunca
 *   percorre a lista inteira, que reemite trechos já confirmados.
 * - Depois do final, reinicia automaticamente a escuta (novo enunciado) até que
 *   o usuário toque no microfone de novo. Erros fatais (not-allowed,
 *   audio-capture) cancelam o reinício e encerram a ditadura.
 * - Comando "limpar": zera o rascunho e chama `onClear` imediatamente (parcial
 *   ou final), e o texto dito depois do comando é entregue como novo enunciado.
 * - Exclusividade global: iniciar uma escuta aqui aborta a escuta de
 *   qualquer outro campo (singleton) e notifica o dono anterior, que volta ao
 *   estado "parado" — apenas UM campo escuta por vez, incluindo o visual.
 */
export function useVoiceInput({ onTranscript, onClear, onEnd }: UseVoiceInputOptions) {
  const [listening, setListening] = useState(false)
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null)
  const restartTimerRef = useRef<number | null>(null)
  // Intenção do usuário: microfone ligado até que ele toque no botão de novo
  const shouldListenRef = useRef(false)
  const failuresRef = useRef(0)
  // Enunciado em curso (parcial atual): substituído a cada evento de interim
  const utteranceRef = useRef('')
  const callbacksRef = useRef({ onTranscript, onClear, onEnd })
  const beginRef = useRef<() => void>(() => {})
  // Este hook é o dono da escuta ativa do singleton neste momento?
  const ownsActiveRef = useRef(false)

  useEffect(() => {
    callbacksRef.current = { onTranscript, onClear, onEnd }
  })

  const clearRestartTimer = useCallback(() => {
    if (restartTimerRef.current !== null) {
      window.clearTimeout(restartTimerRef.current)
      restartTimerRef.current = null
    }
  }, [])

  /** Comando "limpar" no texto de um enunciado: devolve o que veio depois dele. */
  const applyClearCommand = (text: string): string => {
    const afterClear = textAfterClearCommand(text)
    if (afterClear !== null) {
      utteranceRef.current = ''
      callbacksRef.current.onClear?.()
      return afterClear
    }
    return text
  }

  /** Encerra de vez (usuário parou, escuta tomada por outro campo ou desistiu). */
  const finish = useCallback(() => {
    clearRestartTimer()
    shouldListenRef.current = false
    if (ownsActiveRef.current) {
      singleton.abortCurrent()
      ownsActiveRef.current = false
    }
    recognitionRef.current = null
    utteranceRef.current = ''
    setListening(false)
    callbacksRef.current.onEnd?.()
  }, [clearRestartTimer])

  useEffect(() => {
    const scheduleRestart = () => {
      if (!shouldListenRef.current) {
        finish()
        return
      }
      if (restartTimerRef.current !== null) return
      restartTimerRef.current = window.setTimeout(() => {
        restartTimerRef.current = null
        if (shouldListenRef.current) beginRef.current()
      }, 300)
    }

    const begin = () => {
      clearRestartTimer()
      if (!shouldListenRef.current) return
      const Ctor = getSpeechRecognitionCtor()
      if (!Ctor) {
        finish()
        return
      }

      // EXCLUSIVIDADE GLOBAL: aborta e desregistra QUALQUER escuta anterior
      // (inclusive a de outro campo — o dono anterior é notificado e volta ao
      // estado "parado") antes de abrir a nova.
      singleton.abortCurrent()
      singleton.onForeignStop = () => finish()
      ownsActiveRef.current = true

      const recognition = new Ctor()
      recognition.lang = 'pt-BR'
      // Modo single-utterance: um resultado final por enunciado, stream mais
      // estável no Chrome/Android.
      recognition.continuous = false
      recognition.interimResults = true
      recognition.maxAlternatives = 1

      recognition.onresult = (event) => {
        failuresRef.current = 0
        if (recognitionRef.current !== recognition) return

        // Interim: o parcial atual SUBSTITUI o rascunho anterior — nunca soma.
        let interim = ''
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i]
          const transcript = (result?.[0]?.transcript ?? '').trim()
          if (!transcript) continue
          if (result.isFinal) {
            // 3. Processa APENAS results[resultIndex] quando isFinal: nunca
            // percorre a lista inteira nem anexa por cima do parcial.
            if (i !== event.resultIndex) continue
            const raw = applyClearCommand(transcript)
            utteranceRef.current = ''
            if (raw) {
              const replaced = callbacksRef.current.onTranscript(raw, true)
              if (typeof replaced === 'string') {
                // Consumidor devolveu o texto final aplicado: torna-se o novo
                // enunciado em curso — se o stream reemitir o parcial na
                // instância seguinte, a comparação de igualdade pega.
                utteranceRef.current = replaced
              }
            }
            return
          }
          interim = interim ? `${interim} ${transcript}` : transcript
        }

        interim = applyClearCommand(interim)
        if (interim) {
          utteranceRef.current = interim
          callbacksRef.current.onTranscript(interim, false)
        }
      }

      recognition.onerror = (event) => {
        const error = event.error
        if (recognitionRef.current !== recognition) return
        if (error === 'not-allowed' || error === 'service-not-allowed') {
          toast({
            title: 'Permissão do microfone negada',
            description:
              'Libere o microfone nas configurações do navegador para usar o comando de voz. O cadastro segue funcionando normalmente por digitação.',
            variant: 'destructive',
          })
          clearRestartTimer()
          shouldListenRef.current = false
          return
        }
        if (error === 'audio-capture') {
          toast({
            title: 'Microfone não encontrado',
            description:
              'Verifique se há um microfone conectado. O cadastro segue funcionando normalmente por digitação.',
            variant: 'destructive',
          })
          clearRestartTimer()
          shouldListenRef.current = false
          return
        }
        // 'no-speech', 'aborted', 'network' etc.: o onend cuida do reinício.
      }

      recognition.onend = () => {
        if (recognitionRef.current !== recognition) return
        recognitionRef.current = null
        // No modo single-utterance o stream encerra após cada enunciado:
        // reinicia automaticamente para o próximo, mantendo o texto já
        // confirmado no campo como âncora. Rascunho pendente NÃO é confirmado
        // aqui — o próximo enunciado substitui o rascunho pendente no campo.
        scheduleRestart()
      }

      recognitionRef.current = recognition
      singleton.active = recognition
      try {
        recognition.start()
      } catch {
        recognitionRef.current = null
        failuresRef.current += 1
        if (failuresRef.current >= 5) {
          toast({
            title: 'Não foi possível iniciar o microfone',
            description: 'Tente novamente ou digite normalmente.',
            variant: 'destructive',
          })
          shouldListenRef.current = false
          finish()
        } else {
          scheduleRestart()
        }
      }
    }

    beginRef.current = begin

    return () => {
      shouldListenRef.current = false
      clearRestartTimer()
      if (recognitionRef.current) {
        // Unmount com escuta ativa: aborta via singleton e limpa o registro de
        // notificação (o cleanup roda antes do próximo efeito/begin).
        singleton.onForeignStop = null
        singleton.abortCurrent()
        ownsActiveRef.current = false
        recognitionRef.current = null
      }
    }
  }, [clearRestartTimer, finish])

  const start = useCallback(() => {
    if (shouldListenRef.current) return
    const Ctor = getSpeechRecognitionCtor()
    if (!Ctor) {
      toast({
        title: 'Comando de voz indisponível',
        description:
          'Este navegador não suporta reconhecimento de voz. Use o Google Chrome ou o Microsoft Edge no computador, ou digite normalmente.',
        variant: 'destructive',
      })
      return
    }
    shouldListenRef.current = true
    setListening(true)
    failuresRef.current = 0
    utteranceRef.current = ''
    beginRef.current()
  }, [])

  const stop = useCallback(() => {
    shouldListenRef.current = false
    clearRestartTimer()
    const recognition = recognitionRef.current
    if (recognition) {
      try {
        recognition.stop()
      } catch {
        try {
          recognition.abort()
        } catch {
          // ignora
        }
        finish()
      }
    } else {
      // Sem instância ativa (entre reinícios): encerra diretamente.
      finish()
    }
  }, [clearRestartTimer, finish])

  const toggle = useCallback(() => {
    if (shouldListenRef.current) stop()
    else start()
  }, [start, stop])

  return { listening, start, stop, toggle, supported: isVoiceInputSupported() }
}
