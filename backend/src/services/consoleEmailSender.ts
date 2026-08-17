import { logger } from '../config/logger.js';
import type { EmailSender } from '../types/emailSender.js';

/**
 * Default sender when no SMTP is configured: logs the message instead of
 * delivering it. Every environment starts here — a real provider is opt-in
 * via SMTP_HOST, not opt-out.
 */
export const consoleEmailSender: EmailSender = {
  async send(message) {
    logger.info({ email: message }, 'Email not sent (no SMTP configured) - logging instead');
  },
};
