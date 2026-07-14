import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'
import { validateFile } from '@/lib/media'
import { apiResponse, apiError, apiServerError } from '@/lib/api-response'

const MAX_PHOTOS = 6

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return apiError('Non authentifié', 401)
    }

    const formData = await request.formData()
    const file = formData.get('file') as File | null
    if (!file) {
      return apiError('Fichier manquant')
    }

    const validationErr = validateFile(file, 'photo')
    if (validationErr) {
      return apiError(validationErr)
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('photos')
      .eq('id', user.id)
      .maybeSingle()

    const currentPhotos: string[] = profile?.photos ?? []
    if (currentPhotos.length >= MAX_PHOTOS) {
      return apiError(`Maximum ${MAX_PHOTOS} photos autorisées`)
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
      return apiError("Erreur lors de l'upload", 500)
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
      return apiError("Erreur lors de l'enregistrement", 500)
    }

    return apiResponse({ url, photos: updatedPhotos })
  } catch (err) {
    logger.error('[/api/profile/photos] POST exception', err)
    return apiServerError(err)
  }
}

export async function DELETE(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return apiError('Non authentifié', 401)
    }

    let body: Record<string, unknown>
    try { body = await request.json() } catch {
      return apiError('Corps de requête invalide')
    }
    const { photoUrl } = body
    if (!photoUrl || typeof photoUrl !== 'string') {
      return apiError('URL de photo manquante')
    }

    const admin = createAdminClient()
    const { data: profile } = await admin
      .from('profiles')
      .select('photos')
      .eq('id', user.id)
      .maybeSingle()

    const currentPhotos: string[] = profile?.photos ?? []
    if (!currentPhotos.includes(photoUrl)) {
      return apiError('Photo introuvable', 404)
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
      return apiError("Erreur lors de la suppression", 500)
    }

    return apiResponse({ photos: updatedPhotos })
  } catch (err) {
    logger.error('[/api/profile/photos] DELETE exception', err)
    return apiServerError(err)
  }
}

export async function PUT(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return apiError('Non authentifié', 401)
    }

    let body: Record<string, unknown>
    try { body = await request.json() } catch {
      return apiError('Corps de requête invalide')
    }
    const { photoUrl, action, photos: reordered } = body
    if (!photoUrl || typeof photoUrl !== 'string') {
      return apiError('URL de photo manquante')
    }

    const admin = createAdminClient()
    const { data: profile } = await admin
      .from('profiles')
      .select('photos')
      .eq('id', user.id)
      .maybeSingle()

    const currentPhotos: string[] = profile?.photos ?? []
    if (!currentPhotos.includes(photoUrl)) {
      return apiError('Photo introuvable', 404)
    }

    let updatedPhotos: string[]
    if (action === 'set-primary') {
      updatedPhotos = [photoUrl, ...currentPhotos.filter(p => p !== photoUrl)]
    } else if (action === 'reorder') {
      if (!Array.isArray(reordered) || reordered.length !== currentPhotos.length) {
        return apiError('Ordre invalide')
      }
      updatedPhotos = reordered
    } else {
      return apiError('Action invalide')
    }

    const { error: updateError } = await admin
      .from('profiles')
      .update({ photos: updatedPhotos })
      .eq('id', user.id)

    if (updateError) {
      logger.error('Profile photos reorder error', { userId: user.id, error: updateError.message })
      return apiError("Erreur lors de la mise à jour", 500)
    }

    return apiResponse({ photos: updatedPhotos })
  } catch (err) {
    logger.error('[/api/profile/photos] PUT exception', err)
    return apiServerError(err)
  }
}
