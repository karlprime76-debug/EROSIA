export default function Loading() {
  return (
    <div className="flex flex-col items-center justify-center flex-1 px-5 safe-pb safe-pt">
      <div className="w-full max-w-sm">
        <div className="rounded-3xl border border-white/6 p-7 sm:p-8 space-y-5">
          <div className="flex items-center justify-center gap-2.5 mb-4">
            <div className="w-11 h-11 rounded-2xl bg-white/10 animate-pulse" />
            <div className="h-7 w-24 rounded bg-white/10 animate-pulse" />
          </div>
          <div className="space-y-3">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-14 rounded-xl bg-white/5 animate-pulse" />
            ))}
          </div>
          <div className="h-14 rounded-full bg-white/10 animate-pulse" />
        </div>
      </div>
    </div>
  )
}
