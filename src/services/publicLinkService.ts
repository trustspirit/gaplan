import { doc, setDoc, writeBatch } from 'firebase/firestore'
import { db } from '@/firebase'
import { generatePublicToken } from '@/utils/publicToken'

/** `settings/publicUnits`의 한 항목 */
export interface PublicScopeState {
  enabled: boolean
  token: string
}

/** `settings/publicTokens`에서 전체 일정표를 가리키는 특수값 */
const ALL_SCOPE = '__all__'

/**
 * 전체 공개 일정표를 켜고 끈다. 켜는데 토큰이 없으면 하나 만들어 두 문서에 함께 쓴다.
 * 끌 때 토큰을 지우지 않는다 — 다시 켰을 때 이미 공유한 링크가 계속 열려야 한다.
 * 적용된 토큰을 돌려준다.
 */
export async function setGlobalPublic(
  next: boolean,
  currentToken: string | null,
): Promise<string | null> {
  if (next && !currentToken) {
    const token = generatePublicToken()
    const batch = writeBatch(db)
    batch.set(
      doc(db, 'settings', 'public'),
      { schedulePublic: true, globalToken: token },
      { merge: true },
    )
    batch.set(doc(db, 'settings', 'publicTokens'), { [token]: ALL_SCOPE }, { merge: true })
    await batch.commit()
    return token
  }

  await setDoc(doc(db, 'settings', 'public'), { schedulePublic: next }, { merge: true })
  return currentToken
}

/**
 * 단위(지역 또는 스테이크/지방부) 하나의 공개 링크를 켜고 끈다.
 * 켤 때는 토큰이 이미 있어도 publicTokens에 다시 쓴다 — 옛 문서에 항목이 빠져 있는
 * 경우를 복구한다. 적용된 토큰을 돌려준다.
 */
export async function setScopePublic(
  scopeId: string,
  next: boolean,
  currentToken: string | null,
): Promise<string | null> {
  const batch = writeBatch(db)

  if (next) {
    const token = currentToken ?? generatePublicToken()
    batch.set(
      doc(db, 'settings', 'publicUnits'),
      { [scopeId]: { enabled: true, token } },
      { merge: true },
    )
    batch.set(doc(db, 'settings', 'publicTokens'), { [token]: scopeId }, { merge: true })
    await batch.commit()
    return token
  }

  batch.set(
    doc(db, 'settings', 'publicUnits'),
    { [scopeId]: { enabled: false, token: currentToken ?? '' } },
    { merge: true },
  )
  await batch.commit()
  return currentToken
}
