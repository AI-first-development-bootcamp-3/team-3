import path from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { env } from '../../config/env.js';
import { localFileStorage } from '../localFileStorage.js';

const written: string[] = [];

afterAll(async () => {
  await Promise.all(written.map((key) => localFileStorage.delete(key)));
});

describe('localFileStorage', () => {
  it('round-trips stored content', async () => {
    const content = Buffer.from('hello world');
    const key = await localFileStorage.store('note.pdf', content);
    written.push(key);

    const stream = await localFileStorage.retrieve(key);
    const chunks: Buffer[] = [];
    for await (const chunk of stream) {
      chunks.push(chunk as Buffer);
    }

    expect(Buffer.concat(chunks).toString()).toBe('hello world');
  });

  it('generates an opaque key with no path separators, discarding a traversal-laden original filename', async () => {
    const key = await localFileStorage.store('../../../../etc/passwd.pdf', Buffer.from('x'));
    written.push(key);

    expect(key).not.toContain('/');
    expect(key).not.toContain('..');
    expect(key.endsWith('.pdf')).toBe(true);

    // The stored file lives inside the configured root, not wherever the
    // traversal sequence would otherwise have pointed.
    const resolved = path.resolve(env.STORAGE_DIR, key);
    expect(resolved.startsWith(path.resolve(env.STORAGE_DIR) + path.sep)).toBe(true);
  });

  it('refuses to resolve a storage key that tries to escape the root', async () => {
    await expect(localFileStorage.retrieve('../outside.pdf')).rejects.toThrow(
      /outside the storage root/,
    );
  });
});
