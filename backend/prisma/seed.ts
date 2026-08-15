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
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error: unknown) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
