import { afterEach, describe, expect, it } from 'vitest';
import { createAbsence, createTimeReport, createUser } from '../../test/factories.js';
import { resetDatabase } from '../../test/resetDatabase.js';
import { checkAbsenceConflicts } from '../absenceConflict.service.js';

function day(iso: string): Date {
  return new Date(iso);
}

function time(hhmm: string): Date {
  return new Date(`1970-01-01T${hhmm}:00.000Z`);
}

describe('checkAbsenceConflicts', () => {
  afterEach(async () => {
    await resetDatabase();
  });

  describe('overlap with an existing absence', () => {
    it('rejects a partial-range overlap, not just an identical range', async () => {
      const user = await createUser();
      await createAbsence({ userId: user.id, startDate: day('2026-08-10'), endDate: day('2026-08-14') });

      const result = await checkAbsenceConflicts({
        userId: user.id,
        startDate: day('2026-08-12'),
        endDate: day('2026-08-16'),
        halfDay: false,
      });

      expect(result.hasConflict).toBe(true);
      expect(result.conflicts).toEqual([
        { date: '2026-08-12', reason: 'OVERLAPPING_ABSENCE' },
        { date: '2026-08-13', reason: 'OVERLAPPING_ABSENCE' },
        { date: '2026-08-14', reason: 'OVERLAPPING_ABSENCE' },
      ]);
    });

    it('does not reject an adjacent, non-overlapping range', async () => {
      const user = await createUser();
      await createAbsence({ userId: user.id, startDate: day('2026-08-10'), endDate: day('2026-08-14') });

      const result = await checkAbsenceConflicts({
        userId: user.id,
        startDate: day('2026-08-15'),
        endDate: day('2026-08-16'),
        halfDay: false,
      });

      expect(result).toEqual({ hasConflict: false, conflicts: [] });
    });

    it('does not reject an overlap belonging to a different user', async () => {
      const owner = await createUser();
      const otherUser = await createUser();
      await createAbsence({ userId: owner.id, startDate: day('2026-08-10'), endDate: day('2026-08-14') });

      const result = await checkAbsenceConflicts({
        userId: otherUser.id,
        startDate: day('2026-08-10'),
        endDate: day('2026-08-14'),
        halfDay: false,
      });

      expect(result).toEqual({ hasConflict: false, conflicts: [] });
    });

    it('does not count a cancelled absence toward overlap', async () => {
      const user = await createUser();
      await createAbsence({
        userId: user.id,
        startDate: day('2026-08-10'),
        endDate: day('2026-08-14'),
        isActive: false,
      });

      const result = await checkAbsenceConflicts({
        userId: user.id,
        startDate: day('2026-08-10'),
        endDate: day('2026-08-14'),
        halfDay: false,
      });

      expect(result).toEqual({ hasConflict: false, conflicts: [] });
    });
  });

  describe('full-day absence against reported work hours', () => {
    it('rejects a date already fully reported (9 hours)', async () => {
      const user = await createUser();
      await createTimeReport({ userId: user.id, date: day('2026-08-20'), startTime: time('09:00'), endTime: time('18:00') });

      const result = await checkAbsenceConflicts({
        userId: user.id,
        startDate: day('2026-08-20'),
        endDate: day('2026-08-20'),
        halfDay: false,
      });

      expect(result).toEqual({ hasConflict: true, conflicts: [{ date: '2026-08-20', reason: 'WORK_HOURS_CONFLICT' }] });
    });

    it('rejects a date with partial (not full) reported hours', async () => {
      const user = await createUser();
      await createTimeReport({ userId: user.id, date: day('2026-08-20'), startTime: time('09:00'), endTime: time('12:00') });

      const result = await checkAbsenceConflicts({
        userId: user.id,
        startDate: day('2026-08-20'),
        endDate: day('2026-08-20'),
        halfDay: false,
      });

      expect(result).toEqual({ hasConflict: true, conflicts: [{ date: '2026-08-20', reason: 'WORK_HOURS_CONFLICT' }] });
    });

    it('does not reject a date with no reported hours', async () => {
      const user = await createUser();

      const result = await checkAbsenceConflicts({
        userId: user.id,
        startDate: day('2026-08-20'),
        endDate: day('2026-08-20'),
        halfDay: false,
      });

      expect(result).toEqual({ hasConflict: false, conflicts: [] });
    });
  });

  describe('half-day absence against reported work hours', () => {
    it('accepts exactly half a day reported (the intended combination)', async () => {
      const user = await createUser();
      await createTimeReport({ userId: user.id, date: day('2026-08-20'), startTime: time('09:00'), endTime: time('13:30') });

      const result = await checkAbsenceConflicts({
        userId: user.id,
        startDate: day('2026-08-20'),
        endDate: day('2026-08-20'),
        halfDay: true,
      });

      expect(result).toEqual({ hasConflict: false, conflicts: [] });
    });

    it('does not reject a date with no reported hours', async () => {
      const user = await createUser();

      const result = await checkAbsenceConflicts({
        userId: user.id,
        startDate: day('2026-08-20'),
        endDate: day('2026-08-20'),
        halfDay: true,
      });

      expect(result).toEqual({ hasConflict: false, conflicts: [] });
    });

    it('rejects a date with more than half a day reported', async () => {
      const user = await createUser();
      await createTimeReport({ userId: user.id, date: day('2026-08-20'), startTime: time('09:00'), endTime: time('14:00') });

      const result = await checkAbsenceConflicts({
        userId: user.id,
        startDate: day('2026-08-20'),
        endDate: day('2026-08-20'),
        halfDay: true,
      });

      expect(result).toEqual({ hasConflict: true, conflicts: [{ date: '2026-08-20', reason: 'WORK_HOURS_CONFLICT' }] });
    });
  });

  describe('editing an existing absence', () => {
    it('does not conflict with its own prior record when dates are unchanged', async () => {
      const user = await createUser();
      const absence = await createAbsence({ userId: user.id, startDate: day('2026-08-10'), endDate: day('2026-08-14') });

      const result = await checkAbsenceConflicts({
        userId: user.id,
        startDate: day('2026-08-10'),
        endDate: day('2026-08-14'),
        halfDay: false,
        excludeAbsenceId: absence.id,
      });

      expect(result).toEqual({ hasConflict: false, conflicts: [] });
    });

    it('does conflict with itself when the exclusion is omitted (sanity check)', async () => {
      const user = await createUser();
      const absence = await createAbsence({ userId: user.id, startDate: day('2026-08-10'), endDate: day('2026-08-14') });

      const result = await checkAbsenceConflicts({
        userId: user.id,
        startDate: day('2026-08-10'),
        endDate: day('2026-08-14'),
        halfDay: false,
      });

      expect(result.hasConflict).toBe(true);
      void absence;
    });

    it('rejects an edit whose new range overlaps a different active absence', async () => {
      const user = await createUser();
      const other = await createAbsence({ userId: user.id, startDate: day('2026-08-01'), endDate: day('2026-08-05') });
      const beingEdited = await createAbsence({ userId: user.id, startDate: day('2026-08-10'), endDate: day('2026-08-14') });

      const result = await checkAbsenceConflicts({
        userId: user.id,
        startDate: day('2026-08-04'),
        endDate: day('2026-08-06'),
        halfDay: false,
        excludeAbsenceId: beingEdited.id,
      });

      expect(result).toEqual({ hasConflict: true, conflicts: [{ date: '2026-08-04', reason: 'OVERLAPPING_ABSENCE' }] });
      void other;
    });
  });

  describe('multi-date conflicts', () => {
    it('reports every conflicting date, each with its own reason', async () => {
      const user = await createUser();
      await createAbsence({ userId: user.id, startDate: day('2026-08-10'), endDate: day('2026-08-11') });
      await createTimeReport({ userId: user.id, date: day('2026-08-15'), startTime: time('09:00'), endTime: time('18:00') });

      const result = await checkAbsenceConflicts({
        userId: user.id,
        startDate: day('2026-08-10'),
        endDate: day('2026-08-16'),
        halfDay: false,
      });

      expect(result.hasConflict).toBe(true);
      expect(result.conflicts).toEqual([
        { date: '2026-08-10', reason: 'OVERLAPPING_ABSENCE' },
        { date: '2026-08-11', reason: 'OVERLAPPING_ABSENCE' },
        { date: '2026-08-15', reason: 'WORK_HOURS_CONFLICT' },
      ]);
    });
  });

  describe('input validation', () => {
    it('rejects an inverted range', async () => {
      const user = await createUser();

      await expect(
        checkAbsenceConflicts({
          userId: user.id,
          startDate: day('2026-08-20'),
          endDate: day('2026-08-10'),
          halfDay: false,
        }),
      ).rejects.toThrow('End date must not be before start date');
    });
  });
});
