import {
  signInWithPopup,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  type User,
} from 'firebase/auth'
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore'
import { auth, db, googleProvider, ADMIN_EMAIL } from '@/firebase'
import type { AppUser, UserRole } from '@/types'

export async function signInWithGoogle(): Promise<void> {
  await signInWithPopup(auth, googleProvider)
}

export async function signOut(): Promise<void> {
  await firebaseSignOut(auth)
}

export async function resolveUser(firebaseUser: User): Promise<AppUser | null> {
  const userRef = doc(db, 'users', firebaseUser.uid)
  const snap = await getDoc(userRef)

  if (snap.exists()) {
    return { uid: firebaseUser.uid, ...snap.data() } as AppUser
  }

  const email = firebaseUser.email ?? ''
  let role: UserRole = 'president'

  if (email === ADMIN_EMAIL) {
    role = 'admin'
  } else {
    const inviteRef = doc(db, 'invites', email)
    const inviteSnap = await getDoc(inviteRef)
    if (inviteSnap.exists()) {
      role = inviteSnap.data().role as UserRole
    }
  }

  // president needs onboarding — don't create Firestore doc yet
  if (role === 'president') return null

  const newUser: Omit<AppUser, 'uid'> = {
    email,
    name: firebaseUser.displayName ?? email,
    role,
    createdAt: new Date().toISOString(),
  }
  await setDoc(userRef, { ...newUser, createdAt: serverTimestamp() })
  return { uid: firebaseUser.uid, ...newUser }
}

export function subscribeToAuthState(
  onUser: (user: AppUser | null) => void,
  onLoading: (loading: boolean) => void,
): () => void {
  return onAuthStateChanged(auth, async firebaseUser => {
    if (!firebaseUser) {
      onUser(null)
      onLoading(false)
      return
    }
    const user = await resolveUser(firebaseUser)
    onUser(user)
    onLoading(false)
  })
}
