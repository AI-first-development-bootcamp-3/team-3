import bcrypt from 'bcryptjs';
import { prisma } from '../src/config/prisma.js';
import type { AbsenceType, ReportFormat, Role, TaskStatus, WorkLocation } from '../src/generated/prisma/enums.js';

/**
 * Fixed ids make the seed repeatable via `upsert`: re-running it converges on
 * the same rows instead of creating duplicates, since names alone aren't
 * unique in the schema.
 *
 * Use RFC-4122-shaped v4 ids (version nibble 4, variant 8/9/a/b): POST /reports
 * validates clientId/projectId/taskId with Zod `.uuid()`, which rejects the
 * all-zero version nibble used in early fixtures.
 */
function id(n: number): string {
  return `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
}

const SEED_ID_PREFIX = '00000000-0000-4000-8000-';

const IDS = {
  admin: id(1),
  employee: id(2),
  bar: id(3),
  rotem: id(4),
  dan: id(5),
  gal: id(6),
  oz: id(7),
  nvidia: id(10),
  intel: id(11),
  amd: id(12),
  hp: id(13),
  amazon: id(14),
  projectCuda: id(20),
  projectOmniverse: id(21),
  projectMeteor: id(22),
  projectArc: id(23),
  projectRocm: id(24),
  projectRyzenAi: id(25),
  projectPrintCloud: id(26),
  projectElitebook: id(27),
  projectAlexa: id(28),
  projectAwsConsole: id(29),
  taskCudaKernels: id(30),
  taskCudaProfiler: id(31),
  taskOmniSync: id(32),
  taskOmniUsd: id(33),
  taskMeteorToolchain: id(34),
  taskMeteorDocs: id(35),
  taskArcDrivers: id(36),
  taskArcQa: id(37),
  taskRocmRuntime: id(38),
  taskRocmSamples: id(39),
  taskRyzenNpu: id(46),
  taskRyzenStudio: id(47),
  taskPrintQueue: id(48),
  taskPrintMobile: id(49),
  taskEliteBios: id(51),
  taskEliteHealth: id(52),
  taskAlexaSkills: id(53),
  taskAlexaVoice: id(54),
  taskAwsIam: id(55),
  taskAwsBilling: id(56),
  absenceVacationSingleDay: id(40),
  absenceVacationLater: id(41),
  absenceHalfDay: id(42),
  absenceSickWithDoc: id(43),
  absenceSickNoDoc: id(44),
  absenceReserveDuty: id(45),
  absenceGalSick: id(77),
  absenceGalVacation: id(78),
  attachmentSickNote: id(50),
} as const;

/** Pre-v4 fixed ids rejected by POST /reports Zod `.uuid()` — remove before upserting IDS. */
const LEGACY_ID_PREFIX = '00000000-0000-0000-0000-';

const USERS: Array<{
  id: string;
  email: string;
  displayName: string;
  role: Role;
  isActive: boolean;
  mustChangePassword: boolean;
}> = [
  { id: IDS.admin, email: 'admin@abra.test', displayName: 'אדון מנהל', role: 'ADMIN', isActive: true, mustChangePassword: false },
  { id: IDS.employee, email: 'employee@abra.test', displayName: 'אדון עובד', role: 'EMPLOYEE', isActive: true, mustChangePassword: false },
  { id: IDS.bar, email: 'bar@abra.test', displayName: 'בר איזביזקי', role: 'EMPLOYEE', isActive: true, mustChangePassword: false },
  { id: IDS.rotem, email: 'rotem@abra.test', displayName: 'רותם מוסטקי', role: 'EMPLOYEE', isActive: true, mustChangePassword: false },
  { id: IDS.dan, email: 'dan@abra.test', displayName: 'דן גוטמן', role: 'EMPLOYEE', isActive: true, mustChangePassword: false },
  { id: IDS.gal, email: 'gal@abra.test', displayName: 'גל ישראלי', role: 'ADMIN', isActive: true, mustChangePassword: false },
  { id: IDS.oz, email: 'oz@abra.test', displayName: 'עוז קיסר', role: 'ADMIN', isActive: true, mustChangePassword: false },
];

const ALL_USER_IDS = USERS.map((user) => user.id);
const SEED_EMAILS = USERS.map((user) => user.email);

const RETIRED_SEED_EMAILS = [
  'noa@abra.test',
  'yoav@abra.test',
  'ariel@abra.test',
  'shiri@abra.test',
  'raz@abra.test',
  'mark@abra.test',
  'gabriel@abra.test',
  'li@abra.test',
  'noga@abra.test',
  'dana@abra.test',
  'newhire@abra.test',
];

const CLIENTS: Array<{ id: string; name: string; isActive: boolean; contactDetails?: string }> = [
  { id: IDS.nvidia, name: 'NVIDIA', isActive: true, contactDetails: 'israel@nvidia.test' },
  { id: IDS.intel, name: 'Intel', isActive: true, contactDetails: 'haifa@intel.test' },
  { id: IDS.amd, name: 'AMD', isActive: true },
  { id: IDS.hp, name: 'HP', isActive: true },
  { id: IDS.amazon, name: 'Amazon', isActive: true },
];

const PROJECTS: Array<{
  id: string;
  name: string;
  clientId: string;
  isActive: boolean;
  reportFormat: ReportFormat;
  managerId: string;
  startDate: string;
  endDate: string;
  description: string;
}> = [
  {
    id: IDS.projectCuda,
    name: 'CUDA Runtime',
    clientId: IDS.nvidia,
    isActive: true,
    reportFormat: 'CLOCK_IN_OUT',
    managerId: IDS.admin,
    startDate: '2026-01-01',
    endDate: '2027-12-31',
    description: '',
  },
  {
    id: IDS.projectOmniverse,
    name: 'Omniverse Hub',
    clientId: IDS.nvidia,
    isActive: true,
    reportFormat: 'SUM_HOURS',
    managerId: IDS.admin,
    startDate: '2026-01-01',
    endDate: '2027-12-31',
    description: '',
  },
  {
    id: IDS.projectMeteor,
    name: 'Meteor Lake Tools',
    clientId: IDS.intel,
    isActive: true,
    reportFormat: 'CLOCK_IN_OUT',
    managerId: IDS.admin,
    startDate: '2026-01-01',
    endDate: '2027-12-31',
    description: '',
  },
  {
    id: IDS.projectArc,
    name: 'Arc Drivers',
    clientId: IDS.intel,
    isActive: true,
    reportFormat: 'SUM_HOURS',
    managerId: IDS.admin,
    startDate: '2026-01-01',
    endDate: '2027-12-31',
    description: '',
  },
  {
    id: IDS.projectRocm,
    name: 'ROCm Platform',
    clientId: IDS.amd,
    isActive: true,
    reportFormat: 'CLOCK_IN_OUT',
    managerId: IDS.admin,
    startDate: '2026-01-01',
    endDate: '2027-12-31',
    description: '',
  },
  {
    id: IDS.projectRyzenAi,
    name: 'Ryzen AI',
    clientId: IDS.amd,
    isActive: true,
    reportFormat: 'SUM_HOURS',
    managerId: IDS.admin,
    startDate: '2026-01-01',
    endDate: '2027-12-31',
    description: '',
  },
  {
    id: IDS.projectPrintCloud,
    name: 'Print Cloud',
    clientId: IDS.hp,
    isActive: true,
    reportFormat: 'CLOCK_IN_OUT',
    managerId: IDS.admin,
    startDate: '2026-01-01',
    endDate: '2027-12-31',
    description: '',
  },
  {
    id: IDS.projectElitebook,
    name: 'EliteBook Firmware',
    clientId: IDS.hp,
    isActive: true,
    reportFormat: 'CLOCK_IN_OUT',
    managerId: IDS.admin,
    startDate: '2026-01-01',
    endDate: '2027-12-31',
    description: '',
  },
  {
    id: IDS.projectAlexa,
    name: 'Alexa Skills',
    clientId: IDS.amazon,
    isActive: true,
    reportFormat: 'SUM_HOURS',
    managerId: IDS.admin,
    startDate: '2026-01-01',
    endDate: '2027-12-31',
    description: '',
  },
  {
    id: IDS.projectAwsConsole,
    name: 'AWS Console IL',
    clientId: IDS.amazon,
    isActive: true,
    reportFormat: 'CLOCK_IN_OUT',
    managerId: IDS.admin,
    startDate: '2026-01-01',
    endDate: '2027-12-31',
    description: '',
  },
];

const TASKS: Array<{ id: string; name: string; projectId: string; status: TaskStatus; isActive: boolean }> = [
  { id: IDS.taskCudaKernels, name: 'Kernel port', projectId: IDS.projectCuda, status: 'OPEN', isActive: true },
  { id: IDS.taskCudaProfiler, name: 'Profiler UI', projectId: IDS.projectCuda, status: 'OPEN', isActive: true },
  { id: IDS.taskOmniSync, name: 'Scene sync', projectId: IDS.projectOmniverse, status: 'OPEN', isActive: true },
  { id: IDS.taskOmniUsd, name: 'USD import', projectId: IDS.projectOmniverse, status: 'OPEN', isActive: true },
  { id: IDS.taskMeteorToolchain, name: 'Compiler flags', projectId: IDS.projectMeteor, status: 'OPEN', isActive: true },
  { id: IDS.taskMeteorDocs, name: 'Release notes', projectId: IDS.projectMeteor, status: 'OPEN', isActive: true },
  { id: IDS.taskArcDrivers, name: 'DX12 path', projectId: IDS.projectArc, status: 'OPEN', isActive: true },
  { id: IDS.taskArcQa, name: 'Game QA', projectId: IDS.projectArc, status: 'OPEN', isActive: true },
  { id: IDS.taskRocmRuntime, name: 'HIP runtime', projectId: IDS.projectRocm, status: 'OPEN', isActive: true },
  { id: IDS.taskRocmSamples, name: 'Sample apps', projectId: IDS.projectRocm, status: 'OPEN', isActive: true },
  { id: IDS.taskRyzenNpu, name: 'NPU kernels', projectId: IDS.projectRyzenAi, status: 'OPEN', isActive: true },
  { id: IDS.taskRyzenStudio, name: 'Studio plugin', projectId: IDS.projectRyzenAi, status: 'OPEN', isActive: true },
  { id: IDS.taskPrintQueue, name: 'Queue service', projectId: IDS.projectPrintCloud, status: 'OPEN', isActive: true },
  { id: IDS.taskPrintMobile, name: 'Mobile app', projectId: IDS.projectPrintCloud, status: 'OPEN', isActive: true },
  { id: IDS.taskEliteBios, name: 'BIOS update', projectId: IDS.projectElitebook, status: 'OPEN', isActive: true },
  { id: IDS.taskEliteHealth, name: 'Health sensors', projectId: IDS.projectElitebook, status: 'OPEN', isActive: true },
  { id: IDS.taskAlexaSkills, name: 'Skill catalog', projectId: IDS.projectAlexa, status: 'OPEN', isActive: true },
  { id: IDS.taskAlexaVoice, name: 'Hebrew TTS', projectId: IDS.projectAlexa, status: 'OPEN', isActive: true },
  { id: IDS.taskAwsIam, name: 'IAM policies', projectId: IDS.projectAwsConsole, status: 'OPEN', isActive: true },
  { id: IDS.taskAwsBilling, name: 'Billing widgets', projectId: IDS.projectAwsConsole, status: 'OPEN', isActive: true },
];

const ALL_TASK_IDS = TASKS.map((task) => task.id);
const ALL_PROJECT_IDS = PROJECTS.map((project) => project.id);
const ALL_CLIENT_IDS = CLIENTS.map((client) => client.id);

const ASSIGNMENTS: Array<{ taskId: string; userIds: string[] }> = [
  { taskId: IDS.taskCudaKernels, userIds: [IDS.employee, IDS.bar, IDS.dan, IDS.gal] },
  { taskId: IDS.taskCudaProfiler, userIds: [IDS.rotem, IDS.oz] },
  { taskId: IDS.taskOmniSync, userIds: [IDS.bar, IDS.rotem, IDS.dan] },
  { taskId: IDS.taskOmniUsd, userIds: [IDS.gal] },
  { taskId: IDS.taskMeteorToolchain, userIds: [IDS.employee, IDS.dan, IDS.oz] },
  { taskId: IDS.taskMeteorDocs, userIds: [IDS.rotem] },
  { taskId: IDS.taskArcDrivers, userIds: [IDS.bar, IDS.gal, IDS.oz, IDS.admin] },
  { taskId: IDS.taskArcQa, userIds: [IDS.employee, IDS.rotem] },
  { taskId: IDS.taskRocmRuntime, userIds: [IDS.dan, IDS.bar, IDS.employee] },
  { taskId: IDS.taskRocmSamples, userIds: [IDS.rotem, IDS.gal] },
  { taskId: IDS.taskRyzenNpu, userIds: [IDS.oz, IDS.dan] },
  { taskId: IDS.taskRyzenStudio, userIds: [IDS.bar] },
  { taskId: IDS.taskPrintQueue, userIds: [IDS.employee, IDS.rotem, IDS.gal] },
  { taskId: IDS.taskPrintMobile, userIds: [IDS.bar, IDS.dan] },
  { taskId: IDS.taskEliteBios, userIds: [IDS.oz, IDS.admin] },
  { taskId: IDS.taskEliteHealth, userIds: [IDS.rotem, IDS.employee] },
  { taskId: IDS.taskAlexaSkills, userIds: [IDS.gal, IDS.dan, IDS.bar, IDS.rotem, IDS.oz] },
  { taskId: IDS.taskAlexaVoice, userIds: [IDS.employee] },
  { taskId: IDS.taskAwsIam, userIds: [IDS.gal, IDS.oz, IDS.admin] },
  { taskId: IDS.taskAwsBilling, userIds: [IDS.dan, IDS.bar] },
];

function utcDate(isoDate: string): Date {
  return new Date(`${isoDate}T00:00:00.000Z`);
}

function utcTime(hhmm: string): Date {
  const [hours, minutes] = hhmm.split(':').map(Number);
  return new Date(Date.UTC(1970, 0, 1, hours, minutes, 0, 0));
}

function reportId(n: number): string {
  return `00000000-0000-4000-8000-${String(100000000060 + n).slice(-12)}`;
}

function sqlList(ids: string[]): string {
  return ids.map((value) => `'${value}'`).join(', ');
}

async function removeUserAndDependents(userId: string): Promise<void> {
  await prisma.timeReport.deleteMany({ where: { userId } });
  await prisma.attachment.deleteMany({ where: { uploaderId: userId } });
  await prisma.$executeRawUnsafe(`DELETE FROM "absences" WHERE "userId" = '${userId}'`);
  await prisma.taskAssignment.deleteMany({ where: { userId } });
  await prisma.loginAttempt.updateMany({ where: { userId }, data: { userId: null } });
  await prisma.$executeRawUnsafe(`DELETE FROM "users" WHERE id = '${userId}'`);
}

/** Old seed rows used random ids — drop by email so fixed IDS can be recreated. */
async function removeConflictingSeedUsers(): Promise<void> {
  const targetIds = new Set<string>(ALL_USER_IDS);

  for (const email of [...SEED_EMAILS, ...RETIRED_SEED_EMAILS]) {
    const user = await prisma.$queryRaw<{ id: string }[]>`SELECT id FROM "users" WHERE email = ${email}`;
    const existing = user[0];
    if (!existing || targetIds.has(existing.id)) continue;
    await removeUserAndDependents(existing.id);
  }
}

async function removeLegacySeedRows(): Promise<void> {
  const legacyPattern = `${LEGACY_ID_PREFIX}%`;

  await prisma.$executeRaw`
    DELETE FROM "time_reports"
    WHERE "userId" LIKE ${legacyPattern}
       OR "clientId" LIKE ${legacyPattern}
       OR "projectId" LIKE ${legacyPattern}
       OR "taskId" LIKE ${legacyPattern}
  `;
  await prisma.$executeRaw`
    DELETE FROM "attachments"
    WHERE id LIKE ${legacyPattern} OR "uploaderId" LIKE ${legacyPattern}
  `;
  await prisma.$executeRaw`
    DELETE FROM "absences"
    WHERE id LIKE ${legacyPattern} OR "userId" LIKE ${legacyPattern}
  `;
  await prisma.$executeRaw`DELETE FROM "task_assignments" WHERE "userId" LIKE ${legacyPattern} OR "taskId" LIKE ${legacyPattern}`;
  await prisma.$executeRaw`DELETE FROM "tasks" WHERE id LIKE ${legacyPattern}`;
  await prisma.$executeRaw`DELETE FROM "projects" WHERE id LIKE ${legacyPattern}`;
  await prisma.$executeRaw`DELETE FROM "clients" WHERE id LIKE ${legacyPattern}`;
  await prisma.$executeRaw`DELETE FROM "users" WHERE id LIKE ${legacyPattern}`;
}

/** Drop hours/absences/files so a re-seed always matches this file. */
async function wipeDemoTransactionalData(): Promise<void> {
  await prisma.timeReport.deleteMany({
    where: { userId: { in: ALL_USER_IDS } },
  });
  await prisma.attachment.deleteMany({
    where: { uploaderId: { in: ALL_USER_IDS } },
  });
  await prisma.$executeRawUnsafe(`DELETE FROM "absences" WHERE "userId" IN (${sqlList(ALL_USER_IDS)})`);
  await prisma.taskAssignment.deleteMany({
    where: {
      OR: [{ userId: { in: ALL_USER_IDS } }, { taskId: { in: ALL_TASK_IDS } }],
    },
  });
}

/** Previous demo catalog (EL-AL, extra people, …) used the same id prefix — drop leftovers. */
async function removeObsoleteSeedCatalog(): Promise<void> {
  const like = `${SEED_ID_PREFIX}%`;
  await prisma.$executeRawUnsafe(
    `DELETE FROM "time_reports" WHERE "taskId" LIKE '${like}' AND "taskId" NOT IN (${sqlList(ALL_TASK_IDS)})`,
  );
  await prisma.$executeRawUnsafe(
    `DELETE FROM "task_assignments" WHERE "taskId" LIKE '${like}' AND "taskId" NOT IN (${sqlList(ALL_TASK_IDS)})`,
  );
  await prisma.$executeRawUnsafe(`DELETE FROM "tasks" WHERE id LIKE '${like}' AND id NOT IN (${sqlList(ALL_TASK_IDS)})`);
  await prisma.$executeRawUnsafe(
    `DELETE FROM "time_reports" WHERE "projectId" LIKE '${like}' AND "projectId" NOT IN (${sqlList(ALL_PROJECT_IDS)})`,
  );
  await prisma.$executeRawUnsafe(`DELETE FROM "projects" WHERE id LIKE '${like}' AND id NOT IN (${sqlList(ALL_PROJECT_IDS)})`);
  await prisma.$executeRawUnsafe(
    `DELETE FROM "time_reports" WHERE "clientId" LIKE '${like}' AND "clientId" NOT IN (${sqlList(ALL_CLIENT_IDS)})`,
  );
  await prisma.$executeRawUnsafe(`DELETE FROM "clients" WHERE id LIKE '${like}' AND id NOT IN (${sqlList(ALL_CLIENT_IDS)})`);
  const leftoverUsers = await prisma.$queryRawUnsafe<{ id: string }[]>(
    `SELECT id FROM "users" WHERE id LIKE '${like}' AND id NOT IN (${sqlList(ALL_USER_IDS)})`,
  );
  for (const row of leftoverUsers) {
    await removeUserAndDependents(row.id);
  }
}

async function main() {
  await removeLegacySeedRows();
  await removeConflictingSeedUsers();
  await wipeDemoTransactionalData();
  await removeObsoleteSeedCatalog();

  const passwordHash = await bcrypt.hash('password123', 10);

  for (const user of USERS) {
    await prisma.user.upsert({
      where: { id: user.id },
      update: {
        email: user.email,
        passwordHash,
        displayName: user.displayName,
        role: user.role,
        isActive: user.isActive,
        mustChangePassword: user.mustChangePassword,
      },
      create: {
        id: user.id,
        email: user.email,
        passwordHash,
        displayName: user.displayName,
        role: user.role,
        isActive: user.isActive,
        mustChangePassword: user.mustChangePassword,
      },
    });
  }

  for (const client of CLIENTS) {
    await prisma.client.upsert({
      where: { id: client.id },
      update: { name: client.name, isActive: client.isActive, contactDetails: client.contactDetails ?? null },
      create: {
        id: client.id,
        name: client.name,
        isActive: client.isActive,
        ...(client.contactDetails !== undefined ? { contactDetails: client.contactDetails } : {}),
      },
    });
  }

  for (const project of PROJECTS) {
    await prisma.project.upsert({
      where: { id: project.id },
      update: {
        name: project.name,
        isActive: project.isActive,
        clientId: project.clientId,
        reportFormat: project.reportFormat,
        managerId: project.managerId,
        startDate: new Date(`${project.startDate}T00:00:00.000Z`),
        endDate: new Date(`${project.endDate}T00:00:00.000Z`),
        description: project.description,
      },
      create: {
        id: project.id,
        name: project.name,
        clientId: project.clientId,
        isActive: project.isActive,
        reportFormat: project.reportFormat,
        managerId: project.managerId,
        startDate: new Date(`${project.startDate}T00:00:00.000Z`),
        endDate: new Date(`${project.endDate}T00:00:00.000Z`),
        description: project.description,
      },
    });
  }

  for (const task of TASKS) {
    await prisma.task.upsert({
      where: { id: task.id },
      update: { name: task.name, projectId: task.projectId, status: task.status, isActive: task.isActive },
      create: {
        id: task.id,
        name: task.name,
        projectId: task.projectId,
        status: task.status,
        isActive: task.isActive,
      },
    });
  }

  for (const assignment of ASSIGNMENTS) {
    for (const userId of assignment.userIds) {
      await prisma.taskAssignment.upsert({
        where: { userId_taskId: { userId, taskId: assignment.taskId } },
        update: {},
        create: { userId, taskId: assignment.taskId },
      });
    }
  }

  const ABSENCES: Array<{
    id: string;
    userId: string;
    type: AbsenceType;
    startDate: string;
    endDate: string;
    halfDay?: boolean;
  }> = [
    { id: IDS.absenceSickWithDoc, userId: IDS.employee, type: 'SICK', startDate: '2026-08-05', endDate: '2026-08-05' },
    { id: IDS.absenceSickNoDoc, userId: IDS.employee, type: 'SICK', startDate: '2026-08-06', endDate: '2026-08-06' },
    { id: IDS.absenceVacationSingleDay, userId: IDS.employee, type: 'VACATION', startDate: '2026-08-10', endDate: '2026-08-10' },
    { id: IDS.absenceReserveDuty, userId: IDS.employee, type: 'RESERVE_DUTY', startDate: '2026-08-13', endDate: '2026-08-13' },
    { id: IDS.absenceVacationLater, userId: IDS.employee, type: 'VACATION', startDate: '2026-08-24', endDate: '2026-08-26' },
    { id: IDS.absenceHalfDay, userId: IDS.employee, type: 'OTHER', startDate: '2026-08-20', endDate: '2026-08-20', halfDay: true },
    { id: IDS.absenceGalSick, userId: IDS.gal, type: 'SICK', startDate: '2026-08-05', endDate: '2026-08-05' },
    { id: IDS.absenceGalVacation, userId: IDS.gal, type: 'VACATION', startDate: '2026-08-10', endDate: '2026-08-10' },
  ];

  for (const absence of ABSENCES) {
    await prisma.absence.create({
      data: {
        id: absence.id,
        userId: absence.userId,
        type: absence.type,
        startDate: utcDate(absence.startDate),
        endDate: utcDate(absence.endDate),
        ...(absence.halfDay !== undefined ? { halfDay: absence.halfDay } : {}),
      },
    });
  }

  await prisma.attachment.create({
    data: {
      id: IDS.attachmentSickNote,
      filename: 'אישור-מחלה.pdf',
      mimeType: 'application/pdf',
      sizeBytes: 102_400,
      storageKey: 'seed/attachments/sick-note-employee.pdf',
      uploaderId: IDS.employee,
      absenceId: IDS.absenceSickWithDoc,
    },
  });

  type ReportSeed = {
    userId: string;
    date: string;
    clientId: string;
    projectId: string;
    taskId: string;
    workLocation: WorkLocation;
    startTime: string;
    endTime: string;
    hours: number;
    description: string;
  };

  const REPORTS: ReportSeed[] = [
    {
      userId: IDS.employee,
      date: '2026-08-02',
      clientId: IDS.nvidia,
      projectId: IDS.projectCuda,
      taskId: IDS.taskCudaKernels,
      workLocation: 'OFFICE',
      startTime: '09:00',
      endTime: '18:00',
      hours: 9,
      description: 'Port kernels to CUDA 12',
    },
    {
      userId: IDS.employee,
      date: '2026-08-03',
      clientId: IDS.intel,
      projectId: IDS.projectMeteor,
      taskId: IDS.taskMeteorToolchain,
      workLocation: 'CLIENT',
      startTime: '09:00',
      endTime: '18:00',
      hours: 9,
      description: 'Compiler flag sweep',
    },
    {
      userId: IDS.employee,
      date: '2026-08-04',
      clientId: IDS.nvidia,
      projectId: IDS.projectCuda,
      taskId: IDS.taskCudaKernels,
      workLocation: 'HOME',
      startTime: '09:00',
      endTime: '18:00',
      hours: 5,
      description: 'Kernel occupancy notes',
    },
    {
      userId: IDS.employee,
      date: '2026-08-04',
      clientId: IDS.intel,
      projectId: IDS.projectArc,
      taskId: IDS.taskArcQa,
      workLocation: 'HOME',
      startTime: '09:00',
      endTime: '18:00',
      hours: 4,
      description: 'Arc game QA pass',
    },
    {
      userId: IDS.employee,
      date: '2026-08-09',
      clientId: IDS.amd,
      projectId: IDS.projectRocm,
      taskId: IDS.taskRocmRuntime,
      workLocation: 'OFFICE',
      startTime: '09:00',
      endTime: '18:00',
      hours: 9,
      description: 'HIP runtime fixes',
    },
    {
      userId: IDS.employee,
      date: '2026-08-11',
      clientId: IDS.hp,
      projectId: IDS.projectPrintCloud,
      taskId: IDS.taskPrintQueue,
      workLocation: 'OFFICE',
      startTime: '09:00',
      endTime: '18:00',
      hours: 4,
      description: 'Print queue review',
    },
    {
      userId: IDS.employee,
      date: '2026-08-12',
      clientId: IDS.amazon,
      projectId: IDS.projectAlexa,
      taskId: IDS.taskAlexaVoice,
      workLocation: 'CLIENT',
      startTime: '09:00',
      endTime: '18:00',
      hours: 9,
      description: 'Hebrew TTS samples',
    },
    {
      userId: IDS.employee,
      date: '2026-08-16',
      clientId: IDS.nvidia,
      projectId: IDS.projectCuda,
      taskId: IDS.taskCudaKernels,
      workLocation: 'HOME',
      startTime: '08:30',
      endTime: '18:00',
      hours: 9.5,
      description: 'Kernel merge',
    },
    {
      userId: IDS.employee,
      date: '2026-08-17',
      clientId: IDS.hp,
      projectId: IDS.projectElitebook,
      taskId: IDS.taskEliteHealth,
      workLocation: 'OFFICE',
      startTime: '09:00',
      endTime: '18:00',
      hours: 5,
      description: 'Health sensor dashboard',
    },
    {
      userId: IDS.employee,
      date: '2026-08-17',
      clientId: IDS.intel,
      projectId: IDS.projectArc,
      taskId: IDS.taskArcQa,
      workLocation: 'OFFICE',
      startTime: '09:00',
      endTime: '18:00',
      hours: 4,
      description: 'Regression pack',
    },
    {
      userId: IDS.admin,
      date: '2026-08-03',
      clientId: IDS.amazon,
      projectId: IDS.projectAwsConsole,
      taskId: IDS.taskAwsIam,
      workLocation: 'OFFICE',
      startTime: '09:00',
      endTime: '18:00',
      hours: 9,
      description: 'IAM policy review',
    },
    {
      userId: IDS.gal,
      date: '2026-08-02',
      clientId: IDS.nvidia,
      projectId: IDS.projectCuda,
      taskId: IDS.taskCudaKernels,
      workLocation: 'OFFICE',
      startTime: '09:00',
      endTime: '18:00',
      hours: 9,
      description: 'סקירת פורט קרנלים',
    },
    {
      userId: IDS.gal,
      date: '2026-08-03',
      clientId: IDS.intel,
      projectId: IDS.projectArc,
      taskId: IDS.taskArcDrivers,
      workLocation: 'CLIENT',
      startTime: '09:00',
      endTime: '18:00',
      hours: 9,
      description: 'יום אצל אינטל — נתיב DX12',
    },
    {
      userId: IDS.gal,
      date: '2026-08-04',
      clientId: IDS.nvidia,
      projectId: IDS.projectCuda,
      taskId: IDS.taskCudaKernels,
      workLocation: 'HOME',
      startTime: '09:00',
      endTime: '18:00',
      hours: 5,
      description: 'הערות occupancy',
    },
    {
      userId: IDS.gal,
      date: '2026-08-04',
      clientId: IDS.amazon,
      projectId: IDS.projectAlexa,
      taskId: IDS.taskAlexaSkills,
      workLocation: 'HOME',
      startTime: '09:00',
      endTime: '18:00',
      hours: 4,
      description: 'קטלוג Skills',
    },
    {
      userId: IDS.gal,
      date: '2026-08-06',
      clientId: IDS.amd,
      projectId: IDS.projectRocm,
      taskId: IDS.taskRocmSamples,
      workLocation: 'OFFICE',
      startTime: '09:00',
      endTime: '18:00',
      hours: 9,
      description: 'דוגמאות ROCm',
    },
    {
      userId: IDS.gal,
      date: '2026-08-09',
      clientId: IDS.nvidia,
      projectId: IDS.projectCuda,
      taskId: IDS.taskCudaKernels,
      workLocation: 'HOME',
      startTime: '09:00',
      endTime: '18:00',
      hours: 9,
      description: 'סקירת קוד CUDA',
    },
    {
      userId: IDS.gal,
      date: '2026-08-11',
      clientId: IDS.hp,
      projectId: IDS.projectPrintCloud,
      taskId: IDS.taskPrintQueue,
      workLocation: 'OFFICE',
      startTime: '09:00',
      endTime: '18:00',
      hours: 9,
      description: 'שירות תור הדפסה',
    },
    {
      userId: IDS.gal,
      date: '2026-08-12',
      clientId: IDS.amazon,
      projectId: IDS.projectAwsConsole,
      taskId: IDS.taskAwsIam,
      workLocation: 'CLIENT',
      startTime: '09:00',
      endTime: '18:00',
      hours: 6,
      description: 'מדיניות IAM',
    },
    {
      userId: IDS.gal,
      date: '2026-08-12',
      clientId: IDS.amazon,
      projectId: IDS.projectAlexa,
      taskId: IDS.taskAlexaSkills,
      workLocation: 'CLIENT',
      startTime: '09:00',
      endTime: '18:00',
      hours: 3,
      description: 'תיקוני Skill',
    },
    {
      userId: IDS.gal,
      date: '2026-08-13',
      clientId: IDS.nvidia,
      projectId: IDS.projectOmniverse,
      taskId: IDS.taskOmniUsd,
      workLocation: 'HOME',
      startTime: '09:00',
      endTime: '18:00',
      hours: 9,
      description: 'ייבוא USD',
    },
    {
      userId: IDS.gal,
      date: '2026-08-16',
      clientId: IDS.nvidia,
      projectId: IDS.projectCuda,
      taskId: IDS.taskCudaKernels,
      workLocation: 'OFFICE',
      startTime: '08:30',
      endTime: '18:00',
      hours: 9.5,
      description: 'מיזוג קרנלים',
    },
    {
      userId: IDS.gal,
      date: '2026-08-17',
      clientId: IDS.intel,
      projectId: IDS.projectArc,
      taskId: IDS.taskArcDrivers,
      workLocation: 'OFFICE',
      startTime: '09:00',
      endTime: '18:00',
      hours: 5,
      description: 'תיקוני דרייבר',
    },
    {
      userId: IDS.gal,
      date: '2026-08-17',
      clientId: IDS.hp,
      projectId: IDS.projectPrintCloud,
      taskId: IDS.taskPrintQueue,
      workLocation: 'OFFICE',
      startTime: '09:00',
      endTime: '18:00',
      hours: 4,
      description: 'באגים בתור הדפסה',
    },
    {
      userId: IDS.oz,
      date: '2026-08-16',
      clientId: IDS.intel,
      projectId: IDS.projectArc,
      taskId: IDS.taskArcDrivers,
      workLocation: 'CLIENT',
      startTime: '09:00',
      endTime: '18:00',
      hours: 9,
      description: 'DX12 path with Intel',
    },
    {
      userId: IDS.bar,
      date: '2026-08-16',
      clientId: IDS.amd,
      projectId: IDS.projectRyzenAi,
      taskId: IDS.taskRyzenStudio,
      workLocation: 'HOME',
      startTime: '09:00',
      endTime: '18:00',
      hours: 8,
      description: 'Studio plugin prototype',
    },
    {
      userId: IDS.dan,
      date: '2026-08-17',
      clientId: IDS.amazon,
      projectId: IDS.projectAwsConsole,
      taskId: IDS.taskAwsBilling,
      workLocation: 'OFFICE',
      startTime: '09:00',
      endTime: '18:00',
      hours: 7,
      description: 'Billing widget layout',
    },
  ];

  await prisma.timeReport.createMany({
    data: REPORTS.map((report, index) => ({
      id: reportId(index),
      userId: report.userId,
      clientId: report.clientId,
      projectId: report.projectId,
      taskId: report.taskId,
      date: utcDate(report.date),
      workLocation: report.workLocation,
      startTime: utcTime(report.startTime),
      endTime: utcTime(report.endTime),
      hours: report.hours,
      description: report.description,
    })),
  });
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error: unknown) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
