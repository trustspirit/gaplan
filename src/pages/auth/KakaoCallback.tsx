import { useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { connectKakao, consumeKakaoState } from '@/services/kakaoService'
import { Spinner, Button } from '@/components/ui'
import styles from './KakaoCallback.module.scss'

export function KakaoCallback() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const [error, setError] = useState<string | null>(null)
  const ran = useRef(false)

  useEffect(() => {
    // 인가 코드는 1회용이다. StrictMode의 이중 실행을 막지 않으면
    // 두 번째 교환이 반드시 실패해 정상 연동이 에러로 보인다.
    if (ran.current) return
    ran.current = true

    const code = params.get('code')
    const returnedState = params.get('state')
    // consumeKakaoState()는 1회성 읽기다 — 이 요청이 이 탭에서 우리가 시작한
    // 인가 시도인지 확인하고, 같은 URL이 재사용돼도(리로드 등) 두 번째 확인은
    // 항상 실패하게 만든다. 상태 확인은 code 존재 여부와 무관하게 항상 먼저
    // 수행한다.
    const expectedState = consumeKakaoState()

    if (!returnedState || returnedState !== expectedState) {
      setError(t('kakao.stateMismatch'))
      return
    }

    if (!code) {
      setError(t('kakao.connectFailed'))
      return
    }

    connectKakao(code)
      .then(() => navigate('/admin/calendar', { replace: true }))
      .catch(() => setError(t('kakao.connectFailed')))
  }, [params, navigate, t])

  if (error) {
    return (
      <div className={styles.page}>
        <p className={styles.message}>{error}</p>
        <Button variant="ghost" onClick={() => navigate('/admin/calendar', { replace: true })}>
          {t('common.close')}
        </Button>
      </div>
    )
  }

  return (
    <div className={styles.page}>
      <Spinner />
      <p className={styles.message}>{t('kakao.connecting')}</p>
    </div>
  )
}
