'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { MapPin, Plane, ArrowLeft, ToggleLeft, ToggleRight } from 'lucide-react'
import { getTravelMode, setTravelMode } from '@/lib/api'
import { useToast } from '@/components/Toast'

export default function TravelPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [active, setActive] = useState(false)
  const [city, setCity] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    getTravelMode().then(m => {
      setActive(m.active)
      setCity(m.city ?? '')
    }).finally(() => setLoading(false))
  }, [])

  const handleSave = async () => {
    if (saving) return
    if (active && !city.trim()) {
      toast('Veuillez entrer une ville')
      return
    }
    setSaving(true)
    const { error } = await setTravelMode(city.trim(), active)
    setSaving(false)
    if (error) toast(error, 'error')
    else toast(active ? `Mode voyage activé : ${city}` : 'Mode voyage désactivé')
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary/5 to-background pb-24">
      <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="p-2.5 rounded-xl hover:bg-primary/5 transition-colors" aria-label="Retour">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Plane className="w-6 h-6 text-primary" />
            Mode Voyage
          </h1>
        </div>

        <div className="p-6 rounded-2xl glass space-y-5">
          <p className="text-sm text-muted-foreground">
            Active le mode voyage pour apparaître dans les résultats de recherche d&apos;une autre ville. Tes stories et ton profil montreront ta ville de voyage.
          </p>

          <button
            onClick={() => setActive(!active)}
            className="flex items-center justify-between w-full p-4 rounded-xl bg-primary/5 border border-primary/10"
          >
            <span className="font-medium">Mode voyage</span>
            {active ? <ToggleRight className="w-7 h-7 text-primary" /> : <ToggleLeft className="w-7 h-7 text-muted-foreground" />}
          </button>

          {active && (
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-primary" />
                Ville de destination
              </label>
              <input
                type="text"
                value={city}
                onChange={e => setCity(e.target.value)}
                placeholder="Paris, Lyon, Marseille…"
                className="w-full rounded-xl bg-primary/5 border border-primary/10 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
          )}

          <button
            onClick={handleSave}
            disabled={loading || saving}
            className="w-full py-3 rounded-xl bg-primary text-white font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {saving ? 'Enregistrement...' : loading ? 'Chargement…' : 'Enregistrer'}
          </button>
        </div>

        {active && city && (
          <div className="p-4 rounded-xl bg-primary/5 border border-primary/10 text-sm">
            <p className="flex items-center gap-2">
              <Plane className="w-4 h-4 text-primary" />
              Tu apparais actuellement comme étant à <strong>{city}</strong>
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
