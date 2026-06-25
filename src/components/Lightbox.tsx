'use client'

import { useEffect } from 'react'
import { X, ChevronLeft, ChevronRight } from 'lucide-react'

interface LightboxProps {
  images: string[]
  initialIndex: number
  onClose: () => void
  onPrev?: () => void
  onNext?: () => void
}

export default function Lightbox({ images, initialIndex, onClose }: LightboxProps) {
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => { document.body.style.overflow = ''; window.removeEventListener('keydown', handler) }
  }, [onClose])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-lg" onClick={onClose}>
      <button onClick={onClose} className="absolute top-6 right-6 z-10 p-2.5 rounded-full bg-black/40 text-white hover:bg-white/10 transition">
        <X size={24} />
      </button>

      <div className="flex items-center gap-4 max-w-4xl w-full h-full px-4" onClick={e => e.stopPropagation()}>
        {images.length > 1 && (
          <button onClick={onClose} className="p-2.5 rounded-full bg-black/40 text-white/60 hover:text-white transition shrink-0 hidden sm:block">
            <ChevronLeft size={28} />
          </button>
        )}

        <div className="flex-1 flex items-center justify-center overflow-hidden">
          <img
            src={images[initialIndex]}
            alt=""
            className="max-w-full max-h-[85vh] object-contain rounded-2xl shadow-2xl"
            style={{ filter: 'drop-shadow(0 0 40px rgba(217,45,74,0.15))' }}
          />
        </div>

        {images.length > 1 && (
          <button onClick={onClose} className="p-2.5 rounded-full bg-black/40 text-white/60 hover:text-white transition shrink-0 hidden sm:block">
            <ChevronRight size={28} />
          </button>
        )}
      </div>

      <div className="absolute bottom-8 flex gap-2">
        {images.map((_, i) => (
          <div key={i} className={`w-1.5 h-1.5 rounded-full transition ${i === initialIndex ? 'bg-white' : 'bg-white/20'}`} />
        ))}
      </div>
    </div>
  )
}
