import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from '@/hooks/use-toast'

// Tipos mínimos da Web Speech API (o lib.dom do TypeScript não os traz completos)
interface SpeechAlternativeLike {
  transcript: string
}
interface SpeechResultLike {
  readonly length: number
  [index: number]: SpeechAlternativeLike
}
interface SpeechResultListLike {
  readonly length: number
  [index: number]: SpeechResultLike
}
interface SpeechResultEventLike {
  results: SpeechResultListLike
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
  /** Recebe o texto reconhecido desde o início da escuta (final + parcial). */
  onTranscript: (text: string) => void
  /** Chamado quando a escuta termina, com o último texto reconhecido. */
  onEnd?: (text: string) => void
}

/**
 * Reconhecimento de voz em pt-BR via Web Speech API.
 * Avisos (sem suporte, permissão negada, erro) saem como toast; o campo segue editável.
 */
export function useVoiceInput({ onTranscript, onEnd }: UseVoiceInputOptions) {
  const [listening, setListening] = useState(false)
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null)
  const lastTextRef = useRef('')
  const callbacksRef = useRef({ onTranscript, onEnd })

  useEffect(() => {
    callbacksRef.current = { onTranscript, onEnd }
  })

  useEffect(() => {
    return () => {
      const recognition = recognitionRef.current
      recognitionRef.current = null
      recognition?.abort()
    }
  }, [])

  const start = useCallback(() => {
    if (recognitionRef.current) return
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

    const recognition = new Ctor()
    recognition.lang = 'pt-BR'
    recognition.continuous = true
    recognition.interimResults = true
    recognition.maxAlternatives = 1

    recognition.onresult = (event) => {
      let text = ''
      for (let i = 0; i < event.results.length; i++) {
        text += event.results[i][0].transcript
      }
      lastTextRef.current = text.trim()
      callbacksRef.current.onTranscript(lastTextRef.current)
    }

    recognition.onerror = (event) => {
      const error = event.error
      if (error === 'no-speech' || error === 'aborted') return
      if (error === 'not-allowed' || error === 'service-not-allowed') {
        toast({
          title: 'Permissão do microfone negada',
          description:
            'Libere o microfone nas configurações do navegador para usar o comando de voz. O cadastro segue funcionando normalmente por digitação.',
          variant: 'destructive',
        })
      } else if (error === 'audio-capture') {
        toast({
          title: 'Microfone não encontrado',
          description:
            'Verifique se há um microfone conectado. O cadastro segue funcionando normalmente por digitação.',
          variant: 'destructive',
        })
      } else {
        toast({
          title: 'Não foi possível ouvir',
          description:
            'Ocorreu um erro no reconhecimento de voz. Tente novamente ou digite normalmente.',
          variant: 'destructive',
        })
      }
    }

    recognition.onend = () => {
      if (recognitionRef.current !== recognition) return
      recognitionRef.current = null
      setListening(false)
      const finalText = lastTextRef.current
      lastTextRef.current = ''
      callbacksRef.current.onEnd?.(finalText)
    }

    recognitionRef.current = recognition
    lastTextRef.current = ''
    try {
      recognition.start()
      setListening(true)
    } catch {
      recognitionRef.current = null
      setListening(false)
      toast({
        title: 'Não foi possível iniciar o microfone',
        description: 'Tente novamente ou digite normalmente.',
        variant: 'destructive',
      })
    }
  }, [])

  const stop = useCallback(() => {
    recognitionRef.current?.stop()
  }, [])

  const toggle = useCallback(() => {
    if (recognitionRef.current) stop()
    else start()
  }, [start, stop])

  return { listening, start, stop, toggle, supported: isVoiceInputSupported() }
}
