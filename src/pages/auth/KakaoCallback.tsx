import { useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useSetAtom } from 'jotai'
import { connectKakao, consumeKakaoState } from '@/services/kakaoService'
import { authUserAtom } from '@/store/authAtom'
import { ROUTES } from '@/router/routes'
import { Spinner, Button } from '@/components/ui'
import styles from './KakaoCallback.module.scss'

export function KakaoCallback() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const [error, setError] = useState<string | null>(null)
  // authUserAtom은 로그인 시 한 번만 읽히고, 여기서는 클라이언트 라우팅으로
  // 돌아가므로 다시 읽히지 않는다. 직접 반영하지 않으면 연동에 성공해도
  // 설정 화면에는 여전히 "연동" 버튼이 남는다.
  const setUser = useSetAtom(authUserAtom)
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
      .then(() => {
        setUser((prev) => (prev ? { ...prev, kakaoConnected: true } : prev))
        navigate(ROUTES.settingsAccount, { replace: true })
      })
      .catch((e: unknown) => {
        // 톡캘린더는 선택 동의 항목이라 거부해도 토큰은 발급된다. 서버가
        // failed-precondition으로 막았다면 무엇을 해야 하는지 알려 준다.
        const errorCode = (e as { code?: string })?.code
        setError(
          errorCode === 'functions/failed-precondition'
            ? t('kakao.calendarScopeRequired')
            : t('kakao.connectFailed'),
        )
      })
  }, [params, navigate, setUser, t])

  if (error) {
    return (
      <div className={styles.page}>
        <p className={styles.message}>{error}</p>
        <Button variant="ghost" onClick={() => navigate(ROUTES.settingsAccount, { replace: true })}>
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
