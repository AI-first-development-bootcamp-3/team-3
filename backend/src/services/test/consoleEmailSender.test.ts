import { describe, expect, it, vi } from 'vitest';
import { logger } from '../../config/logger.js';
import { consoleEmailSender } from '../consoleEmailSender.js';

describe('consoleEmailSender', () => {
  it('resolves without throwing and logs the message instead of delivering it', async () => {
    const logSpy = vi.spyOn(logger, 'info').mockImplementation(() => logger);

    await expect(
      consoleEmailSender.send({ to: 'someone@example.test', subject: 'Subject', text: 'Body' }),
    ).resolves.toBeUndefined();

    expect(logSpy).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({ email: expect.objectContaining({ to: 'someone@example.test' }) }),
      expect.any(String),
    );

    logSpy.mockRestore();
  });
});
