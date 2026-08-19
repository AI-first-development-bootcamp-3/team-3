import { afterEach, describe, expect, it } from 'vitest';
import { prisma } from '../../config/prisma.js';
import { AbsenceType, Role } from '../../generated/prisma/enums.js';
import { createAbsence, createTimeReport, createUser } from '../../test/factories.js';
import { resetDatabase } from '../../test/resetDatabase.js';
import { ensureHolidayAbsencesForMonth, syncIsraeliHolidays } from '../israeliHolidays.service.js';

describe('syncIsraeliHolidays', () => {
  afterEach(async () => {
    await resetDatabase();
  });

  it('upserts 2026 holidays twice without duplicating rows', async () => {
    const first = await syncIsraeliHolidays(2026);
    const second = await syncIsraeliHolidays(2026);

    expect(second).toEqual(first);
    expect(await prisma.israeliHoliday.count({ where: { year: 2026 } })).toBe(first.length);
    expect(first.some((row) => row.code === 'yom_haatzmaut' && row.date === '2026-04-22')).toBe(true);
  });
});

describe('ensureHolidayAbsencesForMonth', () => {
  afterEach(async () => {
    await resetDatabase();
  });

  it('creates חג rows for active users on Sunday–Thursday holidays and skips weekends', async () => {
    const active = await createUser({ role: Role.EMPLOYEE });
    const inactive = await createUser({ role: Role.EMPLOYEE, isActive: false });
    const admin = await createUser({ role: Role.ADMIN });

    await ensureHolidayAbsencesForMonth(2026, 4);

    const rows = await prisma.absence.findMany({
      where: { type: AbsenceType.HOLIDAY },
      orderBy: [{ userId: 'asc' }, { startDate: 'asc' }],
    });
    const datesFor = (userId: string) =>
      rows.filter((row) => row.userId === userId).map((row) => row.startDate.toISOString().slice(0, 10));

    expect(datesFor(active.id)).toEqual(['2026-04-02', '2026-04-08', '2026-04-22']);
    expect(datesFor(admin.id)).toEqual(['2026-04-02', '2026-04-08', '2026-04-22']);
    expect(datesFor(inactive.id)).toEqual([]);
  });

  it('does not create rows in a locked month', async () => {
    const employee = await createUser();
    await prisma.monthLock.create({ data: { year: 2026, month: 4, lockedById: employee.id } });

    await ensureHolidayAbsencesForMonth(2026, 4);

    expect(await prisma.absence.count({ where: { type: AbsenceType.HOLIDAY } })).toBe(0);
  });

  it('skips Friday and Saturday holidays such as Rosh Hashanah 2026', async () => {
    await createUser();

    await ensureHolidayAbsencesForMonth(2026, 9);

    const dates = (
      await prisma.absence.findMany({
        where: { type: AbsenceType.HOLIDAY },
        orderBy: { startDate: 'asc' },
      })
    ).map((row) => row.startDate.toISOString().slice(0, 10));

    // RH day 2 is Sunday; Yom Kippur is Monday. Fri/Sat RH 1 and Sukkot stay off the list.
    expect(dates).toEqual(['2026-09-13', '2026-09-21']);
    expect(dates).not.toContain('2026-09-12');
    expect(dates).not.toContain('2026-09-26');
  });

  it('replaces hours already reported on the holiday date', async () => {
    const employee = await createUser();
    await createTimeReport({
      userId: employee.id,
      date: new Date('2026-04-02T00:00:00.000Z'),
    });

    await ensureHolidayAbsencesForMonth(2026, 4);

    expect(await prisma.timeReport.count({ where: { userId: employee.id } })).toBe(0);
    expect(
      await prisma.absence.count({
        where: {
          userId: employee.id,
          type: AbsenceType.HOLIDAY,
          startDate: new Date('2026-04-02T00:00:00.000Z'),
        },
      }),
    ).toBe(1);
  });

  it('splits overlapping vacation around the holiday date', async () => {
    const employee = await createUser();
    await createAbsence({
      userId: employee.id,
      type: AbsenceType.VACATION,
      startDate: new Date('2026-03-30T00:00:00.000Z'),
      endDate: new Date('2026-04-03T00:00:00.000Z'),
    });

    await ensureHolidayAbsencesForMonth(2026, 4);

    const vacations = await prisma.absence.findMany({
      where: { userId: employee.id, type: AbsenceType.VACATION },
      orderBy: { startDate: 'asc' },
    });
    expect(
      vacations.map((row) => [row.startDate.toISOString().slice(0, 10), row.endDate.toISOString().slice(0, 10)]),
    ).toEqual([
      ['2026-03-30', '2026-04-01'],
      ['2026-04-03', '2026-04-03'],
    ]);
  });
});
