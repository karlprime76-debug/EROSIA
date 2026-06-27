/**
 * Strip HTML tags and dangerous content from user input.
 * This is a defense-in-depth measure — React already escapes text content.
 */
export function sanitizeText(input: string, maxLength = 5000): string {
  if (typeof input !== 'string') return ''
  let text = input.trim()
  if (text.length > maxLength) text = text.slice(0, maxLength)
  // Strip HTML/XML tags
  text = text.replace(/<[^>]*>/g, '')
  // Strip control characters except newlines and tabs
  text = text.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '')
  // Strip zero-width characters used for invisible text
  text = text.replace(/[\u200B-\u200D\uFEFF]/g, '')
  return text
}

/**
 * Sanitize a string for use in SQL ILIKE queries.
 * Removes LIKE wildcards and other dangerous chars.
 */
export function sanitizeLike(input: string): string {
  return input.replace(/[%_\\]/g, '').trim()
}
