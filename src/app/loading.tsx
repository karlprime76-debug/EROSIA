export default function RootLoading() {
  return (
    <div className="flex-1 flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-[#D92D4A] border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-[#9E9488]">Chargement…</p>
      </div>
    </div>
  )
}
