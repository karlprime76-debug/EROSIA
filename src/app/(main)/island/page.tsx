'use client'

import { Component, useState, useEffect, useRef } from 'react'
import type { ErrorInfo, ReactNode } from 'react'

class ProfileErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  constructor(props: { children: ReactNode }) {
    super(props)
    this.state = { hasError: false }
  }
  static getDerivedStateFromError() { return { hasError: true } }
  componentDidCatch(error: Error, info: ErrorInfo) {
    logger.error('ProfilePage error', { error: String(error), componentStack: info.componentStack })
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
            <span className="text-2xl">😵</span>
          </div>
          <h3 className="font-semibold text-lg">Oups, quelque chose a planté</h3>
          <p className="text-secondary text-sm mt-1 max-w-xs">Un problème est survenu. Recharge la page.</p>
          <button onClick={() => window.location.reload()}
            className="mt-4 px-5 py-2.5 rounded-xl text-sm font-medium text-theme"
            style={{ background: 'var(--primary)' }}>
            Recharger
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Camera, LogOut, Shield, HelpCircle, Palette, Trash2, BadgeCheck, Star, Check, Sun, Moon, Monitor, Lock, BarChart3, Brain, Plane, Sparkles, CalendarDays, Lightbulb, Loader } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { signOut, uploadPhoto, deletePhoto, setPrimaryPhoto, uploadProfileVideo, deleteProfileVideo, getProfileTraits, getStreak, updateEnergyScore, type Profile, type LookingFor, type Mood, type Gender } from '@/lib/api'
import Lightbox from '@/components/Lightbox'
import { useToast } from '@/components/Toast'
import { logger } from '@/lib/logger'
import dynamic from 'next/dynamic'
import { AuraBadge, useAura } from '@/components/AuraSphere'
import { validateFile } from '@/lib/media'
import { useTheme } from 'next-themes'

const AuraSphere = dynamic(() => import('@/components/AuraSphere').then(m => ({ default: m.AuraSphere })), { ssr: false })
import { CircularProgressbar, buildStyles } from 'react-circular-progressbar'
import { Button } from '@/components/ui/button'

