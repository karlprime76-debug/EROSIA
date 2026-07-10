'use client'

import { useId } from 'react'

export default function ToggleSwitch({ enabled, onChange, label }: { enabled: boolean; onChange: (v: boolean) => void; label?: string }) {
  const id = useId()
  return (
    <div className="flex items-center gap-2">
      {label && <label htmlFor={id} className="text-xs text-secondary">{label}</label>}
      <button type="button" role="switch" id={id} aria-checked={enabled} aria-label={label ?? (enabled ? 'Désactiver' : 'Activer')} onClick={() => onChange(!enabled)}
        className={`w-10 h-5 rounded-full transition relative ${enabled ? 'bg-[var(--primary)]' : 'bg-[var(--surfaceElevated)]'}`}>
        <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-[var(--textOnPrimary)] transition ${enabled ? 'left-5' : 'left-0.5'}`} />
      </button>
    </div>
  )
}
