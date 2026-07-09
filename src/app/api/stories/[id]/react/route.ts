import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { addStoryReaction } from '@/lib/stories'
import { z } from 'zod'
import { logger } from '@/lib/logger'

const uuidParam = z.string().uuid()

const reactSchema = z.object({
  emoji: z.string().min(1, 'emoji requis'),
})

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const { id } = await params
    const idParsed = uuidParam.safeParse(id)
    if (!idParsed.success) return NextResponse.json({ error: 'ID invalide' }, { status: 400 })
    let body: Record<string, unknown>
    try { body = await request.json() } catch {
      return NextResponse.json({ error: 'Corps de requête invalide' }, { status: 400 })
    }
    const parsed = reactSchema.safeParse(body)
    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message ?? 'Données invalides'
      return NextResponse.json({ error: firstError }, { status: 400 })
    }
    const { emoji } = parsed.data

    const { error } = await addStoryReaction(idParsed.data, emoji)
    if (error) return NextResponse.json({ error: String(error ?? 'Erreur') }, { status: 400 })

    return NextResponse.json({ success: true })
  } catch (err) {
    logger.error('Story reaction error', { error: String(err) })
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 })
  }
}
