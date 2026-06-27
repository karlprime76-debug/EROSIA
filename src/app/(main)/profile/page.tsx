'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Camera, LogOut, ChevronRight, Shield, HelpCircle, Palette, Trash2, Star, BadgeCheck, Swords, Heart, Gift, Check, Sun, Moon, Monitor } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { signOut, uploadPhoto, updateProfile, deletePhoto, setPrimaryPhoto, uploadProfileVideo, deleteProfileVideo, getProfileTraits, getStreak, type Profile, type LookingFor } from '@/lib/api'
import Lightbox from '@/components/Lightbox'
import { useToast } from '@/components/Toast'

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
  const [now, setNow] = useState(0)
  const [profileTraits, setProfileTraits] = useState<string[]>([])
  const [streak, setStreak] = useState(0)
  const [themePicker, setThemePicker] = useState(false)
  const videoRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()
  const router = useRouter()

  useEffect(() => {
    const timer = setTimeout(() => setNow(Date.now()), 0)
    ;(async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoading(false); return }
      const PROFILE_FIELDS = 'id, name, age, bio, occupation, location, photos, interests, is_verified, looking_for, created_at, last_seen, video_url'
      const { data } = await supabase.from('profiles').select(PROFILE_FIELDS).eq('id', user.id).single()
      if (data) { setProfile(data as Profile); setNameValue((data as Profile).name ?? ''); setBio((data as Profile).bio ?? ''); setInterests((data as Profile).interests?.join(', ') ?? ''); setLookingFor((data as Profile).looking_for ?? 'friendship'); getProfileTraits((data as Profile).id).then(({ data: traits }) => { if (traits) setProfileTraits(traits.map(t => t.trait)) }).catch(() => {}); getStreak().then(({ data: sd }) => { if (sd) setStreak(sd.current_streak ?? 0) }).catch(() => {}) }
      setLoading(false)
    })()
    return () => clearTimeout(timer)
  }, [])
  const loadProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const PROFILE_FIELDS = 'id, name, age, bio, occupation, location, photos, interests, is_verified, looking_for, created_at, last_seen, video_url'
    const { data } = await supabase.from('profiles').select(PROFILE_FIELDS).eq('id', user.id).single()
    if (data) { setProfile(data as Profile); setNameValue((data as Profile).name ?? ''); setBio((data as Profile).bio ?? ''); setInterests((data as Profile).interests?.join(', ') ?? ''); setLookingFor((data as Profile).looking_for ?? 'friendship') }
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
          if (updateErr) { toast(updateErr, 'error'); setUploading(false); return }
          setProfile({ ...profile, photos })
          toast('Photo ajoutée', 'success')
        }
      } catch { toast('Erreur lors de l\'ajout de la photo', 'error') }
      setUploading(false)
    }
    input.click()
  }

  const [savingProfile, setSavingProfile] = useState(false)

  const saveProfile = async () => {
    if (!profile) return
    setSavingProfile(true)
    try {
      const interestsArr = interests.split(',').map(i => i.trim()).filter(Boolean)
      const name = nameValue.trim() || profile.name
      const { error } = await updateProfile(profile.id, { name, bio, interests: interestsArr, looking_for: lookingFor })
      if (error) { toast(error, 'error'); setSavingProfile(false); return }
      setProfile({ ...profile, name, bio, interests: interestsArr, looking_for: lookingFor })
      toast('Profil mis à jour', 'success')
      setEditing(false)
    } catch {
      toast('Erreur lors de la sauvegarde', 'error')
    }
    setSavingProfile(false)
  }

  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 30000); return () => clearInterval(t) }, [])

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
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-[#D92D4A] to-[#C85A17] p-0.5 shrink-0">
                <div className="w-full h-full rounded-full overflow-hidden bg-[#262628]">
                  {profile?.photos?.[0] ? (
                    <button type="button" onClick={() => setLightboxIdx(0)} className="w-full h-full">
                      <Image src={profile.photos[0]} alt={profile.name} width={96} height={96} className="object-cover w-full h-full" />
                    </button>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-[#6B6258] text-3xl">?</div>
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
              {profile?.location && <p className="text-sm text-[#6B6258]">📍 {profile.location}</p>}
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
                      <button type="button" onClick={async () => { const r = await setPrimaryPhoto(profile.id, photo, profile.photos); if (r.photos) setProfile({ ...profile, photos: r.photos }) }}
                        className="p-2 bg-white/90 rounded-full hover:bg-white" aria-label="Photo principale" title="Photo principale">
                        <Star size={14} className="text-amber-500" />
                      </button>
                    )}
                    <button type="button" onClick={async () => { const r = await deletePhoto(profile.id, photo, profile.photos); if (r.photos) setProfile({ ...profile, photos: r.photos }) }}
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
                  className="w-full aspect-video rounded-xl border-2 border-dashed border-[#2A2826] flex items-center justify-center text-[#6B6258] disabled:opacity-40">
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
              <p className="text-[10px] text-[#6B6258] text-right mt-1">{nameValue.length}/80</p>
            </div>
            <div>
              <label htmlFor="profile-bio" className="text-sm font-medium mb-1 block">Bio</label>
              <textarea id="profile-bio" value={bio} onChange={e => setBio(e.target.value.slice(0, 500))} rows={4}
                className="w-full px-4 py-3 rounded-xl border border-[#2A2826] text-sm outline-none focus:border-[#D92D4A] resize-none" />
              <p className="text-[10px] text-[#6B6258] text-right mt-1">{bio.length}/500</p>
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
            <button type="button" onClick={saveProfile} disabled={savingProfile} className="w-full py-3.5 rounded-full text-white font-semibold disabled:opacity-40" style={{ background: '#D92D4A' }}>
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
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm" onClick={() => setThemePicker(false)}
          onKeyDown={(e) => { if (e.key === 'Escape') setThemePicker(false) }}>
          <div className="w-full max-w-lg bg-[#1C1C1E] rounded-t-3xl p-6 animate-slide-up" onClick={e => e.stopPropagation()}>
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
                      html.classList.remove('dark')
                      if (window.matchMedia('(prefers-color-scheme: dark)').matches) html.classList.add('dark')
                    } else {
                      localStorage.setItem('erosia_theme', mode)
                      html.classList.toggle('dark', mode === 'dark')
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
