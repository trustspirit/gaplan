import { useState, useRef, useCallback, useEffect } from 'react'
import { toast } from 'sonner'
import { useTranslation } from 'react-i18next'

const UNDO_DURATION = 5000

interface Pending {
  timer: ReturnType<typeof setTimeout>
  run: () => void
  toastId: string | number
}

export function useDeleteWithUndo() {
  const { t } = useTranslation()
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set())
  const pending = useRef<Map<string, Pending>>(new Map())

  // 되돌리기를 기다리는 동안 앱을 닫거나 다른 앱으로 넘어가면 브라우저가 타이머를 멈추거나 버린다 —
  // "삭제됨"을 보고 나갔는데 다시 열면 그대로 남아 있다. 화면이 가려지는 순간 바로 지운다.
  useEffect(() => {
    const flush = () => {
      for (const p of [...pending.current.values()]) {
        clearTimeout(p.timer)
        toast.dismiss(p.toastId)
        p.run()
      }
    }
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') flush()
    }
    window.addEventListener('pagehide', flush)
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      window.removeEventListener('pagehide', flush)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [])

  const scheduleDelete = useCallback(
    (id: string, doDelete: () => Promise<void>, message?: string) => {
      setPendingIds(prev => new Set([...prev, id]))

      const run = async () => {
        if (!pending.current.delete(id)) return // 이미 지웠거나 되돌렸다
        try {
          await doDelete()
        } catch {
          setPendingIds(prev => { const n = new Set(prev); n.delete(id); return n })
          toast.error(t('common.deleteFailed'))
        }
      }

      const timer = setTimeout(run, UNDO_DURATION)

      const toastId = toast(message ?? t('common.deleted'), {
        action: {
          label: t('common.undo'),
          onClick: () => {
            const existing = pending.current.get(id)
            if (existing) { clearTimeout(existing.timer); pending.current.delete(id) }
            setPendingIds(prev => { const n = new Set(prev); n.delete(id); return n })
          },
        },
        duration: UNDO_DURATION,
      })

      pending.current.set(id, { timer, run, toastId })
    },
    [t],
  )

  return { pendingIds, scheduleDelete }
}
