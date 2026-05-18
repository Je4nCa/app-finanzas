import { useState, useEffect, useRef } from 'react'
import { onSnapshot, type Query, type CollectionReference } from 'firebase/firestore'

export function useCollection<T>(
  buildQuery: () => Query | CollectionReference,
  deps: unknown[] = []
): T[] | undefined {
  const [data, setData] = useState<T[] | undefined>(undefined)
  const buildRef = useRef(buildQuery)
  buildRef.current = buildQuery

  useEffect(() => {
    const unsub = onSnapshot(
      buildRef.current(),
      (snap) => setData(snap.docs.map((d) => d.data() as T)),
      (err) => console.error('[useCollection]', err)
    )
    return unsub
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  return data
}
