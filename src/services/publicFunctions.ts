import { getFunctions, httpsCallable, type HttpsCallable } from 'firebase/functions'
import { app } from '@/firebaseApp'

let publicFunctions: ReturnType<typeof getFunctions> | null = null

function getPublicFunctions() {
  if (!publicFunctions) {
    publicFunctions = getFunctions(app, 'asia-northeast3')
  }
  return publicFunctions
}

export function publicCallable<RequestData, ResponseData>(
  name: string,
): HttpsCallable<RequestData, ResponseData> {
  return httpsCallable<RequestData, ResponseData>(getPublicFunctions(), name)
}
