'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Camera, LogOut, ChevronRight, Shield, HelpCircle, Palette } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { signOut, uploadPhoto, updateProfile, type Profile } from '@/lib/api'

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
      <div className="animate-spin w-8 h-8 border-2 rounded-full" style={{ borderColor: '#FF3B5C', borderTopColor: 'transparent' }} />
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
        <button onClick={() => setEditing(!editing)} className="text-sm font-semibold" style={{ color: '#FF3B5C' }}>
          {editing ? 'Annuler' : 'Modifier'}
        </button>
      </header>

      <div className="px-4">
        <div className="bg-white rounded-2xl p-6 mb-4 text-center border border-zinc-100">
          <div className="relative inline-block">
            <div className="w-24 h-24 rounded-full bg-zinc-200 overflow-hidden mx-auto">
              {profile?.photos?.[0] ? (
                <Image src={profile.photos[0]} alt={profile.name} fill className="object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-zinc-400 text-3xl">?</div>
              )}
            </div>
            <button onClick={handlePhoto} disabled={uploading}
              className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full flex items-center justify-center border-2 border-white shadow"
              style={{ background: '#FF3B5C' }}>
              {uploading ? <div className="animate-spin w-3 h-3 border-2 border-white border-t-transparent rounded-full" /> : <Camera size={14} className="text-white" />}
            </button>
          </div>
          <p className="text-lg font-bold mt-3">{profile?.name ?? 'Utilisateur'}{profile?.age ? `, ${profile.age}` : ''}</p>
          {profile?.location && <p className="text-sm text-zinc-400">📍 {profile.location}</p>}
        </div>

        {editing ? (
          <div className="space-y-4 mb-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Bio</label>
              <textarea value={bio} onChange={e => setBio(e.target.value)} rows={4}
                className="w-full px-4 py-3 rounded-xl border border-zinc-200 text-sm outline-none focus:border-rose-400 resize-none" />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Centres d&rsquo;intérêt (séparés par des virgules)</label>
              <input value={interests} onChange={e => setInterests(e.target.value)} placeholder="Voyage, Café, Photographie..."
                className="w-full px-4 py-3 rounded-xl border border-zinc-200 text-sm outline-none focus:border-rose-400" />
            </div>
            <button onClick={saveProfile} className="w-full py-3.5 rounded-full text-white font-semibold" style={{ background: '#FF3B5C' }}>
              Enregistrer
            </button>
          </div>
        ) : (
          <>
            {profile?.bio && <div className="mb-4"><h3 className="font-semibold text-sm mb-1">Bio</h3><p className="text-zinc-500 text-sm">{profile.bio}</p></div>}
            {profile?.interests && profile.interests.length > 0 && (
              <div className="mb-6">
                <h3 className="font-semibold text-sm mb-2">Centres d&rsquo;intérêt</h3>
                <div className="flex flex-wrap gap-1.5">
                  {profile.interests.map(i => (
                    <span key={i} className="text-xs bg-zinc-100 px-3 py-1 rounded-full">{i}</span>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        <div className="bg-white rounded-2xl border border-zinc-100 overflow-hidden mb-8">
          {menu.map(({ icon: Icon, label, danger, action }) => (
            <button key={label} onClick={action} className="w-full flex items-center justify-between px-4 py-3.5 border-b border-zinc-50 last:border-0 text-left">
              <div className="flex items-center gap-3">
                <Icon size={20} className={danger ? 'text-red-500' : 'text-zinc-500'} />
                <span className={danger ? 'text-red-500 text-sm font-medium' : 'text-sm'}>{label}</span>
              </div>
              <ChevronRight size={18} className="text-zinc-300" />
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
