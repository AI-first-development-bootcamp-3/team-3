import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';
import { env } from '../config/env.js';
import { AppError } from '../types/errors.js';
import type { FileStorage } from '../types/fileStorage.js';

const BUCKET_NAME = 'absence-documents';

const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false },
});

function generateStorageKey(originalFilename: string): string {
  const extension = path.extname(path.basename(originalFilename));
  return `${randomUUID()}${extension}`;
}

function handleSupabaseError(error: unknown, operation: string): never {
  if (error instanceof Error) {
    if (error.message.includes('not found')) {
      throw AppError.notFound(`File not found during ${operation}`);
    }
    if (error.message.includes('permission') || error.message.includes('Unauthorized')) {
      throw AppError.forbidden(`Permission denied for ${operation}`);
    }
    if (error.message.includes('payload')) {
      throw AppError.payloadTooLarge(`File too large for ${operation}`);
    }
  }
  throw AppError.internal(`Storage service error during ${operation}`);
}

export const supabaseFileStorage: FileStorage = {
  async store(originalFilename, content) {
    try {
      const storageKey = generateStorageKey(originalFilename);

      const { error } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(storageKey, content, {
          contentType: 'application/octet-stream',
          upsert: false,
        });

      if (error) {
        handleSupabaseError(error, 'upload');
      }

      return storageKey;
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      handleSupabaseError(error, 'upload');
    }
  },

  async retrieve(storageKey) {
    try {
      const { data, error } = await supabase.storage.from(BUCKET_NAME).download(storageKey);

      if (error) {
        handleSupabaseError(error, 'download');
      }

      const { Readable } = await import('node:stream');
      const readable = Readable.from(data);
      return readable;
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      handleSupabaseError(error, 'download');
    }
  },

  async delete(storageKey) {
    try {
      const { error } = await supabase.storage.from(BUCKET_NAME).remove([storageKey]);

      if (error) {
        handleSupabaseError(error, 'delete');
      }
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      handleSupabaseError(error, 'delete');
    }
  },
};
