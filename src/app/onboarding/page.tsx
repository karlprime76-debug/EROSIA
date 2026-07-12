'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { motion, AnimatePresence } from 'motion/react'
import {
  Camera, Check, ChevronRight, Shield, Sparkles, Image as ImageIcon,
  Plus, X, Heart, Users, Coffee, Flame, Bell, Mail, MapPin,
  PartyPopper, AlertCircle,
} from 'lucide-react'
import { uploadPhoto, deletePhoto, updateProfile, type LookingFor } from '@/lib/api'
import { validateFile, sanitizeFilename } from '@/lib/media'
import { supabase } from '@/lib/supabase/client'
import { useToast } from '@/components/Toast'
import { Button } from '@/components/ui/button'
import { logger } from '@/lib/logger'
import { subscribeToPush } from '@/lib/push'
import { useOnboarding } from '@/lib/onboarding/provider'

const SUGGESTED_INTERESTS = [
  'Voyage', 'Cuisine', 'Art', 'Musique', 'Cinéma',
  'Mode', 'Fitness', 'Lecture', 'Jeux Vidéo',
  'Nature', 'Technologie', 'Photo', 'Animaux',
]

const RELATION_TYPES = [
  { id: 'serious', label: 'Relation sérieuse', desc: 'Pour construire à long terme.', icon: Heart, color: 'var(--primary)' },
  { id: 'casual', label: 'Aventure', desc: 'Des rencontres légères et passionnées.', icon: Flame, color: 'var(--primary-light)' },
  { id: 'fwb', label: 'Complicité & FWB', desc: 'Pas de prise de tête, complicité d\'abord.', icon: Coffee, color: 'var(--accent-warm)' },
  { id: 'friendship', label: 'Amitié sincère', desc: 'Rencontrer du monde, partager.', icon: Users, color: 'var(--info)' },
  { id: 'open', label: 'Relation libre', desc: 'Explorer de multiples horizons.', icon: Sparkles, color: 'var(--accent-purple)' },
]

const STEP_LABELS = [
  'Bienvenue', 'Découvrir', 'Photo', 'Photos', 'Bio',
  'Intérêts', 'Préférences', 'Distance', 'Email', 'Identité',
  'Notifications',
]

const TOTAL_STEPS = 11

