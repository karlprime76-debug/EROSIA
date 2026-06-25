import { describe, it, expect } from 'vitest'
import { sanitizeHtml, sanitizeText } from '../sanitize'

describe('sanitizeText', () => {
  it('trims whitespace', () => {
    expect(sanitizeText('  hello  ')).toBe('hello')
  })

  it('returns empty string for null/undefined', () => {
    expect(sanitizeText(null)).toBe('')
    expect(sanitizeText(undefined)).toBe('')
  })

  it('strips HTML tags', () => {
    expect(sanitizeText('<script>alert("xss")</script>')).not.toContain('<script>')
  })
})

describe('sanitizeHtml', () => {
  it('removes script tags', () => {
    const result = sanitizeHtml('<p>Hello <script>alert("xss")</script></p>')
    expect(result).not.toContain('<script>')
    expect(result).toContain('<p>Hello </p>')
  })

  it('allows safe tags', () => {
    const result = sanitizeHtml('<p><b>Bold</b> <i>italic</i></p>')
    expect(result).toContain('<b>Bold</b>')
    expect(result).toContain('<i>italic</i>')
  })

  it('strips onerror handlers', () => {
    const result = sanitizeHtml('<img src=x onerror="alert(1)">')
    expect(result).not.toContain('onerror')
  })
})
