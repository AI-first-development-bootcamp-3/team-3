const JERUSALEM = 'Asia/Jerusalem';

export interface ClockSegment {
  date: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
}

function jerusalemParts(date: Date): { date: string; time: string } {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: JERUSALEM,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  const parts = formatter.formatToParts(date);
  const pick = (type: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === type)?.value ?? '';
  const dateStr = `${pick('year')}-${pick('month')}-${pick('day')}`;
  const timeStr = `${pick('hour')}:${pick('minute')}`;
  return { date: dateStr, time: timeStr };
}

export function computeClockSegments(startedAt: Date, stoppedAt: Date): ClockSegment[] {
  const start = jerusalemParts(startedAt);
  const stop = jerusalemParts(stoppedAt);

  if (start.date === stop.date) {
    const durationMinutes = Math.max(0, Math.round((stoppedAt.getTime() - startedAt.getTime()) / 60_000));
    return [
      {
        date: start.date,
        startTime: start.time,
        endTime: stop.time,
        durationMinutes,
      },
    ];
  }

  const endOfFirstDayMinutes = minutesFromHhmm(start.time);
  const firstDuration = 24 * 60 - endOfFirstDayMinutes;
  const secondDuration = minutesFromHhmm(stop.time);

  return [
    {
      date: start.date,
      startTime: start.time,
      endTime: '23:59',
      durationMinutes: firstDuration,
    },
    {
      date: stop.date,
      startTime: '00:00',
      endTime: stop.time,
      durationMinutes: secondDuration,
    },
  ];
}

function minutesFromHhmm(hhmm: string): number {
  const [hours, minutes] = hhmm.split(':');
  return Number(hours) * 60 + Number(minutes);
}

export function totalSessionMinutes(segments: ClockSegment[]): number {
  return segments.reduce((sum, segment) => sum + segment.durationMinutes, 0);
}

export function segmentHours(segment: ClockSegment): number {
  if (segment.durationMinutes <= 0) return 0;
  const hours = segment.durationMinutes / 60;
  const rounded = Math.round(hours * 10) / 10;
  return Math.max(0, rounded);
}
