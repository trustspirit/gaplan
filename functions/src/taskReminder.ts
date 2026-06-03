import * as functions from 'firebase-functions/v1'
import * as admin from 'firebase-admin'
import * as nodemailer from 'nodemailer'
import dayjs from 'dayjs'

export const taskReminder = functions
  .region('asia-northeast3')
  .pubsub.schedule('0 0 * * *')
  .timeZone('Asia/Seoul')
  .onRun(async () => {
    const db = admin.firestore()
    const today = dayjs().format('YYYY-MM-DD')
    const threshold = dayjs().add(3, 'day').format('YYYY-MM-DD')

    const snap = await db.collection('tasks')
      .where('status', '==', 'pending')
      .where('dueDate', '<=', threshold)
      .where('dueDate', '>=', today)
      .get()

    if (snap.empty) return

    const transport = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: functions.config().email?.user ?? process.env.EMAIL_USER,
        pass: functions.config().email?.pass ?? process.env.EMAIL_PASS,
      },
    })

    for (const d of snap.docs) {
      const task = d.data()
      const presidentSnap = await db.collection('users').doc(task.assignedTo).get()
      const president = presidentSnap.data()
      if (!president?.email) continue

      const label = task.type === 'select_visit' ? '와드 방문 일정 선택' : '접견 일정 선택'
      const daysLeft = dayjs(task.dueDate).diff(dayjs(), 'day')

      await transport.sendMail({
        from: functions.config().email?.user ?? process.env.EMAIL_USER,
        to: president.email,
        subject: `[gaplan] 처리 필요: ${label} (D-${daysLeft})`,
        text: `${president.name} 회장님,\n\n미완료 task가 있습니다:\n\n• ${label} (마감: ${task.dueDate})\n\ngaplan에 로그인하여 처리해주세요.`,
      })

      await d.ref.update({
        notifiedAt: admin.firestore.FieldValue.arrayUnion(admin.firestore.Timestamp.now()),
      })
    }
  })
