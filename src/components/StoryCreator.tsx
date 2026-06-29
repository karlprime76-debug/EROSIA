'use client'

import { useRef, useState } from 'react'
import { Camera, Lock, Globe, Loader } from 'lucide-react'
import type { StoryPrivacy } from '@/lib/stories/types'

interface StoryCreatorProps {
  onUpload: (file: File, privacy: StoryPrivacy) => Promise<void>
  disabled?: boolean
  premiumRequired?: boolean
}

export function StoryCreator({ onUpload, disabled, premiumRequired }: StoryCreatorProps) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [privacy, setPrivacy] = useState<StoryPrivacy>('public')
  const [showPrivacy, setShowPrivacy] = useState(false)

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      await onUpload(file, privacy)
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  return (
    <div className="flex flex-col items-center gap-2 shrink-0" style={{ width: 80 }}>
      <div className="relative">
        <button
          type="button"
          onClick={() => {
            if (premiumRequired) return
            if (showPrivacy) {
              fileRef.current?.click()
              setShowPrivacy(false)
            } else {
              setShowPrivacy(true)
              setTimeout(() => {
                fileRef.current?.click()
                setShowPrivacy(false)
              }, 2000)
            }
          }}
          disabled={disabled || uploading || premiumRequired}
          className="w-16 h-16 rounded-full bg-gradient-to-br from-[#D92D4A] to-[#C85A17] flex items-center justify-center transition-all active:scale-90 hover:shadow-[0_0_15px_rgba(217,45,74,0.3)] disabled:opacity-40"
        >
          {uploading ? (
            <Loader size={20} className="animate-spin text-white" />
          ) : premiumRequired ? (
            <Lock size={18} className="text-white/60" />
          ) : (
            <Camera size={20} className="text-white" />
          )}
        </button>

        {showPrivacy && (
          <div className="absolute -bottom-12 left-1/2 -translate-x-1/2 z-10 bg-[#1C1C1E] border border-[#2A2826] rounded-xl p-1 flex shadow-xl">
            <button
              type="button"
              onClick={() => setPrivacy('public')}
              className={`px-2.5 py-1.5 rounded-lg text-[10px] font-medium flex items-center gap-1 transition ${privacy === 'public' ? 'bg-[#D92D4A]/20 text-[#D92D4A]' : 'text-[#9E9488] hover:text-white'}`}
            >
              <Globe size={10} /> Public
            </button>
            <button
              type="button"
              onClick={() => setPrivacy('close_friends')}
              className={`px-2.5 py-1.5 rounded-lg text-[10px] font-medium flex items-center gap-1 transition ${privacy === 'close_friends' ? 'bg-[#D92D4A]/20 text-[#D92D4A]' : 'text-[#9E9488] hover:text-white'}`}
            >
              <Lock size={10} /> Amis
            </button>
          </div>
        )}
      </div>
      <span className="text-[10px] text-[#9E9488]">Ta story</span>
      <input
        ref={fileRef}
        type="file"
        accept="image/*,video/mp4,video/quicktime"
        capture="environment"
        onChange={handleFile}
        className="hidden"
      />
    </div>
  )
}
