import * as nodemailer from 'nodemailer'

export function getTransport() {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  })
}

export function getSenderEmail(): string {
  return process.env.EMAIL_USER ?? ''
}
