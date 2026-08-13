import type { Readable } from 'node:stream';
import { prisma } from '../config/prisma.js';
import { Role, type Role as RoleType } from '../generated/prisma/enums.js';
import { AppError } from '../types/errors.js';
import { localFileStorage } from './localFileStorage.js';

export interface UploadAttachmentInput {
  originalFilename: string;
  mimeType: string;
  content: Buffer;
  uploaderId: string;
}

export interface AttachmentMetadata {
  id: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  uploadedAt: Date;
}

export async function uploadAttachment(input: UploadAttachmentInput): Promise<AttachmentMetadata> {
  const storageKey = await localFileStorage.store(input.originalFilename, input.content);

  return prisma.attachment.create({
    data: {
      filename: input.originalFilename,
      mimeType: input.mimeType,
      sizeBytes: input.content.byteLength,
      storageKey,
      uploaderId: input.uploaderId,
    },
    select: { id: true, filename: true, mimeType: true, sizeBytes: true, uploadedAt: true },
  });
}

export interface RetrievedAttachment {
  filename: string;
  mimeType: string;
  stream: Readable;
}

/**
 * Owners reach their own attachments; administrators reach any. An unknown
 * id is 404, an id that exists but isn't the caller's (and they're not an
 * admin) is 403 — matching the spec's distinct scenarios for each.
 */
export async function retrieveAttachment(
  attachmentId: string,
  caller: { id: string; role: RoleType },
): Promise<RetrievedAttachment> {
  const attachment = await prisma.attachment.findUnique({ where: { id: attachmentId } });

  if (!attachment) {
    throw AppError.notFound('Attachment not found');
  }

  if (caller.role !== Role.ADMIN && attachment.uploaderId !== caller.id) {
    throw AppError.forbidden('Not permitted to access this attachment');
  }

  const stream = await localFileStorage.retrieve(attachment.storageKey);
  return { filename: attachment.filename, mimeType: attachment.mimeType, stream };
}
