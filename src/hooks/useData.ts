import { use } from 'react'

export function useData<T>(promise: Promise<T>): T {
  return use(promise)
}
