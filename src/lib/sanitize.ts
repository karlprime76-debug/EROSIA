export function sanitize(input: string, maxLength?: number): string {
  let result = input
  if (typeof DOMParser !== 'undefined') {
    try {
      const doc = new DOMParser().parseFromString(input, 'text/html')
      result = doc.body.textContent || doc.body.innerText || input
    } catch {
      result = input.replace(/<[^>]*>/g, '').replace(/[<>]/g, '')
    }
  } else {
    result = input.replace(/<[^>]*>/g, '').replace(/[<>]/g, '')
  }
  if (maxLength) result = result.slice(0, maxLength)
  return result
}
