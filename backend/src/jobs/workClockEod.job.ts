import { autoStopActiveSessionsNow } from '../services/workClock.service.js';

const JERUSALEM = 'Asia/Jerusalem';

function jerusalemDateString(date: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: JERUSALEM,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

function msUntilNextJerusalem2359(): number {
  const now = new Date();
  const today = jerusalemDateString(now);
  const target = new Date(`${today}T23:59:00.000+03:00`);
  if (target.getTime() <= now.getTime()) {
    target.setDate(target.getDate() + 1);
  }
  return target.getTime() - now.getTime();
}

let timer: ReturnType<typeof setTimeout> | undefined;

async function runAutoStop(): Promise<void> {
  try {
    await autoStopActiveSessionsNow();
  } catch (error) {
    console.error('Work clock EOD auto-stop failed', error);
  }
}

function scheduleNext(): void {
  timer = setTimeout(async () => {
    await runAutoStop();
    scheduleNext();
  }, msUntilNextJerusalem2359());
}

/** Starts the Jerusalem 23:59 auto-stop loop. No-op in test. */
export function startWorkClockEodScheduler(): void {
  if (process.env.NODE_ENV === 'test') return;
  if (timer) return;
  scheduleNext();
}

export function stopWorkClockEodScheduler(): void {
  if (timer) {
    clearTimeout(timer);
    timer = undefined;
  }
}

/** @internal test hook */
export async function triggerWorkClockEodAutoStop(): Promise<void> {
  await runAutoStop();
}
