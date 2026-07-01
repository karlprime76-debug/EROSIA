'use client'

export default function ToggleSwitch({ enabled, onChange }: { enabled: boolean; onChange: (v: boolean) => void }) {
  return (
    <button type="button" role="switch" aria-checked={enabled} aria-label={enabled ? 'Désactiver' : 'Activer'} onClick={() => onChange(!enabled)}
      className={`w-10 h-5 rounded-full transition relative ${enabled ? 'bg-[var(--primary)]' : 'bg-[var(--surfaceElevated)]'}`}>
      <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-[var(--textOnPrimary)] transition ${enabled ? 'left-5' : 'left-0.5'}`} />
    </button>
  )
}
