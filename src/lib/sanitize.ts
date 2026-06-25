import DOMPurify from 'dompurify'

export function sanitizeHtml(dirty: string): string {
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: ['p', 'b', 'i', 'em', 'strong', 'br', 'a', 'ul', 'ol', 'li'],
    ALLOWED_ATTR: ['href', 'target', 'rel'],
  })
}

export function sanitizeText(value: string | null | undefined): string {
  if (!value) return ''
  const cleaned = DOMPurify.sanitize(value, { ALLOWED_TAGS: [] })
  return cleaned.trim()
}
