import { useState } from 'react'
import { useAtom } from 'jotai'
import { toast } from 'sonner'
import { useTranslation } from 'react-i18next'
import { authUserAtom } from '@/store/authAtom'
import { updateUserName } from '@/services/userService'
import { buildKakaoAuthUrl, disconnectKakao } from '@/services/kakaoService'
import { CalendarBanner } from '@/pages/home/CalendarBanner'
import { Button, Card, CardBody, CardHeader, Input, SegmentedControl } from '@/components/ui'
import { LANGUAGES, type SupportedLang } from '@/i18n'

/**
 * 내 계정. 스펙 §4.3 — 나에게만 영향을 주는 설정을 한 화면에 모은다.
 * 모든 역할이 본다.
 */
export function AccountPanel() {
  const { t, i18n } = useTranslation()
  const [user, setUser] = useAtom(authUserAtom)
  const [name, setName] = useState(user?.name ?? '')
  const [savingName, setSavingName] = useState(false)
  const [kakaoBusy, setKakaoBusy] = useState(false)

  const handleSaveName = async () => {
    const next = name.trim()
    if (!next || !user) return
    setSavingName(true)
    try {
      await updateUserName(user.uid, next)
      setUser({ ...user, name: next })
      toast.success(t('settings.account.nameSaved'))
    } catch {
      toast.error(t('settings.account.nameFailed'))
    } finally {
      setSavingName(false)
    }
  }

  const handleKakaoConnect = () => {
    try {
      window.location.href = buildKakaoAuthUrl()
    } catch {
      toast.error(t('kakao.missingKey'))
    }
  }

  const handleKakaoDisconnect = async () => {
    setKakaoBusy(true)
    try {
      await disconnectKakao()
      setUser((prev) => (prev ? { ...prev, kakaoConnected: false } : prev))
      toast.success(t('kakao.disconnected'))
    } catch {
      toast.error(t('kakao.disconnectFailed'))
    } finally {
      setKakaoBusy(false)
    }
  }

  return (
    <>
      <Card>
        <CardHeader title={t('settings.account.nameTitle')} />
        <CardBody>
          <Input
            label={t('settings.account.nameTitle')}
            hint={t('settings.account.nameDesc')}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <Button onClick={handleSaveName} loading={savingName}>
            {t('common.save')}
          </Button>
        </CardBody>
      </Card>

      {/* 언어 전환 자체는 TopBar 드롭다운(같은 LANGUAGES 목록 + i18n.changeLanguage)과
          동일한 메커니즘이다. 여기 두 번째 진입점을 두는 것은 의도적이다 — 스펙 §4.2·§4.3이
          내 계정 화면의 항목으로 언어를 못박고 있다. TopBar·Sidebar의 기존 드롭다운은
          손대지 않는다. */}
      <Card>
        <CardHeader title={t('settings.account.languageTitle')} />
        <CardBody>
          <SegmentedControl
            options={LANGUAGES.map((lang) => ({ value: lang.code, label: lang.label }))}
            value={i18n.language as SupportedLang}
            onChange={(next) => i18n.changeLanguage(next)}
            aria-label={t('settings.account.languageTitle')}
          />
        </CardBody>
      </Card>

      <Card>
        <CardHeader title={t('settings.account.calendarTitle')} />
        <CardBody>
          <CalendarBanner connected={user?.calendarConnected} />
        </CardBody>
      </Card>

      {/* functions/src/kakaoCalendarSync.ts만 실제로 카카오 이벤트를 보낸다. 그 필터
          (kakaoTargets.ts의 filterTargetSecretaries)는 assignedSeventyUid가 스케줄의
          seventyUid와 같은 사용자만 대상으로 삼는다 — 즉 특정 칠십인에게 배정된
          집행서기뿐이다. 그 필드가 없는 역할(칠십인·회장·미배정 집행서기)에게 카드를
          보여주면 OAuth는 완료되고 refresh token도 서버에 저장되지만 이벤트는 영원히
          하나도 오지 않는다. */}
      {user?.assignedSeventyUid && (
        <Card>
          <CardHeader title={t('settings.account.kakaoTitle')} />
          <CardBody>
            <p>{t('kakao.description')}</p>
            {user?.kakaoConnected ? (
              <Button variant="secondary" onClick={handleKakaoDisconnect} loading={kakaoBusy}>
                {t('kakao.disconnect')}
              </Button>
            ) : (
              <Button onClick={handleKakaoConnect}>{t('kakao.connect')}</Button>
            )}
          </CardBody>
        </Card>
      )}
    </>
  )
}
