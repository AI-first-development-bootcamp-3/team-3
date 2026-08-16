import { env } from '../config/env.js';
import type { EmailSender } from '../types/emailSender.js';
import { consoleEmailSender } from './consoleEmailSender.js';
import { createSmtpEmailSender } from './smtpEmailSender.js';

export const emailSender: EmailSender = env.SMTP_HOST ? createSmtpEmailSender() : consoleEmailSender;
