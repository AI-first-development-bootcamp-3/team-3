import { afterAll, describe, expect, it } from 'vitest';
import { prisma } from './prisma.js';

// Exercises the soft-delete extension against a real database. Per-test
// isolation (truncation between runs) lands with the test-harness feature;
// for now each test cleans up the rows it creates.
describe('soft-delete extension', () => {
  const createdClientIds: string[] = [];

  afterAll(async () => {
    if (createdClientIds.length > 0) {
      await prisma.client.deleteMany({ where: { id: { in: createdClientIds } } });
    }
    await prisma.$disconnect();
  });

  async function createClient(name: string) {
    const client = await prisma.client.create({ data: { name } });
    createdClientIds.push(client.id);
    return client;
  }

  it('marks the row inactive instead of removing it on delete', async () => {
    const client = await createClient('Soft Delete Co');

    await prisma.client.delete({ where: { id: client.id } });

    const row = await prisma.client.findUnique({
      where: { id: client.id, isActive: undefined },
    });
    expect(row).not.toBeNull();
    expect(row?.isActive).toBe(false);
  });

  it('excludes deactivated records from default reads', async () => {
    const client = await createClient('Hidden By Default Co');
    await prisma.client.delete({ where: { id: client.id } });

    const found = await prisma.client.findUnique({ where: { id: client.id } });
    expect(found).toBeNull();

    const list = await prisma.client.findMany({ where: { id: client.id } });
    expect(list).toHaveLength(0);
  });

  it('returns deactivated records when a caller explicitly opts in', async () => {
    const client = await createClient('Opt In Co');
    await prisma.client.delete({ where: { id: client.id } });

    const found = await prisma.client.findUnique({
      where: { id: client.id, isActive: undefined },
    });
    expect(found).not.toBeNull();
    expect(found?.isActive).toBe(false);

    const list = await prisma.client.findMany({
      where: { id: client.id, isActive: undefined },
    });
    expect(list).toHaveLength(1);
  });
});
