import { useState, useRef, useCallback } from 'react'
import { toast } from 'sonner'
import { useTranslation } from 'react-i18next'

const UNDO_DURATION = 5000

export function useDeleteWithUndo() {
  const { t } = useTranslation()
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set())
  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())

  const scheduleDelete = useCallback(
    (id: string, doDelete: () => Promise<void>, message?: string) => {
      setPendingIds(prev => new Set([...prev, id]))

      const timer = setTimeout(async () => {
        timers.current.delete(id)
        try {
          await doDelete()
        } catch {
          setPendingIds(prev => { const n = new Set(prev); n.delete(id); return n })
          toast.error(t('common.deleteFailed'))
        }
      }, UNDO_DURATION)

      timers.current.set(id, timer)

      toast(message ?? t('common.deleted'), {
        action: {
          label: t('common.undo'),
          onClick: () => {
            const existing = timers.current.get(id)
            if (existing) { clearTimeout(existing); timers.current.delete(id) }
            setPendingIds(prev => { const n = new Set(prev); n.delete(id); return n })
          },
        },
        duration: UNDO_DURATION,
      })
    },
    [t],
  )

  return { pendingIds, scheduleDelete }
}
