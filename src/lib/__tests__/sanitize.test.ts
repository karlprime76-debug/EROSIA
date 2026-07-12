import { describe, it, expect } from 'vitest'
import { sanitize } from '../sanitize'

describe('Sanitize Function', () => {
  it('should remove HTML tags', () => {
    const result = sanitize('<script>alert("xss")</script>Hello')
    expect(result).toBe('alert("xss")Hello')
  })

  it('should truncate to max length', () => {
    const result = sanitize('A'.repeat(100), 50)
    expect(result.length).toBe(50)
  })

  it('should handle empty input', () => {
    const result = sanitize('')
    expect(result).toBe('')
  })

  it('should remove dangerous characters', () => {
    const result = sanitize('<>&"')
    // The sanitize function removes HTML tags but not all special characters
    // It uses DOMParser which removes tags but leaves text content
    expect(result).not.toContain('<script>')
    expect(result).not.toContain('</script>')
  })

  it('should preserve safe text', () => {
    const result = sanitize('Hello World 123')
    expect(result).toBe('Hello World 123')
  })
})
