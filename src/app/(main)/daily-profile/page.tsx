'use client'

import { useState, Suspense, use } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Star } from 'lucide-react'
import { getDailyProfile, checkForMatch, createSwipe } from '@/lib/api'
import Image from 'next/image'
import { useToast } from '@/components/Toast'
import { logger } from '@/lib/logger'

function DailyProfileContent() {
  const router = useRouter()
  const { toast } = useToast()
  const [liking, setLiking] = useState(false)
  const [profilePromise, setProfilePromise] = useState(() => getDailyProfile())
  const { data: profile } = use(profilePromise)

  if (!profile) return (
    <div className="bg-transparent flex-1 flex flex-col">
      <header className="flex items-center gap-3 px-5 pt-4 pb-3">
        <button type="button" onClick={() => router.back()} aria-label="Retour" className="p-2.5 rounded-xl"><ArrowLeft size={22} /></button>
        <h2 className="text-2xl font-bold">Profil du jour</h2>
      </header>
      <div className="flex-1 flex items-center justify-center px-8 text-center">
        <div>
          <Star size={40} className="text-secondary mx-auto mb-3" />
          <p className="text-secondary text-sm">Aucun profil disponible aujourd&rsquo;hui</p>
          <p className="text-secondary text-xs mt-1">Reviens demain !</p>
        </div>
      </div>
    </div>
  )

  const handleLike = async () => {
    setLiking(true)
    try {
      await createSwipe(profile.id, 'like')
      const { isMatch } = await checkForMatch(profile.id)
      if (isMatch) toast('C\'est un match ! 🔥', 'success')
      setProfilePromise(getDailyProfile())
    } catch (err) {
      logger.error('handleLike error', { error: String(err) })
      toast('Erreur lors du like', 'error')
    } finally {
      setLiking(false)
    }
  }

  return (
    <div className="bg-transparent flex-1 flex flex-col">
      <h1 className="sr-only">Profil du jour</h1>
      <header className="flex items-center gap-3 px-5 pt-4 pb-3">
        <button type="button" onClick={() => router.back()} aria-label="Retour" className="p-2.5 rounded-xl"><ArrowLeft size={22} /></button>
        <h2 className="text-2xl font-bold">Profil du jour</h2>
        <Star size={18} className="text-warning" />
      </header>
      <div className="flex-1 px-4 pb-8 overflow-y-auto">
        <div className="aspect-[3/4] rounded-2xl overflow-hidden bg-surface-elevated mb-4 relative">
          {profile.photos?.[0] ? (
            <Image src={profile.photos[0]} alt={profile.name} fill sizes="(max-width: 768px) 100vw, 600px" className="object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-secondary text-4xl">?</div>
          )}
        </div>
        <h2 className="text-xl font-bold">{profile.name}, {profile.age}</h2>
        {profile.bio && <p className="text-sm text-secondary mt-1">{profile.bio}</p>}
        {profile.interests?.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-3">
            {profile.interests.map((i: string) => (
              <span key={i} className="px-3 py-1 rounded-full bg-surface-elevated text-xs text-secondary border border-theme">{i}</span>
            ))}
          </div>
        )}
        <button type="button" onClick={handleLike} disabled={liking}
          className="w-full mt-6 py-3.5 rounded-full font-semibold text-on-primary disabled:opacity-50" style={{ background: 'var(--primary)' }}>
          {liking ? 'Envoi...' : 'Like 💕'}
        </button>
      </div>
    </div>
  )
}

function LoadingFallback() {
  return (
    <div className="bg-transparent flex-1 flex flex-col">
      <header className="flex items-center gap-3 px-5 pt-4 pb-3">
        <h2 className="text-2xl font-bold">Profil du jour</h2>
      </header>
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 rounded-full" style={{ borderColor: 'var(--primary)', borderTopColor: 'transparent' }} />
      </div>
    </div>
  )
}

export default function DailyProfilePage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <DailyProfileContent />
    </Suspense>
  )
}
