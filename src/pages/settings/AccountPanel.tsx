import { useState } from 'react'
import { useAtom } from 'jotai'
import { toast } from 'sonner'
import { useTranslation } from 'react-i18next'
import { authUserAtom } from '@/store/authAtom'
import { updateUserName } from '@/services/userService'
import { buildKakaoAuthUrl, disconnectKakao } from '@/services/kakaoService'
import { CalendarBanner } from '@/pages/home/CalendarBanner'
import { Button, Card, CardBody, CardHeader, Input } from '@/components/ui'

/**
 * 내 계정. 스펙 §4.3 — 나에게만 영향을 주는 설정을 한 화면에 모은다.
 * 모든 역할이 본다.
 */
export function AccountPanel() {
  const { t } = useTranslation()
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

      <Card>
        <CardHeader title={t('settings.account.calendarTitle')} />
        <CardBody>
          <CalendarBanner connected={user?.calendarConnected} />
        </CardBody>
      </Card>

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
    </>
  )
}
