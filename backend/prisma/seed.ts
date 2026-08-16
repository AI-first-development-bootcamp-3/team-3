import bcrypt from 'bcryptjs';
import { prisma } from '../src/config/prisma.js';

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

  // Single-day absence.
  await prisma.absence.upsert({
    where: { id: IDS.absenceVacationSingleDay },
    update: {},
    create: {
      id: IDS.absenceVacationSingleDay,
      userId: IDS.employee,
      type: 'VACATION',
      startDate: new Date('2026-08-10'),
      endDate: new Date('2026-08-10'),
    },
  });

  // Multi-day range, entirely within one work week (no weekend inside it).
  await prisma.absence.upsert({
    where: { id: IDS.absenceVacationMultiDay },
    update: {},
    create: {
      id: IDS.absenceVacationMultiDay,
      userId: IDS.employee,
      type: 'VACATION',
      startDate: new Date('2026-08-17'),
      endDate: new Date('2026-08-19'),
    },
  });

  // Half-day absence.
  await prisma.absence.upsert({
    where: { id: IDS.absenceHalfDay },
    update: {},
    create: {
      id: IDS.absenceHalfDay,
      userId: IDS.employee,
      type: 'OTHER',
      startDate: new Date('2026-08-20'),
      endDate: new Date('2026-08-20'),
      halfDay: true,
    },
  });

  // Sick absence WITH a supporting document attached.
  await prisma.absence.upsert({
    where: { id: IDS.absenceSickWithDoc },
    update: {},
    create: {
      id: IDS.absenceSickWithDoc,
      userId: IDS.employee,
      type: 'SICK',
      startDate: new Date('2026-08-05'),
      endDate: new Date('2026-08-05'),
    },
  });

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

  // Sick absence WITHOUT a document — exercises the missing-document flag.
  await prisma.absence.upsert({
    where: { id: IDS.absenceSickNoDoc },
    update: {},
    create: {
      id: IDS.absenceSickNoDoc,
      userId: IDS.employee,
      type: 'SICK',
      startDate: new Date('2026-08-06'),
      endDate: new Date('2026-08-06'),
    },
  });

  // Range spanning a weekend (Fri 2026-08-14 - Sat 2026-08-15), to exercise
  // the working-day / Fri-Sat exclusion.
  await prisma.absence.upsert({
    where: { id: IDS.absenceReserveDutyWeekend },
    update: {},
    create: {
      id: IDS.absenceReserveDutyWeekend,
      userId: IDS.employee,
      type: 'RESERVE_DUTY',
      startDate: new Date('2026-08-13'),
      endDate: new Date('2026-08-16'),
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
