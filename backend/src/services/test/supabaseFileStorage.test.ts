import { describe, expect, it, vi, afterEach } from 'vitest';
import { supabaseFileStorage } from '../supabaseFileStorage.js';

describe('supabaseFileStorage', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('store', () => {
    it('stores a file and returns a storage key', async () => {
      const content = Buffer.from('test file content');
      const key = await supabaseFileStorage.store('test.pdf', content);

      expect(key).toBeDefined();
      expect(typeof key).toBe('string');
      expect(key).toMatch(/^[a-f0-9-]+\.pdf$/);
    });

    it('generates unique keys for different files', async () => {
      const content1 = Buffer.from('content 1');
      const content2 = Buffer.from('content 2');

      const key1 = await supabaseFileStorage.store('file1.pdf', content1);
      const key2 = await supabaseFileStorage.store('file2.pdf', content2);

      expect(key1).not.toBe(key2);
    });

    it('preserves file extension from original filename', async () => {
      const content = Buffer.from('data');
      const key = await supabaseFileStorage.store('document.xlsx', content);

      expect(key.endsWith('.xlsx')).toBe(true);
    });

    it('strips directory traversal from filename', async () => {
      const content = Buffer.from('data');
      const key = await supabaseFileStorage.store('../../etc/passwd.pdf', content);

      expect(key).not.toContain('/');
      expect(key).not.toContain('..');
      expect(key.endsWith('.pdf')).toBe(true);
    });
  });

  describe('retrieve', () => {
    it('returns a readable stream for a stored file', async () => {
      const content = Buffer.from('hello world');
      const key = await supabaseFileStorage.store('test.pdf', content);

      const stream = await supabaseFileStorage.retrieve(key);
      expect(stream).toBeDefined();

      const chunks: Buffer[] = [];
      for await (const chunk of stream) {
        chunks.push(chunk as Buffer);
      }

      expect(Buffer.concat(chunks).toString()).toBe('hello world');
    });
  });

  describe('integration', () => {
    it('round-trips stored and retrieved content', async () => {
      const originalContent = Buffer.from('test data for round-trip');
      const key = await supabaseFileStorage.store('roundtrip.txt', originalContent);

      const stream = await supabaseFileStorage.retrieve(key);
      const chunks: Buffer[] = [];
      for await (const chunk of stream) {
        chunks.push(chunk as Buffer);
      }
      const retrievedContent = Buffer.concat(chunks);

      expect(retrievedContent).toEqual(originalContent);
    });
  });
});
