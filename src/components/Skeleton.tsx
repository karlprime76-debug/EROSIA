export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`rounded-xl bg-[var(--cardDeep)] overflow-hidden relative ${className}`}>
    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[var(--primaryGlow)] to-transparent animate-shimmer" />
  </div>
}


export function DiscoverSkeleton() {
  return (
    <div className="flex-1 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <Skeleton className="w-full aspect-[3/4] rounded-3xl" />
        <div className="flex justify-center gap-4 mt-6">
          <Skeleton className="w-14 h-14 rounded-full" />
          <Skeleton className="w-14 h-14 rounded-full" />
          <Skeleton className="w-14 h-14 rounded-full" />
        </div>
      </div>
    </div>
  )
}

export function MatchesSkeleton() {
  return (
    <div className="space-y-3 px-4 pt-6">
      <Skeleton className="h-8 w-28" />
      <Skeleton className="h-3 w-44" />
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 p-3">
          <Skeleton className="w-14 h-14 rounded-full shrink-0" />
          <div className="space-y-2 flex-1">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-3 w-32" />
          </div>
        </div>
      ))}
    </div>
  )
}
