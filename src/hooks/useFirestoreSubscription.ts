import { useEffect, useState } from 'react'

export function useFirestoreSubscription<T>(
  subscribeFn: (
    onData: (data: T[]) => void,
    onError?: (e: Error) => void,
  ) => () => void,
) {
  const [data, setData] = useState<T[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    return subscribeFn(
      d => { setData(d); setError(null); setLoading(false) },
      e => { setError(e); setLoading(false) },
    )
    // subscribeFn is always a stable module-level function reference
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return { data, loading, error }
}
