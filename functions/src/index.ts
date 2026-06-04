import * as admin from 'firebase-admin'
admin.initializeApp()

export { confirmSchedule } from './confirmSchedule'
export { deleteUser } from './adminActions'
export { calendarSync } from './calendarSync'
export { weeklyReminder } from './weeklyReminder'
export { taskReminder } from './taskReminder'
export { fastSundayBlock } from './fastSundayBlock'
