import { useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { ConfirmSheet } from '@/components/ui/ConfirmSheet/ConfirmSheet'

/**
 * 작성 중인 폼을 닫거나 뒤로 갈 때 "버릴까요?"를 묻는다.
 *
 * 폼 다이얼로그 셋(일정 추가·일정 수정·행사)이 각자 window.confirm을 썼다. 브라우저 기본 창은
 * 앱의 다른 확인창과 모양이 다르고, 문구도 버튼도 고칠 수 없다("확인"/"취소"가 무엇을 하는지
 * 읽어 봐야 안다). 앱의 ConfirmSheet로 묻는다.
 *
 * @returns guard(action) — 고친 것이 없으면 action을 바로 실행하고, 있으면 먼저 묻는다.
 *          sheet — 다이얼로그 옆에 그대로 렌더한다.
 */
export function useDiscardGuard(isDirty: boolean): {
  guard: (action: () => void) => void
  sheet: ReactNode
} {
  const { t } = useTranslation()
  const [pending, setPending] = useState<(() => void) | null>(null)

  const guard = (action: () => void) => {
    if (isDirty) setPending(() => action)
    else action()
  }

  const sheet = (
    <ConfirmSheet
      open={pending !== null}
      title={t('confirm.discardTitle')}
      message={t('confirm.discardBody')}
      confirmLabel={t('confirm.discardBtn')}
      cancelLabel={t('confirm.keepEditing')}
      tone="danger"
      onConfirm={() => {
        const action = pending
        setPending(null)
        action?.()
      }}
      onCancel={() => setPending(null)}
    />
  )

  return { guard, sheet }
}
