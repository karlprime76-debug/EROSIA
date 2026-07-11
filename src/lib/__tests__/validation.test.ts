import { describe, it, expect } from 'vitest'
import { registerSchema } from '../validations'

describe('Validation Schemas', () => {
  describe('registerSchema', () => {
    const validData = {
      email: 'test@example.com',
      password: 'Password1',
      name: 'Test User',
      age: 25,
      gender: 'male' as const,
      interestedIn: ['female'] as const,
    }

    it('should validate correct registration data', () => {
      const result = registerSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('should reject invalid email', () => {
      const result = registerSchema.safeParse({ ...validData, email: 'invalid-email' })
      expect(result.success).toBe(false)
    })

    it('should reject password shorter than 8 characters', () => {
      const result = registerSchema.safeParse({ ...validData, password: 'Sh0rt' })
      expect(result.success).toBe(false)
    })

    it('should reject password without uppercase', () => {
      const result = registerSchema.safeParse({ ...validData, password: 'password1' })
      expect(result.success).toBe(false)
    })

    it('should reject password without digit', () => {
      const result = registerSchema.safeParse({ ...validData, password: 'Password' })
      expect(result.success).toBe(false)
    })

    it('should reject age under 18', () => {
      const result = registerSchema.safeParse({ ...validData, age: 17 })
      expect(result.success).toBe(false)
    })

    it('should reject empty name', () => {
      const result = registerSchema.safeParse({ ...validData, name: '   ' })
      expect(result.success).toBe(false)
    })

    it('should reject missing gender', () => {
      const { gender: _gender, ...rest } = validData
      const result = registerSchema.safeParse(rest)
      expect(result.success).toBe(false)
    })

    it('should reject empty interestedIn', () => {
      const result = registerSchema.safeParse({ ...validData, interestedIn: [] })
      expect(result.success).toBe(false)
    })
  })
})
