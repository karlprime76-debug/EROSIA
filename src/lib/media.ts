type MediaKind = 'photo' | 'story' | 'video' | 'audio' | 'chat_photo'

const FILE_LIMITS: Record<MediaKind, { maxSize: number }> = {
  photo: { maxSize: 10 * 1024 * 1024 },
  story: { maxSize: 20 * 1024 * 1024 },
  video: { maxSize: 50 * 1024 * 1024 },
  audio: { maxSize: 5 * 1024 * 1024 },
  chat_photo: { maxSize: 10 * 1024 * 1024 },
}

const ALLOWED_TYPES: Record<MediaKind, string[]> = {
  photo: ['image/jpeg', 'image/png', 'image/webp', 'image/avif'],
  story: ['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'video/mp4', 'video/quicktime'],
  video: ['video/mp4', 'video/quicktime', 'video/webm'],
  audio: ['audio/mp3', 'audio/mpeg', 'audio/ogg', 'audio/wav', 'audio/webm'],
  chat_photo: ['image/jpeg', 'image/png', 'image/webp'],
}

export function validateFile(file: File, kind: MediaKind): string | null {
  const limits = FILE_LIMITS[kind]
  const allowed = ALLOWED_TYPES[kind]
  if (!limits || !allowed) return 'Type de fichier non supporté'
  if (file.size > limits.maxSize) return `Le fichier dépasse la limite de ${limits.maxSize / 1024 / 1024} Mo`
  if (!allowed.includes(file.type)) return `Format non accepté. Formats autorisés : ${allowed.map(t => t.split('/')[1]).join(', ')}`
  return null
}

export function sanitizeFilename(original: string, fallbackExt = 'jpg'): string {
  const ext = original.split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '') ?? fallbackExt
  const name = Date.now().toString(36) + Math.random().toString(36).slice(2, 6)
  return `${name}.${ext}`
}
