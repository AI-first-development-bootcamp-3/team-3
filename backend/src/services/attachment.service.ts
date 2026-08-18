import type { Readable } from 'node:stream';
import { prisma } from '../config/prisma.js';
import { Role, type Role as RoleType } from '../generated/prisma/enums.js';
import { AppError } from '../types/errors.js';
import { supabaseFileStorage } from './supabaseFileStorage.js';

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
  const storageKey = await supabaseFileStorage.store(input.originalFilename, input.content);

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
 * Uploaders and the owner of the absence an attachment is linked to (if any)
 * reach it; administrators reach any. The absence-owner path matters because
 * an absence document isn't always uploaded by the person it's about — e.g.
 * an admin adding a sick note on an employee's behalf shouldn't lock that
 * employee out of their own document. An unknown id is 404, an id that
 * exists but the caller has none of these relations to (and isn't an admin)
 * is 403 — matching the spec's distinct scenarios for each.
 */
export async function retrieveAttachment(
  attachmentId: string,
  caller: { id: string; role: RoleType },
): Promise<RetrievedAttachment> {
  const attachment = await prisma.attachment.findUnique({
    where: { id: attachmentId },
    include: { absence: { select: { userId: true } } },
  });

  if (!attachment) {
    throw AppError.notFound('Attachment not found');
  }

  const isUploader = attachment.uploaderId === caller.id;
  const isAbsenceOwner = attachment.absence?.userId === caller.id;

  if (caller.role !== Role.ADMIN && !isUploader && !isAbsenceOwner) {
    throw AppError.forbidden('Not permitted to access this attachment');
  }

  const stream = await supabaseFileStorage.retrieve(attachment.storageKey);
  return { filename: attachment.filename, mimeType: attachment.mimeType, stream };
}
