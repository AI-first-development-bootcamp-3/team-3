import type { NextFunction, Request, Response } from 'express';
import { Router } from 'express';
import multer from 'multer';
import { upload } from '../config/multer.js';
import { getAttachment, postAttachment } from '../controllers/attachment.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { authGuardRateLimit, readRateLimit, writeRateLimit } from '../middleware/writeRateLimit.middleware.js';
import { AppError } from '../types/errors.js';

export const attachmentRouter = Router();

/**
 * Adapts multer's callback-style error reporting onto the standard error
 * contract: a size violation is 413, anything else multer/fileFilter
 * rejects (disallowed content type included) is 400.
 */
function handleUpload(req: Request, res: Response, next: NextFunction): void {
  upload.single('file')(req, res, (err: unknown) => {
    if (!err) {
      next();
      return;
    }
    if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
      next(AppError.payloadTooLarge('File exceeds the maximum allowed size'));
      return;
    }
    const message = err instanceof Error ? err.message : 'Invalid upload';
    next(AppError.badRequest(message));
  });
}

/**
 * @openapi
 * /attachments:
 *   post:
 *     summary: Upload an attachment
 *     tags: [Attachments]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [file]
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *     responses:
 *       201:
 *         description: The attachment was stored.
 *       400:
 *         description: Missing file or disallowed content type.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *       401:
 *         description: Authentication required.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *       413:
 *         description: File exceeds the maximum allowed size.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 */
attachmentRouter.post(
  '/attachments',
  // Address-keyed guard first so `authenticate` itself is capped, then the
  // per-caller write budget once there is an identity to key it by - same
  // pattern as absence.routes.ts's write routes.
  authGuardRateLimit,
  authenticate,
  writeRateLimit,
  handleUpload,
  postAttachment,
);

/**
 * @openapi
 * /attachments/{id}:
 *   get:
 *     summary: Retrieve an attachment
 *     tags: [Attachments]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: The attachment's bytes, streamed with their recorded content type.
 *       401:
 *         description: Authentication required.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *       403:
 *         description: The caller is neither the uploader nor an administrator.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *       404:
 *         description: No attachment with that id.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 */
attachmentRouter.get('/attachments/:id', readRateLimit, authenticate, getAttachment);
