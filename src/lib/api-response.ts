import { NextResponse } from 'next/server'
import { logger } from './logger'

export function apiResponse<T>(data: T, status = 200) {
  return NextResponse.json({ data }, { status })
}

export function apiError(error: string, status = 400) {
  return NextResponse.json({ error }, { status })
}

export function apiServerError(err: unknown) {
  logger.error('Internal server error', { error: String(err) })
  return NextResponse.json({ error: 'Erreur interne du serveur' }, { status: 500 })
}
