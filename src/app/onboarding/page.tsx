'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { motion, AnimatePresence } from 'motion/react'
import { Camera, Check, ChevronRight, Shield, Sparkles, Image as ImageIcon, Plus, X, Heart, Users, Coffee, Flame } from 'lucide-react'
import { uploadPhoto, updateProfile, completeOnboarding, type LookingFor } from '@/lib/api'
import { validateFile, sanitizeFilename } from '@/lib/media'
import { supabase } from '@/lib/supabase/client'
import { useToast } from '@/components/Toast'
import { Button } from '@/components/ui/button'
import { logger } from '@/lib/logger'

const STEPS = ['Photos', 'Profil', 'Vérification', 'Célébration']

const SUGGESTED_INTERESTS = [
  'Voyage', 'Cuisine', 'Art', 'Musique', 'Cinéma', 
  'Mode', 'Fitness', 'Lecture', 'Jeux Vidéo', 
  'Nature', 'Technologie', 'Photo', 'Animaux'
]

const RELATION_TYPES = [
  { id: 'serious', label: 'Relation sérieuse', desc: 'Pour construire à long terme.', icon: Heart, color: 'var(--primary)' },
  { id: 'casual', label: 'Aventure', desc: 'Des rencontres légères et passionnées.', icon: Flame, color: 'var(--primary-light)' },
  { id: 'fwb', label: 'Complicité & FWB', desc: 'Pas de prise de tête, complicité d’abord.', icon: Coffee, color: 'var(--accent-warm)' },
  { id: 'friendship', label: 'Amitié sincère', desc: 'Rencontrer du monde, partager.', icon: Users, color: 'var(--info)' },
  { id: 'open', label: 'Relation libre', desc: 'Explorer de multiples horizons.', icon: Sparkles, color: 'var(--accent-purple)' },
]

