import { useEffect, useState } from 'react'

export function useFirestoreSubscription<T>(
  subscribeFn: (
    onData: (data: T[]) => void,
    onError?: (e: Error) => void,
  ) => () => void,
) {
  const [data, setData] = useState<T[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    return subscribeFn(
      d => { setData(d); setLoading(false) },
      () => setLoading(false),
    )
    // subscribeFn is always a stable module-level function reference
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return { data, loading }
}