function ProfilePageInner() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [editing, setEditing] = useState(false)
  const photoInputRef = useRef<HTMLInputElement>(null)
  const [photoActionLoading, setPhotoActionLoading] = useState<string | null>(null)
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null)
  const [nameValue, setNameValue] = useState('')
  const [bio, setBio] = useState('')
  const [interests, setInterests] = useState('')
  const [lookingFor, setLookingFor] = useState<LookingFor>('friendship')
  const [mood, setMood] = useState<Mood>('discuter')
  const [gender, setGender] = useState<Gender>('male')
  const [interestedIn, setInterestedIn] = useState<string[]>([])
  const [now, setNow] = useState(0)
  const [profileTraits, setProfileTraits] = useState<string[]>([])
  const [streak, setStreak] = useState(0)
  const [themePicker, setThemePicker] = useState(false)
  const videoRef = useRef<HTMLInputElement>(null)
  const { aura, recompute: recomputeAura } = useAura()
  const { toast } = useToast()
  const router = useRouter()
  const { theme, setTheme } = useTheme()

  const fetchProfileFromApi = async () => {
    const res = await fetch('/api/profile/me')
    const json = await res.json()
    logger.debug('fetchProfileFromApi response', { status: res.status })
    if (!res.ok) return null
    return json.profile as Profile | null
  }

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const profileData = await fetchProfileFromApi()
        if (cancelled) return
        if (!profileData) {
          logger.warn('API profile null, fallback to client')
          const { data: { user } } = await supabase.auth.getUser()
          if (user && !cancelled) {
            const PROFILE_FIELDS = 'id, name, age, bio, occupation, location, photos, interests, is_verified, looking_for, mood, energy_score, trust_score, created_at, is_admin'
            const { data } = await supabase.from('profiles').select(PROFILE_FIELDS).eq('id', user.id).maybeSingle()
            if (data) { setProfile(data as Profile); setNameValue(data.name ?? ''); setBio(data.bio ?? ''); setInterests(data.interests?.join(', ') ?? ''); setLookingFor(data.looking_for ?? 'friendship'); setMood((data as Profile).mood ?? 'discuter'); setGender((data as Profile).gender ?? 'male'); setInterestedIn((data as Profile).interested_in ?? []) }
          }
        } else {
          logger.debug('API profile loaded')
          setProfile(profileData); setNameValue(profileData.name ?? ''); setBio(profileData.bio ?? ''); setInterests(profileData.interests?.join(', ') ?? ''); setLookingFor(profileData.looking_for ?? 'friendship'); setMood(profileData.mood ?? 'discuter'); setGender(profileData.gender ?? 'male'); setInterestedIn(profileData.interested_in ?? []); getProfileTraits(profileData.id).then(({ data: traits }) => { if (traits && !cancelled) setProfileTraits(traits.map(t => t.trait))         }).catch((err) => logger.warn('getProfileTraits error', err)); getStreak().then(({ data: sd }) => { if (sd && !cancelled) setStreak(sd.current_streak ?? 0) }).catch((err) => logger.warn('getStreak error', err))
        }
      } catch (err) { logger.error('loadProfile: exception', err) }
      if (!cancelled) setLoading(false)
    })()
    return () => { cancelled = true }
  }, [])
  const loadProfile = async () => {
    try {
      const profileData = await fetchProfileFromApi()
      if (profileData) { setProfile(profileData); setNameValue(profileData.name ?? ''); setBio(profileData.bio ?? ''); setInterests(profileData.interests?.join(', ') ?? ''); setLookingFor(profileData.looking_for ?? 'friendship'); setMood(profileData.mood ?? 'discuter'); setGender(profileData.gender ?? 'male'); setInterestedIn(profileData.interested_in ?? []) }
    } catch (err) { logger.error('loadProfile: exception', err) }
  }
  const handlePhotoTap = () => {
    photoInputRef.current?.click()
  }
  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!profile) { toast('Profil pas encore chargé', 'error'); return }
    const validationErr = validateFile(file, 'photo')
    if (validationErr) { toast(validationErr, 'error'); e.target.value = ''; return }
    setUploading(true)
    try {
      const result = await uploadPhoto(file)
      if (result.error) { toast(result.error, 'error'); setUploading(false); return }
      if (result.photos) {
        setProfile({ ...profile, photos: result.photos })
        toast('Photo ajoutée', 'success')
      }
    } catch (err) { logger.error('handlePhoto error', err); toast('Erreur lors de l\'ajout de la photo', 'error') }
    setUploading(false)
    e.target.value = ''
  }

  const [savingProfile, setSavingProfile] = useState(false)
  const savingRef = useRef(false)

  const saveProfile = async () => {
    if (savingRef.current) { logger.warn('saveProfile: déjà en cours'); return }
    savingRef.current = true
    setSavingProfile(true)
    let p = profile
    if (!p) {
      logger.debug('profile null, reloading')
      const { data: { user: u } } = await supabase.auth.getUser()
      if (!u) { toast('Session expirée. Reconnecte-toi.', 'error'); setSavingProfile(false); savingRef.current = false; return }
      const { data: fresh } = await supabase.from('profiles').select('id, name, bio, interests, looking_for, mood, energy_score, trust_score, photos, location').eq('id', u.id).maybeSingle()
      if (fresh) { p = fresh as Profile } else { toast('Impossible de charger le profil. Recharge la page.', 'error'); setSavingProfile(false); savingRef.current = false; return }
    }
    logger.debug('saveProfile start')
    try {
      const sanitized: Record<string, unknown> = {}
      const trimmedName = nameValue.trim()
      if (!trimmedName && !p.name) {
        toast('Le nom est requis pour enregistrer ton profil.', 'error')
        setSavingProfile(false); savingRef.current = false; return
      }
      const n = (trimmedName || p.name || '').replace(/<[^>]*>/g, '').slice(0, 80)
      if (n !== p.name) sanitized.name = n
      const b = (bio || '').replace(/<[^>]*>/g, '').slice(0, 500)
      if (b !== p.bio) sanitized.bio = b
      const i = interests.split(',').map(x => x.trim()).filter(Boolean)
      if (JSON.stringify(i) !== JSON.stringify(p.interests)) sanitized.interests = i
      if (lookingFor !== p.looking_for) sanitized.looking_for = lookingFor
      if (mood !== p.mood) sanitized.mood = mood
      if (gender !== p.gender) sanitized.gender = gender
      if (JSON.stringify(interestedIn) !== JSON.stringify(p.interested_in)) sanitized.interested_in = interestedIn
      if (Object.keys(sanitized).length === 0) {
        logger.debug('no changes')
        toast('Aucune modification détectée.', 'info')
        setSavingProfile(false); savingRef.current = false; return
      }
      logger.debug('saving profile')
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { toast('Session expirée. Reconnecte-toi.', 'error'); setSavingProfile(false); savingRef.current = false; return }
      if (user.id !== p.id) { toast('Erreur d\'authentification.', 'error'); setSavingProfile(false); savingRef.current = false; return }
      const upsertPayload = { id: p.id, name: p.name, bio: p.bio, interests: p.interests, looking_for: p.looking_for, mood: p.mood, ...sanitized }
      const { data, error } = await supabase.from('profiles').upsert(upsertPayload).select('id, name, bio, interests, looking_for, mood, gender, interested_in, energy_score, trust_score, location, photos').maybeSingle()
      if (error) { toast(error.message, 'error'); setSavingProfile(false); savingRef.current = false; return }
      if (!data) { toast('Impossible de sauvegarder. Vérifie ta connexion.', 'error'); setSavingProfile(false); savingRef.current = false; return }
      logger.debug('profile saved')
      updateEnergyScore(); fetch('/api/engine/trust-score', { method: 'POST' }).catch((err) => logger.warn('trust-score error', err)); recomputeAura()
      setProfile({ ...p, ...data } as Profile)
      setNameValue((data.name ?? p.name) || '')
      setBio((data.bio ?? p.bio) || '')
      setInterests((data.interests ?? p.interests)?.join(', ') || '')
      setLookingFor((data.looking_for ?? p.looking_for) as LookingFor)
      setMood((data.mood ?? p.mood) as Mood)
      setGender((data.gender ?? p.gender) as Gender)
      setInterestedIn((data.interested_in ?? p.interested_in) as string[])
      toast('Profil mis à jour avec succès.', 'success')
      setEditing(false)
    } catch (err) {
      logger.error('saveProfile: exception', err)
      toast(err instanceof Error ? err.message : 'Erreur réseau. Vérifie ta connexion.', 'error')
    } finally {
      setSavingProfile(false)
      savingRef.current = false
    }
  }

  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 60000); return () => clearInterval(t) }, [])
  useEffect(() => { logger.debug('profile state', profile ? `id=${profile.id} name=${profile.name} photos=${profile.photos?.length}` : 'null') }, [profile])

  const formatLastSeen = (date: string) => {
    const diff = now - new Date(date).getTime()
    if (diff < 60000) return 'En ligne'
    const m = Math.floor(diff / 60000)
    if (m < 60) return `Vu il y a ${m} min`
    const h = Math.floor(m / 60)
    return `Vu il y a ${h} h`
  }

  const [uploadingVideo, setUploadingVideo] = useState(false)

  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (!f) return
    setUploadingVideo(true)
    const result = await uploadProfileVideo(f)
    if (result.error) { toast(result.error, 'error'); setUploadingVideo(false); return }
    toast('Vidéo ajoutée', 'success')
    setUploadingVideo(false)
    loadProfile()
  }
  const handleDeleteVideo = async () => {
    await deleteProfileVideo()
    toast('Vidéo supprimée', 'success')
    loadProfile()
  }

  const handleLogout = async () => {
    await signOut()
    router.push('/')
  }

  if (loading) return (
    <div className="flex-1 flex items-center justify-center">
      <div className="animate-spin w-8 h-8 border-2 rounded-full" style={{ borderColor: 'var(--primary)', borderTopColor: 'transparent' }} />
    </div>
  )

  const menu = [
    { icon: BadgeCheck, label: profile?.is_verified ? 'Vérifié ✓' : 'Vérification', desc: profile?.is_verified ? 'Badge actif' : 'Certifie ton identité', action: () => router.push('/verify') },
    ...(profile?.is_admin ? [{ icon: Shield, label: 'Administration', desc: 'Panneau d\'administration', action: () => router.push('/admin') }] : []),
    { icon: Shield, label: 'Paramètres', desc: 'Confidentialité, notifications', action: () => router.push('/settings') },
    { icon: Lock, label: 'Confidentialité', desc: 'Mode privé, visibilité', action: () => router.push('/settings/privacy') },
    { icon: Palette, label: 'Apparence', desc: 'Thème sombre/clair', action: () => setThemePicker(true) },
    { icon: BarChart3, label: 'Statistiques', desc: 'Activité & progression', action: () => router.push('/stats') },
    { icon: Brain, label: 'Coach IA', desc: 'Améliore ton profil', action: () => router.push('/coach') },
    { icon: Plane, label: 'Mode voyage', desc: 'Change ta localisation', action: () => router.push('/travel') },
    { icon: Sparkles, label: 'Quiz compatibilité', desc: 'Trouve ton match parfait', action: () => router.push('/quiz') },
    { icon: CalendarDays, label: 'Événements', desc: 'Rencontres & sorties', action: () => router.push('/events') },
    { icon: Lightbulb, label: 'Idées de rendez-vous', desc: 'Inspire-toi', action: () => router.push('/date-ideas') },
    { icon: Star, label: 'Profil du jour', desc: 'Un profil mis en avant', action: () => router.push('/daily-profile') },
    { icon: HelpCircle, label: 'Aide', desc: 'Support & FAQ', action: () => router.push('/faq') },
    { icon: LogOut, label: 'Déconnexion', desc: '', danger: true, action: handleLogout },
  ]

  return (
    <div className="relative min-h-screen bg-theme bg-gradient-to-b from-[var(--bg)] via-[var(--surface)] to-[var(--surfaceSecondary)] p-4">
  <div className="flex-1 flex flex-col overflow-y-auto bg-transparent">
      <h1 className="sr-only">Profil</h1>
      <header className="flex items-center justify-between px-5 pt-6 pb-3 relative">
          <h2 className="text-3xl font-bold">Mon Profil</h2>
          {aura && (
            <div className="absolute -top-4 -left-4 z-10">
              <AuraSphere aura={aura} size={64} />
            </div>
          )}
          <Button
  variant="primary"
  onClick={() => setEditing(!editing)}
  className="active:scale-95"
  style={{ color: editing ? 'var(--textSecondary)' : 'var(--textOnPrimary)' }}
>
  {editing ? 'Annuler' : 'Modifier'}
</Button>
        </header>

      <div className="px-4">
        <div className="glass-card rounded-2xl p-6 mb-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="relative shrink-0">
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-[var(--primary)] to-[var(--primaryDark)] p-0.5 shrink-0">
                <div className="w-full h-full rounded-full overflow-hidden bg-hover">
                  {profile?.photos?.[0] ? (
                    <button type="button" onClick={() => setLightboxIdx(0)} className="w-full h-full">
                      <Image src={profile.photos[0]} alt={profile.name} width={96} height={96} className="object-cover w-full h-full" priority />
                    </button>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-secondary text-3xl">?</div>
                  )}
                </div>
              </div>
              <input ref={photoInputRef} type="file" accept="image/*" onChange={handlePhotoChange} className="hidden" />
              <button type="button" onClick={handlePhotoTap} disabled={uploading} aria-label="Ajouter une photo"
                className="absolute -bottom-1 -right-1 w-11 h-11 rounded-full flex items-center justify-center border-2 border-[var(--bg)]"
                style={{ background: 'var(--primary)' }}>
                {uploading ? <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" /> : <Camera size={16} className="text-theme" />}
              </button>
            </div>
            <div>
              <div className="flex items-center gap-1 flex-wrap">
                {profile?.name?.trim() ? (
                  <p className="text-xl font-bold">{profile.name.trim()}</p>
                ) : (
                  <button type="button" onClick={() => setEditing(true)} className="text-xl font-bold text-primary hover:underline">
                    + Ajouter mon pseudo
                  </button>
                )}
                {streak > 0 && (
                  <div className="flex items-center gap-1 text-sm ml-2">
                    <span>🔥</span>
                    <span className="text-warning font-bold">{streak}</span>
                  </div>
                )}
              </div>
                {profile?.location && <p className="text-sm text-secondary">📍 {profile.location}</p>}
                {aura && <div className="mt-1"><AuraBadge aura={aura} /></div>}
              {profile?.last_seen && <p className="text-xs text-secondary mt-0.5">{formatLastSeen(profile.last_seen)}</p>}
            </div>
          </div>

          {profile && (profile.photos?.length ?? 0) > 0 && (
            <div className="grid grid-cols-3 gap-2.5">
              {profile.photos.map((photo, idx) => (
                <div key={photo} className="relative group aspect-[3/4] rounded-xl overflow-hidden bg-hover">
                  <button type="button" onClick={() => setLightboxIdx(idx)} className="w-full h-full">
                    <Image src={photo} alt={`Photo ${idx + 1}`} width={200} height={266} className="object-cover w-full h-full" loading="lazy" />
                  </button>
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 backdrop-blur-sm transition-all flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                    {idx > 0 && (
                      <button type="button" onClick={() => { (async () => {
                        if (photoActionLoading) return
                        setPhotoActionLoading(`set-${photo}`)
                        const r = await setPrimaryPhoto(photo)
                        if (r.photos) setProfile({ ...profile, photos: r.photos })
                        setPhotoActionLoading(null)
                      })().catch(logger.error) }}
                        className="p-2.5 bg-white/90 rounded-full hover:bg-white disabled:opacity-40" aria-label="Photo principale" title="Photo principale" disabled={photoActionLoading === `set-${photo}`}>
                        {photoActionLoading === `set-${photo}` ? <Loader size={16} className="animate-spin text-warning" /> : <Star size={16} className="text-warning" />}
                      </button>
                    )}
                    <button type="button" onClick={() => { (async () => {
                      if (photoActionLoading) return
                      setPhotoActionLoading(`del-${photo}`)
                      const r = await deletePhoto(photo)
                      if (r.photos) setProfile({ ...profile, photos: r.photos })
                      setPhotoActionLoading(null)
                    })().catch(logger.error) }}
                      className="p-2.5 bg-white/90 rounded-full hover:bg-white disabled:opacity-40" aria-label="Supprimer" title="Supprimer" disabled={photoActionLoading === `del-${photo}`}>
                      {photoActionLoading === `del-${photo}` ? <Loader size={16} className="animate-spin text-error" /> : <Trash2 size={16} className="text-error" />}
                    </button>
                  </div>
                  {idx === 0 && <span className="absolute top-1 left-1 text-[10px] bg-warning text-theme px-1.5 py-0.5 rounded font-bold">PRINCIPALE</span>}
                </div>
              ))}
            </div>
          )}
          {editing && (
            <div className="mt-4">
              <p className="text-xs text-secondary mb-2 font-medium">Vidéo d&rsquo;introduction</p>
              {profile?.video_url ? (
                <div className="relative aspect-video rounded-xl overflow-hidden bg-surface">
                  <video src={profile.video_url} controls className="w-full h-full object-cover" />
                  <button type="button" onClick={handleDeleteVideo} aria-label="Supprimer la vidéo"
                    className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/50 flex items-center justify-center">
                    <Trash2 size={14} />
                  </button>
                </div>
              ) : (
                <button type="button" onClick={() => videoRef.current?.click()} disabled={uploadingVideo}
                  className="w-full aspect-video rounded-xl border-2 border-dashed border-theme flex items-center justify-center text-secondary disabled:opacity-40">
                  {uploadingVideo ? <div className="animate-spin w-5 h-5 border-2 border-[var(--primary)] border-t-transparent rounded-full" /> : <Camera size={24} />}
                </button>
              )}
              <input ref={videoRef} type="file" accept="video/*" capture="environment" onChange={handleVideoUpload} className="hidden" />
            </div>
          )}
        </div>

        {editing ? (
          <div className="space-y-4 mb-4">
            <div>
              <label htmlFor="profile-name" className="text-sm font-medium mb-1 block">Pseudo</label>
              <input id="profile-name" value={nameValue} onChange={e => setNameValue(e.target.value.slice(0, 80))} placeholder="Ton pseudo"
                maxLength={80} className="w-full px-4 py-3 rounded-xl border border-theme text-sm outline-none focus:border-primary" />
              <p className="text-[10px] text-secondary text-right mt-1">{nameValue.length}/80</p>
            </div>
            <div>
              <label htmlFor="profile-bio" className="text-sm font-medium mb-1 block">Bio</label>
              <textarea id="profile-bio" value={bio} onChange={e => setBio(e.target.value.slice(0, 500))} rows={4}
                className="w-full px-4 py-3 rounded-xl border border-theme text-sm outline-none focus:border-primary resize-none" />
              <p className="text-[10px] text-secondary text-right mt-1">{bio.length}/500</p>
            </div>
            <div>
              <label htmlFor="profile-interests" className="text-sm font-medium mb-1 block">Centres d&rsquo;intérêt (séparés par des virgules)</label>
              <input id="profile-interests" value={interests} onChange={e => setInterests(e.target.value)} placeholder="Voyage, Café, Photographie..."
                className="w-full px-4 py-3 rounded-xl border border-theme text-sm outline-none focus:border-primary" />
            </div>
            <div>
              <label htmlFor="profile-looking-for" className="text-sm font-medium mb-1 block">Ce que je cherche</label>
              <select id="profile-looking-for" value={lookingFor} onChange={e => setLookingFor(e.target.value as LookingFor)}
                className="w-full px-4 py-3 rounded-xl border border-theme text-sm outline-none focus:border-primary bg-theme">
                <option value="friendship">Amitié</option>
                <option value="casual">Plan cul</option>
                <option value="fwb">Friends with benefits</option>
                <option value="serious">Relation sérieuse</option>
                <option value="open">Relation libre</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Mon mood</label>
              <div className="flex overflow-x-auto gap-2 pb-2">
                {([
                  ['discuter', '💬 Discuter'],
                  ['rencontre', '🔥 Rencontre'],
                  ['disponible_ce_soir', '🍷 Dispo ce soir'],
                  ['relation_serieuse', '💕 Sérieux'],
                  ['chill', '🎮 Chill'],
                  ['de_passage', '🌍 De passage'],
                ] as const).map(([val, label]) => (
                  <button type="button" key={val} onClick={() => setMood(val as Mood)}
                    className={`px-3 py-2.5 rounded-xl text-xs font-medium border transition-all ${
                      mood === val
                        ? 'border-[var(--primary)] bg-primary/10 text-primary'
                        : 'border-theme text-secondary hover:border-[var(--borderMedium)]'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Genre</label>
              <div className="flex gap-2">
                {(['male', 'female', 'non_binary'] as const).map(g => (
                  <button type="button" key={g} onClick={() => setGender(g)}
                    className={`flex-1 px-3 py-2.5 rounded-xl text-xs font-medium border transition-all ${
                      gender === g ? 'border-primary bg-primary/10 text-primary' : 'border-theme text-secondary hover:border-primary/30'
                    }`}>
                    {g === 'male' ? 'Homme' : g === 'female' ? 'Femme' : 'Non binaire'}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Je cherche</label>
              <div className="flex flex-wrap gap-2">
                {(['male', 'female', 'non_binary'] as const).map(g => {
                  const checked = interestedIn.includes(g)
                  return (
                    <button type="button" key={g} onClick={() => {
                      setInterestedIn(checked ? interestedIn.filter(x => x !== g) : [...interestedIn, g])
                    }}
                      className={`px-3 py-2 rounded-xl text-xs font-medium border transition-all ${
                        checked ? 'border-primary bg-primary/10 text-primary' : 'border-theme text-secondary hover:border-primary/30'
                      }`}>
                      {g === 'male' ? 'Hommes' : g === 'female' ? 'Femmes' : 'Non binaires'}
                    </button>
                  )
                })}
              </div>
            </div>
            <Button
  variant="premium"
  onClick={() => { saveProfile().catch(logger.error) }}
  disabled={savingProfile}
  className="w-full py-3.5 disabled:opacity-40"
  style={{ background: 'var(--primary)' }}
>
  {savingProfile ? 'Sauvegarde...' : 'Enregistrer'}
</Button>
          </div>
        ) : (
          <>
            {profile?.bio && (
              <div className="glass-card rounded-2xl p-5 mb-4">
                <h3 className="font-semibold text-sm mb-1.5 text-secondary uppercase tracking-wider">Bio</h3>
                <p className="text-sm leading-relaxed">{profile.bio}</p>
              </div>
            )}
            {profile?.interests && profile.interests.length > 0 && (
              <div className="glass-card rounded-2xl p-5 mb-4">
                <h3 className="font-semibold text-sm mb-2.5 text-secondary uppercase tracking-wider">Centres d&rsquo;intérêt</h3>
                <div className="flex flex-wrap gap-2">
                  {profile.interests.map(i => (
                    <span key={i} className="text-xs bg-primary/8 px-3 py-1.5 rounded-full border border-[var(--primary)]/10 text-primary">{i}</span>
                  ))}
                </div>
              </div>
            )}
            {profile?.looking_for && (
              <div className="glass-card rounded-2xl p-5 mb-4">
                <h3 className="font-semibold text-sm mb-2.5 text-secondary uppercase tracking-wider">Ce que je cherche</h3>
                <span className="text-xs text-primary bg-primary/10 px-3 py-1.5 rounded-full border border-[var(--primary)]/10">
                  {{ friendship: 'Amitié', casual: 'Plan cul', fwb: 'Friends with benefits', serious: 'Relation sérieuse', open: 'Relation libre' }[profile.looking_for] ?? profile.looking_for}
                </span>
              </div>
            )}
            {profile?.gender && (
              <div className="glass-card rounded-2xl p-5 mb-4">
                <h3 className="font-semibold text-sm mb-2.5 text-secondary uppercase tracking-wider">Genre</h3>
                <span className="text-xs text-primary bg-primary/10 px-3 py-1.5 rounded-full border border-[var(--primary)]/10">
                  {{ male: 'Homme', female: 'Femme', non_binary: 'Non binaire' }[profile.gender] ?? profile.gender}
                </span>
              </div>
            )}
            {profile?.interested_in && profile.interested_in.length > 0 && (
              <div className="glass-card rounded-2xl p-5 mb-4">
                <h3 className="font-semibold text-sm mb-2.5 text-secondary uppercase tracking-wider">Je cherche</h3>
                <div className="flex flex-wrap gap-2">
                  {profile.interested_in.map(g => (
                    <span key={g} className="text-xs text-primary bg-primary/10 px-3 py-1.5 rounded-full border border-[var(--primary)]/10">
                      {{ male: 'Hommes', female: 'Femmes', non_binary: 'Non binaires' }[g] ?? g}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {profile?.mood && (
              <div className="glass-card rounded-2xl p-5 mb-4">
                <h3 className="font-semibold text-sm mb-2.5 text-secondary uppercase tracking-wider">Mon mood</h3>
                <span className="inline-flex items-center gap-1.5 text-xs bg-primary/10 px-3 py-1.5 rounded-full border border-[var(--primary)]/10 text-primary">
                  {{
                    discuter: '💬 Discuter',
                    rencontre: '🔥 Rencontre',
                    disponible_ce_soir: '🍷 Disponible ce soir',
                    relation_serieuse: '💕 Relation sérieuse',
                    chill: '🎮 Chill',
                    de_passage: '🌍 De passage',
                  }[profile.mood] ?? profile.mood}
                </span>
              </div>
            )}
            {profile?.energy_score !== undefined && profile?.energy_score !== null && (
              <div className="glass-card rounded-2xl p-5 mb-4">
                <h3 className="font-semibold text-sm mb-2.5 text-secondary uppercase tracking-wider">Energy Score</h3>
                <div className="flex items-center gap-3">
                <div className="w-12 h-12">
                  <CircularProgressbar
                    value={profile.energy_score}
                    text={`${profile.energy_score}`}
                    styles={buildStyles({
                      textSize: '32px',
                      pathColor:
                        profile.energy_score >= 70 ? 'var(--success)' :
                        profile.energy_score >= 40 ? 'var(--warning)' :
                        'var(--error)',
                      trailColor: 'var(--border)',
                      textColor: 'var(--textPrimary)',
                    })}
                  />
                </div>
                <span className="text-sm font-bold">Energy</span>
              </div>
              </div>
            )}
            {profile?.trust_score !== undefined && profile?.trust_score !== null && (
              <div className="glass-card rounded-2xl p-5 mb-4">
                <h3 className="font-semibold text-sm mb-2.5 text-secondary uppercase tracking-wider">Score de Confiance</h3>
                <div className="flex items-center gap-3">
                <div className="w-12 h-12">
                  <CircularProgressbar
                    value={profile.trust_score}
                    text={`${profile.trust_score}`}
                    styles={buildStyles({
                      textSize: '32px',
                      pathColor:
                        profile.trust_score >= 70 ? 'var(--info)' :
                        profile.trust_score >= 40 ? 'var(--warning)' :
                        'var(--error)',
                      trailColor: 'var(--border)',
                      textColor: 'var(--textPrimary)',
                    })}
                  />
                </div>
                <span className="text-sm font-bold">Trust</span>
              </div>
              </div>
            )}
            {profileTraits.length > 0 && (
              <div className="glass-card rounded-2xl p-5 mb-4">
                <h3 className="font-semibold text-sm mb-2.5 text-secondary uppercase tracking-wider">Personnalité</h3>
                <div className="flex flex-wrap gap-2">
                  {profileTraits.map((trait: string, i: number) => (
                    <span key={i} className="px-3 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary border border-[var(--primary)]/20">
                      {trait}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        <div className="grid grid-cols-2 gap-3 mb-8">
          {menu.map(({ icon: Icon, label, desc, danger, action }) => (
            <button type="button" key={label} onClick={action}
              onMouseMove={e => {
                const rect = e.currentTarget.getBoundingClientRect()
                e.currentTarget.style.setProperty('--mouse-x', `${((e.clientX - rect.left) / rect.width) * 100}%`)
                e.currentTarget.style.setProperty('--mouse-y', `${((e.clientY - rect.top) / rect.height) * 100}%`)
              }}
              className="relative group flex flex-col items-start gap-2 p-4 rounded-2xl text-left transition-all duration-200 active:scale-[0.97] border"
              style={{
                background: danger
                  ? 'linear-gradient(135deg, rgba(239,68,68,0.08) 0%, rgba(239,68,68,0.02) 100%)'
                  : 'linear-gradient(135deg, var(--primaryGlow) 0%, var(--borderLight) 100%)',
                borderColor: danger ? 'rgba(239,68,68,0.15)' : 'var(--borderLight)',
              }}>
              <div className="flex items-center gap-3 w-full">
                <div className="p-2 rounded-xl transition-colors shrink-0"
                  style={{
                    background: danger
                      ? 'rgba(239,68,68,0.12)'
                      : 'linear-gradient(135deg, var(--primaryGlow) 0%, var(--borderLight) 100%)',
                  }}>
                  <Icon size={18} className={danger ? 'text-error' : ''} style={{ color: danger ? undefined : 'var(--primary)' }} />
                </div>
                <span className={`text-sm font-semibold ${danger ? 'text-error' : 'text-theme'}`}>{label}</span>
              </div>
              {desc && <span className="text-[11px] text-muted leading-tight">{desc}</span>}
              <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
                style={{
                  background: danger
                    ? 'radial-gradient(600px circle at var(--mouse-x,50%) var(--mouse-y,50%), rgba(239,68,68,0.06), transparent 40%)'
                    : 'radial-gradient(600px circle at var(--mouse-x,50%) var(--mouse-y,50%), var(--primaryGlow), transparent 40%)',
                }} />
            </button>
          ))}
        </div>
      </div>

      {lightboxIdx !== null && profile?.photos && (
        <Lightbox images={profile.photos} initialIndex={lightboxIdx} onClose={() => setLightboxIdx(null)} />
      )}

      {themePicker && (
        <div aria-hidden="true" role="presentation" className="fixed inset-0 z-50 flex items-end justify-center bg-[rgba(0,0,0,0.6)] backdrop-blur-sm" onClick={() => setThemePicker(false)}
          onKeyDown={(e) => { if (e.key === 'Escape') setThemePicker(false) }}>
          <div role="dialog" aria-modal="true" tabIndex={-1} className="w-full max-w-lg bg-surface rounded-t-3xl p-6 animate-slide-up" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-center mb-5">Apparence</h3>
            <div className="space-y-2">
              {[
                { mode: 'light', icon: Sun, label: 'Clair' },
                { mode: 'dark', icon: Moon, label: 'Nuit' },
                { mode: 'system', icon: Monitor, label: 'Système' },
              ].map(({ mode, icon: Icon, label }) => {
                const current = theme || 'system'
                const active = current === mode
                return (
                  <button type="button" key={mode} onClick={() => {
                    setTheme(mode)
                    setThemePicker(false)
                  }} className={`w-full flex items-center justify-between px-4 py-3.5 rounded-xl transition-all ${active ? 'bg-primary/10 border border-[var(--primary)]/20' : 'hover:bg-card/5'}`}>
                    <div className="flex items-center gap-3">
                      <Icon size={20} className={active ? 'text-primary' : 'text-secondary'} />
                      <span className={active ? 'text-primary font-medium' : 'text-sm'}>{label}</span>
                    </div>
                    {active && <Check size={18} className="text-primary" />}
                  </button>
                )
              })}
            </div>
          </div>


    </div>
  )}
  </div>
</div>
)
}

export default function ProfilePage() {
  return (
    <ProfileErrorBoundary>
      <ProfilePageInner />
    </ProfileErrorBoundary>
  )
}

