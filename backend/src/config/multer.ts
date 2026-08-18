import multer from 'multer';

export const MAX_ATTACHMENT_BYTES = 5 * 1024 * 1024;

const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
]);

/**
 * Buffers the upload in memory rather than writing to disk directly — files
 * are capped at 5 MB, small enough that this doesn't reintroduce the
 * whole-file-in-memory problem the `bytea` alternative was rejected for
 * (see design.md -> File bytes outside PostgreSQL), and it keeps `multer`
 * decoupled from the `FileStorage` interface that decides where bytes end
 * up.
 */
export const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_ATTACHMENT_BYTES },
  fileFilter(_req, file, callback) {
    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
      callback(new Error(`Unsupported content type: ${file.mimetype}`));
      return;
    }
    callback(null, true);
  },
});
