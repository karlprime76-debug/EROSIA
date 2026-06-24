'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Camera, LogOut, ChevronRight, Shield, HelpCircle, Palette, Trash2, Star } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { signOut, uploadPhoto, updateProfile, deletePhoto, setPrimaryPhoto, type Profile } from '@/lib/api'

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [editing, setEditing] = useState(false)
  const [bio, setBio] = useState('')
  const [interests, setInterests] = useState('')
  const router = useRouter()

  useEffect(() => {
    ;(async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoading(false); return }
      const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      if (data) { setProfile(data as Profile); setBio((data as Profile).bio ?? ''); setInterests((data as Profile).interests?.join(', ') ?? '') }
      setLoading(false)
    })()
  }, [])

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
    await updateProfile(profile.id, { bio, interests: interestsArr })
    setProfile({ ...profile, bio, interests: interestsArr })
    setEditing(false)
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
    { icon: Shield, label: 'Confidentialité' },
    { icon: Palette, label: 'Apparence' },
    { icon: HelpCircle, label: 'Aide' },
    { icon: LogOut, label: 'Déconnexion', danger: true, action: handleLogout },
  ]

  return (
    <div className="flex-1 flex flex-col overflow-y-auto">
      <header className="flex items-center justify-between px-5 pt-4 pb-2">
        <h2 className="text-2xl font-bold">Mon Profil</h2>
        <button onClick={() => setEditing(!editing)} className="text-sm font-semibold" style={{ color: '#D92D4A' }}>
          {editing ? 'Annuler' : 'Modifier'}
        </button>
      </header>

      <div className="px-4">
        <div className="bg-[#1C1C1E] rounded-2xl p-6 mb-4 border border-[#2A2826]">
          <div className="flex items-center gap-4 mb-4">
            <div className="relative shrink-0">
              <div className="w-20 h-20 rounded-full bg-zinc-200 overflow-hidden">
                {profile?.photos?.[0] ? (
                  <Image src={profile.photos[0]} alt={profile.name} width={80} height={80} className="object-cover w-full h-full" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-[#6B6258] text-3xl">?</div>
                )}
              </div>
              <button onClick={handlePhoto} disabled={uploading}
                className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full flex items-center justify-center border-2 border-white shadow"
                style={{ background: '#D92D4A' }}>
                {uploading ? <div className="animate-spin w-3 h-3 border-2 border-white border-t-transparent rounded-full" /> : <Camera size={14} className="text-white" />}
              </button>
            </div>
            <div>
              <p className="text-lg font-bold">{profile?.name ?? 'Utilisateur'}{profile?.age ? `, ${profile.age}` : ''}</p>
              {profile?.location && <p className="text-sm text-[#6B6258]">📍 {profile.location}</p>}
            </div>
          </div>

          {profile && profile.photos.length > 0 && (
            <div className="grid grid-cols-3 gap-2">
              {profile.photos.map((photo, idx) => (
                <div key={photo} className="relative group aspect-[3/4] rounded-xl overflow-hidden bg-[#262628]">
                  <Image src={photo} alt={`Photo ${idx + 1}`} width={200} height={266} className="object-cover w-full h-full" />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                    {idx > 0 && (
                      <button onClick={async () => { const r = await setPrimaryPhoto(profile.id, photo, profile.photos); if (r.photos) setProfile({ ...profile, photos: r.photos }) }}
                        className="p-2 bg-white/90 rounded-full hover:bg-white" title="Photo principale">
                        <Star size={14} className="text-amber-500" />
                      </button>
                    )}
                    <button onClick={async () => { const r = await deletePhoto(profile.id, photo, profile.photos); if (r.photos) setProfile({ ...profile, photos: r.photos }) }}
                      className="p-2 bg-white/90 rounded-full hover:bg-white" title="Supprimer">
                      <Trash2 size={14} className="text-red-500" />
                    </button>
                  </div>
                  {idx === 0 && <span className="absolute top-1 left-1 text-[10px] bg-amber-400 text-white px-1.5 py-0.5 rounded font-bold">PRINCIPALE</span>}
                </div>
              ))}
            </div>
          )}
        </div>

        {editing ? (
          <div className="space-y-4 mb-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Bio</label>
              <textarea value={bio} onChange={e => setBio(e.target.value)} rows={4}
                className="w-full px-4 py-3 rounded-xl border border-[#2A2826] text-sm outline-none focus:border-[#D92D4A] resize-none" />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Centres d&rsquo;intérêt (séparés par des virgules)</label>
              <input value={interests} onChange={e => setInterests(e.target.value)} placeholder="Voyage, Café, Photographie..."
                className="w-full px-4 py-3 rounded-xl border border-[#2A2826] text-sm outline-none focus:border-[#D92D4A]" />
            </div>
            <button onClick={saveProfile} className="w-full py-3.5 rounded-full text-white font-semibold" style={{ background: '#D92D4A' }}>
              Enregistrer
            </button>
          </div>
        ) : (
          <>
            {profile?.bio && <div className="mb-4"><h3 className="font-semibold text-sm mb-1">Bio</h3><p className="text-[#9E9488] text-sm">{profile.bio}</p></div>}
            {profile?.interests && profile.interests.length > 0 && (
              <div className="mb-6">
                <h3 className="font-semibold text-sm mb-2">Centres d&rsquo;intérêt</h3>
                <div className="flex flex-wrap gap-1.5">
                  {profile.interests.map(i => (
                    <span key={i} className="text-xs bg-[#262628] px-3 py-1 rounded-full">{i}</span>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        <div className="bg-[#1C1C1E] rounded-2xl border border-[#2A2826] overflow-hidden mb-8">
          {menu.map(({ icon: Icon, label, danger, action }) => (
            <button key={label} onClick={action} className="w-full flex items-center justify-between px-4 py-3.5 border-b border-[#2A2826] last:border-0 text-left">
              <div className="flex items-center gap-3">
                <Icon size={20} className={danger ? 'text-red-500' : 'text-[#9E9488]'} />
                <span className={danger ? 'text-red-500 text-sm font-medium' : 'text-sm'}>{label}</span>
              </div>
              <ChevronRight size={18} className="text-[#5A5248]" />
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
