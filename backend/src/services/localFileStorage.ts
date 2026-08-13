import { randomUUID } from 'node:crypto';
import { createReadStream } from 'node:fs';
import fs from 'node:fs/promises';
import path from 'node:path';
import { env } from '../config/env.js';
import type { FileStorage } from '../types/fileStorage.js';

const root = path.resolve(env.STORAGE_DIR);

/**
 * The base name is always a fresh UUID — only the extension of the
 * original filename survives. Traversal-safety comes from discarding the
 * user-supplied name outright, not from validating it.
 */
function keyFor(originalFilename: string): string {
  const extension = path.extname(path.basename(originalFilename));
  return `${randomUUID()}${extension}`;
}

/** Defence in depth: refuses to touch anything the key resolves to outside the storage root. */
function resolveWithinRoot(storageKey: string): string {
  const resolved = path.resolve(root, storageKey);
  if (resolved !== root && !resolved.startsWith(root + path.sep)) {
    throw new Error(`Refusing to resolve storage key outside the storage root: ${storageKey}`);
  }
  return resolved;
}

/**
 * Stores attachment bytes on the local filesystem, under a mounted volume
 * in Docker/production. See backend/README.md -> File storage for the
 * ephemeral-filesystem caveat and the S3 migration path.
 */
export const localFileStorage: FileStorage = {
  async store(originalFilename, content) {
    await fs.mkdir(root, { recursive: true });
    const storageKey = keyFor(originalFilename);
    await fs.writeFile(resolveWithinRoot(storageKey), content);
    return storageKey;
  },

  async retrieve(storageKey) {
    return createReadStream(resolveWithinRoot(storageKey));
  },

  async delete(storageKey) {
    await fs.rm(resolveWithinRoot(storageKey), { force: true });
  },
};
