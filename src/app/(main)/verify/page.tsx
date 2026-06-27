'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Camera, CheckCircle, Clock, Shield, ExternalLink } from 'lucide-react'
import { submitVerification, getVerificationStatus, createDiditSession } from '@/lib/api'
import { DiditSdk } from '@didit-protocol/sdk-web'
import { useToast } from '@/components/Toast'

export default function VerifyPage() {
  const router = useRouter()
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [status, setStatus] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [verifying, setVerifying] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()

  useEffect(() => {
    getVerificationStatus().then(s => setStatus(s.status)).catch(() => { toast('Erreur chargement statut', 'error') }).finally(() => setLoading(false))
  }, [toast])

  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview) }, [preview])

  const handleDiditVerify = async () => {
    setVerifying(true)
    try {
      const { url, error } = await createDiditSession()
      if (error || !url) {
        toast(error ?? 'Erreur lors de la création de la session', 'error')
        return
      }
      DiditSdk.shared.onComplete = (result: { type: string; session?: { status?: string }; error?: { message?: string } }) => {
        if (result.type === 'completed' && (result.session?.status === 'Approved' || result.session?.status === 'approved')) {
          setStatus('approved')
          toast('Vérification réussie !', 'success')
        } else if (result.type === 'completed') {
          setStatus('pending')
          toast('Vérification en cours de revue', 'info')
        } else if (result.type === 'cancelled') {
          toast('Vérification annulée', 'info')
        } else if (result.type === 'failed') {
          toast('Échec de la vérification', 'error')
        }
        DiditSdk.shared.onComplete = undefined
      }
      DiditSdk.shared.startVerification({ url })
    } catch {
      toast('Erreur lors de la vérification', 'error')
    } finally {
      setVerifying(false)
    }
  }

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (f) {
      if (preview) URL.revokeObjectURL(preview)
      setFile(f)
      setPreview(URL.createObjectURL(f))
    }
  }

  const handleSubmit = async () => {
    if (!file) return
    setUploading(true)
    const { error } = await submitVerification(file)
    if (!error) setStatus('pending')
    setUploading(false)
  }

  if (loading) return (
    <div className="flex-1 flex items-center justify-center">
      <div className="animate-spin w-8 h-8 border-2 rounded-full" style={{ borderColor: '#D92D4A', borderTopColor: 'transparent' }} />
    </div>
  )

  return (
    <div className="bg-transparent flex-1 flex flex-col">
      <header className="flex items-center gap-3 px-5 pt-4 pb-3">
        <button type="button" onClick={() => router.back()} aria-label="Retour" className="p-1"><ArrowLeft size={22} /></button>
        <h2 className="text-2xl font-bold">Vérification</h2>
      </header>
      <div className="flex-1 px-4 pb-8">
        {status === 'approved' ? (
          <div className="flex flex-col items-center justify-center h-full text-center gap-4">
            <CheckCircle size={48} className="text-[#22C55E]" />
            <p className="text-lg font-semibold">Compte vérifié</p>
            <p className="text-sm text-[#9E9488]">Ton badge vérifié est actif sur ton profil.</p>
          </div>
        ) : status === 'pending' ? (
          <div className="flex flex-col items-center justify-center h-full text-center gap-4">
            <Clock size={48} className="text-[#EAB308]" />
            <p className="text-lg font-semibold">Vérification en cours</p>
            <p className="text-sm text-[#9E9488]">Ton identité est en cours de vérification. Tu recevras une notification dès que c&rsquo;est terminé.</p>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="glass rounded-2xl p-6 text-center space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#D92D4A]/10 to-transparent mx-auto flex items-center justify-center border border-[#D92D4A]/10">
                <Shield size={32} className="text-[#D92D4A]" />
              </div>
              <p className="text-lg font-semibold">Vérifie ton identité</p>
              <p className="text-sm text-[#9E9488] leading-relaxed">
                Didit vérifie ton identité en quelques minutes. Il te suffit de prendre une photo de ta pièce d&rsquo;identité et un selfie.
              </p>
              <button type="button" onClick={handleDiditVerify} disabled={verifying}
                className="w-full py-3.5 rounded-full font-semibold text-white transition-all duration-300 active:scale-[0.97] disabled:opacity-50 flex items-center justify-center gap-2"
                style={{ background: '#D92D4A' }}>
                {verifying ? 'Ouverture...' : <><ExternalLink size={16} /> Vérifier avec Didit</>}
              </button>
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-[#2A2826]" /></div>
              <div className="relative flex justify-center"><span className="bg-[#070708] px-3 text-xs text-[#6B6258]">ou</span></div>
            </div>

            <div className="space-y-3">
              <p className="text-xs text-[#6B6258] text-center">Vérification manuelle (selfie + pseudo)</p>
              <div onClick={() => fileRef.current?.click()} className="aspect-[3/4] rounded-2xl border-2 border-dashed border-[#2A2826] flex items-center justify-center cursor-pointer bg-[#1C1C1E] overflow-hidden">
                {preview ? (
                  <img src={preview} alt="selfie" className="w-full h-full object-cover" />
                ) : (
                  <div className="flex flex-col items-center gap-2 text-[#6B6258]">
                    <Camera size={32} />
                    <span className="text-sm">Ajouter une photo</span>
                  </div>
                )}
              </div>
              <input ref={fileRef} type="file" accept="image/*" capture="user" onChange={handleFile} className="hidden" />
              <p className="text-[10px] text-[#6B6258] text-center leading-relaxed">
                Prends un selfie avec un papier portant <strong>ton pseudo</strong> et la date du jour
              </p>
              <button type="button" onClick={handleSubmit} disabled={!file || uploading}
                className="w-full py-3 rounded-full font-semibold text-white disabled:opacity-50 text-sm"
                style={{ background: '#18181A', border: '1px solid #2A2826' }}>
                {uploading ? 'Envoi...' : 'Envoyer ma vérification'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