export default function OnboardingPage() {
  const { step, setStep, markStepCompleted, completedSteps, updateProfileData, completionPercentage, isLoaded, completeOnboardingFlow } = useOnboarding()
  const [userId, setUserId] = useState('')
  const [photos, setPhotos] = useState<string[]>([])
  const [uploading, setUploading] = useState<number | null>(null)
  const [bio, setBio] = useState('')
  const [selectedInterests, setSelectedInterests] = useState<string[]>([])
  const [customInterest, setCustomInterest] = useState('')
  const [lookingFor, setLookingFor] = useState<string>('serious')
  const [minAge, setMinAge] = useState(18)
  const [maxAge, setMaxAge] = useState(45)
  const [distance, setDistance] = useState(50)
  const [gender, setGender] = useState<string>('')
  const [interestedIn, setInterestedIn] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  const [verifPhoto, setVerifPhoto] = useState<string | null>(null)
  const [verifUploading, setVerifUploading] = useState(false)
  const [verifDone, setVerifDone] = useState(false)
  const [emailVerified, setEmailVerified] = useState(false)
  const [sendingEmail, setSendingEmail] = useState(false)
  const [notificationsEnabled, setNotificationsEnabled] = useState(false)
  const router = useRouter()
  const { toast } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const verifInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { router.push('/login'); return }
      setUserId(user.id)
      setEmailVerified(!!user.email_confirmed_at)

      supabase.from('profiles').select('photos, bio, interests, looking_for, gender, age, interested_in').eq('id', user.id).maybeSingle()
        .then(({ data }) => {
          if (data) {
            if (data.photos) { setPhotos(data.photos); updateProfileData({ photos: data.photos }) }
            if (data.bio) { setBio(data.bio); updateProfileData({ bio: data.bio }) }
            if (data.interests) { setSelectedInterests(data.interests); updateProfileData({ interests: data.interests }) }
            if (data.looking_for) { setLookingFor(data.looking_for); updateProfileData({ looking_for: data.looking_for }) }
            if (data.gender) { setGender(data.gender); updateProfileData({ gender: data.gender }) }
            if (data.age) { updateProfileData({ age: data.age }) }
            if (data.interested_in) setInterestedIn(data.interested_in)
          }
        })

      if ('Notification' in window && Notification.permission === 'granted') {
        setNotificationsEnabled(true)
        updateProfileData({ notifications_enabled: true })
      }
    }).catch((err) => {
      logger.error('Auth error', { error: String(err) })
      toast('Erreur de chargement', 'error')
    })
  }, [router, toast, updateProfileData])

  const goTo = useCallback((s: number) => {
    markStepCompleted(step)
    setStep(s)
  }, [step, markStepCompleted, setStep])

  const goNext = useCallback(() => {
    markStepCompleted(step)
    setStep(step + 1)
  }, [step, markStepCompleted, setStep])

  const handleComplete = async () => {
    await completeOnboardingFlow()
    router.push('/')
  }

  const handleAddPhoto = async (e: React.ChangeEvent<HTMLInputElement>, slotIndex: number) => {
    const file = e.target.files?.[0]
    if (!file || !userId) return
    const verifErr = validateFile(file, 'photo')
    if (verifErr) { toast(verifErr, 'error'); return }
    setUploading(slotIndex)
    try {
      const result = await uploadPhoto(file)
      if (result.error) { toast(result.error, 'error'); return }
      if (result.photos) {
        setPhotos(result.photos)
        updateProfileData({ photos: result.photos })
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
    const photoUrl = photos[indexToDelete]
    if (!photoUrl) return
    try {
      const result = await deletePhoto(photoUrl)
      if (result.error) { toast(result.error, 'error'); return }
      if (result.photos) {
        setPhotos(result.photos)
        updateProfileData({ photos: result.photos })
      }
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
    if (selectedInterests.includes(clean)) { setCustomInterest(''); return }
    if (selectedInterests.length >= 8) { toast('Maximum 8 centres d\'intérêt', 'warning'); return }
    setSelectedInterests(prev => [...prev, clean])
    setCustomInterest('')
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
      await supabase.from('verification_requests').insert({ user_id: userId, photo_url: urlData.publicUrl })
      setVerifDone(true)
      updateProfileData({ identity_verified: true })
    } catch (err) {
      logger.error('handleVerifPhoto error', { error: String(err) })
      toast('Erreur lors du téléchargement', 'error')
    } finally {
      setVerifUploading(false)
    }
  }

  const handleSendVerifyEmail = async () => {
    setSendingEmail(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user?.email) { toast('Email introuvable', 'error'); return }
      await supabase.auth.resend({ type: 'signup', email: user.email })
      toast('Email de vérification envoyé !', 'success')
    } catch {
      toast('Erreur lors de l\'envoi', 'error')
    } finally {
      setSendingEmail(false)
    }
  }

  const handleEnableNotifications = async () => {
    if ('Notification' in window) {
      const perm = await Notification.requestPermission()
      if (perm === 'granted') {
        setNotificationsEnabled(true)
        updateProfileData({ notifications_enabled: true })
        await subscribeToPush().catch(() => {})
        toast('Notifications activées !', 'success')
      } else {
        toast('Autorisation refusée', 'warning')
      }
    }
  }

  if (!isLoaded) return null

  const progressPct = ((step + 1) / TOTAL_STEPS) * 100

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-theme flex flex-col justify-between py-6 px-4 sm:px-6 lg:px-8">
      <h1 className="sr-only">Onboarding</h1>
      <div className="pointer-events-none absolute top-10 right-10 w-80 h-80 rounded-full bg-[var(--primary)] blur-[150px] opacity-[0.06]" />
      <div className="pointer-events-none absolute bottom-10 left-10 w-96 h-96 rounded-full bg-[var(--accent-cool)] blur-[150px] opacity-[0.05]" />

      <header className="relative z-10 w-full max-w-2xl mx-auto flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold text-theme tracking-wide" style={{ fontFamily: 'var(--font-display)' }}>Erosia</span>
            <span className="text-[10px] text-muted uppercase tracking-widest font-semibold px-2 py-0.5 rounded-full bg-surface border border-theme">
              Création
            </span>
          </div>
          {step > 0 && step < 11 && (
            <button
              type="button"
              onClick={handleComplete}
              className="text-xs font-semibold text-secondary hover:text-theme transition duration-200"
            >
              Passer
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 w-full pt-2">
          {step > 0 && step < 11 && (
            <span className="text-[10px] font-bold text-primary shrink-0 tabular-nums">
              {step}/{TOTAL_STEPS - 1}
            </span>
          )}
          <div className="flex-1 h-[3px] rounded-full bg-surface-elevated overflow-hidden">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-[var(--primary)] to-[var(--primary-light)]"
              initial={{ width: 0 }}
              animate={{ width: `${progressPct}%` }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            />
          </div>
        </div>

        {step > 0 && step < 11 && (
          <div className="flex gap-1 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-none">
            {STEP_LABELS.map((label, idx) => {
              const isActive = idx === step
              const isDone = completedSteps.includes(idx) || idx < step
              return (
                <button
                  key={label}
                  type="button"
                  onClick={() => idx < step && goTo(idx)}
                  className={`shrink-0 px-2.5 py-1 rounded-full text-[10px] font-semibold transition-all duration-200 border ${
                    isActive
                      ? 'bg-[var(--primary)]/10 text-[var(--primary)] border-[var(--primary)]/30'
                      : isDone
                        ? 'bg-[var(--primary)]/5 text-muted border-transparent'
                        : 'text-muted border-transparent'
                  } ${idx < step ? 'cursor-pointer hover:bg-surface' : ''}`}
                >
                  {isDone && !isActive ? <Check size={10} className="inline mr-0.5" /> : null}
                  {label}
                </button>
              )
            })}
          </div>
        )}
      </header>

      <main className="relative z-10 flex-1 max-w-2xl w-full mx-auto flex items-center justify-center py-6 sm:py-8">
        <div className="w-full">
          <AnimatePresence mode="wait">
            {step === 0 && (
              <motion.div
                key="step-welcome"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                className="space-y-8 text-center max-w-md mx-auto"
              >
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.2, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                  className="relative w-24 h-24 mx-auto"
                >
                  <motion.div
                    animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.2, 0.5] }}
                    transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                    className="absolute inset-0 rounded-full bg-gradient-to-tr from-[var(--primary)] to-[var(--accent-warm)] blur-2xl"
                  />
                  <div className="relative z-10 w-full h-full rounded-full bg-gradient-to-br from-[var(--primary)] to-[var(--primary-dark)] flex items-center justify-center shadow-[0_12px_40px_var(--primaryGlow)] border border-theme">
                    <Sparkles size={36} className="text-on-primary drop-shadow-lg" />
                  </div>
                </motion.div>

                <div className="space-y-2">
                  <motion.h2
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3, duration: 0.6 }}
                    className="text-3xl font-bold text-theme tracking-tight"
                    style={{ fontFamily: 'var(--font-display)' }}
                  >
                    Bienvenue sur Erosia
                  </motion.h2>
                  <motion.p
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4, duration: 0.6 }}
                    className="text-sm text-secondary max-w-xs mx-auto"
                  >
                    Ton aventure commence maintenant. Quelques étapes pour créer un profil qui te ressemble.
                  </motion.p>
                </div>

                <motion.div
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5, duration: 0.6 }}
                  className="space-y-3"
                >
                  {[
                    { icon: Heart, text: 'Rencontres authentiques', color: 'var(--primary)' },
                    { icon: Shield, text: 'Profils vérifiés', color: 'var(--accent-cool)' },
                    { icon: Users, text: 'Communauté bienveillante', color: 'var(--info)' },
                  ].map(({ icon: Icon, text, color }, i) => (
                    <motion.div
                      key={text}
                      initial={{ opacity: 0, x: -15 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.6 + i * 0.1, duration: 0.5 }}
                      className="flex items-center gap-3 p-3 rounded-2xl bg-surface border border-theme"
                    >
                      <div
                        className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                        style={{ backgroundColor: `color-mix(in srgb, ${color} 8%, transparent)`, border: `1px solid color-mix(in srgb, ${color} 15%, transparent)` }}
                      >
                        <Icon size={16} style={{ color }} />
                      </div>
                      <span className="text-sm font-semibold text-theme">{text}</span>
                    </motion.div>
                  ))}
                </motion.div>

                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.9 }}>
                  <Button variant="premium" size="pill-lg" className="w-full text-sm font-semibold tracking-wide" onClick={() => goNext()}>
                    Découvrir l&apos;aventure
                    <ChevronRight size={18} />
                  </Button>
                </motion.div>
              </motion.div>
            )}

            {step === 1 && (
              <motion.div
                key="step-how-it-works"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                className="space-y-6 max-w-md mx-auto"
              >
                <div className="text-center space-y-2">
                  <h2 className="text-2xl font-bold text-theme tracking-tight">Comment ça marche ?</h2>
                  <p className="text-sm text-secondary">3 étapes simples pour rencontrer ton prochain coup de cœur.</p>
                </div>

                <div className="space-y-4">
                  {[
                    { num: '1', title: 'Swipe', desc: 'Explore les profils et like ceux qui te parlent.', icon: Heart, color: 'var(--primary)' },
                    { num: '2', title: 'Match', desc: 'Quand c\'est réciproque, le match est créé !', icon: Sparkles, color: 'var(--accent-warm)' },
                    { num: '3', title: 'Chat', desc: 'Échange des messages, vocaux ou photos.', icon: Users, color: 'var(--accent-cool)' },
                  ].map(({ num, title, desc, icon: Icon, color }, i) => (
                    <motion.div
                      key={num}
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 + i * 0.15, duration: 0.5 }}
                      className="flex items-start gap-4 p-4 rounded-2xl bg-surface border border-theme"
                    >
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 font-bold text-sm"
                        style={{ backgroundColor: `color-mix(in srgb, ${color} 10%, transparent)`, color, border: `1px solid color-mix(in srgb, ${color} 15%, transparent)` }}
                      >
                        {num}
                      </div>
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-bold text-theme">{title}</h3>
                          <Icon size={14} style={{ color }} />
                        </div>
                        <p className="text-xs text-secondary">{desc}</p>
                      </div>
                    </motion.div>
                  ))}
                </div>

                <div className="pt-2">
                  <Button variant="premium" size="pill-lg" className="w-full text-sm font-semibold tracking-wide" onClick={() => goNext()}>
                    C&apos;est parti !
                    <ChevronRight size={18} />
                  </Button>
                </div>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div
                key="step-main-photo"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                className="space-y-6"
              >
                <div className="text-center space-y-2">
                  <div className="w-12 h-12 rounded-2xl bg-[var(--primary)]/10 flex items-center justify-center mx-auto border border-[var(--primary)]/20">
                    <Camera size={22} className="text-primary" />
                  </div>
                  <h2 className="text-2xl font-bold text-theme tracking-tight">Photo principale</h2>
                  <p className="text-sm text-secondary max-w-md mx-auto">
                    Ta première photo est essentielle. Choisis une photo claire et souriante.
                  </p>
                </div>

                <div className="flex justify-center pt-2">
                  <div className="w-56 aspect-[3/4] relative rounded-2xl overflow-hidden border border-dashed border-theme bg-surface">
                    {photos[0] ? (
                      <>
                        <Image src={photos[0]} alt="Photo principale" fill className="object-cover" sizes="224px" />
                        <div className="absolute inset-0 bg-gradient-to-t from-[var(--bg)]/50 via-transparent to-transparent opacity-0 hover:opacity-100 transition-opacity duration-200 flex items-end justify-center pb-3">
                          <button type="button" onClick={() => handleDeletePhoto(0)}
                            className="w-8 h-8 rounded-full bg-[var(--bg)]/60 border border-theme flex items-center justify-center text-theme hover:bg-[var(--primary)] hover:border-transparent transition-colors duration-200 active:scale-90">
                            <X size={14} />
                          </button>
                        </div>
                      </>
                    ) : (
                      <button type="button" onClick={() => fileInputRef.current?.click()}
                        className="w-full h-full flex flex-col items-center justify-center text-secondary hover:text-theme transition-colors duration-200 gap-2">
                        {uploading === 0 ? (
                          <div className="animate-spin w-8 h-8 border-2 border-[var(--primary)] border-t-transparent rounded-full" />
                        ) : (
                          <>
                            <Camera size={32} className="text-[var(--primary)]" />
                            <span className="text-xs font-semibold">Ajoute ta photo principale</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>

                <input ref={fileInputRef} type="file" accept="image/*"
                  onChange={(e) => handleAddPhoto(e, 0)} className="hidden" />

                <div className="pt-4 flex flex-col gap-2">
                  <Button variant="premium" size="pill-lg" className="w-full text-sm font-semibold tracking-wide"
                    disabled={!photos[0]} onClick={() => goNext()}>
                    {photos[0] ? 'Continuer' : 'Ajoute une photo'}
                    <ChevronRight size={18} />
                  </Button>
                  <Button variant="ghost" size="pill-lg" className="w-full text-xs font-semibold text-secondary hover:text-theme"
                    onClick={() => goNext()}>
                    Passer pour l&apos;instant
                  </Button>
                </div>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div
                key="step-photos-extra"
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
                    Montre ta vraie personnalité. Ajoute au moins 1 photo supplémentaire.
                  </p>
                </div>

                <div className="grid grid-cols-3 gap-3.5 max-w-md mx-auto pt-2">
                  {[...Array(6)].map((_, i) => {
                    const photoUrl = photos[i]
                    const isUploading = uploading === i
                    return (
                      <div key={i}
                        className={`aspect-[3/4] relative rounded-2xl overflow-hidden border bg-surface backdrop-blur-md transition-all duration-300 ${
                          photoUrl ? 'border-theme' : 'border-dashed border-theme hover:border-[var(--primary)]/30'
                        }`}>
                        {photoUrl ? (
                          <>
                            <Image src={photoUrl} alt={`Photo ${i + 1}`} fill className="object-cover" sizes="(max-w-768px) 33vw, 150px" />
                            <div className="absolute inset-0 bg-gradient-to-t from-[var(--bg)]/50 via-transparent to-transparent opacity-0 hover:opacity-100 transition-opacity duration-200 flex items-end justify-center pb-2.5">
                              <button type="button" onClick={() => handleDeletePhoto(i)}
                                className="w-7 h-7 rounded-full bg-[var(--bg)]/60 border border-theme flex items-center justify-center text-theme hover:bg-[var(--primary)] hover:border-transparent transition-colors duration-200 active:scale-90">
                                <X size={14} />
                              </button>
                            </div>
                          </>
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            {isUploading ? (
                              <div className="animate-spin w-6 h-6 border-2 border-[var(--primary)] border-t-transparent rounded-full" />
                            ) : (
                              <button type="button"
                                onClick={() => {
                                  if (fileInputRef.current) {
                                    fileInputRef.current.setAttribute('data-slot', String(i))
                                    fileInputRef.current.click()
                                  }
                                }}
                                className="w-9 h-9 rounded-full bg-surface-secondary border border-theme flex items-center justify-center text-secondary hover:text-theme hover:bg-card hover:scale-105 active:scale-95 transition-all duration-200">
                                <Plus size={16} />
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>

                <input ref={fileInputRef} type="file" accept="image/*"
                  onChange={(e) => {
                    const slot = Number(fileInputRef.current?.getAttribute('data-slot') ?? '0')
                    handleAddPhoto(e, slot)
                  }} className="hidden" />

                <div className="pt-4 flex justify-center">
                  <Button variant="premium" size="pill-lg" className="w-full max-w-md text-sm font-semibold tracking-wide"
                    disabled={photos.length === 0} onClick={() => goNext()}>
                    {photos.length > 0 ? `Continuer (${photos.length} photo${photos.length > 1 ? 's' : ''})` : 'Ajoute au moins 1 photo'}
                    <ChevronRight size={18} />
                  </Button>
                </div>
              </motion.div>
            )}

            {step === 4 && (
              <motion.div
                key="step-bio"
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
                    Crée un profil authentique qui captive l&apos;attention.
                  </p>
                </div>

                <div className="space-y-5 max-w-md mx-auto pt-2">
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <label className="text-xs font-semibold text-secondary uppercase tracking-wider">Bio</label>
                      <span className="text-[10px] font-semibold text-muted">{bio.length}/500</span>
                    </div>
                    <textarea
                      value={bio}
                      onChange={e => setBio(e.target.value.slice(0, 500))}
                      rows={4}
                      placeholder="Ex: Passionné(e) de voyage et de cuisine, je cherche quelqu&apos;un pour explorer le monde..."
                      className="w-full px-4 py-3.5 rounded-2xl bg-surface border border-theme text-theme text-sm outline-none focus:border-[var(--primary)] resize-none transition duration-200 placeholder:text-muted focus:shadow-[0_0_20px_var(--primaryGlow)]"
                      aria-label="Bio"
                    />
                    {bio.length > 0 && bio.length < 20 && (
                      <p className="text-[10px] text-muted">20 caractères recommandés pour une bio efficace</p>
                    )}
                  </div>

                  <div className="pt-2">
                    <Button variant="premium" size="pill-lg" className="w-full text-sm font-semibold tracking-wide"
                      disabled={bio.trim().length === 0} onClick={async () => {
                        if (!userId) return
                        setSaving(true)
                        try {
                          await updateProfile(userId, { bio })
                          updateProfileData({ bio })
                          goNext()
                        } catch (err) {
                          logger.error('save bio error', { error: String(err) })
                          toast('Erreur lors de la sauvegarde', 'error')
                        } finally {
                          setSaving(false)
                        }
                      }}>
                      {saving ? 'Enregistrement...' : 'Continuer'}
                      <ChevronRight size={18} />
                    </Button>
                  </div>
                </div>
              </motion.div>
            )}

            {step === 5 && (
              <motion.div
                key="step-interests"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                className="space-y-6"
              >
                <div className="text-center space-y-2">
                  <h2 className="text-2xl font-bold text-theme tracking-tight">Centres d&apos;intérêt</h2>
                  <p className="text-sm text-secondary max-w-md mx-auto">
                    Choisis au moins 3 centres d&apos;intérêt pour que l&apos;algorithme te comprenne mieux.
                  </p>
                </div>

                <div className="space-y-4 max-w-md mx-auto pt-2">
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <label className="text-xs font-semibold text-secondary uppercase tracking-wider">Tes intérêts</label>
                      <span className="text-[10px] font-semibold text-muted">
                        {selectedInterests.length}/8 sélectionnés (min 3)
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-1.5 p-3 rounded-2xl border border-theme bg-surface">
                      {selectedInterests.length === 0 ? (
                        <span className="text-xs text-muted py-1 px-1">Aucun tag sélectionné</span>
                      ) : (
                        selectedInterests.map((interest) => (
                          <div key={interest}
                            className="inline-flex items-center gap-1.5 py-1.5 px-3 rounded-full text-xs font-semibold bg-[var(--primary)]/10 text-[var(--primary-light)] border border-[var(--primary)]/20 animate-scale-bounce">
                            <span>{interest}</span>
                            <button type="button" onClick={() => handleToggleInterest(interest)}
                              className="text-[var(--primary-light)] opacity-60 hover:opacity-100 transition duration-150">
                              <X size={12} />
                            </button>
                          </div>
                        ))
                      )}
                      <form onSubmit={handleAddCustomInterest} className="flex-1 min-w-[120px]">
                        <input type="text" placeholder="Autre intérêt + Entrée..."
                          value={customInterest} onChange={e => setCustomInterest(e.target.value)}
                          className="w-full bg-transparent border-none outline-none py-1.5 text-xs text-theme placeholder:text-muted focus:ring-0 focus:shadow-none" />
                      </form>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <p className="text-[10px] font-semibold text-muted uppercase tracking-wider">Suggestions</p>
                    <div className="flex flex-wrap gap-1.5">
                      {SUGGESTED_INTERESTS.map((interest) => {
                        const isSelected = selectedInterests.includes(interest)
                        return (
                          <button key={interest} type="button" onClick={() => handleToggleInterest(interest)}
                            className={`py-1.5 px-3.5 rounded-full text-xs font-semibold border transition-all duration-200 active:scale-95 ${
                              isSelected
                                ? 'bg-[var(--primary)] text-theme border-transparent shadow-[0_2px_10px_var(--primaryGlow)]'
                                : 'bg-surface text-secondary border-theme hover:border-[var(--primary)]/30 hover:text-theme'
                            }`}>
                            {interest}
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  <Button variant="premium" size="pill-lg" className="w-full text-sm font-semibold tracking-wide"
                    disabled={selectedInterests.length < 3} onClick={async () => {
                      if (!userId) return
                      setSaving(true)
                      try {
                        await updateProfile(userId, { interests: selectedInterests })
                        updateProfileData({ interests: selectedInterests })
                        goNext()
                      } catch (err) {
                        logger.error('save interests error', { error: String(err) })
                        toast('Erreur lors de la sauvegarde', 'error')
                      } finally {
                        setSaving(false)
                      }
                    }}>
                    {saving ? 'Enregistrement...' : 'Continuer'}
                    <ChevronRight size={18} />
                  </Button>
                </div>
              </motion.div>
            )}

            {step === 6 && (
              <motion.div
                key="step-preferences"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                className="space-y-6"
              >
                <div className="text-center space-y-2">
                  <h2 className="text-2xl font-bold text-theme tracking-tight">Préférences de recherche</h2>
                  <p className="text-sm text-secondary max-w-md mx-auto">
                    Définis qui tu veux rencontrer pour des suggestions plus pertinentes.
                  </p>
                </div>

                <div className="space-y-5 max-w-md mx-auto pt-2">
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-secondary uppercase tracking-wider block">Genre</label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { id: 'male', label: 'Homme' },
                        { id: 'female', label: 'Femme' },
                        { id: 'non_binary', label: 'Non-binaire' },
                      ].map(({ id, label }) => (
                        <button key={id} type="button" onClick={() => setGender(id)}
                          className={`py-3 rounded-2xl text-xs font-semibold border transition-all duration-200 ${
                            gender === id
                              ? 'bg-[var(--primary)]/10 text-[var(--primary)] border-[var(--primary)]/30 shadow-[0_0_15px_var(--primaryGlow)]'
                              : 'bg-surface text-secondary border-theme hover:border-[var(--primary)]/20'
                          }`}>
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-secondary uppercase tracking-wider block">Tranche d&apos;âge</label>
                    <div className="flex items-center gap-3">
                      <div className="flex-1 space-y-1">
                        <input type="range" min={18} max={60} value={minAge}
                          onChange={e => setMinAge(Math.min(Number(e.target.value), maxAge - 1))}
                          className="w-full accent-[var(--primary)]" />
                        <p className="text-center text-xs font-bold text-theme">{minAge} ans</p>
                      </div>
                      <span className="text-muted text-xs">→</span>
                      <div className="flex-1 space-y-1">
                        <input type="range" min={18} max={60} value={maxAge}
                          onChange={e => setMaxAge(Math.max(Number(e.target.value), minAge + 1))}
                          className="w-full accent-[var(--primary)]" />
                        <p className="text-center text-xs font-bold text-theme">{maxAge} ans</p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-secondary uppercase tracking-wider block">Ce que tu cherches</label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {RELATION_TYPES.map((type) => {
                        const Icon = type.icon
                        const isSelected = lookingFor === type.id
                        return (
                          <button key={type.id} type="button" onClick={() => setLookingFor(type.id)}
                            className={`group relative text-left p-4 rounded-2xl border transition-all duration-300 flex items-center gap-3.5 select-none ${
                              isSelected
                                ? 'bg-gradient-to-r from-[var(--primary)]/10 to-transparent border-[var(--primary)]/40 shadow-[0_4px_24px_var(--primaryGlow)]'
                                : 'bg-surface border-theme hover:border-[var(--primary)]/30 hover:bg-card'
                            }`}>
                            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-transform duration-300 group-hover:scale-105"
                              style={{
                                backgroundColor: isSelected ? `color-mix(in srgb, ${type.color} 8%, transparent)` : 'color-mix(in srgb, var(--textPrimary) 3%, transparent)',
                                border: `1px solid ${isSelected ? `color-mix(in srgb, ${type.color} 19%, transparent)` : 'color-mix(in srgb, var(--textPrimary) 5%, transparent)'}`
                              }}>
                              <Icon size={16} style={{ color: isSelected ? type.color : 'var(--textSecondary)' }} />
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-semibold text-theme">{type.label}</p>
                              <p className="text-[10px] text-secondary truncate mt-0.5">{type.desc}</p>
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  <Button variant="premium" size="pill-lg" className="w-full text-sm font-semibold tracking-wide"
                    disabled={!gender || !lookingFor} onClick={async () => {
                      if (!userId) return
                      setSaving(true)
                      try {
                        await updateProfile(userId, {
                          looking_for: lookingFor as LookingFor,
                          gender: gender as 'male' | 'female' | 'non_binary',
                          interested_in: interestedIn,
                        } as never)
                        updateProfileData({ looking_for: lookingFor, gender, preferences_set: true })
                        goNext()
                      } catch (err) {
                        logger.error('save preferences error', { error: String(err) })
                        toast('Erreur lors de la sauvegarde', 'error')
                      } finally {
                        setSaving(false)
                      }
                    }}>
                    {saving ? 'Enregistrement...' : 'Continuer'}
                    <ChevronRight size={18} />
                  </Button>
                </div>
              </motion.div>
            )}

            {step === 7 && (
              <motion.div
                key="step-distance"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                className="space-y-6 max-w-md mx-auto"
              >
                <div className="text-center space-y-2">
                  <div className="w-12 h-12 rounded-2xl bg-[var(--accent-cool)]/10 flex items-center justify-center mx-auto border border-[var(--accent-cool)]/20">
                    <MapPin size={22} className="text-[var(--accent-cool)]" />
                  </div>
                  <h2 className="text-2xl font-bold text-theme tracking-tight">À quelle distance cherches-tu ?</h2>
                  <p className="text-sm text-secondary max-w-xs mx-auto">
                    Définis le rayon de recherche autour de ta position.
                  </p>
                </div>

                <div className="space-y-4 pt-4">
                  <div className="text-center">
                    <span className="text-4xl font-bold text-theme" style={{ fontFamily: 'var(--font-display)' }}>
                      {distance}
                    </span>
                    <span className="text-sm text-secondary ml-1">km</span>
                  </div>

                  <input type="range" min={1} max={200} value={distance}
                    onChange={e => setDistance(Number(e.target.value))}
                    className="w-full accent-[var(--primary)]" />

                  <div className="flex justify-between text-[10px] text-muted font-semibold">
                    <span>1 km</span>
                    <span>200 km</span>
                  </div>
                </div>

                <div className="pt-4">
                  <Button variant="premium" size="pill-lg" className="w-full text-sm font-semibold tracking-wide"
                    onClick={() => {
                      updateProfileData({ distance_set: true })
                      goNext()
                    }}>
                    Continuer
                    <ChevronRight size={18} />
                  </Button>
                </div>
              </motion.div>
            )}

            {step === 8 && (
              <motion.div
                key="step-email"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                className="space-y-6 max-w-md mx-auto"
              >
                <div className="text-center space-y-2">
                  <div className="w-12 h-12 rounded-2xl bg-[var(--primary)]/10 flex items-center justify-center mx-auto border border-[var(--primary)]/20">
                    <Mail size={22} className="text-primary" />
                  </div>
                  <h2 className="text-2xl font-bold text-theme tracking-tight">Vérifie ton email</h2>
                  <p className="text-sm text-secondary max-w-xs mx-auto">
                    La vérification de ton email renforce la sécurité de ton compte.
                  </p>
                </div>

                <div className="flex flex-col items-center justify-center py-8">
                  {emailVerified ? (
                    <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                      className="flex flex-col items-center gap-3">
                      <div className="w-16 h-16 rounded-full bg-[var(--success)]/10 flex items-center justify-center border border-[var(--success)]/20">
                        <Check size={28} className="text-[var(--success)]" />
                      </div>
                      <p className="text-sm font-semibold text-theme">Email vérifié !</p>
                    </motion.div>
                  ) : (
                    <div className="space-y-4 text-center">
                      <AlertCircle size={40} className="text-[var(--warning)] mx-auto" />
                      <p className="text-sm text-secondary">Tu n&apos;as pas encore vérifié ton adresse email.</p>
                      <Button variant="primary" size="pill" className="text-sm font-semibold"
                        disabled={sendingEmail} onClick={handleSendVerifyEmail}>
                        {sendingEmail ? 'Envoi en cours...' : 'Renvoyer l\'email'}
                      </Button>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Button variant="premium" size="pill-lg" className="w-full text-sm font-semibold tracking-wide"
                    onClick={() => {
                      updateProfileData({ email_verified: emailVerified })
                      goNext()
                    }}>
                    Continuer
                    <ChevronRight size={18} />
                  </Button>
                  {!emailVerified && (
                    <Button variant="ghost" size="pill-lg" className="w-full text-xs font-semibold text-secondary hover:text-theme"
                      onClick={() => goNext()}>
                      Je vérifierai plus tard
                    </Button>
                  )}
                </div>
              </motion.div>
            )}

            {step === 9 && (
              <motion.div
                key="step-identity"
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
                    <button type="button" onClick={() => verifInputRef.current?.click()} disabled={verifUploading}
                      className="w-48 h-48 rounded-full border border-dashed border-theme hover:border-[var(--accent-cool)]/40 flex flex-col items-center justify-center text-secondary hover:text-theme bg-surface transition-all duration-300 relative group active:scale-95">
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

                  <input ref={verifInputRef} id="verif-input" type="file" accept="image/*" capture="user"
                    onChange={handleVerifPhoto} className="hidden" />

                  {verifDone && (
                    <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                      className="flex items-center gap-1.5 text-[var(--successVibrant)] text-xs font-semibold mt-4">
                      <Check size={14} /> Selfie envoyé, vérification lancée
                    </motion.div>
                  )}
                </div>

                <div className="space-y-3 pt-2">
                  <Button variant="premium" size="pill-lg" className="w-full text-sm font-semibold tracking-wide"
                    onClick={() => goNext()}>
                    Continuer
                    <ChevronRight size={18} />
                  </Button>
                  <Button variant="ghost" size="pill-lg" className="w-full text-xs font-semibold text-secondary hover:text-theme"
                    onClick={() => goNext()}>
                    Passer la vérification pour l&apos;instant
                  </Button>
                </div>
              </motion.div>
            )}

            {step === 10 && (
              <motion.div
                key="step-notifications"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                className="space-y-6 max-w-md mx-auto"
              >
                <div className="text-center space-y-2">
                  <div className="w-12 h-12 rounded-2xl bg-[var(--primary)]/10 flex items-center justify-center mx-auto border border-[var(--primary)]/20">
                    <Bell size={22} className="text-primary" />
                  </div>
                  <h2 className="text-2xl font-bold text-theme tracking-tight">Active les notifications</h2>
                  <p className="text-sm text-secondary max-w-xs mx-auto">
                    Ne rate aucun match, message ou clin d&apos;œil. Reste connecté(e) à tout moment.
                  </p>
                </div>

                <div className="flex flex-col items-center justify-center py-8">
                  {notificationsEnabled ? (
                    <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                      className="flex flex-col items-center gap-3">
                      <div className="w-16 h-16 rounded-full bg-[var(--success)]/10 flex items-center justify-center border border-[var(--success)]/20">
                        <Check size={28} className="text-[var(--success)]" />
                      </div>
                      <p className="text-sm font-semibold text-theme">Notifications activées !</p>
                    </motion.div>
                  ) : (
                    <div className="space-y-4 text-center">
                      <div className="w-20 h-20 rounded-full bg-surface border border-theme flex items-center justify-center mx-auto">
                        <Bell size={32} className="text-secondary" />
                      </div>
                      <p className="text-sm text-secondary">Active les notifications push pour ne rien manquer.</p>
                    </div>
                  )}
                </div>

                <div className="space-y-3 pt-2">
                  {!notificationsEnabled && (
                    <Button variant="premium" size="pill-lg" className="w-full text-sm font-semibold tracking-wide"
                      onClick={handleEnableNotifications}>
                      Activer
                      <Bell size={16} />
                    </Button>
                  )}
                  <Button variant={notificationsEnabled ? 'premium' : 'ghost'} size="pill-lg"
                    className={`w-full text-sm font-semibold ${!notificationsEnabled ? 'text-secondary hover:text-theme' : ''}`}
                    onClick={() => goNext()}>
                    {notificationsEnabled ? 'Continuer' : 'Plus tard'}
                    <ChevronRight size={18} />
                  </Button>
                </div>
              </motion.div>
            )}

            {step === 11 && (
              <motion.div
                key="step-celebration"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                className="space-y-6 text-center max-w-md mx-auto"
              >
                <div className="relative w-28 h-28 mx-auto flex items-center justify-center">
                  <motion.div
                    animate={{ scale: [1, 1.25, 1], opacity: [0.6, 0.3, 0.6] }}
                    transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                    className="absolute inset-0 rounded-full bg-gradient-to-tr from-[var(--primary)] to-[var(--accent-warm)] opacity-50 blur-2xl"
                  />
                  <div className="relative z-10 w-24 h-24 rounded-full bg-gradient-to-tr from-[var(--successVibrant)] to-[var(--primary)] flex items-center justify-center shadow-[0_12px_40px_var(--primaryGlow)] border border-theme animate-breathe">
                    <PartyPopper size={40} className="text-on-primary drop-shadow-[0_4px_8px_var(--shadow-drop)]" />
                  </div>
                </div>

                <div className="space-y-2">
                  <h2 className="text-3xl font-bold text-theme tracking-tight" style={{ fontFamily: 'var(--font-display)' }}>
                    Ton profil est prêt !
                  </h2>
                  <p className="text-sm text-secondary max-w-xs mx-auto leading-relaxed">
                    Félicitations, ton onboarding est complet. L&apos;univers d&apos;Erosia t&apos;attend.
                  </p>
                </div>

                <div className="relative w-32 h-32 mx-auto">
                  <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
                    <circle cx="60" cy="60" r="52" fill="none" stroke="var(--surface)" strokeWidth="8" />
                    <circle cx="60" cy="60" r="52" fill="none" stroke={completionPercentage >= 80 ? 'var(--success)' : completionPercentage >= 60 ? 'var(--warning)' : 'var(--primary)'}
                      strokeWidth="8" strokeLinecap="round"
                      strokeDasharray={`${(completionPercentage / 100) * 327} 327`}
                      className="transition-all duration-1000" />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-2xl font-bold text-theme">{completionPercentage}%</span>
                    <span className="text-[10px] text-muted font-semibold">profil complété</span>
                  </div>
                </div>

                {completionPercentage < 100 && (
                  <div className="space-y-1.5">
                    <p className="text-xs text-secondary font-semibold">Pour atteindre 100%, tu peux :</p>
                    {completionPercentage < 60 && <p className="text-[10px] text-muted">• Ajoute plus de photos et enrichis ta bio</p>}
                    {completionPercentage < 80 && <p className="text-[10px] text-muted">• Vérifie ton email et ton identité</p>}
                  </div>
                )}

                <div className="pt-4 space-y-2">
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

      <footer className="relative z-10 w-full text-center text-[10px] text-muted tracking-wider">
        Erosia · Rencontre Immersive Premium
      </footer>
    </div>
  )
}
