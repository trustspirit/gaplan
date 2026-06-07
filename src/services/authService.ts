import {
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  type User,
} from 'firebase/auth'
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore'
import { httpsCallable } from 'firebase/functions'
import { auth, db, functions, googleProvider } from '@/firebase'
import type { AppUser, UserRole } from '@/types'

// Call once on app startup so a completed redirect login is resolved.
export function consumeRedirectResult(): void {
  getRedirectResult(auth).catch(() => {
    // No redirect pending or already consumed — safe to ignore.
  })
}

export async function signInWithGoogle(): Promise<void> {
  try {
    await signInWithPopup(auth, googleProvider)
  } catch (error: unknown) {
    const e = error as { code?: string }
    // Android WebView and some browsers block popups → fall back to redirect.
    if (e.code === 'auth/popup-blocked' || e.code === 'auth/popup-closed-by-user') {
      await signInWithRedirect(auth, googleProvider)
    } else {
      throw error
    }
  }
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

  // CF does server-side email lookup and merges pre-registered placeholder atomically
  if (email && firebaseUser.emailVerified) {
    try {
      const mergeFn = httpsCallable<Record<string, never>, Record<string, unknown> | null>(
        functions, 'mergePreRegisteredUser'
      )
      const result = await mergeFn({})
      if (result.data) {
        return { uid: firebaseUser.uid, ...(result.data as Omit<AppUser, 'uid'>) }
      }
      // null → no pre-registration; fall through to normal invite/pending flow
    } catch {
      // CF unavailable or failed — check if a concurrent call already completed the merge
      const merged = await getDoc(doc(db, 'users', firebaseUser.uid))
      if (merged.exists()) return { uid: firebaseUser.uid, ...merged.data() } as AppUser
      // Otherwise fall through to normal flow
    }
  }

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

  const inviteData = inviteSnap.data()
  const regionIds: string[] =
    (inviteData?.assignedRegionIds as string[] | undefined)?.filter(Boolean) ??
    (inviteData?.assignedRegionId ? [inviteData.assignedRegionId as string] : [])
  const regionFields = role === 'seventy' && regionIds.length > 0
    ? { regionIds, regionId: regionIds[0] }
    : {}

  const newUser: Omit<AppUser, 'uid'> = {
    email,
    name: firebaseUser.displayName ?? email,
    role,
    ...regionFields,
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
