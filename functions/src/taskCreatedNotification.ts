/**
 * taskCreatedNotification — Firestore onCreate trigger on tasks/{taskId}
 *
 * Sends an immediate email to the assigned president when a new task is created.
 * Also sends reminders 7 days and 3 days before the due date (escalating urgency).
 */
import * as functions from 'firebase-functions/v1'
import * as admin from 'firebase-admin'
import { getTransport, getSenderEmail } from './emailTransport'
import { APP_URL, resolveTaskTypeLabel } from './emailHelpers'

export const taskCreatedNotification = functions
  .region('asia-northeast3')
  .firestore.document('tasks/{taskId}')
  .onCreate(async (snap) => {
    const task = snap.data()
    if (!task) return

    const db = admin.firestore()
    const transport = getTransport()

    // Get the assigned president's info
    const presidentSnap = await db.collection('users').doc(task.assignedTo).get()
    const president = presidentSnap.data()
    if (!president?.email) return

    const typeLabel = resolveTaskTypeLabel(task.type, task.title)
    const dueDate = task.dueDate as string
    const taskId = snap.id
    const tasksUrl = `${APP_URL}/tasks`
    const respondUrl = task.respondToken
      ? `${APP_URL}/respond/${taskId}?t=${task.respondToken}`
      : null

    const subject = `[gaplan] 새 Task가 배정되었습니다: ${typeLabel}`
    const text = [
      `${president.name} 회장님,`,
      '',
      `새로운 Task가 배정되었습니다.`,
      '',
      `• 종류: ${typeLabel}`,
      `• 마감일: ${dueDate}`,
      task.note ? `• 요청 사항: ${task.note}` : null,
      '',
      `아래 링크를 클릭해 Task를 확인하고 처리해주세요:`,
      tasksUrl,
      respondUrl ? `\n공개 링크 (로그인 불필요):\n${respondUrl}` : null,
      '',
      'gaplan',
    ].filter(l => l !== null).join('\n')

    try {
      await transport.sendMail({
        from: getSenderEmail(),
        to: president.email,
        subject,
        text,
        html: buildHtmlEmail(president.name, typeLabel, dueDate, task.note, tasksUrl, respondUrl),
      })
      // Mark as notified so daily reminder doesn't duplicate
      await snap.ref.update({
        notifiedAt: admin.firestore.FieldValue.arrayUnion(admin.firestore.Timestamp.now()),
      })
    } catch (err) {
      functions.logger.error('taskCreatedNotification: email failed', err)
    }
  })

function escapeHtml(s: string): string {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function buildHtmlEmail(
  name: string,
  typeLabel: string,
  dueDate: string,
  note: string | undefined,
  tasksUrl: string,
  respondUrl: string | null = null,
): string {
  const safeName = escapeHtml(name)
  const safeTypeLabel = escapeHtml(typeLabel)
  const safeDueDate = escapeHtml(dueDate)
  const safeNote = note ? escapeHtml(note).replace(/\n/g, '<br>') : null
  const safeRespondUrl = respondUrl ? escapeHtml(respondUrl) : null

  return `
<!DOCTYPE html>
<html lang="ko">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f7f8f8;margin:0;padding:24px">
  <div style="max-width:480px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08)">
    <div style="background:#003057;padding:20px 28px">
      <span style="color:#ffffff;font-size:18px;font-weight:700;letter-spacing:0.02em">gaplan</span>
    </div>
    <div style="padding:28px">
      <h2 style="margin:0 0 8px;font-size:16px;color:#212225">새 Task가 배정되었습니다</h2>
      <p style="margin:0 0 20px;color:#808081;font-size:14px">${safeName} 회장님께</p>

      <div style="background:#f7f8f8;border-radius:8px;padding:16px;margin-bottom:20px">
        <div style="display:flex;gap:8px;margin-bottom:8px">
          <span style="color:#808081;font-size:13px;min-width:60px">종류</span>
          <span style="color:#212225;font-size:13px;font-weight:600">${safeTypeLabel}</span>
        </div>
        <div style="display:flex;gap:8px">
          <span style="color:#808081;font-size:13px;min-width:60px">마감일</span>
          <span style="color:#212225;font-size:13px;font-weight:600">${safeDueDate}</span>
        </div>
        ${safeNote ? `
        <div style="display:flex;gap:8px;margin-top:8px">
          <span style="color:#808081;font-size:13px;min-width:60px">요청 사항</span>
          <span style="color:#212225;font-size:13px">${safeNote}</span>
        </div>` : ''}
      </div>

      <a href="${tasksUrl}"
        style="display:block;text-align:center;background:#177C9C;color:#ffffff;text-decoration:none;
               padding:12px 24px;border-radius:8px;font-size:14px;font-weight:600">
        Task 확인하고 처리하기 →
      </a>
      ${safeRespondUrl ? `
      <p style="margin-top:16px;padding:12px;background:#f0f9ff;border-radius:8px;font-size:14px;">
        <strong>공개 링크 (로그인 불필요):</strong><br/>
        <a href="${safeRespondUrl}" style="color:#177C9C;">${safeRespondUrl}</a>
      </p>` : ''}
    </div>
  </div>
</body>
</html>`
}
