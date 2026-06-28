import { z } from 'zod'

export const registerSchema = z.object({
  email: z.string().email('Email invalide').max(255),
  password: z.string().min(8, '8 caractères minimum').max(128),
  name: z.string().min(1, 'Nom requis').max(80).transform(v => v.trim()).refine(v => v.length > 0, 'Nom requis'),
  age: z.number().int().min(18, 'Tu dois avoir au moins 18 ans').max(120),
})


