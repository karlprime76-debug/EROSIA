'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { ArrowLeft, Camera, Loader, X, AlertCircle } from 'lucide-react'
import Image from 'next/image'
import type { CreateEventInput, EventCategory } from '@/lib/events'
import { EVENT_CATEGORIES } from '@/lib/events'
import { FocusTrap } from '@/components/FocusTrap'
import { useToast } from '@/components/Toast'
import { validateFile } from '@/lib/media'

interface EventFormProps {
  onSubmit: (input: CreateEventInput, file?: File) => Promise<void>
  onClose: () => void
}

export function EventForm({ onSubmit, onClose }: EventFormProps) {
  const { toast } = useToast()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [location, setLocation] = useState('')
  const [eventDate, setEventDate] = useState('')
  const [maxParticipants, setMaxParticipants] = useState('')
  const [category, setCategory] = useState<EventCategory>('other')
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const fileRef = useRef<HTMLInputElement>(null)

  const handleEscape = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose()
  }, [onClose])

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    document.addEventListener('keydown', handleEscape)
    return () => {
      document.body.style.overflow = ''
      document.removeEventListener('keydown', handleEscape)
    }
  }, [handleEscape])

  useEffect(() => {
    return () => { if (preview) URL.revokeObjectURL(preview) }
  }, [preview])

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (!f) return
    const err = validateFile(f, 'photo')
    if (err) { toast(err, 'error'); e.target.value = ''; return }
    if (preview) URL.revokeObjectURL(preview)
    setFile(f)
    setPreview(URL.createObjectURL(f))
    setErrors(prev => { const { image: _, ...rest } = prev; return rest })
  }

  const removeImage = () => {
    if (preview) URL.revokeObjectURL(preview)
    setFile(null)
    setPreview(null)
    if (fileRef.current) fileRef.current.value = ''
  }

  const validate = (): boolean => {
    const errs: Record<string, string> = {}
    if (!title.trim()) errs.title = 'Le titre est requis'
    if (title.trim().length > 100) errs.title = 'Le titre ne peut pas dépasser 100 caractères'
    if (eventDate && new Date(eventDate) < new Date()) errs.eventDate = 'La date doit être dans le futur'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    setLoading(true)
    try {
      await onSubmit({
        title: title.trim(),
        description: description.trim() || undefined,
        location: location.trim() || undefined,
        event_date: eventDate || undefined,
        max_participants: maxParticipants ? parseInt(maxParticipants, 10) : undefined,
        category: category === 'other' ? undefined : category,
      }, file ?? undefined)
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Erreur lors de la création', 'error')
    } finally {
      setLoading(false)
    }
  }

  const today = new Date().toISOString().slice(0, 16)

  return (
    <div className="fixed inset-0 z-[60] bg-[rgba(0,0,0,0.6)] backdrop-blur-sm flex items-end sm:items-center justify-center" role="dialog" aria-modal="true" onClick={onClose}>
      <FocusTrap><div className="bg-[var(--card)] w-full max-w-lg rounded-t-3xl sm:rounded-3xl max-h-[90vh] flex flex-col border border-[var(--border)]" onClick={e => e.stopPropagation()}>
        <div className="sticky top-0 bg-[var(--card)] z-10 flex items-center gap-3 px-5 pt-4 pb-3 border-b border-[var(--border)] shrink-0">
          <button type="button" onClick={onClose} aria-label="Fermer" className="p-2.5 rounded-xl">
            <ArrowLeft size={20} />
          </button>
          <h2 className="font-semibold">Nouvel événement</h2>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {/* Image */}
            <div>
              {preview ? (
                <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-[var(--surfaceElevated)]">
                  <Image src={preview} alt="Aperçu de l'événement" fill className="object-cover" sizes="200px" />
                  <button type="button" onClick={removeImage} aria-label="Supprimer l'image" className="absolute top-2 right-2 w-11 h-11 rounded-full bg-black/50 flex items-center justify-center">
                    <X size={16} />
                  </button>
                </div>
              ) : (
                <button type="button" onClick={() => fileRef.current?.click()} className="w-full aspect-video rounded-xl border-2 border-dashed border-[var(--border)] flex flex-col items-center justify-center gap-2 text-[var(--textSecondary)] hover:border-[var(--primary)]/40 transition">
                  <Camera size={24} />
                  <span className="text-xs">Ajouter une image</span>
                </button>
              )}
              <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} className="hidden" />
            </div>

            {/* Title */}
            <div>
              <label className="text-[11px] font-medium text-[var(--textSecondary)] uppercase tracking-wider">Titre *</label>
              <input
                type="text"
                value={title}
                onChange={e => { setTitle(e.target.value); if (errors.title) setErrors(prev => { const { title: _, ...rest } = prev; return rest }) }}
                maxLength={100}
                className={`w-full bg-[var(--surfaceElevated)] rounded-xl px-4 py-2.5 text-sm mt-1 outline-none focus:ring-1 transition ${
                  errors.title ? 'ring-1 ring-red-500' : 'focus:ring-[var(--primary)]'
                }`}
                placeholder="Soirée bowling, Brunch..."
              />
              {errors.title && (
                <p className="text-red-500 text-xs mt-1 flex items-center gap-1"><AlertCircle size={12} />{errors.title}</p>
              )}
            </div>

            {/* Description */}
            <div>
              <label className="text-[11px] font-medium text-[var(--textSecondary)] uppercase tracking-wider">Description</label>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                maxLength={500}
                rows={3}
                className="w-full bg-[var(--surfaceElevated)] rounded-xl px-4 py-2.5 text-sm mt-1 outline-none focus:ring-1 focus:ring-[var(--primary)] resize-none"
                placeholder="Décris ton événement..."
              />
            </div>

            {/* Category */}
            <div>
              <label className="text-[11px] font-medium text-[var(--textSecondary)] uppercase tracking-wider">Catégorie</label>
              <div className="flex flex-wrap gap-1.5 mt-1.5">
                {EVENT_CATEGORIES.map(cat => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setCategory(cat)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition ${
                      category === cat
                        ? 'bg-primary/20 text-primary border border-[var(--primary)]/30'
                        : 'bg-[var(--surfaceElevated)] text-[var(--textSecondary)] border border-transparent hover:border-[var(--border)]'
                    }`}
                  >
                    {cat === 'sport' && '⚽ '}{cat === 'culture' && '🎨 '}{cat === 'food' && '🍽️ '}
                    {cat === 'music' && '🎵 '}{cat === 'travel' && '✈️ '}{cat === 'games' && '🎮 '}
                    {cat === 'workshop' && '🔧 '}{cat === 'other' && '📌 '}
                    {cat === 'other' ? 'Autre' : cat.charAt(0).toUpperCase() + cat.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* Location */}
            <div>
              <label className="text-[11px] font-medium text-[var(--textSecondary)] uppercase tracking-wider">Lieu</label>
              <input
                type="text"
                value={location}
                onChange={e => setLocation(e.target.value)}
                className="w-full bg-[var(--surfaceElevated)] rounded-xl px-4 py-2.5 text-sm mt-1 outline-none focus:ring-1 focus:ring-[var(--primary)]"
                placeholder="Paris 11e, Chez Michel..."
              />
            </div>

            {/* Date */}
            <div>
              <label className="text-[11px] font-medium text-[var(--textSecondary)] uppercase tracking-wider">Date</label>
              <input
                type="datetime-local"
                value={eventDate}
                onChange={e => { setEventDate(e.target.value); if (errors.eventDate) setErrors(prev => { const { eventDate: _, ...rest } = prev; return rest }) }}
                min={today}
                className={`w-full bg-[var(--surfaceElevated)] rounded-xl px-4 py-2.5 text-sm mt-1 outline-none focus:ring-1 transition ${
                  errors.eventDate ? 'ring-1 ring-red-500' : 'focus:ring-[var(--primary)]'
                } text-[var(--textPrimary)]`}
              />
              {errors.eventDate && (
                <p className="text-red-500 text-xs mt-1 flex items-center gap-1"><AlertCircle size={12} />{errors.eventDate}</p>
              )}
            </div>

            {/* Max participants */}
            <div>
              <label className="text-[11px] font-medium text-[var(--textSecondary)] uppercase tracking-wider">Participants max</label>
              <input
                type="number"
                value={maxParticipants}
                onChange={e => setMaxParticipants(e.target.value)}
                min={2}
                max={1000}
                className="w-full bg-[var(--surfaceElevated)] rounded-xl px-4 py-2.5 text-sm mt-1 outline-none focus:ring-1 focus:ring-[var(--primary)]"
                placeholder="Illimité"
              />
            </div>
          </div>

          <div className="sticky bottom-0 bg-[var(--card)] z-10 border-t border-[var(--border)] px-5 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom,80px))] shrink-0">
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[var(--primary)] text-[var(--textOnPrimary)] rounded-xl py-3 text-sm font-semibold flex items-center justify-center gap-2 hover:bg-[var(--primaryLight)] transition disabled:opacity-40"
            >
              {loading && <Loader size={14} className="animate-spin" />}
              {loading ? 'Création...' : 'Créer l\'événement'}
            </button>
          </div>
        </form>
      </div></FocusTrap>
    </div>
  )
}
