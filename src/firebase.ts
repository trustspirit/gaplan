import { getAuth, GoogleAuthProvider } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'
import { getFunctions } from 'firebase/functions'
import { app } from './firebaseApp'

export { app }
export const auth = getAuth(app)
export const db = getFirestore(app)
export const functions = getFunctions(app, 'asia-northeast3')
export const googleProvider = new GoogleAuthProvider()

export const SHARED_CALENDAR_ID = import.meta.env.VITE_SHARED_CALENDAR_ID
