import * as functions from 'firebase-functions/v1'
import * as nodemailer from 'nodemailer'

export function getTransport() {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: functions.config().email?.user ?? process.env.EMAIL_USER,
      pass: functions.config().email?.pass ?? process.env.EMAIL_PASS,
    },
  })
}

export function getSenderEmail(): string {
  return functions.config().email?.user ?? process.env.EMAIL_USER ?? ''
}
