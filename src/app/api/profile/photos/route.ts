import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'

const MAX_PHOTOS = 6
const MAX_SIZE = 10 * 1024 * 1024
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif']

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File | null
    if (!file) {
      return NextResponse.json({ error: 'Fichier manquant' }, { status: 400 })
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ error: 'Format non accepté. Formats autorisés : jpeg, png, webp, avif' }, { status: 400 })
    }
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: `Le fichier dépasse la limite de ${MAX_SIZE / 1024 / 1024} Mo` }, { status: 400 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('photos')
      .eq('id', user.id)
      .maybeSingle()

    const currentPhotos: string[] = profile?.photos ?? []
    if (currentPhotos.length >= MAX_PHOTOS) {
      return NextResponse.json({ error: `Maximum ${MAX_PHOTOS} photos autorisées` }, { status: 400 })
    }

    const ext = file.name.split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '') ?? 'jpg'
    const name = crypto.randomUUID()
    const fileName = `${user.id}/${name}.${ext}`

    const admin = createAdminClient()
    const { error: uploadError } = await admin.storage.from('photos').upload(fileName, file, {
      contentType: file.type,
      upsert: false,
    })
    if (uploadError) {
      logger.error('Photo upload error', { userId: user.id, error: uploadError.message })
      return NextResponse.json({ error: "Erreur lors de l'upload" }, { status: 500 })
    }

    const { data: urlData } = admin.storage.from('photos').getPublicUrl(fileName)
    const url = urlData.publicUrl

    const updatedPhotos = [...currentPhotos, url]
    const { error: updateError } = await admin
      .from('profiles')
      .update({ photos: updatedPhotos })
      .eq('id', user.id)

    if (updateError) {
      await admin.storage.from('photos').remove([fileName])
      logger.error('Profile photos update error', { userId: user.id, error: updateError.message })
      return NextResponse.json({ error: "Erreur lors de l'enregistrement" }, { status: 500 })
    }

    return NextResponse.json({ url, photos: updatedPhotos })
  } catch (err) {
    logger.error('[/api/profile/photos] POST exception', err)
    return NextResponse.json({ error: 'Erreur interne du serveur' }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const { photoUrl } = await request.json()
    if (!photoUrl || typeof photoUrl !== 'string') {
      return NextResponse.json({ error: 'URL de photo manquante' }, { status: 400 })
    }

    const admin = createAdminClient()
    const { data: profile } = await admin
      .from('profiles')
      .select('photos')
      .eq('id', user.id)
      .maybeSingle()

    const currentPhotos: string[] = profile?.photos ?? []
    if (!currentPhotos.includes(photoUrl)) {
      return NextResponse.json({ error: 'Photo introuvable' }, { status: 404 })
    }

    const objectPath = photoUrl.split('/storage/v1/object/public/photos/')[1]
    if (objectPath) {
      await admin.storage.from('photos').remove([objectPath])
    }

    const updatedPhotos = currentPhotos.filter(p => p !== photoUrl)
    const { error: updateError } = await admin
      .from('profiles')
      .update({ photos: updatedPhotos })
      .eq('id', user.id)

    if (updateError) {
      logger.error('Profile photos delete update error', { userId: user.id, error: updateError.message })
      return NextResponse.json({ error: "Erreur lors de la suppression" }, { status: 500 })
    }

    return NextResponse.json({ photos: updatedPhotos })
  } catch (err) {
    logger.error('[/api/profile/photos] DELETE exception', err)
    return NextResponse.json({ error: 'Erreur interne du serveur' }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const body = await request.json()
    const { photoUrl, action, photos: reordered } = body
    if (!photoUrl || typeof photoUrl !== 'string') {
      return NextResponse.json({ error: 'URL de photo manquante' }, { status: 400 })
    }

    const admin = createAdminClient()
    const { data: profile } = await admin
      .from('profiles')
      .select('photos')
      .eq('id', user.id)
      .maybeSingle()

    const currentPhotos: string[] = profile?.photos ?? []
    if (!currentPhotos.includes(photoUrl)) {
      return NextResponse.json({ error: 'Photo introuvable' }, { status: 404 })
    }

    let updatedPhotos: string[]
    if (action === 'set-primary') {
      updatedPhotos = [photoUrl, ...currentPhotos.filter(p => p !== photoUrl)]
    } else if (action === 'reorder') {
      if (!Array.isArray(reordered) || reordered.length !== currentPhotos.length) {
        return NextResponse.json({ error: 'Ordre invalide' }, { status: 400 })
      }
      updatedPhotos = reordered
    } else {
      return NextResponse.json({ error: 'Action invalide' }, { status: 400 })
    }

    const { error: updateError } = await admin
      .from('profiles')
      .update({ photos: updatedPhotos })
      .eq('id', user.id)

    if (updateError) {
      logger.error('Profile photos reorder error', { userId: user.id, error: updateError.message })
      return NextResponse.json({ error: "Erreur lors de la mise à jour" }, { status: 500 })
    }

    return NextResponse.json({ photos: updatedPhotos })
  } catch (err) {
    logger.error('[/api/profile/photos] PUT exception', err)
    return NextResponse.json({ error: 'Erreur interne du serveur' }, { status: 500 })
  }
}
