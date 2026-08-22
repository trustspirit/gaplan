import { doc, getDoc, setDoc, arrayUnion } from 'firebase/firestore'
import { db } from '@/firebase'
import { validateNewZoomLink, type ZoomLink, type ZoomLinkRejection } from '@/utils/zoomLinkRules'

export type { ZoomLink }

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

export async function getZoomLinks(uid: string): Promise<ZoomLink[]> {
  const snap = await getDoc(doc(db, 'userSettings', uid))
  return (snap.data()?.zoomLinks as ZoomLink[] | undefined) ?? []
}

async function writeZoomLinks(uid: string, links: ZoomLink[]): Promise<void> {
  await setDoc(doc(db, 'userSettings', uid), { zoomLinks: links }, { merge: true })
}

export type AddZoomLinkResult = { ok: true; link: ZoomLink } | { ok: false; reason: ZoomLinkRejection }

/**
 * 검증(zoomLinkRules.ts)을 통과한 링크만 저장한다. 사용자 입력 문제(중복/빈 라벨/잘못된
 * URL/한도 초과)는 예외를 던지지 않고 결과값으로 돌려준다 — 호출부가 메시지를 고른다.
 */
export async function addZoomLink(
  uid: string,
  input: { label: string; url: string },
): Promise<AddZoomLinkResult> {
  const existing = await getZoomLinks(uid)
  const validation = validateNewZoomLink(existing, input)
  if (!validation.ok) return validation

  const link: ZoomLink = { id: crypto.randomUUID(), label: input.label.trim(), url: input.url.trim() }
  await writeZoomLinks(uid, [...existing, link])
  return { ok: true, link }
}

export type RenameZoomLinkResult = { ok: true } | { ok: false; reason: 'empty_label' }

export async function renameZoomLink(
  uid: string,
  id: string,
  label: string,
): Promise<RenameZoomLinkResult> {
  const trimmed = label.trim()
  if (!trimmed) return { ok: false, reason: 'empty_label' }

  const existing = await getZoomLinks(uid)
  await writeZoomLinks(uid, existing.map((l) => (l.id === id ? { ...l, label: trimmed } : l)))
  return { ok: true }
}

export async function deleteZoomLink(uid: string, id: string): Promise<void> {
  const existing = await getZoomLinks(uid)
  await writeZoomLinks(uid, existing.filter((l) => l.id !== id))
}
