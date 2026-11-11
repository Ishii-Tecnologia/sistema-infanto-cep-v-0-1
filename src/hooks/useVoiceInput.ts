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
  /** Recebe o texto FECHADO do enunciado (último result final da fala) — apenas uma vez. */
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
 * Reconhecimento de voz em pt-BR via Web Speech API, em ESCUTA CONTÍNUA.
 *
 * Design (v0.0.113 — pipeline "o ÚLTIMO result final por enunciado, sem
 * interim gravado", assumindo o comportamento HOSTIL do Chrome/Android):
 *
 * 1. `interimResults = false` para GRAVAÇÃO. No Android os eventos results
 *    chegam em rajada (o enunciado inteiro é reemisso varias vezes com
 *    resultIndex variável, interim=true seguido de interim=false para o MESMO
 *    índice): tratá-los como trechos distintos é a causa raiz da duplicação
 *    IMEDIATA. Sem interim no stream de gravação, o navegador entrega o
 *    enunciado fechado — o texto entra no campo UMA vez.
 * 2. Um enunciado (utterance) é identificado por resultIndex + transcript:
 *    `seenFinalRef` (chave `i:<index>:<transcript>`) garante que o MESMO
 *    enunciado final nunca seja entregue duas vezes, mesmo que o Chrome
 *    reemita o evento com o MESMO índice (guarda dedup por índice+transcript).
 * 3. Se a lista trouxer VÁRIOS finais no mesmo evento (Android entrega rajada
 *    de enunciados fechados acumulados), o processamento é sobre o ÚLTIMO —
 *    não sobre cada um: os anteriores já estão no campo ou são reemissão.
 * 4. Se TODOS os finais do evento são reemissão (vistos), o evento inteiro é
 *    ignorado — nada é entregue duas vezes.
 * 5. `continuous = true` mantém a escuta entre pausas do usuário (o
 *    comportamento "microfone se mantém ativo enquanto estou no campo");
 *    reinício de 250ms pelo onend cobre o Android, que encerra o stream
 *    sozinho. O reinício cria UMA instância nova, nunca uma segunda em
 *    paralelo com a antiga — e o resultado consumido da sessão anterior não
 *    volta (a sessão nova começa a lista do zero).
 * 6. Erros fatais (not-allowed, audio-capture) cancelam o reinício e encerram
 *    a ditadura — nunca uma 2ª instância em paralelo.
 * 7. Comando "limpar": chama `onClear` imediatamente; o texto dito depois do
 *    comando é entregue como novo enunciado.
 * 8. Exclusividade global: iniciar uma escuta aqui aborta a escuta de
 *    qualquer outro campo (singleton) e notifica o dono anterior, que volta ao
 *    estado "parado" — apenas UM campo escuta por vez, incluindo o visual.
 */
export function useVoiceInput({ onTranscript, onClear, onEnd }: UseVoiceInputOptions) {
  const [listening, setListening] = useState(false)
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null)
  const restartTimerRef = useRef<number | null>(null)
  // Intenção do usuário: microfone ligado até que ele toque no botão de novo
  const shouldListenRef = useRef(false)
  const failuresRef = useRef(0)
  // Enunciados FECHADOS já vistos nesta sessão: chave `i:<index>:<transcript>`
  // (dedup por índice+transcript) e `x:<texto aplicado>` (dedup por resultado).
  // O Chrome/Android reemite eventos com a mesma lista de resultados (ou parte
  // dela) várias vezes: um final só é entregue ao campo na PRIMEIRA vez.
  const seenFinalRef = useRef<Set<string>>(new Set())
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
      // Reinício conservador (250ms): cobre o Android, que encerra o stream
      // contínuo após cada enunciado. O reinício cria UMA instância nova — a
      // anterior já está sem handlers (ver onend) e nunca há duas em paralelo.
      restartTimerRef.current = window.setTimeout(() => {
        restartTimerRef.current = null
        if (shouldListenRef.current) beginRef.current()
      }, 250)
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
      // ESCUTA CONTÍNUA + SEM interim gravável (ver design v0.0.113): o
      // navegador entrega o enunciado FECHADO uma única vez por índice+
      // transcript — sem rascunho, sem reemissão reprocessada, sem duplicar.
      recognition.continuous = true
      recognition.interimResults = false
      recognition.maxAlternatives = 1

      recognition.onresult = (event) => {
        failuresRef.current = 0
        if (recognitionRef.current !== recognition) return

        // Consome a lista inteira (o resultIndex do Android é confiável):
        // identifica o ÚLTIMO final NOVO do evento — os anteriores da MESMA
        // lista são trechos anteriores da MESMA fala que o Android reemite
        // junto, ou finais já entregues nesta sessão (vistos).
        let lastNewFinal: { index: number; transcript: string } | null = null
        for (let i = 0; i < event.results.length; i++) {
          const result = event.results[i]
          const transcript = (result?.[0]?.transcript ?? '').trim()
          if (!transcript || !result.isFinal) continue
          const key = `i:${i}:${transcript}`
          if (seenFinalRef.current.has(key)) continue // reemissão: ignora
          lastNewFinal = { index: i, transcript }
        }

        // Nada novo neste evento (tudo reemissão ou interim desligado): nada
        // é entregue — o campo não muda.
        if (!lastNewFinal) return

        // Entrega UM único enunciado por evento (o último novo): os finais
        // anteriores da mesma lista são marcados como vistos, não aplicados.
        for (let i = 0; i < event.results.length; i++) {
          const result = event.results[i]
          const transcript = (result?.[0]?.transcript ?? '').trim()
          if (!transcript || !result.isFinal) continue
          seenFinalRef.current.add(`i:${i}:${transcript}`)
        }

        let raw = lastNewFinal.transcript
        const afterClear = textAfterClearCommand(raw)
        if (afterClear !== null) {
          callbacksRef.current.onClear?.()
          raw = afterClear
        }
        if (!raw) return
        const replaced = callbacksRef.current.onTranscript(raw, true)
        if (typeof replaced === 'string' && replaced) {
          // Consumidor devolveu o texto final aplicado: guarda — se o
          // navegador reemitir o MESMO enunciado (mesmo transcript) em
          // outro índice, a comparação abaixo pega.
          if (replaced !== raw) {
            seenFinalRef.current.add(`x:${replaced}`)
          }
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
        // Em modo contínuo o stream encerra apenas quando o navegador decide
        // (silêncio longo, Android): reinicia automaticamente enquanto a
        // intenção for permanecer ouvindo — sem confirmar rascunho pendente
        // (não há rascunho neste pipeline; o enunciado entra só quando fechado).
        scheduleRestart()
      }

      recognitionRef.current = recognition
      seenFinalRef.current = new Set()
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
          'Este navegador não suporta reconhecimento de voz. Use o Google Chrome no celular/desktop, ou digite normalmente.',
        variant: 'destructive',
      })
      return
    }
    shouldListenRef.current = true
    setListening(true)
    failuresRef.current = 0
    beginRef.current()
    // A chave dedup é RECONSTRUÍDA por sessão — não é zerada por toggle: a
    // mesma fala reemitida entre sessões (recomeço do Android) não entra duas
    // vezes no campo.
    seenFinalRef.current = new Set()
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
