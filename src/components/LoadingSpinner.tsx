export function LoadingSpinner({ text = 'Chargement…' }: { text?: string }) {
  return (
    <div className="flex-1 flex items-center justify-center min-h-[60vh]">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-[var(--primary)] border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-secondary">{text}</p>
      </div>
    </div>
  )
}
