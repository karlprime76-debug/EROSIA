import { NextResponse } from 'next/server'
import { validateFile } from '@/lib/media'
import { createClient } from '@/lib/supabase/server'
import { uploadStory as uploadStorySvc } from '@/lib/stories'
import { logger } from '@/lib/logger'
import { createStorySchema } from '@/lib/validations'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const formData = await request.formData()
    const file = formData.get('file') as File | null
    if (!file) return NextResponse.json({ error: 'Fichier requis' }, { status: 400 })
    const err = validateFile(file, 'story')
    if (err) return NextResponse.json({ error: err }, { status: 400 })

    const parsed = createStorySchema.safeParse({ privacy: formData.get('privacy') as string ?? 'public' })
    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message ?? 'Données invalides'
      return NextResponse.json({ error: firstError }, { status: 400 })
    }
    const privacy = parsed.data.privacy ?? 'public'

    const result = await uploadStorySvc(file, privacy as 'public' | 'close_friends')
    if (result.error) return NextResponse.json({ error: result.error }, { status: 400 })

    return NextResponse.json({ story: result.data })
  } catch (err) {
    logger.error('Story upload error', { error: String(err) })
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 })
  }
}
