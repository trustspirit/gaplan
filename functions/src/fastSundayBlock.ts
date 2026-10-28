import * as functions from 'firebase-functions/v1'
import * as admin from 'firebase-admin'
import { firstSundayOfNextMonthKst } from './fastSundayDate'

// Run at 1am KST on 1st of each month
export const fastSundayBlock = functions
  .region('asia-northeast3')
  .pubsub.schedule('0 1 1 * *')
  .timeZone('Asia/Seoul')
  .onRun(async () => {
    const db = admin.firestore()

    const firstSunday = firstSundayOfNextMonthKst()

    const usersSnap = await db.collection('users').where('role', '==', 'seventy').get()

    for (const userDoc of usersSnap.docs) {
      const ref = db
        .collection('availability')
        .doc(userDoc.id)
        .collection('slots')
        .doc(`fast-${firstSunday}`)
      await ref.set({
        type: 'override',
        date: firstSunday,
        startTime: '00:00',
        endTime: '23:59',
        isBlocked: true,
      })
    }
  })
