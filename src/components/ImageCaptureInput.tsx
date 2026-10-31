import React, { useRef, useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Camera,
  Upload,
  Trash2,
  Image as ImageIcon,
  Check,
  Video,
  X,
  RefreshCw,
} from 'lucide-react'
import { toast } from '@/hooks/use-toast'

interface ImageCaptureInputProps {
  value: string
  onChange: (value: string) => void
  label?: string
  description?: string
  placeholder?: string
  aspectRatio?: 'square' | 'portrait' | 'landscape'
  previewShape?: 'circle' | 'rounded'
  className?: string
  showUrlInput?: boolean
}

/**
 * Converte um arquivo ou blob de imagem para uma string Base64 (data:image/jpeg;base64,...),
 * redimensionando proporcionalmente para no máximo 1200px de largura/altura com compressão leve,
 * garantindo economia de armazenamento no PocketBase sem perda perceptível de qualidade.
 */
function processImageFile(file: File | Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('Erro ao ler o arquivo de imagem.'))
    reader.onload = () => {
      const dataUrl = reader.result as string
      const img = new Image()
      img.onerror = () => reject(new Error('Não foi possível decodificar a imagem.'))
      img.onload = () => {
        // Redimensiona para foto de perfil / capa (no máximo 800px no maior lado)
        // proporcionando alta nitidez e tamanho em base64 muito bem controlado
        const MAX_SIZE = 800
        let { width, height } = img

        if (width > MAX_SIZE || height > MAX_SIZE) {
          if (width > height) {
            height = Math.round((height * MAX_SIZE) / width)
            width = MAX_SIZE
          } else {
            width = Math.round((width * MAX_SIZE) / height)
            height = MAX_SIZE
          }
        }

        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          resolve(dataUrl)
          return
        }

        ctx.drawImage(img, 0, 0, width, height)
        // Sempre codifica em JPEG 0.80 para fotos com excelente fidelidade visual e payload enxuto
        const compressed = canvas.toDataURL('image/jpeg', 0.8)
        resolve(compressed)
      }
      img.src = dataUrl
    }
    reader.readAsDataURL(file)
  })
}

