'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import Image from 'next/image'
import { ArrowLeft, MapPin, Briefcase, GraduationCap, Sparkles } from 'lucide-react'

export default function UserProfilePage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string
  const [profile, setProfile] = useState<{
    name: string; age: number; bio: string; photos: string[]
    location: string; interests: string[]; occupation: string; education: string
  } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!id) return
    supabase.from('profiles').select('name, age, bio, photos, location, interests, occupation, education').eq('id', id).maybeSingle()
      .then(({ data, error: err }) => {
        if (err || !data) { setError('Profil introuvable'); setLoading(false); return }
        setProfile(data as typeof profile)
        setLoading(false)
      })
  }, [id])

  if (loading) return (
    <div className="min-h-dvh flex items-center justify-center bg-[var(--bg)]">
      <div className="w-8 h-8 border-2 border-[var(--primary)] border-t-transparent rounded-full animate-spin" />
    </div>
  )

  if (error) return (
    <div className="min-h-dvh flex flex-col items-center justify-center px-6 bg-[var(--bg)]">
      <div className="glass-card rounded-3xl p-8 max-w-sm w-full text-center">
        <p className="text-secondary text-sm mb-4">{error}</p>
        <button type="button" onClick={() => router.back()}
          className="w-full py-3.5 rounded-full font-semibold text-on-primary transition active:scale-95"
          style={{ background: 'var(--primary)' }}>
          Retour
        </button>
      </div>
    </div>
  )

  if (!profile) return null

  return (
    <div className="min-h-dvh bg-[var(--bg)]">
      <header className="sticky top-0 z-20 bg-[var(--bg)]/80 backdrop-blur-xl border-b border-[var(--border)]">
        <div className="flex items-center p-3">
          <button type="button" onClick={() => router.back()} className="p-2.5 -ml-2 text-secondary hover:text-theme transition" aria-label="Retour">
            <ArrowLeft size={20} />
          </button>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
        {profile.photos?.[0] && (
          <div className="aspect-[4/3] rounded-3xl overflow-hidden bg-surface-elevated">
            <Image src={profile.photos[0]} alt={profile.name} fill className="object-cover" sizes="(max-width: 512px) 100vw, 512px" />
          </div>
        )}

        <div>
          <h1 className="text-2xl font-bold">{profile.name}{profile.age ? `, ${profile.age}` : ''}</h1>
        </div>

        {profile.bio && <p className="text-secondary text-sm leading-relaxed">{profile.bio}</p>}

        <div className="space-y-3">
          {profile.location && (
            <div className="flex items-center gap-3 text-sm text-secondary">
              <MapPin size={16} className="shrink-0 text-primary" />
              <span>{profile.location}</span>
            </div>
          )}
          {profile.occupation && (
            <div className="flex items-center gap-3 text-sm text-secondary">
              <Briefcase size={16} className="shrink-0 text-primary" />
              <span>{profile.occupation}</span>
            </div>
          )}
          {profile.education && (
            <div className="flex items-center gap-3 text-sm text-secondary">
              <GraduationCap size={16} className="shrink-0 text-primary" />
              <span>{profile.education}</span>
            </div>
          )}
        </div>

        {profile.interests && profile.interests.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <Sparkles size={16} className="text-primary" /> Centres d&apos;intérêt
            </h3>
            <div className="flex flex-wrap gap-2">
              {profile.interests.map((i, idx) => (
                <span key={idx} className="px-3 py-1.5 rounded-full text-xs font-medium bg-primary/10 text-primary">
                  {i}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
