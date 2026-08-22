import { useCallback, useEffect, useState } from 'react'
import {
  getZoomLinks,
  addZoomLink,
  renameZoomLink,
  deleteZoomLink,
  type ZoomLink,
  type AddZoomLinkResult,
  type RenameZoomLinkResult,
} from '@/services/userSettingsService'

/**
 * 저장된 Zoom 링크(개인, userSettings/{uid}.zoomLinks) — 일정 폼의 picker와 설정의
 * 관리 카드가 함께 쓴다. 마운트 시 한 번 읽고, 그 뒤 add/rename/remove는 서버에
 * 쓴 다음 로컬 state를 낙관적으로 갱신한다(재조회 없이 즉시 반영).
 */
export function useZoomLinks(uid: string | undefined) {
  const [links, setLinks] = useState<ZoomLink[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!uid) {
      setLinks([])
      setLoading(false)
      return
    }
    let active = true
    setLoading(true)
    getZoomLinks(uid)
      .then((next) => { if (active) setLinks(next) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [uid])

  const add = useCallback(
    async (input: { label: string; url: string }): Promise<AddZoomLinkResult> => {
      if (!uid) return { ok: false, reason: 'invalid_url' }
      const result = await addZoomLink(uid, input)
      if (result.ok) setLinks((prev) => [...prev, result.link])
      return result
    },
    [uid],
  )

  const rename = useCallback(
    async (id: string, label: string): Promise<RenameZoomLinkResult> => {
      if (!uid) return { ok: false, reason: 'empty_label' }
      const result = await renameZoomLink(uid, id, label)
      if (result.ok) {
        const trimmed = label.trim()
        setLinks((prev) => prev.map((l) => (l.id === id ? { ...l, label: trimmed } : l)))
      }
      return result
    },
    [uid],
  )

  const remove = useCallback(
    async (id: string): Promise<void> => {
      if (!uid) return
      await deleteZoomLink(uid, id)
      setLinks((prev) => prev.filter((l) => l.id !== id))
    },
    [uid],
  )

  return { links, loading, add, rename, remove }
}
