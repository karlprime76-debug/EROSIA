import { z } from 'zod'

export const registerSchema = z.object({
  email: z.string().email('Email invalide').max(255),
  password: z.string().min(8, '8 caractères minimum').max(128),
  name: z.string().min(1, 'Nom requis').max(80).transform(v => v.replace(/<[^>]*>/g, '')),
  age: z.number().int().min(18, 'Tu dois avoir au moins 18 ans').max(120),
})

export const createEventSchema = z.object({
  title: z.string().min(1, 'Titre requis').max(100),
  description: z.string().max(500).optional().default(''),
  location: z.string().max(200).optional().default(''),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  event_date: z.string().optional(),
  max_participants: z.number().int().min(2).max(1000).optional(),
  type: z.enum(['date_night', 'meetup', 'party', 'other']),
})

export const createDuelSchema = z.object({
  profileAId: z.string().uuid(),
  profileBId: z.string().uuid(),
})

export const sendGiftSchema = z.object({
  receiverId: z.string().uuid(),
  giftId: z.string().uuid(),
  matchId: z.string().uuid(),
  message: z.string().max(200).optional(),
})

export const payoutSchema = z.object({
  amountCents: z.number().int().min(100, 'Minimum 1€').max(10000000, 'Maximum 100 000€'),
})
