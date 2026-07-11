'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Search, X, SlidersHorizontal, Save, Clock, MapPin } from 'lucide-react'
import type { Profile } from '@/lib/api'

interface SearchResult extends Profile {
  city?: string
  height?: number
  languages?: string[]
  education?: string
  smoker?: string
  drinker?: string
  wants_kids?: string
  has_pets?: string
  sports?: string[]
  music?: string[]
}

interface Filters {
  minAge?: number
  maxAge?: number
  gender?: string
  city?: string
  minHeight?: number
  maxHeight?: number
  smoker?: string
  drinker?: string
  wantsKids?: string
  hasPets?: string
  languages?: string
  sports?: string
  music?: string
  education?: string
  interests?: string
}

interface SavedSearch {
  id: string
  name: string
  filters: Filters
  created_at: string
}

const AGE_RANGE = [18, 80]
const HEIGHT_RANGE = [100, 250]

export default function SearchPage() {
  const router = useRouter()
  const [profiles, setProfiles] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([])
  const [showFilters, setShowFilters] = useState(true)
  const [saveName, setSaveName] = useState('')
  const [showSaveDialog, setShowSaveDialog] = useState(false)
  const dialogRef = useRef<HTMLDivElement>(null)
  const loadedRef = useRef(false)

  const [filters, setFilters] = useState<Filters>({ minAge: 18, maxAge: 60 })

  const fetchProfiles = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      Object.entries(filters).forEach(([k, v]) => { if (v) params.set(k, String(v)) })
      const res = await fetch(`/api/search?${params}`)
      const json = await res.json()
      if (Array.isArray(json)) setProfiles(json)
      else setProfiles(json.data ?? [])
    } finally {
      setLoading(false)
    }
  }, [filters])

  const fetchSaved = useCallback(async () => {
    const res = await fetch('/api/saved-searches')
    const json = await res.json()
    if (Array.isArray(json)) setSavedSearches(json)
  }, [])

  useEffect(() => { if (!loadedRef.current) { loadedRef.current = true; fetchSaved(); fetchProfiles() } }, [fetchSaved, fetchProfiles])
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dialogRef.current && !dialogRef.current.contains(e.target as Node)) setShowSaveDialog(false)
    }
    if (showSaveDialog) document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [showSaveDialog])

  async function saveSearch() {
    if (!saveName.trim()) return
    await fetch('/api/saved-searches', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: saveName.trim(), filters })
    })
    setSaveName('')
    setShowSaveDialog(false)
    fetchSaved()
  }

  function applySaved(f: Filters) {
    setFilters(f)
  }

  async function deleteSaved(id: string) {
    await fetch(`/api/saved-searches/${id}`, { method: 'DELETE' })
    fetchSaved()
  }

  function updateFilter<K extends keyof Filters>(key: K, value: Filters[K]) {
    setFilters(prev => ({ ...prev, [key]: value || undefined }))
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary/5 to-background pb-24">
      <div className="sticky top-0 z-20 bg-background/80 backdrop-blur-xl border-b border-primary/10 px-4 py-3">
        <div className="flex items-center gap-3 max-w-5xl mx-auto">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Rechercher par centre d'intérêt, mot-clé…"
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-primary/5 border border-primary/10 focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm"
              value={filters.interests || ''}
              onChange={e => updateFilter('interests', e.target.value)}
              onKeyDown={e => e.key === 'Enter' && fetchProfiles()}
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`p-2.5 rounded-xl border transition-colors ${showFilters ? 'bg-primary text-white border-primary' : 'bg-primary/5 border-primary/10 text-muted-foreground'}`}
            aria-label="Filtres"
          >
            <SlidersHorizontal className="w-5 h-5" />
          </button>
          <button
            onClick={() => setShowSaveDialog(true)}
            className="p-2.5 rounded-xl bg-primary/5 border border-primary/10 text-muted-foreground hover:bg-primary/10 transition-colors"
            aria-label="Sauvegarder la recherche"
          >
            <Save className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-4 space-y-6">
        {showFilters && (
          <div className="p-5 space-y-5 glass rounded-2xl">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-lg">Filtres avancés</h2>
              <button
                onClick={() => setFilters({ minAge: 18, maxAge: 60 })}
                className="text-xs text-primary hover:underline"
              >
                Réinitialiser
              </button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Âge min</label>
                <input
                  type="range" min={AGE_RANGE[0]} max={AGE_RANGE[1]}
                  value={filters.minAge ?? 18}
                  onChange={e => updateFilter('minAge', Number(e.target.value))}
                  className="w-full accent-primary"
                />
                <span className="text-xs">{filters.minAge ?? 18} ans</span>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Âge max</label>
                <input
                  type="range" min={AGE_RANGE[0]} max={AGE_RANGE[1]}
                  value={filters.maxAge ?? 60}
                  onChange={e => updateFilter('maxAge', Number(e.target.value))}
                  className="w-full accent-primary"
                />
                <span className="text-xs">{filters.maxAge ?? 60} ans</span>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Genre</label>
                <select
                  value={filters.gender || ''}
                  onChange={e => updateFilter('gender', e.target.value || undefined)}
                  className="w-full rounded-lg bg-primary/5 border border-primary/10 p-2 text-sm"
                >
                  <option value="">Tous</option>
                  <option value="homme">Homme</option>
                  <option value="femme">Femme</option>
                  <option value="autre">Autre</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Ville</label>
                <input
                  type="text" placeholder="Paris, Lyon…"
                  value={filters.city || ''}
                  onChange={e => updateFilter('city', e.target.value)}
                  className="w-full rounded-lg bg-primary/5 border border-primary/10 p-2 text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-2 border-t border-primary/10">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Taille min (cm)</label>
                <input
                  type="range" min={HEIGHT_RANGE[0]} max={HEIGHT_RANGE[1]}
                  value={filters.minHeight ?? 100}
                  onChange={e => updateFilter('minHeight', Number(e.target.value))}
                  className="w-full accent-primary"
                />
                <span className="text-xs">{filters.minHeight ?? 100} cm</span>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Taille max (cm)</label>
                <input
                  type="range" min={HEIGHT_RANGE[0]} max={HEIGHT_RANGE[1]}
                  value={filters.maxHeight ?? 250}
                  onChange={e => updateFilter('maxHeight', Number(e.target.value))}
                  className="w-full accent-primary"
                />
                <span className="text-xs">{filters.maxHeight ?? 250} cm</span>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Tabac</label>
                <select
                  value={filters.smoker || ''}
                  onChange={e => updateFilter('smoker', e.target.value || undefined)}
                  className="w-full rounded-lg bg-primary/5 border border-primary/10 p-2 text-sm"
                >
                  <option value="">Indifférent</option>
                  <option value="no">Non</option>
                  <option value="yes">Oui</option>
                  <option value="sometimes">Parfois</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Alcool</label>
                <select
                  value={filters.drinker || ''}
                  onChange={e => updateFilter('drinker', e.target.value || undefined)}
                  className="w-full rounded-lg bg-primary/5 border border-primary/10 p-2 text-sm"
                >
                  <option value="">Indifférent</option>
                  <option value="no">Non</option>
                  <option value="yes">Oui</option>
                  <option value="sometimes">Parfois</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-2 border-t border-primary/10">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Enfants</label>
                <select
                  value={filters.wantsKids || ''}
                  onChange={e => updateFilter('wantsKids', e.target.value || undefined)}
                  className="w-full rounded-lg bg-primary/5 border border-primary/10 p-2 text-sm"
                >
                  <option value="">Indifférent</option>
                  <option value="yes">Oui</option>
                  <option value="no">Non</option>
                  <option value="open">Ouvert</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Animaux</label>
                <select
                  value={filters.hasPets || ''}
                  onChange={e => updateFilter('hasPets', e.target.value || undefined)}
                  className="w-full rounded-lg bg-primary/5 border border-primary/10 p-2 text-sm"
                >
                  <option value="">Indifférent</option>
                  <option value="yes">Oui</option>
                  <option value="no">Non</option>
                  <option value="open">Ouvert</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Langues</label>
                <input
                  type="text" placeholder="Français, Anglais…"
                  value={filters.languages || ''}
                  onChange={e => updateFilter('languages', e.target.value)}
                  className="w-full rounded-lg bg-primary/5 border border-primary/10 p-2 text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Sport</label>
                <input
                  type="text" placeholder="Running, Yoga…"
                  value={filters.sports || ''}
                  onChange={e => updateFilter('sports', e.target.value)}
                  className="w-full rounded-lg bg-primary/5 border border-primary/10 p-2 text-sm"
                />
              </div>
            </div>

            <div className="flex justify-end">
              <button
                onClick={fetchProfiles}
                className="px-6 py-2.5 rounded-xl bg-primary text-white font-medium hover:bg-primary/90 transition-colors"
              >
                Appliquer les filtres
              </button>
            </div>
          </div>
        )}

        {savedSearches.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {savedSearches.map(s => (
              <button
                key={s.id}
                onClick={() => applySaved(s.filters as Filters)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-sm hover:bg-primary/20 transition-colors"
              >
                <Clock className="w-3.5 h-3.5" />
                {s.name}
                <X
                  className="w-3.5 h-3.5 ml-1 cursor-pointer hover:text-red-500"
                  onClick={e => { e.stopPropagation(); deleteSaved(s.id) }}
                />
              </button>
            ))}
          </div>
        )}

        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="aspect-[3/4] rounded-2xl bg-primary/5 animate-pulse" />
            ))}
          </div>
        ) : profiles.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <Search className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p className="text-lg">Aucun profil trouvé</p>
            <p className="text-sm mt-1">Essayez d&apos;élargir vos filtres</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {profiles.map(p => (
              <button
                key={p.id}
                onClick={() => router.push(`/profile/${p.id}`)}
                className="group relative aspect-[3/4] rounded-2xl overflow-hidden bg-gradient-to-b from-primary/10 to-background border border-primary/10 hover:border-primary/30 transition-all"
              >
                {p.photos?.[0] ? (
                  <Image src={p.photos[0]} alt={p.name || ''} fill className="object-cover" />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-4xl opacity-30">👤</div>
                )}
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent p-3 pt-8">
                  <p className="text-white font-semibold text-sm">{p.name}, {p.age}</p>
                  {p.city && <p className="text-white/70 text-xs flex items-center gap-1"><MapPin className="w-3 h-3" />{p.city}</p>}
                </div>
                {p.is_verified && (
                  <span className="absolute top-2 right-2 bg-primary text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold">
                    ✓
                  </span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {showSaveDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div ref={dialogRef} className="bg-background rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <h3 className="font-semibold text-lg mb-3">Sauvegarder la recherche</h3>
            <input
              autoFocus
              type="text"
              placeholder="Nom de la recherche"
              value={saveName}
              onChange={e => setSaveName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && saveSearch()}
              className="w-full rounded-xl bg-primary/5 border border-primary/10 p-3 text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
            <div className="flex gap-3 justify-end">
              <button onClick={() => setShowSaveDialog(false)} className="px-4 py-2 rounded-xl border border-primary/10 text-sm">Annuler</button>
              <button onClick={saveSearch} className="px-4 py-2 rounded-xl bg-primary text-white text-sm font-medium">Sauvegarder</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
