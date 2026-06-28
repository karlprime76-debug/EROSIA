export function sanitize(input: string, maxLength?: number): string {
  let result = input
  if (typeof DOMParser !== 'undefined') {
    const doc = new DOMParser().parseFromString(input, 'text/html')
    result = doc.body.textContent || doc.body.innerText || input
  }
  result = result.replace(/<[^>]*>/g, '').replace(/[<>]/g, '')
  if (maxLength) result = result.slice(0, maxLength)
  return result
}
