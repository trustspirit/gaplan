import { doc, setDoc, writeBatch } from 'firebase/firestore'
import { db } from '@/firebase'
import { generatePublicToken } from '@/utils/publicToken'
import { seventyScopeId } from '@/utils/publicScope'

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
  // 전체 링크 토큰이 칠십인 개인 링크로 옮겨 갔으면 그 범위 값. 그때는 스위치만 바꾸고 새 토큰을
  // 만들지 않는다 — 껐다 켤 때마다 전체 링크가 말없이 되살아나면 안 된다.
  movedTo: string | null = null,
): Promise<string | null> {
  if (next && !currentToken && !movedTo) {
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

/**
 * 칠십인 개인 링크를 켜고 끈다.
 *
 * 처음 켤 때(그 칠십인에게 아직 토큰이 없을 때) 전체 링크 토큰이 있으면 새로 만들지 않고 그 토큰을
 * 넘겨받는다 — 이미 전달된 칠십인 전용 링크 주소와 캘린더 구독이 그대로 그 칠십인 링크가 된다.
 * 넘겨받으면 전체 링크 토큰을 비우고 어디로 옮겼는지 남긴다(setGlobalPublic의 movedTo). 그래서
 * 넘겨받기는 한 번만 일어난다.
 */
export async function setSeventyPublic(
  seventyUid: string,
  next: boolean,
  currentToken: string | null,
  globalToken: string | null,
): Promise<{ token: string | null; tookOverGlobal: boolean }> {
  const scopeId = seventyScopeId(seventyUid)

  if (next && !currentToken && globalToken) {
    const batch = writeBatch(db)
    batch.set(doc(db, 'settings', 'publicTokens'), { [globalToken]: scopeId }, { merge: true })
    batch.set(
      doc(db, 'settings', 'publicUnits'),
      { [scopeId]: { enabled: true, token: globalToken } },
      { merge: true },
    )
    batch.set(
      doc(db, 'settings', 'public'),
      { globalToken: '', globalTokenMovedTo: scopeId },
      { merge: true },
    )
    await batch.commit()
    return { token: globalToken, tookOverGlobal: true }
  }

  const token = await setScopePublic(scopeId, next, currentToken)
  return { token, tookOverGlobal: false }
}
