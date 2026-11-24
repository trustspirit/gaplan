import { doc, getDoc, setDoc, arrayUnion, deleteField } from 'firebase/firestore'
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

/** 스테이크별 링크 보내기 설정 — 사람마다 하나, 모든 요청에 쓴다 */
export interface ShareSettings {
  /** 언어별 안내문. null이면 기본 안내문 */
  templates: { ko: string | null; en: string | null }
  /** 영어로 보내는 스테이크(unitId -> 'en'). 없으면 한국어 */
  langs: Record<string, 'en'>
}

const str = (v: unknown) => (typeof v === 'string' && v.trim() ? v : null)

export async function getShareSettings(uid: string): Promise<ShareSettings> {
  const data = (await getDoc(doc(db, 'userSettings', uid))).data() ?? {}
  const langs = data.shareLangs && typeof data.shareLangs === 'object' ? (data.shareLangs as Record<string, unknown>) : {}
  return {
    templates: { ko: str(data.shareTemplate), en: str(data.shareTemplateEn) },
    langs: Object.fromEntries(Object.entries(langs).filter(([, v]) => v === 'en')) as Record<string, 'en'>,
  }
}

/** null이면 그 언어의 기본 안내문으로 되돌린다 */
export async function setShareTemplate(uid: string, lang: 'ko' | 'en', template: string | null): Promise<void> {
  const field = lang === 'en' ? 'shareTemplateEn' : 'shareTemplate'
  await setDoc(doc(db, 'userSettings', uid), { [field]: template?.trim() || null }, { merge: true })
}

/** 그 스테이크에 보낼 언어. 한국어면 키를 지운다 */
export async function setShareLang(uid: string, unitId: string, lang: 'ko' | 'en'): Promise<void> {
  await setDoc(
    doc(db, 'userSettings', uid),
    { shareLangs: { [unitId]: lang === 'en' ? 'en' : deleteField() } },
    { merge: true },
  )
}
