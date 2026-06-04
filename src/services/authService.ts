import {
  signInWithPopup,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  type User,
} from 'firebase/auth'
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore'
import { auth, db, googleProvider } from '@/firebase'
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

  const [configSnap, inviteSnap] = await Promise.all([
    getDoc(doc(db, 'settings', 'admin')),
    getDoc(doc(db, 'invites', email)),
  ])

  let role: UserRole
  if (configSnap.data()?.email === email) {
    role = 'admin'
  } else if (inviteSnap.exists()) {
    role = inviteSnap.data().role as UserRole
  } else {
    // No invite and not admin → onboarding to collect name/unit, then pending state
    role = 'pending'
  }

  // pending or invited president → transient user (no Firestore doc yet)
  // pending → onboarding → saves as pending → awaits admin approval
  // president (invited) → onboarding → saves as president → dashboard
  if (role === 'pending' || role === 'president') {
    return { uid: firebaseUser.uid, email, name: firebaseUser.displayName ?? email, role, createdAt: new Date().toISOString() }
  }

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
  onAccessDenied?: () => void,
): () => void {
  return onAuthStateChanged(auth, async firebaseUser => {
    if (!firebaseUser) {
      onUser(null)
      onLoading(false)
      return
    }
    try {
      const user = await resolveUser(firebaseUser)
      if (user === null) onAccessDenied?.()
      onUser(user)
    } catch (e) {
      console.error('[auth] resolveUser failed:', e)
      onAccessDenied?.()
      onUser(null)
    } finally {
      onLoading(false)
    }
  })
}
