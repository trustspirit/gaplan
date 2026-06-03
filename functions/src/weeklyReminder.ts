import * as functions from 'firebase-functions/v1'
import * as admin from 'firebase-admin'
import * as nodemailer from 'nodemailer'
import dayjs from 'dayjs'
import isoWeek from 'dayjs/plugin/isoWeek'
dayjs.extend(isoWeek)

function getTransport() {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: functions.config().email?.user ?? process.env.EMAIL_USER,
      pass: functions.config().email?.pass ?? process.env.EMAIL_PASS,
    },
  })
}

// Every Monday 9am KST (= 00:00 UTC)
export const weeklyReminder = functions
  .region('asia-northeast3')
  .pubsub.schedule('0 0 * * 1')
  .timeZone('Asia/Seoul')
  .onRun(async () => {
    const db = admin.firestore()
    const weekStart = dayjs().startOf('isoWeek' as any).format('YYYY-MM-DD')
    const weekEnd = dayjs().endOf('isoWeek' as any).format('YYYY-MM-DD')

    const snap = await db.collection('schedules')
      .where('status', '==', 'confirmed')
      .where('date', '>=', weekStart)
      .where('date', '<=', weekEnd)
      .get()

    if (snap.empty) return

    const byPresident: Record<string, admin.firestore.QueryDocumentSnapshot[]> = {}
    snap.docs.forEach(d => {
      const uid = d.data().presidentUid
      byPresident[uid] = [...(byPresident[uid] ?? []), d]
    })

    const transport = getTransport()

    for (const [uid, docs] of Object.entries(byPresident)) {
      const presidentSnap = await db.collection('users').doc(uid).get()
      const president = presidentSnap.data()
      if (!president?.email) continue

      const lines = docs.map(d => {
        const s = d.data()
        return `• ${s.date} ${s.startTime} — ${s.type === 'ward_visit' ? '와드 방문' : '접견'}`
      }).join('\n')

      await transport.sendMail({
        from: functions.config().email?.user ?? process.env.EMAIL_USER,
        to: president.email,
        subject: `[gaplan] 이번 주 일정 안내 (${weekStart} ~ ${weekEnd})`,
        text: `${president.name} 회장님,\n\n이번 주 확정된 일정입니다:\n\n${lines}\n\ngaplan`,
      })
    }
  })
