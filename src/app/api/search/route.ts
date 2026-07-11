import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const url = new URL(req.url)
    const minAge = url.searchParams.get('minAge')
    const maxAge = url.searchParams.get('maxAge')
    const gender = url.searchParams.get('gender')
    const city = url.searchParams.get('city')
    const minHeight = url.searchParams.get('minHeight')
    const maxHeight = url.searchParams.get('maxHeight')
    const smoker = url.searchParams.get('smoker')
    const drinker = url.searchParams.get('drinker')
    const wantsKids = url.searchParams.get('wantsKids')
    const hasPets = url.searchParams.get('hasPets')
    const languages = url.searchParams.get('languages')
    const sports = url.searchParams.get('sports')
    const music = url.searchParams.get('music')
    const education = url.searchParams.get('education')
    const interests = url.searchParams.get('interests')

    let query = supabase
      .from('profiles')
      .select('id, name, age, photos, city, bio, interests, looking_for, gender, mood, is_verified, height, languages, education, smoker, drinker, wants_kids, has_pets, sports, music, energy_score, trust_score')
      .neq('id', user.id)
      .limit(50)

    if (minAge) query = query.gte('age', parseInt(minAge))
    if (maxAge) query = query.lte('age', parseInt(maxAge))
    if (gender) query = query.eq('gender', gender)
    if (city) query = query.ilike('city', `%${city}%`)
    if (minHeight) query = query.gte('height', parseInt(minHeight))
    if (maxHeight) query = query.lte('height', parseInt(maxHeight))
    if (smoker) query = query.eq('smoker', smoker)
    if (drinker) query = query.eq('drinker', drinker)
    if (wantsKids) query = query.eq('wants_kids', wantsKids)
    if (hasPets) query = query.eq('has_pets', hasPets)
    if (languages) {
      const langs = languages.split(',').map(l => l.trim()).filter(Boolean)
      if (langs.length) query = query.overlaps('languages', langs)
    }
    if (sports) {
      const sportList = sports.split(',').map(l => l.trim()).filter(Boolean)
      if (sportList.length) query = query.overlaps('sports', sportList)
    }
    if (music) {
      const musicList = music.split(',').map(l => l.trim()).filter(Boolean)
      if (musicList.length) query = query.overlaps('music', musicList)
    }
    if (education) query = query.ilike('education', `%${education}%`)
    if (interests) query = query.ilike('interests', `%${interests}%`)

    const { data, error } = await query

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
  } catch (err) {
    logger.error('Search error', { error: String(err) })
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 })
  }
}
