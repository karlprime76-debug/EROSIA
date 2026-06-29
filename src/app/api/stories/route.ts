import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { uploadStory as uploadStorySvc } from '@/lib/stories'
import { logger } from '@/lib/logger'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const formData = await request.formData()
    const file = formData.get('file') as File | null
    if (!file) return NextResponse.json({ error: 'Fichier requis' }, { status: 400 })

    const privacy = (formData.get('privacy') as string) ?? 'public'
    if (!['public', 'close_friends'].includes(privacy)) {
      return NextResponse.json({ error: 'Confidentialité invalide' }, { status: 400 })
    }

    const result = await uploadStorySvc(file, privacy as 'public' | 'close_friends')
    if (result.error) return NextResponse.json({ error: result.error }, { status: 400 })

    return NextResponse.json({ story: result.data })
  } catch (err) {
    logger.error('Story upload error', { error: String(err) })
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 })
  }
}
