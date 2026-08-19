import { describe, expect, it } from 'vitest';
import { listIsraeliHolidaysForYear } from '../israeliHolidays.calendar.js';

describe('listIsraeliHolidaysForYear', () => {
  it('maps 2026 Hebrew holidays to the civil dates Israel observes', () => {
    const byCode = Object.fromEntries(listIsraeliHolidaysForYear(2026).map((row) => [row.code, row]));

    expect(byCode.pesach).toEqual({ code: 'pesach', nameHe: 'פסח', date: '2026-04-02' });
    expect(byCode.pesach_7).toEqual({ code: 'pesach_7', nameHe: 'שביעי של פסח', date: '2026-04-08' });
    expect(byCode.yom_haatzmaut).toEqual({
      code: 'yom_haatzmaut',
      nameHe: 'יום העצמאות',
      date: '2026-04-22',
    });
    expect(byCode.shavuot).toEqual({ code: 'shavuot', nameHe: 'שבועות', date: '2026-05-22' });
    expect(byCode.rosh_hashana_1?.date).toBe('2026-09-12');
    expect(byCode.rosh_hashana_2?.date).toBe('2026-09-13');
    expect(byCode.yom_kippur?.date).toBe('2026-09-21');
    expect(byCode.sukkot?.date).toBe('2026-09-26');
    expect(byCode.simchat_torah?.date).toBe('2026-10-03');
    expect(Object.values(byCode).some((row) => row.date.startsWith('2026-08'))).toBe(false);
  });

  it('puts Independence Day on a weekday Israel observes, not Friday or Saturday', () => {
    const atzmaut = listIsraeliHolidaysForYear(2026).find((row) => row.code === 'yom_haatzmaut');
    const weekday = new Date(`${atzmaut?.date}T00:00:00.000Z`).getUTCDay();

    expect(atzmaut?.date).toBe('2026-04-22');
    expect(weekday).not.toBe(5);
    expect(weekday).not.toBe(6);
  });
});
