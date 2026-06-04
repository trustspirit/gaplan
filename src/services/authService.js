import { signInWithPopup, signInWithRedirect, getRedirectResult, signOut as firebaseSignOut, onAuthStateChanged, } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db, googleProvider } from '@/firebase';
// Call once on app startup so a completed redirect login is resolved.
export function consumeRedirectResult() {
    getRedirectResult(auth).catch(() => {
        // No redirect pending or already consumed — safe to ignore.
    });
}
export async function signInWithGoogle() {
    try {
        await signInWithPopup(auth, googleProvider);
    }
    catch (error) {
        const e = error;
        // Android WebView and some browsers block popups → fall back to redirect.
        if (e.code === 'auth/popup-blocked' || e.code === 'auth/popup-closed-by-user') {
            await signInWithRedirect(auth, googleProvider);
        }
        else {
            throw error;
        }
    }
}
export async function signOut() {
    await firebaseSignOut(auth);
}
export async function resolveUser(firebaseUser) {
    const userRef = doc(db, 'users', firebaseUser.uid);
    const snap = await getDoc(userRef);
    if (snap.exists()) {
        return { uid: firebaseUser.uid, ...snap.data() };
    }
    const email = firebaseUser.email ?? '';
    const [configSnap, inviteSnap] = await Promise.all([
        getDoc(doc(db, 'settings', 'admin')),
        getDoc(doc(db, 'invites', email)),
    ]);
    let role;
    if (configSnap.data()?.email === email) {
        role = 'admin';
    }
    else if (inviteSnap.exists()) {
        role = inviteSnap.data().role;
    }
    else {
        // No invite and not admin → onboarding to collect name/unit, then pending state
        role = 'pending';
    }
    // pending or invited president → transient user (no Firestore doc yet)
    // pending → onboarding → saves as pending → awaits admin approval
    // president (invited) → onboarding → saves as president → dashboard
    if (role === 'pending' || role === 'president') {
        return { uid: firebaseUser.uid, email, name: firebaseUser.displayName ?? email, role, createdAt: new Date().toISOString() };
    }
    const newUser = {
        email,
        name: firebaseUser.displayName ?? email,
        role,
        createdAt: new Date().toISOString(),
    };
    await setDoc(userRef, { ...newUser, createdAt: serverTimestamp() });
    return { uid: firebaseUser.uid, ...newUser };
}
export function subscribeToAuthState(onUser, onLoading, onAccessDenied) {
    return onAuthStateChanged(auth, async (firebaseUser) => {
        if (!firebaseUser) {
            onUser(null);
            onLoading(false);
            return;
        }
        try {
            const user = await resolveUser(firebaseUser);
            if (user === null)
                onAccessDenied?.();
            onUser(user);
        }
        catch (e) {
            console.error('[auth] resolveUser failed:', e);
            onAccessDenied?.();
            onUser(null);
        }
        finally {
            onLoading(false);
        }
    });
}
