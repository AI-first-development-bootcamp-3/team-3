/**
 * Outbound transactional email, decoupled from the transport. Mirrors the
 * FileStorage interface's shape: one small contract, swappable
 * implementations, callers never see which one is active.
 */
export interface EmailMessage {
  to: string;
  subject: string;
  text: string;
}

export interface EmailSender {
  send(message: EmailMessage): Promise<void>;
}
