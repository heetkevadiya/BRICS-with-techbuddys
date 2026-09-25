import { useCallback, useEffect, useRef, useState } from 'react'

/** Accumulating pager: holds every page fetched so far and appends the next one on demand.
 *  Changing `deps` (a filter change) resets back to page 1 rather than appending to stale rows. */
export function usePagedList(fetchPage, deps = [], pageSize = 50) {
  const [items, setItems] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState(null)
  // guards against a scroll event firing another fetch while one is already in flight
  const inFlight = useRef(false)

  const load = useCallback(async (nextPage) => {
    if (inFlight.current) return
    inFlight.current = true
    if (nextPage === 1) setLoading(true)
    else setLoadingMore(true)
    try {
      const res = await fetchPage({ page: nextPage, page_size: pageSize })
      setItems((prev) => (nextPage === 1 ? res.items : [...prev, ...res.items]))
      setTotal(res.total)
      setPage(nextPage)
      setError(null)
    } catch (e) {
      setError(e)
    } finally {
      inFlight.current = false
      setLoading(false)
      setLoadingMore(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, pageSize])

  // a filter change starts the list over
  useEffect(() => { setItems([]); setPage(1); load(1) }, [load])

  const hasMore = items.length < total
  const loadMore = useCallback(() => { if (hasMore && !inFlight.current) load(page + 1) }, [hasMore, load, page])
  const reload = useCallback(() => load(1), [load])

  return { items, total, hasMore, loading, loadingMore, error, loadMore, reload }
}

/** Calls `onVisible` whenever the returned ref scrolls into view — the bottom-of-list sentinel.
 *  `rootRef` is the scrolling container; it is read inside the effect, never during render, so the
 *  observer attaches to the real element rather than to the viewport on the first pass. */
export function useInfiniteScroll(onVisible, { enabled = true, rootRef = null, rootMargin = '300px' } = {}) {
  const ref = useRef(null)
  useEffect(() => {
    const el = ref.current
    if (!el || !enabled) return
    const io = new IntersectionObserver(
      (entries) => entries[0].isIntersecting && onVisible(),
      { root: rootRef?.current ?? null, rootMargin },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [onVisible, enabled, rootRef, rootMargin])
  return ref
}
