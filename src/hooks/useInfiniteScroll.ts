'use client'

import { useState, useEffect, useRef, useCallback } from 'react'

interface UseInfiniteScrollOptions {
  threshold?: number
}

export function useInfiniteScroll<T>(
  fetchPage: (page: number) => Promise<{ data: T[] | null; error?: string | null }>,
  options: UseInfiniteScrollOptions = {}
) {
  const { threshold = 200 } = options
  const [items, setItems] = useState<T[]>([])
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const sentinelRef = useRef<HTMLDivElement>(null)
  const isLoadingRef = useRef(false)

  const loadMore = useCallback(async () => {
    if (isLoadingRef.current || !hasMore) return
    isLoadingRef.current = true
    setLoading(true)
    const result = await fetchPage(page)
    setLoading(false)
    isLoadingRef.current = false
    if (result.error) {
      setError(result.error)
      return
    }
    const data = result.data
    if (!data || data.length === 0) {
      setHasMore(false)
      return
    }
    setItems(prev => [...prev, ...data])
    setPage(p => p + 1)
  }, [fetchPage, page, hasMore])

  useEffect(() => {
    const el = sentinelRef.current
    if (!el) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) loadMore()
      },
      { rootMargin: `${threshold}px` }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [loadMore, threshold])

  const reset = useCallback(() => {
    setItems([])
    setPage(1)
    setHasMore(true)
    setError(null)
    isLoadingRef.current = false
  }, [])

  return { items, loading, error, hasMore, sentinelRef, reset, loadMore }
}