export const ImageCaptureInput: React.FC<ImageCaptureInputProps> = ({
  value,
  onChange,
  label = 'Foto / Imagem',
  description,
  placeholder = 'https://... ou cole/capture uma imagem',
  aspectRatio = 'square',
  previewShape = 'rounded',
  className = '',
  showUrlInput = true,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const [webcamOpen, setWebcamOpen] = useState(false)
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment')

  // Escuta evento de paste quando o container está em foco ou com o mouse sobre ele
  useEffect(() => {
    const handlePaste = async (e: ClipboardEvent) => {
      if (!containerRef.current) return
      // Verifica se o evento aconteceu dentro do nosso container ou se o container está ativo
      const isTargetInside = containerRef.current.contains(e.target as Node)
      if (!isTargetInside) return

      const items = e.clipboardData?.items
      if (!items) return

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.startsWith('image/')) {
          e.preventDefault()
          const file = items[i].getAsFile()
          if (file) {
            try {
              const base64 = await processImageFile(file)
              onChange(base64)
            } catch (err: any) {
              toast({
                title: 'Erro ao colar imagem',
                description: err?.message || 'Arquivo de imagem inválido.',
                variant: 'destructive',
              })
            }
          }
          break
        }
      }
    }

    window.addEventListener('paste', handlePaste)
    return () => window.removeEventListener('paste', handlePaste)
  }, [onChange])

  // Desliga webcam ao desmontar ou fechar
  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop())
      }
    }
  }, [stream])

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      const base64 = await processImageFile(file)
      onChange(base64)
      toast({
        title: 'Foto carregada!',
        description: 'Imagem pronta para salvar.',
      })
    } catch (err: any) {
      toast({
        title: 'Erro ao carregar imagem',
        description: err?.message,
        variant: 'destructive',
      })
    } finally {
      if (e.target) e.target.value = ''
    }
  }

  // Tenta abrir câmera web interativa ou fallback para input capture
  const handleOpenCamera = () => {
    // Se for celular / toque, o input com capture="environment" é mais confiável e nativo
    const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0
    if (isTouch && cameraInputRef.current) {
      cameraInputRef.current.click()
      return
    }

    // Se estiver em desktop ou o usuário quiser, tenta getUserMedia
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      startWebcam(facingMode)
    } else if (cameraInputRef.current) {
      cameraInputRef.current.click()
    } else {
      toast({
        title: 'Câmera não suportada',
        description:
          'Seu navegador não tem suporte direto à câmera. Use a opção de Enviar arquivo.',
        variant: 'destructive',
      })
    }
  }

  const startWebcam = async (mode: 'user' | 'environment') => {
    try {
      if (stream) {
        stream.getTracks().forEach((t) => t.stop())
      }
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: mode,
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      })
      setStream(mediaStream)
      setWebcamOpen(true)
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream
          videoRef.current.play().catch(console.error)
        }
      }, 100)
    } catch (err: any) {
      console.warn('Erro ao abrir webcam, usando input nativo:', err)
      // Fallback para input capture
      if (cameraInputRef.current) {
        cameraInputRef.current.click()
      } else {
        toast({
          title: 'Permissão de câmera negada',
          description:
            'Permita o acesso à câmera no navegador ou utilize a opção de Enviar arquivo.',
          variant: 'destructive',
        })
      }
    }
  }

  const handleCaptureWebcamPhoto = () => {
    if (!videoRef.current) return
    const video = videoRef.current
    const canvas = document.createElement('canvas')
    let w = video.videoWidth || 640
    let h = video.videoHeight || 480
    const MAX_DIM = 800
    if (w > MAX_DIM || h > MAX_DIM) {
      if (w > h) {
        h = Math.round((h * MAX_DIM) / w)
        w = MAX_DIM
      } else {
        w = Math.round((w * MAX_DIM) / h)
        h = MAX_DIM
      }
    }
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.drawImage(video, 0, 0, w, h)
    const base64 = canvas.toDataURL('image/jpeg', 0.8)
    onChange(base64)

    // Fecha webcam
    closeWebcam()
    toast({
      title: 'Foto capturada!',
      description: 'Imagem da câmera pronta para salvar.',
    })
  }

  const closeWebcam = () => {
    if (stream) {
      stream.getTracks().forEach((t) => t.stop())
      setStream(null)
    }
    setWebcamOpen(false)
  }

  const toggleFacingMode = () => {
    const nextMode = facingMode === 'environment' ? 'user' : 'environment'
    setFacingMode(nextMode)
    startWebcam(nextMode)
  }

  const handleRemoveImage = () => {
    onChange('')
  }

  return (
    <div ref={containerRef} className={`space-y-2 ${className}`}>
      {/* Inputs ocultos para Câmera e Upload de Arquivo */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileSelect}
      />
      {/* capture="environment" abre câmera traseira/principal no celular */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFileSelect}
      />

      {label && (
        <div className="flex items-center justify-between">
          <Label className="text-xs font-medium flex items-center gap-1.5 text-slate-800 dark:text-slate-200">
            <ImageIcon className="h-3.5 w-3.5 text-indigo-500" />
            {label}
          </Label>
          {description && <span className="text-[11px] text-muted-foreground">{description}</span>}
        </div>
      )}

      {/* Modal / Área inline de Câmera Web ativa */}
      {webcamOpen && (
        <div className="p-3 border rounded-xl bg-slate-950 text-white space-y-2 shadow-lg">
          <div className="flex items-center justify-between text-xs pb-1 border-b border-slate-800">
            <span className="flex items-center gap-1 font-semibold text-emerald-400">
              <Video className="h-3.5 w-3.5 animate-pulse" />
              Câmera ativa
            </span>
            <div className="flex items-center gap-1">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={toggleFacingMode}
                className="h-6 px-2 text-[11px] text-slate-300 hover:text-white hover:bg-slate-800"
                title="Trocar câmera"
              >
                <RefreshCw className="h-3 w-3 mr-1" />
                Inverter
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={closeWebcam}
                className="h-6 w-6 text-slate-400 hover:text-white"
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>

          <div className="relative rounded-lg overflow-hidden bg-black aspect-4/3 flex items-center justify-center max-h-64 mx-auto">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
          </div>

          <div className="flex items-center justify-center gap-2 pt-1">
            <Button
              type="button"
              size="sm"
              onClick={handleCaptureWebcamPhoto}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-8 px-4"
            >
              <Camera className="h-3.5 w-3.5 mr-1.5" />
              Tirar Foto Agora
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={closeWebcam}
              className="text-xs h-8 text-slate-300 border-slate-700 hover:bg-slate-800"
            >
              Cancelar
            </Button>
          </div>
        </div>
      )}

      {/* Caixa de visualização e botões de ação rápida */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        {/* Pré-visualização da imagem */}
        <div
          className={`shrink-0 overflow-hidden border bg-slate-100 dark:bg-slate-800 flex items-center justify-center relative shadow-xs transition-all ${
            previewShape === 'circle' ? 'rounded-full' : 'rounded-lg'
          } ${
            aspectRatio === 'portrait'
              ? 'w-16 h-22 sm:w-20 sm:h-28'
              : aspectRatio === 'landscape'
                ? 'w-24 h-16 sm:w-28 sm:h-20'
                : 'w-16 h-16 sm:w-20 sm:h-20'
          }`}
        >
          {value ? (
            <>
              <img
                src={value}
                alt="Pré-visualização"
                className="h-full w-full object-cover"
                onError={(e) => {
                  ;(e.target as HTMLElement).style.display = 'none'
                }}
              />
              <button
                type="button"
                onClick={handleRemoveImage}
                title="Remover foto"
                className="absolute top-1 right-1 bg-black/60 hover:bg-rose-600 text-white p-1 rounded-full transition-colors"
              >
                <X className="h-3 w-3" />
              </button>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center text-slate-400 p-2 text-center">
              <ImageIcon className="h-5 w-5 mb-0.5 opacity-60" />
              <span className="text-[9px] uppercase tracking-wider font-semibold opacity-70">
                Sem foto
              </span>
            </div>
          )}
        </div>

        {/* Opções de captura + Botões */}
        <div className="flex-1 w-full space-y-2">
          <div className="flex flex-wrap items-center gap-1.5">
            {/* Opção 1: Câmera */}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleOpenCamera}
              className="text-xs h-8 px-2.5 bg-white dark:bg-slate-900 border-indigo-200 dark:border-indigo-900 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300"
            >
              <Camera className="h-3.5 w-3.5 mr-1 text-indigo-600" />
              Tirar Foto
            </Button>

            {/* Opção 2: Enviar arquivo (upload do dispositivo) */}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              className="text-xs h-8 px-2.5 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              <Upload className="h-3.5 w-3.5 mr-1 text-slate-600 dark:text-slate-400" />
              Enviar Arquivo
            </Button>

            {/* Limpar caso tenha imagem */}
            {value && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleRemoveImage}
                className="text-xs h-8 px-2 text-rose-600 hover:bg-rose-50 hover:text-rose-700"
              >
                <Trash2 className="h-3.5 w-3.5 mr-1" />
                Remover
              </Button>
            )}
          </div>

          {/* Campo de URL / texto (para manter compatibilidade com links e permitir colagem direta) */}
          {showUrlInput && (
            <div className="relative">
              <Input
                placeholder={placeholder}
                value={
                  value.startsWith('data:image/') ? '[Foto capturada / imagem importada]' : value
                }
                onChange={(e) => onChange(e.target.value)}
                readOnly={value.startsWith('data:image/')}
                className="text-xs h-8 pr-8 text-slate-700 dark:text-slate-300"
              />
              {value && (
                <div className="absolute right-2.5 top-1/2 -translate-y-1/2 text-emerald-600">
                  <Check className="h-3.5 w-3.5" />
                </div>
              )}
            </div>
          )}

          <p className="text-[10px] text-muted-foreground">
            Dica: no celular use <strong>Tirar Foto</strong> para abrir a câmera; no computador você
            também pode copiar qualquer imagem e pressionar <strong>Ctrl+V</strong> para colar.
          </p>
        </div>
      </div>
    </div>
  )
}

export default ImageCaptureInput
