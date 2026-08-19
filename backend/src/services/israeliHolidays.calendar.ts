import { HebrewCalendar } from '@hebcal/core';

export const ISRAELI_HOLIDAY_CODES = [
  'rosh_hashana_1',
  'rosh_hashana_2',
  'yom_kippur',
  'sukkot',
  'simchat_torah',
  'pesach',
  'pesach_7',
  'shavuot',
  'yom_haatzmaut',
] as const;

export type IsraeliHolidayCode = (typeof ISRAELI_HOLIDAY_CODES)[number];

export interface IsraeliHolidayDate {
  code: IsraeliHolidayCode;
  nameHe: string;
  date: string;
}

const NAME_HE: Record<IsraeliHolidayCode, string> = {
  rosh_hashana_1: 'ראש השנה',
  rosh_hashana_2: 'ראש השנה (יום ב׳)',
  yom_kippur: 'יום כיפור',
  sukkot: 'סוכות',
  simchat_torah: 'שמחת תורה',
  pesach: 'פסח',
  pesach_7: 'שביעי של פסח',
  shavuot: 'שבועות',
  yom_haatzmaut: 'יום העצמאות',
};

/** Hebcal `greg()` is local midnight of the daytime civil date. Never use UTC ISO. */
function toIsoDate(value: Date): string {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function classify(desc: string): IsraeliHolidayCode | null {
  if (desc === 'Rosh Hashana II') return 'rosh_hashana_2';
  // Hebcal names day 1 "Rosh Hashana 5787". Do not use startsWith — that also
  // matches "Rosh Hashana LaBehemot" (1 Elul, not a public holiday).
  if (/^Rosh Hashana \d{4}$/.test(desc)) return 'rosh_hashana_1';
  if (desc === 'Yom Kippur') return 'yom_kippur';
  if (desc === 'Sukkot I') return 'sukkot';
  if (desc === 'Shmini Atzeret') return 'simchat_torah';
  if (desc === 'Pesach I') return 'pesach';
  if (desc === 'Pesach VII') return 'pesach_7';
  if (desc === 'Shavuot') return 'shavuot';
  if (desc === "Yom HaAtzma'ut") return 'yom_haatzmaut';
  return null;
}

/** Pure: Hebrew calendar → civil dates for in-scope Israeli paid public holidays. */
export function listIsraeliHolidaysForYear(year: number): IsraeliHolidayDate[] {
  const events = HebrewCalendar.calendar({
    year,
    isHebrewYear: false,
    il: true,
    noMinorFast: true,
    noRoshChodesh: true,
    noSpecialShabbat: true,
    noModern: false,
  });

  const byCode = new Map<IsraeliHolidayCode, IsraeliHolidayDate>();
  for (const event of events) {
    const code = classify(event.getDesc());
    if (!code || byCode.has(code)) continue;
    const date = toIsoDate(event.getDate().greg());
    if (!date.startsWith(String(year))) continue;
    byCode.set(code, { code, nameHe: NAME_HE[code], date });
  }

  return [...byCode.values()].sort((left, right) => left.date.localeCompare(right.date));
}

export function isWeekendIso(isoDate: string): boolean {
  const day = new Date(`${isoDate}T00:00:00.000Z`).getUTCDay();
  return day === 5 || day === 6;
}
