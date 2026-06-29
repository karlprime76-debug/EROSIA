'use client'

import type { StoryGroup } from '@/lib/stories/types'

interface StoryRingProps {
  group: StoryGroup
  onClick: () => void
  size?: number
}

export function StoryRing({ group, onClick, size = 64 }: StoryRingProps) {
  const ringColors = group.allViewed
    ? 'border-[#2A2826]'
    : 'border-[#D92D4A] shadow-[0_0_8px_rgba(217,45,74,0.3)]'

  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-col items-center gap-1 shrink-0"
      style={{ width: size + 16 }}
    >
      <div
        className={`rounded-full p-0.5 bg-gradient-to-br from-[#D92D4A] to-[#C85A17] ${ringColors}`}
        style={{ width: size, height: size }}
      >
        <div className="w-full h-full rounded-full overflow-hidden bg-[#1C1C1E]">
          {group.photo ? (
            <img
              src={group.photo}
              alt={group.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-[#9E9488] text-lg font-bold">
              {group.name.charAt(0).toUpperCase()}
            </div>
          )}
        </div>
      </div>
      <span className="text-[10px] text-[#9E9488] truncate max-w-[72px] text-center leading-tight">
        {group.name.split(' ')[0]}
      </span>
    </button>
  )
}
