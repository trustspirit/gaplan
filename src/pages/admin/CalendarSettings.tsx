import { useState } from 'react'
import { useAtomValue } from 'jotai'
import { doc, setDoc } from 'firebase/firestore'
import { toast } from 'sonner'
import { authUserAtom } from '@/store/authAtom'
import { db } from '@/firebase'
import { AppShell, TopBar } from '@/components/layout'
import { Card, CardHeader, CardBody, Input, Button } from '@/components/ui'
import styles from './CalendarSettings.module.scss'

export function CalendarSettings() {
  const user = useAtomValue(authUserAtom)!
  const [calendarId, setCalendarId] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!calendarId.trim()) return
    setLoading(true)
    try {
      await setDoc(doc(db, 'settings', 'calendar'), { sharedCalendarId: calendarId.trim() })
      toast.success('구글 캘린더가 등록되었습니다.')
    } catch {
      toast.error('저장에 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AppShell
      role={user.role} name={user.name}
      topBar={<TopBar name={user.name} subtext="구글 캘린더 연동" />}
    >
      <div className={styles.page}>
        <Card>
          <CardHeader title="구글 캘린더 연동" />
          <CardBody>
            <p className={styles.desc}>
              Google Calendar에서 공유 캘린더를 생성하고, 캘린더 설정에서 캘린더 ID를 복사해 붙여넣으세요.
              확정된 모든 일정이 해당 캘린더에 자동으로 기록됩니다.
            </p>
            <form className={styles.form} onSubmit={handleSave}>
              <Input
                label="캘린더 ID"
                value={calendarId}
                onChange={e => setCalendarId(e.target.value)}
                placeholder="xxxxxxxx@group.calendar.google.com"
              />
              <Button type="submit" loading={loading}>저장</Button>
            </form>
          </CardBody>
        </Card>
      </div>
    </AppShell>
  )
}
