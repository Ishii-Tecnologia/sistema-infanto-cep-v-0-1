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

interface UseVoiceInputOptions {
  /** Recebe o texto reconhecido até o momento (trechos finais + parcial atual). */
  onTranscript: (text: string) => void
  /** Chamado quando a escuta termina de vez (microfone desligado), com o texto final. */
  onEnd?: (text: string) => void
}

/**
 * Reconhecimento de voz em pt-BR via Web Speech API.
 *
 * Correção para duplicação no celular (Chrome/Android):
 * - o texto confirmado (`isFinal`) é guardado uma única vez, lendo apenas os
 *   resultados a partir de `event.resultIndex` — o Chrome no Android reemite a
 *   lista de resultados (às vezes refeita do zero) quando o stream reinicia,
 *   e concatenar a lista inteira a cada evento duplicava as falas;
 * - o resultado parcial (interim) SUBSTITUI o rascunho anterior, nunca soma;
 * - o Android encerra o stream com frequência: no `onend` o reconhecimento é
 *   reiniciado automaticamente preservando o texto já confirmado, sem reappend.
 * Avisos (sem suporte, permissão negada, erro) saem como toast; o campo segue editável.
 */
export function useVoiceInput({ onTranscript, onEnd }: UseVoiceInputOptions) {
  const [listening, setListening] = useState(false)
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null)
  const restartTimerRef = useRef<number | null>(null)
  // Intenção do usuário: microfone ligado até que ele toque no botão de novo
  const shouldListenRef = useRef(false)
  // Trechos finais já confirmados nesta ditadura (sobrevive a reinícios do stream)
  const committedRef = useRef('')
  // Parcial atual (interim) — substituído a cada evento
  const interimRef = useRef('')
  // Quantidade de resultados já confirmados como final na lista atual
  const finalizedCountRef = useRef(0)
  // Último trecho final confirmado (proteção contra reemissão duplicada do Chrome)
  const lastFinalRef = useRef('')
  // true quando o último evento trouxe parcial (o final correspondente ainda não veio)
  const hadInterimRef = useRef(false)
  const failuresRef = useRef(0)
  const callbacksRef = useRef({ onTranscript, onEnd })
  const beginRef = useRef<() => void>(() => {})

  useEffect(() => {
    callbacksRef.current = { onTranscript, onEnd }
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

  /** Confirma um trecho final exatamente uma vez. */
  const commitFinal = (segment: string) => {
    const seg = segment.trim()
    if (!seg) return
    // Chrome (Android) pode reemitir o mesmo trecho final já confirmado sem que
    // tenha havido parcial novo entre os eventos: nesse caso, ignora.
    if (seg === lastFinalRef.current && !hadInterimRef.current) return
    lastFinalRef.current = seg
    hadInterimRef.current = false
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

      const recognition = new Ctor()
      recognition.lang = 'pt-BR'
      recognition.continuous = true
      recognition.interimResults = true
      recognition.maxAlternatives = 1

      recognition.onresult = (event) => {
        failuresRef.current = 0
        // Reinício do stream (Android): a lista de resultados volta ao início
        // com apenas o áudio novo — não há o que já tenha sido confirmado nela.
        if (event.results.length <= finalizedCountRef.current) {
          finalizedCountRef.current = 0
        }
        // Só lê a partir do primeiro resultado ainda não confirmado: reprocessar
        // a lista inteira é o que duplicava o texto no celular.
        const startIdx = Math.max(event.resultIndex, finalizedCountRef.current)
        let interim = ''
        for (let i = startIdx; i < event.results.length; i++) {
          const result = event.results[i]
          const transcript = (result?.[0]?.transcript ?? '').trim()
          if (!transcript) continue
          if (result.isFinal) {
            finalizedCountRef.current = i + 1
            commitFinal(transcript)
            interim = ''
          } else {
            interim = interim ? `${interim} ${transcript}` : transcript
            hadInterimRef.current = true
          }
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
          shouldListenRef.current = false
          return
        }
        // 'no-speech', 'aborted', 'network' etc.: o onend cuida do reinício.
      }

      recognition.onend = () => {
        if (recognitionRef.current !== recognition) return
        recognitionRef.current = null
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
    lastFinalRef.current = ''
    finalizedCountRef.current = 0
    hadInterimRef.current = false
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
