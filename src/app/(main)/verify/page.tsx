'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { ArrowLeft, Camera, CheckCircle, Clock } from 'lucide-react'
import { submitVerification, getVerificationStatus } from '@/lib/api'

export default function VerifyPage() {
  const router = useRouter()
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [status, setStatus] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    getVerificationStatus().then(s => setStatus(s.status)).catch(() => {})
  }, [])

  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview) }, [preview])

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
            <p className="text-lg font-semibold">Compte vérifié ✅</p>
            <p className="text-sm text-[#9E9488]">Ton badge vérifié est actif sur ton profil.</p>
          </div>
        ) : status === 'pending' ? (
          <div className="flex flex-col items-center justify-center h-full text-center gap-4">
            <Clock size={48} className="text-[#EAB308]" />
            <p className="text-lg font-semibold">Vérification en cours</p>
            <p className="text-sm text-[#9E9488]">Notre équipe examine ton selfie. Tu recevras une notification sous 24h.</p>
          </div>
        ) : (
          <div className="space-y-6">
            <p className="text-sm text-[#9E9488]">
              Prends un selfie avec un papier portant <strong>ton pseudo</strong> et la date du jour pour vérifier ton identité.
            </p>
            <div onClick={() => fileRef.current?.click()} className="aspect-[3/4] rounded-2xl border-2 border-dashed border-[#2A2826] flex items-center justify-center cursor-pointer bg-[#1C1C1E] overflow-hidden">
              {preview ? (
                <Image src={preview} alt="selfie" width={400} height={533} className="w-full h-full object-cover" />
              ) : (
                <div className="flex flex-col items-center gap-2 text-[#6B6258]">
                  <Camera size={32} />
                  <span className="text-sm">Ajouter une photo</span>
                </div>
              )}
            </div>
            <input ref={fileRef} type="file" accept="image/*" capture="user" onChange={handleFile} className="hidden" />
            <button type="button" onClick={handleSubmit} disabled={!file || uploading}
              className="w-full py-3.5 rounded-full font-semibold text-white disabled:opacity-50"
              style={{ background: '#D92D4A' }}>
              {uploading ? 'Envoi...' : 'Envoyer ma vérification'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
