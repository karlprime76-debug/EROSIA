export function sanitize(input: string, maxLength?: number): string {
  let result = input
  result = result
    .replace(/&#x?[a-f0-9]+;/gi, '')
    .replace(/<[^>]*>/g, '')
    .replace(/[<>]/g, '')
    .replace(/javascript\s*:/gi, '')
    .replace(/data\s*:/gi, '')
    .replace(/vbscript\s*:/gi, '')
  if (maxLength) result = result.slice(0, maxLength)
  return result
}
