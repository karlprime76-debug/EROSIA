'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Lock } from 'lucide-react'
import { createDuel, getProfiles, checkPremium } from '@/lib/api'
import { useToast } from '@/components/Toast'

interface NewDuelProfile {
  id: string
  name: string
  age: number | null
}

export default function NewDuelPage() {
  const router = useRouter()
  const [profiles, setProfiles] = useState<NewDuelProfile[]>([])
  const [selectedA, setSelectedA] = useState('')
  const [selectedB, setSelectedB] = useState('')
  const [creating, setCreating] = useState(false)
  const [isPremium, setIsPremium] = useState<boolean | null>(null)
  const { toast } = useToast()

  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await getProfiles([])
        if (data) setProfiles(data as NewDuelProfile[])
      } catch { toast('Erreur chargement profils', 'error') }
      try {
        const premium = await checkPremium()
        setIsPremium(premium)
      } catch { toast('Erreur vérification premium', 'error') }
    }
    load()
  }, [toast])

  const handleCreate = async () => {
    if (!selectedA || !selectedB || selectedA === selectedB) return
    setCreating(true)
    try {
      await createDuel(selectedA, selectedB)
      router.push('/duels')
    } catch (err) {
      console.error('handleCreate error', err)
      toast('Erreur lors de la création du duel', 'error')
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="flex-1 flex flex-col">
      <header className="flex items-center gap-3 px-5 pt-4 pb-3">
        <button type="button" onClick={() => router.back()} aria-label="Retour" className="p-1"><ArrowLeft size={22} /></button>
        <h2 className="text-2xl font-bold">Nouveau duel</h2>
      </header>
      <div className="flex-1 px-4 pb-8 space-y-4 overflow-y-auto">
        <p className="text-sm text-[#9E9488]">Choisis deux profils à opposer</p>
        <div>
          <label className="text-xs text-[#9E9488] mb-1 block">Profil A</label>
          <select value={selectedA} onChange={e => setSelectedA(e.target.value)}
            className="w-full px-4 py-3 rounded-xl bg-[#1C1C1E] border border-[#2A2826] text-white text-sm outline-none">
            <option value="">Sélectionner...</option>
            {profiles.filter(p => p.id !== selectedB).map(p => (
              <option key={p.id} value={p.id}>{p.name}, {p.age}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs text-[#9E9488] mb-1 block">Profil B</label>
          <select value={selectedB} onChange={e => setSelectedB(e.target.value)}
            className="w-full px-4 py-3 rounded-xl bg-[#1C1C1E] border border-[#2A2826] text-white text-sm outline-none">
            <option value="">Sélectionner...</option>
            {profiles.filter(p => p.id !== selectedA).map(p => (
              <option key={p.id} value={p.id}>{p.name}, {p.age}</option>
            ))}
          </select>
        </div>
        {isPremium === false ? (
          <button type="button" onClick={() => router.push('/settings')}
            className="w-full py-3.5 rounded-full font-semibold text-white flex items-center justify-center gap-2 bg-[#262628]">
            <Lock size={16} /> Premium requis
          </button>
        ) : (
          <button type="button" onClick={handleCreate} disabled={!selectedA || !selectedB || selectedA === selectedB || creating}
            className="w-full py-3.5 rounded-full font-semibold text-white disabled:opacity-50" style={{ background: '#D92D4A' }}>
            {creating ? 'Création...' : 'Lancer le duel'}
          </button>
        )}
      </div>
    </div>
  )
}
