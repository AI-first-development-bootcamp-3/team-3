import { afterEach, describe, expect, it } from 'vitest';
import { prisma } from '../config/prisma.js';
import { createClient, createProject, createTask } from './factories.js';
import { resetDatabase } from './resetDatabase.js';

describe('Client -> Project -> Task traversal', () => {
  afterEach(async () => {
    await resetDatabase();
  });

  it('resolves a client down to its tasks through real SQL joins', async () => {
    const client = await createClient({ name: 'Acme Corp' });
    const project = await createProject({ name: 'Website Rebuild', clientId: client.id });
    await createTask({ name: 'Design', projectId: project.id });
    await createTask({ name: 'Development', projectId: project.id });

    const found = await prisma.client.findUniqueOrThrow({
      where: { id: client.id },
      include: { projects: { include: { tasks: true } } },
    });

    expect(found.name).toBe('Acme Corp');
    expect(found.projects).toHaveLength(1);
    expect(found.projects[0]?.name).toBe('Website Rebuild');
    expect(found.projects[0]?.tasks.map((task) => task.name).sort()).toEqual(['Design', 'Development']);
  });

  it('resolves a task back up to its client through real SQL joins', async () => {
    const task = await createTask();

    const found = await prisma.task.findUniqueOrThrow({
      where: { id: task.id },
      include: { project: { include: { client: true } } },
    });

    expect(found.project.client.id).toBeTruthy();
  });

  it('does not carry data over from a previous test', async () => {
    const counts = {
      clients: await prisma.client.count(),
      projects: await prisma.project.count(),
      tasks: await prisma.task.count(),
    };

    expect(counts).toEqual({ clients: 0, projects: 0, tasks: 0 });
  });
});
