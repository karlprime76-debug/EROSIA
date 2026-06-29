import type { CompressOptions } from './types'

export async function compressImage(file: File, options: CompressOptions = {}): Promise<Blob> {
  const { maxWidth = 1080, maxHeight = 1920, quality = 0.82 } = options

  if (file.type === 'image/gif') return file

  const img = await createImageBitmap(file)
  let width = img.width
  let height = img.height

  if (width > maxWidth) {
    height = Math.round(height * (maxWidth / width))
    width = maxWidth
  }
  if (height > maxHeight) {
    width = Math.round(width * (maxHeight / height))
    height = maxHeight
  }

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) return file

  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(img, 0, 0, width, height)
  img.close()

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob)
        else reject(new Error('Compression échouée'))
      },
      'image/webp',
      quality,
    )
  })
}

export function compressVideo(file: File): Promise<Blob> {
  return Promise.resolve(file)
}

export function estimateFileSize(originalSize: number): number {
  return Math.round(originalSize * 0.4)
}

export function isVideo(mime: string): boolean {
  return mime.startsWith('video/')
}

export function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}
