import nodemailer from 'nodemailer';
import { env } from '../config/env.js';
import type { EmailSender } from '../types/emailSender.js';

/**
 * Real delivery via SMTP. Only constructed when SMTP_HOST is set (see
 * emailSender.ts) - env.SMTP_HOST/USER/PASSWORD are asserted non-null here
 * because that's already been checked by the caller.
 */
export function createSmtpEmailSender(): EmailSender {
  const transport = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_PORT === 465,
    auth: env.SMTP_USER && env.SMTP_PASSWORD ? { user: env.SMTP_USER, pass: env.SMTP_PASSWORD } : undefined,
  });

  return {
    async send(message) {
      await transport.sendMail({
        from: env.EMAIL_FROM,
        to: message.to,
        subject: message.subject,
        text: message.text,
      });
    },
  };
}
