import { describe, expect, it } from 'vitest';
import { computeClockSegments, segmentHours, totalSessionMinutes } from '../clockSegments.js';

describe('computeClockSegments', () => {
  it('returns one segment for same calendar day in Jerusalem', () => {
    const startedAt = new Date('2026-08-16T06:00:00.000Z');
    const stoppedAt = new Date('2026-08-16T14:00:00.000Z');
    const segments = computeClockSegments(startedAt, stoppedAt);
    expect(segments).toHaveLength(1);
    expect(segments[0]?.date).toBe('2026-08-16');
    expect(totalSessionMinutes(segments)).toBeGreaterThan(0);
  });

  it('splits a session that crosses Jerusalem midnight into two segments', () => {
    const startedAt = new Date('2026-08-16T20:50:00.000Z');
    const stoppedAt = new Date('2026-08-16T21:10:00.000Z');
    const segments = computeClockSegments(startedAt, stoppedAt);
    expect(segments).toHaveLength(2);
    expect(segments[0]).toMatchObject({ date: '2026-08-16', endTime: '23:59' });
    expect(segments[1]).toMatchObject({ date: '2026-08-17', startTime: '00:00' });
  });

  it('maps sub-minute segments to zero reportable hours', () => {
    expect(segmentHours({ date: '2026-08-17', startTime: '09:00', endTime: '09:00', durationMinutes: 0 })).toBe(
      0,
    );
  });
});
