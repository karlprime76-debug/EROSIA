'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Camera, Check, ChevronRight, Shield, Sparkles, Image as ImageIcon } from 'lucide-react'
import { uploadPhoto, updateProfile, completeOnboarding, type LookingFor } from '@/lib/api'
import { validateFile, sanitizeFilename } from '@/lib/media'
import { supabase } from '@/lib/supabase/client'
import { useToast } from '@/components/Toast'

const STEPS = ['Photos', 'Profil', 'Vérification', 'Terminé']

export default function OnboardingPage() {
  const [step, setStep] = useState(0)
  const [userId, setUserId] = useState('')
  const [photos, setPhotos] = useState<string[]>([])
  const [uploading, setUploading] = useState(false)
  const [bio, setBio] = useState('')
  const [interests, setInterests] = useState('')
  const [lookingFor, setLookingFor] = useState('casual')
  const [saving, setSaving] = useState(false)
  const [verifPhoto, setVerifPhoto] = useState<string | null>(null)
  const [verifUploading, setVerifUploading] = useState(false)
  const [verifDone, setVerifDone] = useState(false)
  const router = useRouter()
  const { toast } = useToast()
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { router.push('/login'); return }
      setUserId(user.id)
    }).catch((err) => {
      console.error('Auth error', err)
      toast('Erreur de chargement', 'error')
    })
  }, [router])

  const handleAddPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !userId) return
    setUploading(true)
    try {
      const result = await uploadPhoto(file, userId, photos.length)
      if (result.error) { toast(result.error, 'error'); return }
      if (result.url) {
        setPhotos(prev => [...prev, result.url!])
        await updateProfile(userId, { photos: [...photos, result.url] })
      }
    } catch (err) {
      console.error('handleAddPhoto error', err)
      toast('Erreur lors de l\'ajout de la photo', 'error')
    } finally {
      setUploading(false)
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
      console.error('handleVerifPhoto error', err)
      toast('Erreur lors du téléchargement', 'error')
    } finally {
      setVerifUploading(false)
    }
  }

  const handleFinishProfile = async () => {
    if (!userId) return
    setSaving(true)
    try {
      const interestsArr = interests.split(',').map(i => i.trim()).filter(Boolean)
      await updateProfile(userId, { bio, interests: interestsArr, looking_for: lookingFor as LookingFor })
      setStep(2)
    } catch (err) {
      console.error('handleFinishProfile error', err)
      toast('Erreur lors de la sauvegarde du profil', 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleComplete = async () => {
    await completeOnboarding()
    router.push('/')
  }

  return (
    <div className="min-h-dvh flex flex-col bg-transparent px-5">
      <div className="flex items-center justify-between pt-6 pb-8">
        <div className="flex gap-1.5">
          {STEPS.map((s, i) => (
            <div key={s}
              className={`h-1 rounded-full transition-all duration-300 ${i <= step ? 'bg-[#D92D4A]' : 'bg-[#2A2826]'} ${i === step ? 'w-8' : 'w-4'}`} />
          ))}
        </div>
        {step < 3 && (
          <button type="button" onClick={async () => { await completeOnboarding(); router.push('/') }} className="text-[#9E9488] text-xs hover:text-white transition">
            Passer
          </button>
        )}
      </div>

      <div className="flex-1 flex flex-col">
        {step === 0 && (
          <div className="flex-1 flex flex-col items-center justify-center animate-fade-up">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#D92D4A]/15 to-transparent flex items-center justify-center mb-6 border border-[#D92D4A]/10">
              <ImageIcon size={36} className="text-[#D92D4A]" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Ajoute tes photos</h2>
            <p className="text-[#9E9488] text-sm mb-6 text-center max-w-xs">
              Au moins une photo pour que les autres puissent te découvrir.
            </p>

            <div className="flex gap-3 flex-wrap justify-center mb-6">
              {photos.map((photo, i) => (
                <div key={i} className="w-24 h-32 rounded-xl overflow-hidden bg-[#1C1C1E] border border-[#2A2826]">
                  <Image src={photo} alt={"Photo " + (i + 1)} width={96} height={128} className="w-full h-full object-cover" />
                </div>
              ))}
              {photos.length < 6 && (
                <button type="button" onClick={() => inputRef.current?.click()} disabled={uploading}
                  className="w-24 h-32 rounded-xl border-2 border-dashed border-[#2A2826] flex items-center justify-center text-[#9E9488] hover:border-[#D92D4A]/30 transition-all active:scale-95">
                  {uploading ? <div className="animate-spin w-5 h-5 border-2 border-[#D92D4A] border-t-transparent rounded-full" /> : <Camera size={24} />}
                </button>
              )}
            </div>
            <input ref={inputRef} type="file" accept="image/*" onChange={handleAddPhoto} className="hidden" />

            <button type="button" onClick={() => photos.length > 0 && setStep(1)} disabled={photos.length === 0}
              className="w-full max-w-xs py-3.5 rounded-full text-white font-semibold disabled:opacity-30 flex items-center justify-center gap-2 transition-all active:scale-95" style={{ background: '#D92D4A' }}>
              {photos.length > 0 ? `Continuer (${photos.length} photo${photos.length > 1 ? 's' : ''})` : 'Ajoute au moins 1 photo'}
              <ChevronRight size={18} />
            </button>
          </div>
        )}

        {step === 1 && (
          <div className="flex-1 flex flex-col animate-fade-up">
            <div className="flex-1 space-y-4 pt-4">
              <div>
                <label className="text-xs text-[#9E9488] font-medium mb-1.5 block">Bio</label>
                <textarea value={bio} onChange={e => setBio(e.target.value.slice(0, 500))} rows={3} placeholder="Parle un peu de toi..." aria-label="Bio"
                  className="w-full px-4 py-3 rounded-xl bg-[#1C1C1E] border border-[#2A2826] text-white text-sm outline-none focus:border-[#D92D4A] resize-none" />
                <p className="text-[10px] text-[#9E9488] text-right mt-1">{bio.length}/500</p>
              </div>
              <div>
                <label className="text-xs text-[#9E9488] font-medium mb-1.5 block">Centres d&rsquo;intérêt (séparés par des virgules)</label>
                <input value={interests} onChange={e => setInterests(e.target.value)} placeholder="Voyage, Café, Photographie..." aria-label="Centres d'intérêt"
                  className="w-full px-4 py-3 rounded-xl bg-[#1C1C1E] border border-[#2A2826] text-white text-sm outline-none focus:border-[#D92D4A]" />
              </div>
              <div>
                <label className="text-xs text-[#9E9488] font-medium mb-1.5 block">Ce que tu cherches</label>
                <select value={lookingFor} onChange={e => setLookingFor(e.target.value)} aria-label="Je cherche"
                  className="w-full px-4 py-3 rounded-xl bg-[#1C1C1E] border border-[#2A2826] text-white text-sm outline-none focus:border-[#D92D4A]">
                  <option value="friendship">Amitié</option>
                  <option value="casual">Plan cul</option>
                  <option value="fwb">Friends with benefits</option>
                  <option value="serious">Relation sérieuse</option>
                  <option value="open">Relation libre</option>
                </select>
              </div>
            </div>
            <div className="py-6">
              <button type="button" onClick={handleFinishProfile} disabled={saving}
                className="w-full py-3.5 rounded-full text-white font-semibold disabled:opacity-40 flex items-center justify-center gap-2 transition-all active:scale-95" style={{ background: '#D92D4A' }}>
                {saving ? 'Enregistrement...' : 'Continuer'}
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="flex-1 flex flex-col items-center justify-center animate-fade-up">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#A855F7]/15 to-transparent flex items-center justify-center mb-6 border border-[#A855F7]/10">
              <Shield size={36} className="text-[#A855F7]" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Vérifie ton compte</h2>
            <p className="text-[#9E9488] text-sm mb-6 text-center max-w-xs">
              Prends un selfie pour vérifier ton identité. Les profils vérifiés inspirent confiance.
            </p>

            {verifPhoto ? (
              <div className="w-48 h-48 rounded-2xl overflow-hidden bg-[#1C1C1E] border-2 border-[#22C55E] mb-4">
                <Image src={verifPhoto} alt="Selfie" width={192} height={192} className="w-full h-full object-cover" />
              </div>
            ) : (
              <button type="button" onClick={() => document.getElementById('verif-input')?.click()} disabled={verifUploading}
                className="w-48 h-48 rounded-2xl border-2 border-dashed border-[#2A2826] flex flex-col items-center justify-center text-[#9E9488] hover:border-[#A855F7]/30 transition-all active:scale-95">
                {verifUploading ? (
                  <div className="animate-spin w-8 h-8 border-2 border-[#A855F7] border-t-transparent rounded-full" />
                ) : (
                  <>
                    <Camera size={32} className="mb-2" />
                    <span className="text-xs">Prendre un selfie</span>
                  </>
                )}
              </button>
            )}
            <input id="verif-input" type="file" accept="image/*" capture="user" onChange={handleVerifPhoto} className="hidden" />

            {verifDone && (
              <div className="flex items-center gap-2 text-[#22C55E] text-sm mb-4">
                <Check size={16} /> Selfie envoyé, vérification en cours
              </div>
            )}

            <button type="button" onClick={() => setStep(3)} className="mt-4 w-full max-w-xs py-3.5 rounded-full text-white font-semibold flex items-center justify-center gap-2 transition-all active:scale-95" style={{ background: '#D92D4A' }}>
              Terminer
              <ChevronRight size={18} />
            </button>
            <button type="button" onClick={() => setStep(3)} className="text-[#9E9488] text-xs mt-3 hover:text-white transition">
              Passer la vérification
            </button>
          </div>
        )}

        {step === 3 && (
          <div className="flex-1 flex flex-col items-center justify-center animate-scale-in">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-[#22C55E] to-[#D92D4A] flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(34,197,94,0.2)]">
              <Sparkles size={44} className="text-white" />
            </div>
            <h2 className="text-2xl font-bold mb-2">C&rsquo;est prêt !</h2>
            <p className="text-[#9E9488] text-sm mb-8 text-center max-w-xs">
              Ton profil est visible dans les découvertes. Vas-y, explore !
            </p>
            <button type="button" onClick={handleComplete}
              className="w-full max-w-xs py-3.5 rounded-full text-white font-semibold flex items-center justify-center gap-2 transition-all active:scale-95 hover:shadow-[0_0_30px_rgba(217,45,74,0.3)]" style={{ background: '#D92D4A' }}>
              Découvrir des profils
              <Sparkles size={18} />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
