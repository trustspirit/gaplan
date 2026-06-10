import { doc, getDoc, setDoc, arrayUnion } from 'firebase/firestore'
import { db } from '@/firebase'

export async function getDismissedReminders(uid: string): Promise<string[]> {
  const snap = await getDoc(doc(db, 'userSettings', uid))
  return (snap.data()?.dismissedReminders as string[] | undefined) ?? []
}

export async function dismissReminder(uid: string, key: string): Promise<void> {
  await setDoc(
    doc(db, 'userSettings', uid),
    { dismissedReminders: arrayUnion(key) },
    { merge: true },
  )
}
