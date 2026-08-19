import { prisma } from '../config/prisma.js';
import { Prisma } from '../generated/prisma/client.js';
import { AppError } from '../types/errors.js';
import type { CreateTimeReportBatchBody } from '../types/timeReport.schema.js';
import {
  createTimeReportBatch,
  deleteTimeReportsForDate,
  listReportingOptions,
  listTimeReportAudits,
  listTimeReportsForMonth,
  type TimeReportAuditWrite,
} from './timeReport.service.js';

async function requireExistingUser(userId: string): Promise<void> {
  const user = await prisma.user.findFirst({
    where: { id: userId, isActive: undefined } as unknown as Prisma.UserWhereInput,
    select: { id: true },
  });
  if (!user) {
    throw AppError.notFound('User not found');
  }
}

export async function listAdminEmployeeReports(userId: string, month: number, year: number) {
  await requireExistingUser(userId);
  return listTimeReportsForMonth(userId, month, year);
}

export async function listAdminReportingOptions(userId: string) {
  await requireExistingUser(userId);
  return listReportingOptions(userId);
}

export async function replaceAdminEmployeeReports(
  actorId: string,
  userId: string,
  input: CreateTimeReportBatchBody,
  reason?: string,
) {
  await requireExistingUser(userId);
  const audit: TimeReportAuditWrite = { actorId, ...(reason ? { reason } : {}) };
  return createTimeReportBatch(userId, input, audit);
}

export async function deleteAdminEmployeeReports(
  actorId: string,
  userId: string,
  date: string,
  reason?: string,
) {
  await requireExistingUser(userId);
  const audit: TimeReportAuditWrite = { actorId, ...(reason ? { reason } : {}) };
  return deleteTimeReportsForDate(userId, date, audit);
}

export async function listAdminEmployeeReportAudits(userId: string, month: number, year: number) {
  await requireExistingUser(userId);
  return listTimeReportAudits(userId, month, year);
}
