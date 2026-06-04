/**
 * taskReminder — daily cron that sends escalating reminders for pending tasks.
 * Schedule: 09:00 KST every day
 * Thresholds: D-7, D-3, D-1, D+0+
 */
import * as functions from 'firebase-functions/v1'
import * as admin from 'firebase-admin'
import dayjs from 'dayjs'
import { getTransport, getSenderEmail } from './emailTransport'

const APP_URL = 'https://gaplan-fccfe.web.app'
const TASK_TYPE_LABELS: Record<string, string> = {
  select_visit: '와드 방문 일정',
  select_interview: '접견/모임 일정',
}

export const taskReminder = functions
  .region('asia-northeast3')
  .pubsub.schedule('0 9 * * *')
  .timeZone('Asia/Seoul')
  .onRun(async () => {
    const db = admin.firestore()
    const today = dayjs()
    const todayStr = today.format('YYYY-MM-DD')

    const snap = await db.collection('tasks').where('status', '==', 'pending').get()
    if (snap.empty) return

    const transport = getTransport()
    const userSnaps = await Promise.all(
      snap.docs.map(d => db.collection('users').doc(d.data().assignedTo).get())
    )

    const results = await Promise.allSettled(
      snap.docs.map(async (d, i) => {
        const task = d.data()
        const president = userSnaps[i].data()
        if (!president?.email) return

        const daysLeft = dayjs(task.dueDate as string).diff(today, 'day')
        if (daysLeft !== 7 && daysLeft !== 3 && daysLeft !== 1 && daysLeft > 0) return

        const alreadyToday = (task.notifiedAt as admin.firestore.Timestamp[] ?? []).some(
          t => dayjs(t.toDate()).format('YYYY-MM-DD') === todayStr
        )
        if (alreadyToday) return

        const typeLabel = task.title || TASK_TYPE_LABELS[task.type] || 'Task'
        const tag = daysLeft <= 0 ? `기한 초과 D+${Math.abs(daysLeft)}` : `D-${daysLeft}`
        const urgency = daysLeft <= 0
          ? `기한이 ${Math.abs(daysLeft)}일 지났습니다.`
          : daysLeft === 1 ? '내일이 마감입니다!'
          : `기한이 ${daysLeft}일 남았습니다.`

        await transport.sendMail({
          from: getSenderEmail(),
          to: president.email,
          subject: `[gaplan] [${tag}] 미완료 Task: ${typeLabel}`,
          text: [
            `${president.name} 회장님,`,
            ``,
            `처리하지 않은 Task가 있습니다. ${urgency}`,
            ``,
            `• 종류: ${typeLabel}`,
            `• 마감일: ${task.dueDate}`,
            task.note ? `• 요청 사항: ${task.note}` : null,
            ``,
            `지금 처리해주세요: ${APP_URL}/tasks`,
            ``,
            `gaplan`,
          ].filter(Boolean).join('\n'),
        })

        await d.ref.update({
          notifiedAt: admin.firestore.FieldValue.arrayUnion(admin.firestore.Timestamp.now()),
        })
      })
    )

    results.forEach((r, i) => {
      if (r.status === 'rejected') {
        functions.logger.error(`taskReminder failed for ${snap.docs[i].id}`, r.reason)
      }
    })
  })
