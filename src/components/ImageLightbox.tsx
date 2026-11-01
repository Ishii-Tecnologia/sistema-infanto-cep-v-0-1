import React, { useEffect } from 'react'
import { X, ZoomIn, Download } from 'lucide-react'

export interface ImageLightboxProps {
  src: string | null
  alt?: string
  title?: string
  description?: string
  onClose: () => void
}

export const ImageLightbox: React.FC<ImageLightboxProps> = ({
  src,
  alt = 'Foto ampliada',
  title,
  description,
  onClose,
}) => {
  useEffect(() => {
    if (!src) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        onClose()
      }
    }

    window.addEventListener('keydown', handleKeyDown, true)
    return () => window.removeEventListener('keydown', handleKeyDown, true)
  }, [src, onClose])

  if (!src) return null

  const handleDownload = () => {
    try {
      const link = document.createElement('a')
      link.href = src
      link.download = `${(title || alt || 'foto').toLowerCase().replace(/\s+/g, '_')}.jpg`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } catch {
      window.open(src, '_blank')
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title || alt || 'Visualização ampliada da foto'}
      className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-sm animate-in fade-in-0 duration-200 select-none"
      onClick={onClose}
    >
      {/* Botão de Fechar no topo direito */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          onClose()
        }}
        aria-label="Fechar visualização"
        className="absolute top-4 right-4 z-[102] p-2 rounded-full bg-white/10 hover:bg-white/25 text-white transition-colors border border-white/20 shadow-lg focus:outline-none focus:ring-2 focus:ring-white/50"
      >
        <X className="h-5 w-5 sm:h-6 sm:w-6" />
      </button>

      {/* Botão de Download / Salvar no topo */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          handleDownload()
        }}
        title="Baixar imagem"
        aria-label="Baixar imagem"
        className="absolute top-4 right-16 sm:right-18 z-[102] p-2 rounded-full bg-white/10 hover:bg-white/25 text-white transition-colors border border-white/20 shadow-lg focus:outline-none focus:ring-2 focus:ring-white/50"
      >
        <Download className="h-5 w-5 sm:h-6 sm:w-6" />
      </button>

      {/* Container da imagem */}
      <div
        className="relative max-w-4xl max-h-[88vh] flex flex-col items-center justify-center z-[101]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative rounded-2xl overflow-hidden bg-black/40 border border-white/15 shadow-2xl flex items-center justify-center max-w-full max-h-[82vh]">
          <img
            src={src}
            alt={alt}
            className="max-h-[75vh] sm:max-h-[80vh] max-w-[92vw] sm:max-w-[85vw] object-contain rounded-xl select-none"
          />
        </div>

        {(title || description) && (
          <div className="mt-3 px-4 py-2 rounded-lg bg-black/70 border border-white/15 text-center text-white backdrop-blur-md max-w-md">
            {title && <p className="text-sm font-semibold truncate">{title}</p>}
            {description && <p className="text-xs text-slate-300 mt-0.5 truncate">{description}</p>}
          </div>
        )}
      </div>
    </div>
  )
}

export default ImageLightbox
