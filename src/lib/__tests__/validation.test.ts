import { describe, it, expect } from 'vitest'
import { registerSchema } from '../validations'

describe('Validation Schemas', () => {
  describe('registerSchema', () => {
    it('should validate correct registration data', () => {
      const result = registerSchema.safeParse({
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User',
        age: 25
      })
      expect(result.success).toBe(true)
    })

    it('should reject invalid email', () => {
      const result = registerSchema.safeParse({
        email: 'invalid-email',
        password: 'password123',
        name: 'Test User',
        age: 25
      })
      expect(result.success).toBe(false)
    })

    it('should reject password shorter than 8 characters', () => {
      const result = registerSchema.safeParse({
        email: 'test@example.com',
        password: 'short',
        name: 'Test User',
        age: 25
      })
      expect(result.success).toBe(false)
    })

    it('should reject age under 18', () => {
      const result = registerSchema.safeParse({
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User',
        age: 17
      })
      expect(result.success).toBe(false)
    })

    it('should reject empty name', () => {
      const result = registerSchema.safeParse({
        email: 'test@example.com',
        password: 'password123',
        name: '   ',
        age: 25
      })
      expect(result.success).toBe(false)
    })
  })
})
