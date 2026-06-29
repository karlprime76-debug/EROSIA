'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Camera, LogOut, ChevronRight, Shield, HelpCircle, Palette, Trash2, Star, BadgeCheck, Swords, Heart, Gift, Check, Sun, Moon, Monitor } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { signOut, uploadPhoto, updateProfile, deletePhoto, setPrimaryPhoto, uploadProfileVideo, deleteProfileVideo, getProfileTraits, getStreak, updateEnergyScore, type Profile, type LookingFor, type Mood } from '@/lib/api'
import Lightbox from '@/components/Lightbox'
import { useToast } from '@/components/Toast'
import { logger } from '@/lib/logger'
import { AuraSphere, AuraBadge, useAura } from '@/components/AuraSphere'

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [editing, setEditing] = useState(false)
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null)
  const [nameValue, setNameValue] = useState('')
  const [bio, setBio] = useState('')
  const [interests, setInterests] = useState('')
  const [lookingFor, setLookingFor] = useState<LookingFor>('friendship')
  const [mood, setMood] = useState<Mood>('discuter')
  const [now, setNow] = useState(0)
  const [profileTraits, setProfileTraits] = useState<string[]>([])
  const [streak, setStreak] = useState(0)
  const [themePicker, setThemePicker] = useState(false)
  const videoRef = useRef<HTMLInputElement>(null)
  const { aura, recompute: recomputeAura } = useAura()
  const { toast } = useToast()
  const router = useRouter()

  const fetchProfileFromApi = async () => {
    const res = await fetch('/api/profile/me')
    const json = await res.json()
    logger.debug('/api/profile/me response', { status: res.status, data: json })
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
          logger.warn('/api/profile/me returned null, fallback to browser client getUser')
          const { data: { user } } = await supabase.auth.getUser()
          logger.debug('browser getUser fallback', { userId: user?.id, email: user?.email })
          if (user && !cancelled) {
            const PROFILE_FIELDS = 'id, name, age, bio, occupation, location, photos, interests, is_verified, looking_for, mood, energy_score, trust_score, created_at'
            const { data } = await supabase.from('profiles').select(PROFILE_FIELDS).eq('id', user.id).maybeSingle()
            logger.debug('browser select fallback', { id: data?.id, name: data?.name })
            if (data) { setProfile(data as Profile); setNameValue(data.name ?? ''); setBio(data.bio ?? ''); setInterests(data.interests?.join(', ') ?? ''); setLookingFor(data.looking_for ?? 'friendship'); setMood((data as Profile).mood ?? 'discuter') }
          }
        } else {
          logger.debug('/api/profile/me success', { id: profileData.id, name: profileData.name })
          setProfile(profileData); setNameValue(profileData.name ?? ''); setBio(profileData.bio ?? ''); setInterests(profileData.interests?.join(', ') ?? ''); setLookingFor(profileData.looking_for ?? 'friendship'); setMood(profileData.mood ?? 'discuter'); getProfileTraits(profileData.id).then(({ data: traits }) => { if (traits && !cancelled) setProfileTraits(traits.map(t => t.trait)) }).catch(() => {}); getStreak().then(({ data: sd }) => { if (sd && !cancelled) setStreak(sd.current_streak ?? 0) }).catch(() => {})
        }
      } catch (err) { logger.error('loadProfile: exception', err) }
      if (!cancelled) setLoading(false)
    })()
    return () => { cancelled = true }
  }, [])
  const loadProfile = async () => {
    try {
      const profileData = await fetchProfileFromApi()
      if (profileData) { setProfile(profileData); setNameValue(profileData.name ?? ''); setBio(profileData.bio ?? ''); setInterests(profileData.interests?.join(', ') ?? ''); setLookingFor(profileData.looking_for ?? 'friendship'); setMood(profileData.mood ?? 'discuter') }
    } catch (err) { logger.error('loadProfile: exception', err) }
  }
  const handlePhoto = async () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    input.onchange = async () => {
      const file = input.files?.[0]
      if (!file || !profile) return
      setUploading(true)
      try {
        const result = await uploadPhoto(file, profile.id, profile.photos.length)
        if (result.error) { toast(result.error, 'error'); setUploading(false); return }
        if (result.url) {
          const photos = [result.url, ...(profile.photos?.filter(p => p !== result.url) ?? [])]
          const { error: updateErr } = await updateProfile(profile.id, { photos })
          if (updateErr) { logger.error('handlePhoto updateProfile error', updateErr); toast(updateErr, 'error'); setUploading(false); return }
          setProfile({ ...profile, photos })
          toast('Photo ajoutée', 'success')
        }
      } catch (err) { logger.error('handlePhoto error', err); toast('Erreur lors de l\'ajout de la photo', 'error') }
      setUploading(false)
    }
    input.click()
  }

  const [savingProfile, setSavingProfile] = useState(false)
  const savingRef = useRef(false)

  const saveProfile = async () => {
    if (savingRef.current) { logger.warn('saveProfile: déjà en cours'); return }
    savingRef.current = true
    setSavingProfile(true)
    let p = profile
    if (!p) {
      logger.debug('saveProfile: profile null, tentative de rechargement')
      const { data: { user: u } } = await supabase.auth.getUser()
      if (!u) { toast('Session expirée. Reconnecte-toi.', 'error'); setSavingProfile(false); savingRef.current = false; return }
      const { data: fresh } = await supabase.from('profiles').select('id, name, bio, interests, looking_for, mood, energy_score, trust_score, photos, location').eq('id', u.id).maybeSingle()
      if (fresh) { p = fresh as Profile } else { toast('Impossible de charger le profil. Recharge la page.', 'error'); setSavingProfile(false); savingRef.current = false; return }
    }
    logger.debug('saveProfile: début', { id: p.id, nameValue, bio, interests, lookingFor })
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
      if (Object.keys(sanitized).length === 0) {
        logger.debug('saveProfile: aucun changement')
        toast('Aucune modification détectée.', 'info')
        setSavingProfile(false); savingRef.current = false; return
      }
      logger.debug('saveProfile: envoi vers Supabase', sanitized)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { toast('Session expirée. Reconnecte-toi.', 'error'); setSavingProfile(false); savingRef.current = false; return }
      if (user.id !== p.id) { toast('Erreur d\'authentification.', 'error'); setSavingProfile(false); savingRef.current = false; return }
      const upsertPayload = { id: p.id, name: p.name, bio: p.bio, interests: p.interests, looking_for: p.looking_for, mood: p.mood, ...sanitized }
      const { data, error } = await supabase.from('profiles').upsert(upsertPayload).select('id, name, bio, interests, looking_for, mood, energy_score, trust_score, location, photos').maybeSingle()
      logger.debug('saveProfile: réponse Supabase', { data, error })
      if (error) { toast(error.message, 'error'); setSavingProfile(false); savingRef.current = false; return }
      if (!data) { toast('Impossible de sauvegarder. Vérifie ta connexion.', 'error'); setSavingProfile(false); savingRef.current = false; return }
      logger.debug('saveProfile: succès', data)
      updateEnergyScore(); fetch('/api/engine/trust-score', { method: 'POST' }).catch(() => {}); recomputeAura()
      setProfile({ ...p, ...data } as Profile)
      setNameValue((data.name ?? p.name) || '')
      setBio((data.bio ?? p.bio) || '')
      setInterests((data.interests ?? p.interests)?.join(', ') || '')
      setLookingFor((data.looking_for ?? p.looking_for) as LookingFor)
      setMood((data.mood ?? p.mood) as Mood)
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

  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 30000); return () => clearInterval(t) }, [])
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
      <div className="animate-spin w-8 h-8 border-2 rounded-full" style={{ borderColor: '#D92D4A', borderTopColor: 'transparent' }} />
    </div>
  )

  const menu = [
    { icon: BadgeCheck, label: 'Vérification', action: () => router.push('/verify') },
    { icon: Shield, label: 'Paramètres', action: () => router.push('/settings') },
    { icon: Gift, label: 'Boutique cadeaux', action: () => router.push('/gifts') },
    { icon: Palette, label: 'Apparence', action: () => setThemePicker(true) },
    { icon: Swords, label: 'Duel', action: () => router.push('/duels') },
    { icon: Heart, label: 'Idées de date', action: () => router.push('/date-ideas') },
    { icon: Star, label: 'Profil du jour', action: () => router.push('/daily-profile') },
    { icon: HelpCircle, label: 'Aide', action: () => window.open('mailto:support@erosia.app', '_blank') },
    { icon: LogOut, label: 'Déconnexion', danger: true, action: handleLogout },
  ]

  return (
    <div className="flex-1 flex flex-col overflow-y-auto bg-transparent">
      <header className="flex items-center justify-between px-5 pt-6 pb-3">
        <h2 className="text-3xl font-bold">Mon Profil</h2>
        <button type="button" onClick={() => setEditing(!editing)} className="px-5 py-2 rounded-full text-xs font-semibold transition-all active:scale-95 glass-light hover:bg-white/10"
          style={{ color: editing ? '#9E9488' : '#D92D4A' }}>
          {editing ? 'Annuler' : 'Modifier'}
        </button>
      </header>

      <div className="px-4">
        <div className="glass-card rounded-2xl p-6 mb-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="relative shrink-0">
              {aura && (
                <div className="absolute -top-2 -left-2 z-10">
                  <AuraSphere aura={aura} size={56} />
                </div>
              )}
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-[#D92D4A] to-[#C85A17] p-0.5 shrink-0">
                <div className="w-full h-full rounded-full overflow-hidden bg-[#262628]">
                  {profile?.photos?.[0] ? (
                    <button type="button" onClick={() => setLightboxIdx(0)} className="w-full h-full">
                      <Image src={profile.photos[0]} alt={profile.name} width={96} height={96} className="object-cover w-full h-full" />
                    </button>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-[#9E9488] text-3xl">?</div>
                  )}
                </div>
              </div>
              <button type="button" onClick={handlePhoto} disabled={uploading} aria-label="Ajouter une photo"
                className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full flex items-center justify-center border-2 border-[#141414]"
                style={{ background: '#D92D4A' }}>
                {uploading ? <div className="animate-spin w-3 h-3 border-2 border-white border-t-transparent rounded-full" /> : <Camera size={14} className="text-white" />}
              </button>
            </div>
            <div>
              <div className="flex items-center gap-1 flex-wrap">
                {profile?.name?.trim() ? (
                  <p className="text-xl font-bold">{profile.name.trim()}</p>
                ) : (
                  <button type="button" onClick={() => setEditing(true)} className="text-xl font-bold text-[#D92D4A] hover:underline">
                    + Ajouter mon pseudo
                  </button>
                )}
                {streak > 0 && (
                  <div className="flex items-center gap-1 text-sm ml-2">
                    <span>🔥</span>
                    <span className="text-[#EAB308] font-bold">{streak}</span>
                  </div>
                )}
              </div>
                {profile?.location && <p className="text-sm text-[#9E9488]">📍 {profile.location}</p>}
                {aura && <div className="mt-1"><AuraBadge aura={aura} /></div>}
              {profile?.last_seen && <p className="text-xs text-[#9E9488] mt-0.5">{formatLastSeen(profile.last_seen)}</p>}
            </div>
          </div>

          {profile && profile.photos.length > 0 && (
            <div className="grid grid-cols-3 gap-2.5">
              {profile.photos.map((photo, idx) => (
                <div key={photo} className="relative group aspect-[3/4] rounded-xl overflow-hidden bg-[#262628]">
                  <button type="button" onClick={() => setLightboxIdx(idx)} className="w-full h-full">
                    <Image src={photo} alt={`Photo ${idx + 1}`} width={200} height={266} className="object-cover w-full h-full" />
                  </button>
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 backdrop-blur-sm transition-all flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                    {idx > 0 && (
                      <button type="button" onClick={() => { (async () => { const r = await setPrimaryPhoto(profile.id, photo, profile.photos); if (r.photos) setProfile({ ...profile, photos: r.photos }) })().catch(logger.error) }}
                        className="p-2 bg-white/90 rounded-full hover:bg-white" aria-label="Photo principale" title="Photo principale">
                        <Star size={14} className="text-amber-500" />
                      </button>
                    )}
                    <button type="button" onClick={() => { (async () => { const r = await deletePhoto(profile.id, photo, profile.photos); if (r.photos) setProfile({ ...profile, photos: r.photos }) })().catch(logger.error) }}
                      className="p-2 bg-white/90 rounded-full hover:bg-white" aria-label="Supprimer" title="Supprimer">
                      <Trash2 size={14} className="text-red-500" />
                    </button>
                  </div>
                  {idx === 0 && <span className="absolute top-1 left-1 text-[10px] bg-amber-400 text-white px-1.5 py-0.5 rounded font-bold">PRINCIPALE</span>}
                </div>
              ))}
            </div>
          )}
          {editing && (
            <div className="mt-4">
              <p className="text-xs text-[#9E9488] mb-2 font-medium">Vidéo d&rsquo;introduction</p>
              {profile?.video_url ? (
                <div className="relative aspect-video rounded-xl overflow-hidden bg-[#1C1C1E]">
                  <video src={profile.video_url} controls className="w-full h-full object-cover" />
                  <button type="button" onClick={handleDeleteVideo} aria-label="Supprimer la vidéo"
                    className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/50 flex items-center justify-center">
                    <Trash2 size={14} />
                  </button>
                </div>
              ) : (
                <button type="button" onClick={() => videoRef.current?.click()} disabled={uploadingVideo}
                  className="w-full aspect-video rounded-xl border-2 border-dashed border-[#2A2826] flex items-center justify-center text-[#9E9488] disabled:opacity-40">
                  {uploadingVideo ? <div className="animate-spin w-5 h-5 border-2 border-[#D92D4A] border-t-transparent rounded-full" /> : <Camera size={24} />}
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
                maxLength={80} className="w-full px-4 py-3 rounded-xl border border-[#2A2826] text-sm outline-none focus:border-[#D92D4A]" />
              <p className="text-[10px] text-[#9E9488] text-right mt-1">{nameValue.length}/80</p>
            </div>
            <div>
              <label htmlFor="profile-bio" className="text-sm font-medium mb-1 block">Bio</label>
              <textarea id="profile-bio" value={bio} onChange={e => setBio(e.target.value.slice(0, 500))} rows={4}
                className="w-full px-4 py-3 rounded-xl border border-[#2A2826] text-sm outline-none focus:border-[#D92D4A] resize-none" />
              <p className="text-[10px] text-[#9E9488] text-right mt-1">{bio.length}/500</p>
            </div>
            <div>
              <label htmlFor="profile-interests" className="text-sm font-medium mb-1 block">Centres d&rsquo;intérêt (séparés par des virgules)</label>
              <input id="profile-interests" value={interests} onChange={e => setInterests(e.target.value)} placeholder="Voyage, Café, Photographie..."
                className="w-full px-4 py-3 rounded-xl border border-[#2A2826] text-sm outline-none focus:border-[#D92D4A]" />
            </div>
            <div>
              <label htmlFor="profile-looking-for" className="text-sm font-medium mb-1 block">Ce que je cherche</label>
              <select id="profile-looking-for" value={lookingFor} onChange={e => setLookingFor(e.target.value as LookingFor)}
                className="w-full px-4 py-3 rounded-xl border border-[#2A2826] text-sm outline-none focus:border-[#D92D4A] bg-[#141414]">
                <option value="friendship">Amitié</option>
                <option value="casual">Plan cul</option>
                <option value="fwb">Friends with benefits</option>
                <option value="serious">Relation sérieuse</option>
                <option value="open">Relation libre</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Mon mood</label>
              <div className="grid grid-cols-2 gap-2">
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
                        ? 'border-[#D92D4A] bg-[#D92D4A]/10 text-[#D92D4A]'
                        : 'border-[#2A2826] text-[#9E9488] hover:border-[#5A5248]'
                    }`}>
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <button type="button" onClick={() => { saveProfile().catch(logger.error) }} disabled={savingProfile} className="w-full py-3.5 rounded-full text-white font-semibold disabled:opacity-40" style={{ background: '#D92D4A' }}>
              {savingProfile ? 'Sauvegarde...' : 'Enregistrer'}
            </button>
          </div>
        ) : (
          <>
            {profile?.bio && (
              <div className="glass-card rounded-2xl p-5 mb-4">
                <h3 className="font-semibold text-sm mb-1.5 text-[#9E9488] uppercase tracking-wider">Bio</h3>
                <p className="text-sm leading-relaxed">{profile.bio}</p>
              </div>
            )}
            {profile?.interests && profile.interests.length > 0 && (
              <div className="glass-card rounded-2xl p-5 mb-4">
                <h3 className="font-semibold text-sm mb-2.5 text-[#9E9488] uppercase tracking-wider">Centres d&rsquo;intérêt</h3>
                <div className="flex flex-wrap gap-2">
                  {profile.interests.map(i => (
                    <span key={i} className="text-xs bg-[#D92D4A]/8 px-3 py-1.5 rounded-full border border-[#D92D4A]/10 text-[#D92D4A]">{i}</span>
                  ))}
                </div>
              </div>
            )}
            {profile?.looking_for && (
              <div className="glass-card rounded-2xl p-5 mb-4">
                <h3 className="font-semibold text-sm mb-2.5 text-[#9E9488] uppercase tracking-wider">Ce que je cherche</h3>
                <span className="text-xs text-[#D92D4A] bg-[#D92D4A]/10 px-3 py-1.5 rounded-full border border-[#D92D4A]/10">
                  {{ friendship: 'Amitié', casual: 'Plan cul', fwb: 'Friends with benefits', serious: 'Relation sérieuse', open: 'Relation libre' }[profile.looking_for] ?? profile.looking_for}
                </span>
              </div>
            )}
            {profile?.mood && (
              <div className="glass-card rounded-2xl p-5 mb-4">
                <h3 className="font-semibold text-sm mb-2.5 text-[#9E9488] uppercase tracking-wider">Mon mood</h3>
                <span className="inline-flex items-center gap-1.5 text-xs bg-[#D92D4A]/10 px-3 py-1.5 rounded-full border border-[#D92D4A]/10 text-[#D92D4A]">
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
                <h3 className="font-semibold text-sm mb-2.5 text-[#9E9488] uppercase tracking-wider">Energy Score</h3>
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-2.5 rounded-full bg-[#2A2826] overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${profile.energy_score}%`,
                        background: profile.energy_score >= 70
                          ? 'linear-gradient(90deg, #34D399, #22C55E)'
                          : profile.energy_score >= 40
                          ? 'linear-gradient(90deg, #FBBF24, #F59E0B)'
                          : 'linear-gradient(90deg, #F87171, #EF4444)',
                      }} />
                  </div>
                  <span className="text-sm font-bold" style={{
                    color: profile.energy_score >= 70 ? '#34D399' : profile.energy_score >= 40 ? '#FBBF24' : '#F87171',
                  }}>{profile.energy_score}</span>
                </div>
              </div>
            )}
            {profile?.trust_score !== undefined && profile?.trust_score !== null && (
              <div className="glass-card rounded-2xl p-5 mb-4">
                <h3 className="font-semibold text-sm mb-2.5 text-[#9E9488] uppercase tracking-wider">Score de Confiance</h3>
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-2.5 rounded-full bg-[#2A2826] overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${profile.trust_score}%`,
                        background: profile.trust_score >= 70
                          ? 'linear-gradient(90deg, #818CF8, #6366F1)'
                          : profile.trust_score >= 40
                          ? 'linear-gradient(90deg, #FBBF24, #F59E0B)'
                          : 'linear-gradient(90deg, #F87171, #EF4444)',
                      }} />
                  </div>
                  <span className="text-sm font-bold" style={{
                    color: profile.trust_score >= 70 ? '#818CF8' : profile.trust_score >= 40 ? '#FBBF24' : '#F87171',
                  }}>{profile.trust_score}</span>
                </div>
              </div>
            )}
            {profileTraits.length > 0 && (
              <div className="glass-card rounded-2xl p-5 mb-4">
                <h3 className="font-semibold text-sm mb-2.5 text-[#9E9488] uppercase tracking-wider">Personnalité</h3>
                <div className="flex flex-wrap gap-2">
                  {profileTraits.map((trait: string, i: number) => (
                    <span key={i} className="px-3 py-1 rounded-full text-xs font-medium bg-[#D92D4A]/10 text-[#D92D4A] border border-[#D92D4A]/20">
                      {trait}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        <div className="glass-card rounded-2xl overflow-hidden mb-8 divide-y divide-[#2A2826]/50">
          {menu.map(({ icon: Icon, label, danger, action }) => (
            <button type="button" key={label} onClick={action} className="w-full flex items-center justify-between px-4 py-3.5 text-left">
              <div className="flex items-center gap-3">
                <Icon size={20} className={danger ? 'text-red-500' : 'text-[#9E9488]'} />
                <span className={danger ? 'text-red-500 text-sm font-medium' : 'text-sm'}>{label}</span>
              </div>
              <ChevronRight size={18} className="text-[#5A5248]" />
            </button>
          ))}
        </div>
      </div>

      {lightboxIdx !== null && profile?.photos && (
        <Lightbox images={profile.photos} initialIndex={lightboxIdx} onClose={() => setLightboxIdx(null)} />
      )}

      {themePicker && (
        <div aria-hidden="true" role="presentation" className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm" onClick={() => setThemePicker(false)}
          onKeyDown={(e) => { if (e.key === 'Escape') setThemePicker(false) }}>
          <div role="dialog" aria-modal="true" tabIndex={-1} className="w-full max-w-lg bg-[#1C1C1E] rounded-t-3xl p-6 animate-slide-up" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-center mb-5">Apparence</h3>
            <div className="space-y-2">
              {[
                { mode: 'light', icon: Sun, label: 'Clair' },
                { mode: 'dark', icon: Moon, label: 'Nuit' },
                { mode: 'system', icon: Monitor, label: 'Système' },
              ].map(({ mode, icon: Icon, label }) => {
                const current = localStorage.getItem('erosia_theme') || 'system'
                const active = current === mode
                return (
                  <button type="button" key={mode} onClick={() => {
                    const html = document.documentElement
                    if (mode === 'system') {
                      localStorage.removeItem('erosia_theme')
                      html.classList.remove('light', 'dark')
                      if (window.matchMedia('(prefers-color-scheme: dark)').matches) html.classList.add('dark')
                      else html.classList.add('light')
                    } else {
                      localStorage.setItem('erosia_theme', mode)
                      html.classList.remove('light', 'dark')
                      html.classList.add(mode)
                    }
                    setThemePicker(false)
                  }}
                    className={`w-full flex items-center justify-between px-4 py-3.5 rounded-xl transition-all ${active ? 'bg-[#D92D4A]/10 border border-[#D92D4A]/20' : 'hover:bg-white/5'}`}>
                    <div className="flex items-center gap-3">
                      <Icon size={20} className={active ? 'text-[#D92D4A]' : 'text-[#9E9488]'} />
                      <span className={active ? 'text-[#D92D4A] font-medium' : 'text-sm'}>{label}</span>
                    </div>
                    {active && <Check size={18} className="text-[#D92D4A]" />}
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
