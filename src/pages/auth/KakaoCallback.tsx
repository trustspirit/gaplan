import { useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { connectKakao } from '@/services/kakaoService'
import { Spinner } from '@/components/ui'

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
      <div style={{ padding: 24, textAlign: 'center' }}>
        <p>{error}</p>
        <button type="button" onClick={() => navigate('/admin/calendar', { replace: true })}>
          {t('common.close')}
        </button>
      </div>
    )
  }

  return (
    <div style={{ padding: 24, textAlign: 'center' }}>
      <Spinner />
      <p>{t('kakao.connecting')}</p>
    </div>
  )
}
