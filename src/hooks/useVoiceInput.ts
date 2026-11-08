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
  /** Recebe o texto reconhecido até o momento (trechos finais + parcial atual). */
  onTranscript: (text: string) => void
  /** Chamado quando a fala contém o comando "limpar": o campo deve ser esvaziado. */
  onClear?: () => void
  /** Chamado quando a escuta termina de vez (microfone desligado), com o texto final. */
  onEnd?: (text: string) => void
}

/**
 * Reconhecimento de voz em pt-BR via Web Speech API.
 *
 * Regras anti-duplicação (Chrome/Android):
 * - apenas UMA instância de reconhecimento vive por vez: erros fatais
 *   (not-allowed, audio-capture) CANCELAM o reinício agendado — uma segunda
 *   instância ativa em paralelo reemite os resultados e duplica o texto;
 * - cada instância tem a sua própria lista de resultados: o
 *   contador de confirmados é zerado a cada nova instância;
 * - dentro de uma instância, só se lê a partir de `event.resultIndex` (e nunca
 *   antes de um resultado já confirmado): cada trecho `isFinal` entra uma única vez;
 * - o parcial (interim) SUBSTITUI o rascunho anterior, nunca é somado;
 * - o texto-base do campo NÃO é reanexado nos reinícios: o hook guarda tudo o que
 *   já foi confirmado nesta ditadura (committedRef);
 * - se o stream termina com um parcial pendente, ele é confirmado no `onend`; se a
 *   instância seguinte reemitir exatamente esse trecho como primeiro final, é ignorado.
 *
 * Comando "limpar": zera o texto confirmado e o parcial, e chama `onClear`.
 * Avisos (sem suporte, permissão negada, erro) saem como toast; o campo segue editável.
 */
