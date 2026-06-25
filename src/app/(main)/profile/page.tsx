'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Camera, LogOut, ChevronRight, Shield, HelpCircle, Palette, Trash2, Star, BadgeCheck, Swords, Heart } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { signOut, uploadPhoto, updateProfile, deletePhoto, setPrimaryPhoto, uploadProfileVideo, deleteProfileVideo, getProfileTraits, getStreak, type Profile, type LookingFor } from '@/lib/api'
import Lightbox from '@/components/Lightbox'

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [editing, setEditing] = useState(false)
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null)
  const [bio, setBio] = useState('')
  const [interests, setInterests] = useState('')
  const [lookingFor, setLookingFor] = useState<LookingFor>('friendship')
  const [now, setNow] = useState(0)
  const [profileTraits, setProfileTraits] = useState<string[]>([])
  const [streak, setStreak] = useState(0)
  const videoRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  useEffect(() => {
    const timer = setTimeout(() => setNow(Date.now()), 0)
    ;(async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoading(false); return }
      const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      if (data) { setProfile(data as Profile); setBio((data as Profile).bio ?? ''); setInterests((data as Profile).interests?.join(', ') ?? ''); setLookingFor((data as Profile).looking_for ?? 'friendship'); getProfileTraits((data as Profile).id).then(({ data: traits }) => { if (traits) setProfileTraits(traits.map(t => t.trait)) }).catch(() => {}); getStreak().then(({ data: sd }) => { if (sd) setStreak(sd.current_streak ?? 0) }).catch(() => {}) }
      setLoading(false)
    })()
    return () => clearTimeout(timer)
  }, [])
  const loadProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
    if (data) { setProfile(data as Profile); setBio((data as Profile).bio ?? ''); setInterests((data as Profile).interests?.join(', ') ?? ''); setLookingFor((data as Profile).looking_for ?? 'friendship') }
  }
  const handlePhoto = async () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    input.onchange = async () => {
      const file = input.files?.[0]
      if (!file || !profile) return
      setUploading(true)
      const { url } = await uploadPhoto(file, profile.id, 0)
      if (url) {
        const photos = [url, ...(profile.photos?.filter(p => p !== url) ?? [])]
        await updateProfile(profile.id, { photos })
        setProfile({ ...profile, photos })
      }
      setUploading(false)
    }
    input.click()
  }

  const saveProfile = async () => {
    if (!profile) return
    const interestsArr = interests.split(',').map(i => i.trim()).filter(Boolean)
    await updateProfile(profile.id, { bio, interests: interestsArr, looking_for: lookingFor })
    setProfile({ ...profile, bio, interests: interestsArr, looking_for: lookingFor })
    setEditing(false)
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

  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (!f) return
    await uploadProfileVideo(f)
    loadProfile()
  }
  const handleDeleteVideo = async () => {
    await deleteProfileVideo()
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
    { icon: Shield, label: 'Confidentialité', action: () => router.push('/settings') },
    { icon: Palette, label: 'Apparence', action: () => {
      const html = document.documentElement
      const isDark = html.classList.toggle('dark')
      localStorage.setItem('erosia_theme', isDark ? 'dark' : 'light')
    }},
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
        <button onClick={() => setEditing(!editing)} className="px-5 py-2 rounded-full text-xs font-semibold transition-all active:scale-95 glass-light hover:bg-white/10"
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
                    <button onClick={() => setLightboxIdx(0)} className="w-full h-full">
                      <Image src={profile.photos[0]} alt={profile.name} width={96} height={96} className="object-cover w-full h-full" />
                    </button>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-[#6B6258] text-3xl">?</div>
                  )}
                </div>
              </div>
              <button onClick={handlePhoto} disabled={uploading} aria-label="Ajouter une photo"
                className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full flex items-center justify-center border-2 border-[#141414]"
                style={{ background: '#D92D4A' }}>
                {uploading ? <div className="animate-spin w-3 h-3 border-2 border-white border-t-transparent rounded-full" /> : <Camera size={14} className="text-white" />}
              </button>
            </div>
            <div>
              <div className="flex items-center gap-1 flex-wrap">
                <p className="text-xl font-bold">{profile?.name ?? 'Utilisateur'}{profile?.age ? `, ${profile.age}` : ''}</p>
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
                  <button onClick={() => setLightboxIdx(idx)} className="w-full h-full">
                    <Image src={photo} alt={`Photo ${idx + 1}`} width={200} height={266} className="object-cover w-full h-full" />
                  </button>
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 backdrop-blur-sm transition-all flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                    {idx > 0 && (
                      <button onClick={async () => { const r = await setPrimaryPhoto(profile.id, photo, profile.photos); if (r.photos) setProfile({ ...profile, photos: r.photos }) }}
                        className="p-2 bg-white/90 rounded-full hover:bg-white" aria-label="Photo principale" title="Photo principale">
                        <Star size={14} className="text-amber-500" />
                      </button>
                    )}
                    <button onClick={async () => { const r = await deletePhoto(profile.id, photo, profile.photos); if (r.photos) setProfile({ ...profile, photos: r.photos }) }}
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
                  <button onClick={handleDeleteVideo} aria-label="Supprimer la vidéo"
                    className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/50 flex items-center justify-center">
                    <Trash2 size={14} />
                  </button>
                </div>
              ) : (
                <button onClick={() => videoRef.current?.click()}
                  className="w-full aspect-video rounded-xl border-2 border-dashed border-[#2A2826] flex items-center justify-center text-[#6B6258]">
                  <Camera size={24} />
                </button>
              )}
              <input ref={videoRef} type="file" accept="video/*" capture="environment" onChange={handleVideoUpload} className="hidden" />
            </div>
          )}
        </div>

        {editing ? (
          <div className="space-y-4 mb-4">
            <div>
              <label htmlFor="profile-bio" className="text-sm font-medium mb-1 block">Bio</label>
              <textarea id="profile-bio" value={bio} onChange={e => setBio(e.target.value)} rows={4}
                className="w-full px-4 py-3 rounded-xl border border-[#2A2826] text-sm outline-none focus:border-[#D92D4A] resize-none" />
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
            <button onClick={saveProfile} className="w-full py-3.5 rounded-full text-white font-semibold" style={{ background: '#D92D4A' }}>
              Enregistrer
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
            <button key={label} onClick={action} className="w-full flex items-center justify-between px-4 py-3.5 text-left">
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
    </div>
  )
}
