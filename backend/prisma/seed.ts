import bcrypt from 'bcryptjs';
import { prisma } from '../src/config/prisma.js';
import type { AbsenceType } from '../src/generated/prisma/enums.js';

/**
 * Fixed ids make the seed repeatable via `upsert`: re-running it converges on
 * the same rows instead of creating duplicates, since names alone aren't
 * unique in the schema.
 */
const IDS = {
  admin: '00000000-0000-0000-0000-000000000001',
  employee: '00000000-0000-0000-0000-000000000002',
  clientAcme: '00000000-0000-0000-0000-000000000010',
  clientGlobex: '00000000-0000-0000-0000-000000000011',
  projectWebsite: '00000000-0000-0000-0000-000000000020',
  projectMobile: '00000000-0000-0000-0000-000000000021',
  taskDesign: '00000000-0000-0000-0000-000000000030',
  taskDevelopment: '00000000-0000-0000-0000-000000000031',
  taskTesting: '00000000-0000-0000-0000-000000000032',
  absenceVacationSingleDay: '00000000-0000-0000-0000-000000000040',
  absenceVacationMultiDay: '00000000-0000-0000-0000-000000000041',
  absenceHalfDay: '00000000-0000-0000-0000-000000000042',
  absenceSickWithDoc: '00000000-0000-0000-0000-000000000043',
  absenceSickNoDoc: '00000000-0000-0000-0000-000000000044',
  absenceReserveDutyWeekend: '00000000-0000-0000-0000-000000000045',
  attachmentSickNote: '00000000-0000-0000-0000-000000000050',
} as const;

async function main() {
  const passwordHash = await bcrypt.hash('password123', 10);

  await prisma.user.upsert({
    where: { id: IDS.admin },
    update: {},
    create: {
      id: IDS.admin,
      email: 'admin@abra.test',
      passwordHash,
      displayName: 'מנהל המערכת',
      role: 'ADMIN',
      mustChangePassword: false,
    },
  });

  await prisma.user.upsert({
    where: { id: IDS.employee },
    update: {},
    create: {
      id: IDS.employee,
      email: 'employee@abra.test',
      passwordHash,
      displayName: 'ישראל ישראלי',
      role: 'EMPLOYEE',
      mustChangePassword: false,
    },
  });

  await prisma.client.upsert({
    where: { id: IDS.clientAcme },
    update: {},
    create: { id: IDS.clientAcme, name: 'חברת אקמי בע"מ' },
  });

  await prisma.client.upsert({
    where: { id: IDS.clientGlobex },
    update: {},
    create: { id: IDS.clientGlobex, name: 'גלובקס תעשיות' },
  });

  await prisma.project.upsert({
    where: { id: IDS.projectWebsite },
    update: {},
    create: { id: IDS.projectWebsite, name: 'בניית אתר תדמית', clientId: IDS.clientAcme },
  });

  await prisma.project.upsert({
    where: { id: IDS.projectMobile },
    update: {},
    create: { id: IDS.projectMobile, name: 'אפליקציית מובייל', clientId: IDS.clientGlobex },
  });

  await prisma.task.upsert({
    where: { id: IDS.taskDesign },
    update: {},
    create: { id: IDS.taskDesign, name: 'עיצוב ממשק', projectId: IDS.projectWebsite },
  });

  await prisma.task.upsert({
    where: { id: IDS.taskDevelopment },
    update: {},
    create: { id: IDS.taskDevelopment, name: 'פיתוח', projectId: IDS.projectWebsite },
  });

  await prisma.task.upsert({
    where: { id: IDS.taskTesting },
    update: {},
    create: { id: IDS.taskTesting, name: 'בדיקות QA', projectId: IDS.projectMobile },
  });

  // Sample absences for the employee, covering SCRUM-154's required shapes.
  // Every entry has a single-day range (startDate === endDate) unless noted.
  const ABSENCES: Array<{
    id: string;
    type: AbsenceType;
    startDate: string;
    endDate: string;
    halfDay?: boolean;
  }> = [
    // Single-day absence.
    { id: IDS.absenceVacationSingleDay, type: 'VACATION', startDate: '2026-08-10', endDate: '2026-08-10' },
    // Multi-day range, entirely within one work week (no weekend inside it).
    { id: IDS.absenceVacationMultiDay, type: 'VACATION', startDate: '2026-08-17', endDate: '2026-08-19' },
    // Half-day absence.
    { id: IDS.absenceHalfDay, type: 'OTHER', startDate: '2026-08-20', endDate: '2026-08-20', halfDay: true },
    // Sick absence WITH a supporting document attached (see the Attachment upsert below).
    { id: IDS.absenceSickWithDoc, type: 'SICK', startDate: '2026-08-05', endDate: '2026-08-05' },
    // Sick absence WITHOUT a document — exercises the missing-document flag.
    { id: IDS.absenceSickNoDoc, type: 'SICK', startDate: '2026-08-06', endDate: '2026-08-06' },
    // Thu 2026-08-13 -> Sun 2026-08-16: 4 calendar days, spanning the Fri
    // 8/14 + Sat 8/15 weekend. NOT a "0 working days" fixture — Thu and Sun
    // are working days, so this is 2 working days out of 4 calendar days.
    { id: IDS.absenceReserveDutyWeekend, type: 'RESERVE_DUTY', startDate: '2026-08-13', endDate: '2026-08-16' },
  ];

  for (const absence of ABSENCES) {
    await prisma.absence.upsert({
      where: { id: absence.id },
      update: {},
      create: {
        id: absence.id,
        userId: IDS.employee,
        type: absence.type,
        startDate: new Date(absence.startDate),
        endDate: new Date(absence.endDate),
        ...(absence.halfDay !== undefined ? { halfDay: absence.halfDay } : {}),
      },
    });
  }

  await prisma.attachment.upsert({
    where: { id: IDS.attachmentSickNote },
    update: {},
    create: {
      id: IDS.attachmentSickNote,
      filename: 'אישור-מחלה.pdf',
      mimeType: 'application/pdf',
      sizeBytes: 102_400,
      storageKey: 'seed/attachments/sick-note-employee.pdf',
      uploaderId: IDS.employee,
      absenceId: IDS.absenceSickWithDoc,
    },
  });
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error: unknown) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
