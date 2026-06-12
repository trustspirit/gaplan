import type { QuerySnapshot, DocumentData, FirestoreError } from 'firebase/firestore'

export const mapDocs = <T>(snap: QuerySnapshot<DocumentData>): T[] =>
  snap.docs.map(d => ({ id: d.id, ...d.data() }) as T)

export const snapshotErrHandler =
  (tag: string, onError?: (e: Error) => void) =>
  (err: FirestoreError): void => {
    console.error(`[${tag}] onSnapshot error:`, err.code, err.message)
    onError?.(err)
  }
