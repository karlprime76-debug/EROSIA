'use client'

export default function ToggleSwitch({ enabled, onChange }: { enabled: boolean; onChange: (v: boolean) => void }) {
  return (
    <button type="button" aria-label={enabled ? 'Désactiver' : 'Activer'} onClick={() => onChange(!enabled)}
      className={`w-10 h-5 rounded-full transition relative ${enabled ? 'bg-[#D92D4A]' : 'bg-[#262628]'}`}>
      <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition ${enabled ? 'left-5' : 'left-0.5'}`} />
    </button>
  )
}