export function useVoiceInput({ onTranscript, onClear, onEnd }: UseVoiceInputOptions) {
  const [listening, setListening] = useState(false)
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null)
  const restartTimerRef = useRef<number | null>(null)
  // Intenção do usuário: microfone ligado até que ele toque no botão de novo
  const shouldListenRef = useRef(false)
  // Trechos finais já confirmados nesta ditadura (sobrevive a reinícios do stream)
  const committedRef = useRef('')
  // Parcial atual (interim) — substituído a cada evento
  const interimRef = useRef('')
  // Quantidade de resultados já confirmados na instância atual do reconhecimento
  const finalizedCountRef = useRef(0)
  // Trecho confirmado no onend (parcial pendente); evita reemissão na instância seguinte
  const pendingEndRef = useRef<string | null>(null)
  const failuresRef = useRef(0)
  const callbacksRef = useRef({ onTranscript, onClear, onEnd })
  const beginRef = useRef<() => void>(() => {})

  useEffect(() => {
    callbacksRef.current = { onTranscript, onClear, onEnd }
  })

  const clearRestartTimer = useCallback(() => {
    if (restartTimerRef.current !== null) {
      window.clearTimeout(restartTimerRef.current)
      restartTimerRef.current = null
    }
  }, [])

  /** Texto completo da ditadura até agora: confirmados + parcial atual. */
  const buildText = () =>
    [committedRef.current.trim(), interimRef.current.trim()].filter(Boolean).join(' ')

  /** Comando "limpar": esvazia o que foi confirmado e o parcial. */
  const clearField = () => {
    committedRef.current = ''
    callbacksRef.current.onClear?.()
  }

  /** Encerra de vez (usuário parou ou desistiu após falhas). */
  const finish = useCallback(() => {
    clearRestartTimer()
    shouldListenRef.current = false
    recognitionRef.current = null
    setListening(false)
    const finalText = buildText()
    interimRef.current = ''
    callbacksRef.current.onEnd?.(finalText)
  }, [clearRestartTimer])

  /** Confirma um trecho final exatamente uma vez (aplica o comando "limpar", se houver). */
  const commitFinal = (segment: string, fromEnd: boolean) => {
    const raw = segment.trim()
    if (!raw) return
    // Reemissão do mesmo trecho logo após o reinício do stream: ignora
    if (!fromEnd && pendingEndRef.current !== null && raw === pendingEndRef.current) {
      pendingEndRef.current = null
      return
    }
    pendingEndRef.current = fromEnd ? raw : null

    let seg = raw
    const afterClear = textAfterClearCommand(seg)
    if (afterClear !== null) {
      clearField()
      seg = afterClear
    }
    if (!seg) return
    committedRef.current = committedRef.current ? `${committedRef.current.trimEnd()} ${seg}` : seg
  }

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
      }, 250)
    }

    beginRef.current = () => {
      clearRestartTimer()
      if (!shouldListenRef.current) return
      const Ctor = getSpeechRecognitionCtor()
      if (!Ctor) {
        finish()
        return
      }

      // Encerra instância anterior, se alguma tiver sobrado
      try {
        recognitionRef.current?.abort()
      } catch {
        // ignora
      }

      // Nova instância = nova lista de resultados começando em 0
      finalizedCountRef.current = 0

      const recognition = new Ctor()
      recognition.lang = 'pt-BR'
      recognition.continuous = true
      recognition.interimResults = true
      recognition.maxAlternatives = 1

      recognition.onresult = (event) => {
        failuresRef.current = 0
        // Só lê a partir do primeiro resultado ainda não confirmado.
        const startIdx = Math.max(event.resultIndex, finalizedCountRef.current)
        let interim = ''
        for (let i = startIdx; i < event.results.length; i++) {
          const result = event.results[i]
          const transcript = (result?.[0]?.transcript ?? '').trim()
          if (!transcript) continue
          if (result.isFinal) {
            finalizedCountRef.current = i + 1
            commitFinal(transcript, false)
            interim = ''
          } else if (i >= event.resultIndex) {
            interim = interim ? `${interim} ${transcript}` : transcript
          }
        }
        // Comando "limpar" no parcial: descarta o que veio antes dele.
        const afterClear = textAfterClearCommand(interim)
        if (afterClear !== null) {
          clearField()
          interim = afterClear
        }
        // O parcial substitui o rascunho anterior — nunca é concatenado.
        interimRef.current = interim.trim()
        const text = buildText()
        if (text) callbacksRef.current.onTranscript(text)
      }

      recognition.onerror = (event) => {
        const error = event.error
        if (error === 'not-allowed' || error === 'service-not-allowed') {
          toast({
            title: 'Permissão do microfone negada',
            description:
              'Libere o microfone nas configurações do navegador para usar o comando de voz. O cadastro segue funcionando normalmente por digitação.',
            variant: 'destructive',
          })
          // Erro fatal: SEM reinício — se o timer de reinício continuar ativo,
          // uma SEGUNDA instância de recognition começa a ouvir em paralelo e
          // reemite os resultados, duplicando o texto ditado.
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
        // Stream encerrado com parcial pendente: confirma o parcial para não perder a fala.
        if (interimRef.current) {
          const pending = interimRef.current
          interimRef.current = ''
          commitFinal(pending, true)
          const text = buildText()
          if (text) callbacksRef.current.onTranscript(text)
        }
        // No Android o stream é encerrado com frequência: reinicia preservando
        // o texto já confirmado (committedRef), sem reappend.
        scheduleRestart()
      }

      recognitionRef.current = recognition
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

    return () => {
      shouldListenRef.current = false
      if (restartTimerRef.current !== null) {
        window.clearTimeout(restartTimerRef.current)
        restartTimerRef.current = null
      }
      const recognition = recognitionRef.current
      recognitionRef.current = null
      try {
        recognition?.abort()
      } catch {
        // ignora
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

    // Ditadura nova: zera os trechos confirmados uma única vez, no início.
    committedRef.current = ''
    interimRef.current = ''
    pendingEndRef.current = null
    finalizedCountRef.current = 0
    failuresRef.current = 0
    shouldListenRef.current = true
    setListening(true)
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