export default function OnboardingPage() {
  const [step, setStep] = useState(0)
  const [userId, setUserId] = useState('')
  const [photos, setPhotos] = useState<string[]>([])
  const [uploading, setUploading] = useState<number | null>(null) // index of uploading photo slot
  const [bio, setBio] = useState('')
  const [selectedInterests, setSelectedInterests] = useState<string[]>([])
  const [customInterest, setCustomInterest] = useState('')
  const [lookingFor, setLookingFor] = useState<string>('serious')
  const [saving, setSaving] = useState(false)
  const [verifPhoto, setVerifPhoto] = useState<string | null>(null)
  const [verifUploading, setVerifUploading] = useState(false)
  const [verifDone, setVerifDone] = useState(false)
  const router = useRouter()
  const { toast } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const verifInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { router.push('/login'); return }
      setUserId(user.id)
      
      // Load initial profile data if exists
      supabase.from('profiles').select('photos, bio, interests, looking_for').eq('id', user.id).maybeSingle()
        .then(({ data }) => {
          if (data) {
            if (data.photos) setPhotos(data.photos)
            if (data.bio) setBio(data.bio)
            if (data.interests) setSelectedInterests(data.interests)
            if (data.looking_for) setLookingFor(data.looking_for)
          }
        })
    }).catch((err) => {
      logger.error('Auth error', { error: String(err) })
      toast('Erreur de chargement', 'error')
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router])

  const handleAddPhoto = async (e: React.ChangeEvent<HTMLInputElement>, slotIndex: number) => {
    const file = e.target.files?.[0]
    if (!file || !userId) return
    
    const verifErr = validateFile(file, 'photo')
    if (verifErr) { toast(verifErr, 'error'); return }

    setUploading(slotIndex)
    try {
      const result = await uploadPhoto(file, userId, slotIndex)
      if (result.error) { toast(result.error, 'error'); return }
      if (result.url) {
        const updatedPhotos = [...photos]
        updatedPhotos[slotIndex] = result.url
        setPhotos(updatedPhotos)
        await updateProfile(userId, { photos: updatedPhotos })
      }
    } catch (err) {
      logger.error('handleAddPhoto error', { error: String(err) })
      toast('Erreur lors de l\'ajout de la photo', 'error')
    } finally {
      setUploading(null)
    }
  }

  const handleDeletePhoto = async (indexToDelete: number) => {
    if (!userId) return
    const updatedPhotos = photos.filter((_, i) => i !== indexToDelete)
    setPhotos(updatedPhotos)
    try {
      await updateProfile(userId, { photos: updatedPhotos })
      toast('Photo supprimée', 'success')
    } catch (err) {
      logger.error('delete photo error', { error: String(err) })
    }
  }

  const handleToggleInterest = (interest: string) => {
    if (selectedInterests.includes(interest)) {
      setSelectedInterests(prev => prev.filter(i => i !== interest))
    } else {
      if (selectedInterests.length >= 8) {
        toast('Maximum 8 centres d\'intérêt', 'warning')
        return
      }
      setSelectedInterests(prev => [...prev, interest])
    }
  }

  const handleAddCustomInterest = (e: React.FormEvent) => {
    e.preventDefault()
    const clean = customInterest.trim()
    if (!clean) return
    if (selectedInterests.includes(clean)) {
      setCustomInterest('')
      return
    }
    if (selectedInterests.length >= 8) {
      toast('Maximum 8 centres d\'intérêt', 'warning')
      return
    }
    setSelectedInterests(prev => [...prev, clean])
    setCustomInterest('')
  }

  const handleFinishProfile = async () => {
    if (!userId) return
    if (!bio.trim()) { toast('Veuillez écrire une courte bio', 'warning'); return }
    if (selectedInterests.length < 3) { toast('Choisissez au moins 3 centres d\'intérêt', 'warning'); return }
    
    setSaving(true)
    try {
      await updateProfile(userId, { 
        bio, 
        interests: selectedInterests, 
        looking_for: lookingFor as LookingFor 
      })
      setStep(2)
    } catch (err) {
      logger.error('handleFinishProfile error', { error: String(err) })
      toast('Erreur lors de la sauvegarde du profil', 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleVerifPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !userId) return
    const verifErr = validateFile(file, 'photo')
    if (verifErr) { toast(verifErr, 'error'); return }
    setVerifUploading(true)
    try {
      const fileName = `verification/${userId}/${Date.now()}_${sanitizeFilename(file.name)}`
      const { error: uploadError } = await supabase.storage.from('verification_photos').upload(fileName, file)
      if (uploadError) { toast(uploadError.message, 'error'); return }
      const { data: urlData } = supabase.storage.from('verification_photos').getPublicUrl(fileName)
      setVerifPhoto(urlData.publicUrl)
      await supabase.from('verification_requests').insert({
        user_id: userId, photo_url: urlData.publicUrl,
      })
      setVerifDone(true)
    } catch (err) {
      logger.error('handleVerifPhoto error', { error: String(err) })
      toast('Erreur lors du téléchargement', 'error')
    } finally {
      setVerifUploading(false)
    }
  }

  const handleComplete = async () => {
    await completeOnboarding()
    router.push('/')
  }

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-theme flex flex-col justify-between py-6 px-4 sm:px-6 lg:px-8">
      {/* Éléments de lueur d'arrière-plan */}
      <div className="pointer-events-none absolute top-10 right-10 w-80 h-80 rounded-full bg-[var(--primary)] blur-[150px] opacity-[0.06]" />
      <div className="pointer-events-none absolute bottom-10 left-10 w-96 h-96 rounded-full bg-[var(--accent-cool)] blur-[150px] opacity-[0.05]" />

      {/* Header, Progression */}
      <header className="relative z-10 w-full max-w-2xl mx-auto flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold text-theme tracking-wide" style={{ fontFamily: 'var(--font-display)' }}>Erosia</span>
            <span className="text-[10px] text-muted uppercase tracking-widest font-semibold px-2 py-0.5 rounded-full bg-surface border border-theme">
              Création
            </span>
          </div>
          {step < 3 && (
            <button 
              type="button" 
              onClick={async () => { await completeOnboarding(); router.push('/') }} 
              className="text-xs font-semibold text-secondary hover:text-theme transition duration-200"
            >
              Passer
            </button>
          )}
        </div>

        {/* Barre de progression */}
        <div className="flex gap-2 w-full pt-2">
          {STEPS.map((stepLabel, idx) => (
            <div key={stepLabel} className="flex-1 flex flex-col gap-1.5">
              <div 
                className={`h-[3px] rounded-full transition-all duration-500 ${
                  idx <= step ? 'bg-gradient-to-r from-[var(--primary)] to-[var(--primary-light)]' : 'bg-surface-elevated'
                }`}
              />
              <span className={`text-[10px] uppercase tracking-wider font-semibold ${
                idx === step ? 'text-theme' : 'text-muted'
              }`}>
                {stepLabel}
              </span>
            </div>
          ))}
        </div>
      </header>

      {/* Content Form Area */}
      <main className="relative z-10 flex-1 max-w-2xl w-full mx-auto flex items-center justify-center py-6 sm:py-8">
        <div className="w-full">
          <AnimatePresence mode="wait">
            {/* ETAPE 1: PHOTOS */}
            {step === 0 && (
              <motion.div
                key="step-photos"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                className="space-y-6"
              >
                <div className="text-center space-y-2">
                  <div className="w-12 h-12 rounded-2xl bg-[var(--primary)]/10 flex items-center justify-center mx-auto border border-[var(--primary)]/20">
                    <ImageIcon size={22} className="text-primary" />
                  </div>
                  <h2 className="text-2xl font-bold text-theme tracking-tight">Ajoute tes plus belles photos</h2>
                  <p className="text-sm text-secondary max-w-md mx-auto">
                    Montre ta vraie personnalité. Ajoute au moins une photo pour commencer à découvrir des profils.
                  </p>
                </div>

                {/* Grid 3x2 premium */}
                <div className="grid grid-cols-3 gap-3.5 max-w-md mx-auto pt-2">
                  {[...Array(6)].map((_, i) => {
                    const photoUrl = photos[i]
                    const isUploading = uploading === i
                    return (
                      <div 
                        key={i} 
                        className={`aspect-[3/4] relative rounded-2xl overflow-hidden border bg-surface backdrop-blur-md transition-all duration-300 ${
                          photoUrl ? 'border-theme' : 'border-dashed border-theme hover:border-[var(--primary)]/30'
                        }`}
                      >
                        {photoUrl ? (
                          <>
                            <Image 
                              src={photoUrl} 
                              alt={`Photo ${i + 1}`} 
                              fill 
                              className="object-cover" 
                              sizes="(max-w-768px) 33vw, 150px"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-[var(--bg)]/50 via-transparent to-transparent opacity-0 hover:opacity-100 transition-opacity duration-200 flex items-end justify-center pb-2.5">
                              <button 
                                type="button"
                                onClick={() => handleDeletePhoto(i)}
                                className="w-7 h-7 rounded-full bg-[var(--bg)]/60 border border-theme flex items-center justify-center text-theme hover:bg-[var(--primary)] hover:border-transparent transition-colors duration-200 active:scale-90"
                              >
                                <X size={14} />
                              </button>
                            </div>
                          </>
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            {isUploading ? (
                              <div className="animate-spin w-6 h-6 border-2 border-[var(--primary)] border-t-transparent rounded-full" />
                            ) : (
                              <button 
                                type="button" 
                                onClick={() => {
                                  if (fileInputRef.current) {
                                    fileInputRef.current.setAttribute('data-slot', String(i))
                                    fileInputRef.current.click()
                                  }
                                }}
                                className="w-9 h-9 rounded-full bg-surface-secondary border border-theme flex items-center justify-center text-secondary hover:text-theme hover:bg-card hover:scale-105 active:scale-95 transition-all duration-200"
                              >
                                <Plus size={16} />
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>

                <input 
                  ref={fileInputRef} 
                  type="file" 
                  accept="image/*" 
                  onChange={(e) => {
                    const slot = Number(fileInputRef.current?.getAttribute('data-slot') ?? '0')
                    handleAddPhoto(e, slot)
                  }} 
                  className="hidden" 
                />

                <div className="pt-4 flex justify-center">
                  <Button 
                    variant="premium" 
                    size="pill-lg" 
                    className="w-full max-w-md text-sm font-semibold tracking-wide"
                    disabled={photos.length === 0}
                    onClick={() => setStep(1)}
                  >
                    {photos.length > 0 ? `Continuer (${photos.length} photo${photos.length > 1 ? 's' : ''})` : 'Ajoute au moins 1 photo'}
                    <ChevronRight size={18} />
                  </Button>
                </div>
              </motion.div>
            )}

            {/* ETAPE 2: PROFILE DETAILS */}
            {step === 1 && (
              <motion.div
                key="step-profile"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                className="space-y-6"
              >
                <div className="text-center space-y-2">
                  <div className="w-12 h-12 rounded-2xl bg-[var(--primary)]/10 flex items-center justify-center mx-auto border border-[var(--primary)]/20">
                    <Sparkles size={20} className="text-primary" />
                  </div>
                  <h2 className="text-2xl font-bold text-theme tracking-tight">Raconte-nous ton histoire</h2>
                  <p className="text-sm text-secondary max-w-md mx-auto">
                    Crée un profil authentique qui captive l&rsquo;attention.
                  </p>
                </div>

                <div className="space-y-5 max-w-md sm:max-w-xl mx-auto pt-2">
                  {/* Bio Area */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <label className="text-xs font-semibold text-secondary uppercase tracking-wider">Bio</label>
                      <span className="text-[10px] font-semibold text-muted">{bio.length}/500</span>
                    </div>
                    <textarea 
                      value={bio} 
                      onChange={e => setBio(e.target.value.slice(0, 500))} 
                      rows={3} 
                      placeholder="Partage tes passions, tes rêves ou une description originale..." 
                      className="w-full px-4 py-3.5 rounded-2xl bg-surface border border-theme text-theme text-sm outline-none focus:border-[var(--primary)] resize-none transition duration-200 placeholder:text-muted focus:shadow-[0_0_20px_var(--primaryGlow)]"
                      aria-label="Bio"
                    />
                  </div>

                  {/* Looking For Card Selector */}
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-secondary uppercase tracking-wider block">Ce que tu cherches</label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {RELATION_TYPES.map((type) => {
                        const Icon = type.icon
                        const isSelected = lookingFor === type.id
                        return (
                          <button
                            key={type.id}
                            type="button"
                            onClick={() => setLookingFor(type.id)}
                            className={`group relative text-left p-4 rounded-2xl border transition-all duration-300 flex items-center gap-3.5 select-none ${
                              isSelected 
                                ? 'bg-gradient-to-r from-[var(--primary)]/10 to-transparent border-[var(--primary)]/40 shadow-[0_4px_24px_var(--primaryGlow)]' 
                                : 'bg-surface border-theme hover:border-[var(--primary)]/30 hover:bg-card'
                            }`}
                          >
                            <div 
                              className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-transform duration-300 group-hover:scale-105"
                              style={{ 
                                backgroundColor: isSelected ? `color-mix(in srgb, ${type.color} 8%, transparent)` : 'color-mix(in srgb, var(--textPrimary) 3%, transparent)',
                                border: `1px solid ${isSelected ? `color-mix(in srgb, ${type.color} 19%, transparent)` : 'color-mix(in srgb, var(--textPrimary) 5%, transparent)'}`
                              }}
                            >
                              <Icon size={16} style={{ color: isSelected ? type.color : 'var(--textSecondary)' }} />
                            </div>
                            <div className="min-w-0">
                              <p className={`text-xs font-semibold ${isSelected ? 'text-theme' : 'text-theme'}`}>{type.label}</p>
                              <p className="text-[10px] text-secondary truncate mt-0.5">{type.desc}</p>
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  {/* Interests Selector */}
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <label className="text-xs font-semibold text-secondary uppercase tracking-wider block">Centres d&rsquo;intérêt</label>
                      <span className="text-[10px] font-semibold text-muted">
                        {selectedInterests.length}/8 sélectionnés (min 3)
                      </span>
                    </div>

                    {/* Selected & Input */}
                    <div className="flex flex-wrap gap-1.5 p-3 rounded-2xl border border-theme bg-surface">
                      {selectedInterests.length === 0 ? (
                        <span className="text-xs text-muted py-1 px-1">Aucun tag sélectionné</span>
                      ) : (
                        selectedInterests.map((interest) => (
                          <div 
                            key={interest} 
                            className="inline-flex items-center gap-1.5 py-1.5 px-3 rounded-full text-xs font-semibold bg-[var(--primary)]/10 text-[var(--primary-light)] border border-[var(--primary)]/20 animate-scale-bounce"
                          >
                            <span>{interest}</span>
                            <button 
                              type="button" 
                              onClick={() => handleToggleInterest(interest)}
                              className="text-[var(--primary-light)] opacity-60 hover:opacity-100 transition duration-150"
                            >
                              <X size={12} />
                            </button>
                          </div>
                        ))
                      )}

                      {/* Custom Input */}
                      <form onSubmit={handleAddCustomInterest} className="flex-1 min-w-[120px]">
                        <input 
                          type="text" 
                          placeholder="Autre interest + Entrée..." 
                          value={customInterest}
                          onChange={e => setCustomInterest(e.target.value)}
                          className="w-full bg-transparent border-none outline-none py-1.5 text-xs text-theme placeholder:text-muted focus:ring-0 focus:shadow-none"
                        />
                      </form>
                    </div>

                    {/* Suggestions */}
                    <div className="space-y-1.5">
                      <p className="text-[10px] font-semibold text-muted uppercase tracking-wider">Suggestions</p>
                      <div className="flex flex-wrap gap-1.5">
                        {SUGGESTED_INTERESTS.map((interest) => {
                          const isSelected = selectedInterests.includes(interest)
                          return (
                            <button
                              key={interest}
                              type="button"
                              onClick={() => handleToggleInterest(interest)}
                              className={`py-1.5 px-3.5 rounded-full text-xs font-semibold border transition-all duration-200 active:scale-95 ${
                                isSelected 
                                  ? 'bg-[var(--primary)] text-theme border-transparent shadow-[0_2px_10px_var(--primaryGlow)]' 
                                  : 'bg-surface text-secondary border-theme hover:border-[var(--primary)]/30 hover:text-theme'
                              }`}
                            >
                              {interest}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Submit Button */}
                  <div className="pt-4">
                    <Button 
                      variant="premium" 
                      size="pill-lg" 
                      className="w-full text-sm font-semibold tracking-wide"
                      disabled={saving || bio.trim() === '' || selectedInterests.length < 3}
                      onClick={handleFinishProfile}
                    >
                      {saving ? 'Enregistrement...' : 'Continuer'}
                      <ChevronRight size={18} />
                    </Button>
                  </div>
                </div>
              </motion.div>
            )}

            {/* ETAPE 3: IDENTITY VERIFICATION */}
            {step === 2 && (
              <motion.div
                key="step-verification"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                className="space-y-6 max-w-md mx-auto"
              >
                <div className="text-center space-y-2">
                  <div className="w-12 h-12 rounded-2xl bg-[var(--accent-cool)]/10 flex items-center justify-center mx-auto border border-[var(--accent-cool)]/20">
                    <Shield size={22} className="text-[var(--accent-cool)]" />
                  </div>
                  <h2 className="text-2xl font-bold text-theme tracking-tight">Vérifie ton authenticité</h2>
                  <p className="text-sm text-secondary max-w-xs mx-auto">
                    Les profils certifiés gagnent en visibilité et inspirent confiance. Prends un selfie rapide !
                  </p>
                </div>

                <div className="flex flex-col items-center justify-center py-4 relative">
                  {verifPhoto ? (
                    <div className="w-48 h-48 rounded-full overflow-hidden border-2 border-[var(--successVibrant)] bg-surface relative shadow-[0_0_30px_var(--successBg)]">
                      <Image src={verifPhoto} alt="Selfie de vérification" fill className="object-cover" />
                    </div>
                  ) : (
                    <button 
                      type="button" 
                      onClick={() => verifInputRef.current?.click()} 
                      disabled={verifUploading}
                      className="w-48 h-48 rounded-full border border-dashed border-theme hover:border-[var(--accent-cool)]/40 flex flex-col items-center justify-center text-secondary hover:text-theme bg-surface transition-all duration-300 relative group active:scale-95"
                    >
                      {/* Pulse effect */}
                      <div className="absolute inset-0 rounded-full border border-[var(--accent-cool)]/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 animate-pulse-glow-soft blur-md" />
                      
                      {verifUploading ? (
                        <div className="animate-spin w-8 h-8 border-2 border-[var(--accent-cool)] border-t-transparent rounded-full" />
                      ) : (
                        <>
                          <Camera size={32} className="text-[var(--accent-cool)] mb-2 transition-transform duration-300 group-hover:scale-105" />
                          <span className="text-[10px] uppercase font-bold tracking-wider">Prendre un selfie</span>
                        </>
                      )}
                    </button>
                  )}
                  
                  <input 
                    ref={verifInputRef}
                    id="verif-input" 
                    type="file" 
                    accept="image/*" 
                    capture="user" 
                    onChange={handleVerifPhoto} 
                    className="hidden" 
                  />

                  {verifDone && (
                    <motion.div 
                      initial={{ scale: 0.9, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="flex items-center gap-1.5 text-[var(--successVibrant)] text-xs font-semibold mt-4"
                    >
                      <Check size={14} /> Selfie envoyé, vérification lancée
                    </motion.div>
                  )}
                </div>

                <div className="space-y-3 pt-2">
                  <Button 
                    variant="premium" 
                    size="pill-lg" 
                    className="w-full text-sm font-semibold tracking-wide"
                    onClick={() => setStep(3)}
                  >
                    Continuer
                    <ChevronRight size={18} />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="pill-lg" 
                    className="w-full text-xs font-semibold text-secondary hover:text-theme"
                    onClick={() => setStep(3)}
                  >
                    Passer la vérification pour l&rsquo;instant
                  </Button>
                </div>
              </motion.div>
            )}

            {/* ETAPE 4: SUCCESS / CELEBRATION */}
            {step === 3 && (
              <motion.div
                key="step-success"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                className="space-y-6 text-center max-w-md mx-auto"
              >
                {/* Glowing celebration emblem */}
                <div className="relative w-28 h-28 mx-auto flex items-center justify-center">
                  <motion.div 
                    animate={{
                      scale: [1, 1.25, 1],
                      opacity: [0.6, 0.3, 0.6],
                    }}
                    transition={{
                      duration: 3,
                      repeat: Infinity,
                      ease: "easeInOut"
                    }}
                    className="absolute inset-0 rounded-full bg-gradient-to-tr from-[var(--primary)] to-[var(--accent-warm)] opacity-50 blur-2xl"
                  />
                  <div className="relative z-10 w-24 h-24 rounded-full bg-gradient-to-tr from-[var(--successVibrant)] to-[var(--primary)] flex items-center justify-center shadow-[0_12px_40px_var(--primaryGlow)] border border-theme animate-breathe">
                    <Sparkles size={40} className="text-on-primary drop-shadow-[0_4px_8px_var(--shadow-drop)]" />
                  </div>
                </div>

                <div className="space-y-2">
                  <h2 className="text-3xl font-bold text-theme tracking-tight" style={{ fontFamily: 'var(--font-display)' }}>
                    Ton profil est prêt !
                  </h2>
                  <p className="text-sm text-secondary max-w-xs mx-auto leading-relaxed">
                    Félicitations, ton onboarding est complet. L&rsquo;univers d&rsquo;Erosia t&rsquo;attend désormais.
                  </p>
                </div>

                <div className="pt-6">
                  <Button 
                    variant="premium" 
                    size="pill-lg" 
                    className="w-full text-sm font-semibold tracking-wide shadow-[0_12px_40px_var(--primaryGlow)] animate-glow-ring"
                    onClick={handleComplete}
                  >
                    Entrer dans Erosia
                    <Sparkles size={16} />
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* Footer minimaliste */}
      <footer className="relative z-10 w-full text-center text-[10px] text-muted tracking-wider">
        Erosia · Rencontre Immersive Premium
      </footer>
    </div>
  )
}
