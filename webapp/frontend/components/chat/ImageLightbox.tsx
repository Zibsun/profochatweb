'use client'

import { useEffect, useCallback } from 'react'
import { X, ChevronLeft, ChevronRight } from 'lucide-react'

interface ImageLightboxProps {
  urls: string[]
  index: number
  onClose: () => void
  onNavigate: (index: number) => void
}

export default function ImageLightbox({
  urls,
  index,
  onClose,
  onNavigate,
}: ImageLightboxProps) {
  const hasPrev = index > 0
  const hasNext = index < urls.length - 1

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowLeft' && hasPrev) onNavigate(index - 1)
      if (e.key === 'ArrowRight' && hasNext) onNavigate(index + 1)
    },
    [onClose, onNavigate, index, hasPrev, hasNext]
  )

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
    }
  }, [handleKeyDown])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
      onClick={onClose}
    >
      {/* Close button */}
      <button
        className="absolute top-4 right-4 text-white/80 hover:text-white
          bg-black/40 hover:bg-black/60 rounded-full p-2 transition-colors"
        onClick={onClose}
        aria-label="Закрыть"
      >
        <X size={24} />
      </button>

      {/* Counter */}
      {urls.length > 1 && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 text-white/70
          text-sm bg-black/40 rounded-full px-3 py-1">
          {index + 1} / {urls.length}
        </div>
      )}

      {/* Prev button */}
      {hasPrev && (
        <button
          className="absolute left-4 text-white/80 hover:text-white
            bg-black/40 hover:bg-black/60 rounded-full p-2 transition-colors"
          onClick={(e) => { e.stopPropagation(); onNavigate(index - 1) }}
          aria-label="Предыдущее"
        >
          <ChevronLeft size={32} />
        </button>
      )}

      {/* Image */}
      <img
        src={urls[index]}
        alt={`Image ${index + 1}`}
        className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg shadow-2xl
          select-none"
        style={{ touchAction: 'pinch-zoom' }}
        onClick={(e) => e.stopPropagation()}
        crossOrigin="anonymous"
        draggable={false}
      />

      {/* Next button */}
      {hasNext && (
        <button
          className="absolute right-4 text-white/80 hover:text-white
            bg-black/40 hover:bg-black/60 rounded-full p-2 transition-colors"
          onClick={(e) => { e.stopPropagation(); onNavigate(index + 1) }}
          aria-label="Следующее"
        >
          <ChevronRight size={32} />
        </button>
      )}
    </div>
  )
}
