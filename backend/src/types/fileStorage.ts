import type { Readable } from 'node:stream';

/**
 * Bytes-only storage, decoupled from metadata (which lives in the
 * `Attachment` table). Local filesystem is the only implementation now;
 * the interface is what lets an S3-compatible store replace it later
 * without touching callers.
 */
export interface FileStorage {
  /** Stores `content` under a fresh opaque key derived from `originalFilename`, returning that key. */
  store(originalFilename: string, content: Buffer): Promise<string>;

  /** Streams the bytes stored under `storageKey`, so retrieval never buffers a whole file into memory. */
  retrieve(storageKey: string): Promise<Readable>;

  /** Removes the bytes stored under `storageKey`. */
  delete(storageKey: string): Promise<void>;
}
