import React, { useEffect } from 'react'
import { X } from 'lucide-react'

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

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title || alt || 'Visualização ampliada da foto'}
      className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-sm animate-in fade-in-0 duration-200 select-none"
    >
      {/* Botão de Fechar no topo direito com dica visual 'ESC para fechar' */}
      <div className="absolute top-4 right-4 z-[102] flex items-center gap-2">
        <span className="hidden sm:inline-block px-2.5 py-1 rounded-full text-xs font-medium text-white/80 bg-black/50 border border-white/20 backdrop-blur-md select-none">
          ESC para fechar
        </span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Fechar visualização"
          title="Fechar (ESC)"
          className="p-2 rounded-full bg-white/10 hover:bg-white/25 text-white transition-colors border border-white/20 shadow-lg focus:outline-none focus:ring-2 focus:ring-white/50 cursor-pointer"
        >
          <X className="h-5 w-5 sm:h-6 sm:w-6" />
        </button>
      </div>

      {/* Container da imagem */}
      <div className="relative max-w-4xl max-h-[88vh] flex flex-col items-center justify-center z-[101]">
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

        {/* Dica visível também na parte inferior para telas móveis ou reforço */}
        <p className="sm:hidden text-white/70 text-[11px] mt-2 bg-black/60 px-3 py-1 rounded-full border border-white/15">
          ESC para fechar
        </p>
      </div>
    </div>
  )
}

export default ImageLightbox
