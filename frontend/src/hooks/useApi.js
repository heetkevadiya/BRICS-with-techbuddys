import { useCallback, useEffect, useState } from 'react'

/** Fetch on mount and whenever `deps` change. Returns { data, error, loading, reload }. */
export function useApi(fn, deps = [], initial = null) {
  const [data, setData] = useState(initial)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(true)

  const reload = useCallback(() => {
    let cancelled = false
    setLoading(true)
    fn().then(
      (d) => { if (!cancelled) { setData(d); setError(null) } },
      (e) => { if (!cancelled) setError(e) },
    ).finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  useEffect(reload, [reload])
  return { data, error, loading, reload }
}
