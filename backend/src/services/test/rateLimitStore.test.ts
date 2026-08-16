import { describe, expect, it } from 'vitest';
import { RateLimitStore } from '../rateLimitStore.js';

const WINDOW_MS = 15 * 60 * 1000;

/** A fake clock the test controls explicitly, rather than real timers. */
function fakeClock(startAt = 0) {
  let current = startAt;
  return {
    now: () => current,
    advance(ms: number) {
      current += ms;
    },
  };
}

describe('RateLimitStore', () => {
  it('allows attempts below the threshold', () => {
    const store = new RateLimitStore(WINDOW_MS);

    for (let i = 0; i < 4; i++) {
      store.recordFailure('a@example.com');
    }

    expect(store.check('a@example.com', 5)).toEqual({ allowed: true, retryAfterSeconds: 0 });
  });

  it('trips once the threshold is reached', () => {
    const store = new RateLimitStore(WINDOW_MS);

    for (let i = 0; i < 5; i++) {
      store.recordFailure('a@example.com');
    }

    const result = store.check('a@example.com', 5);
    expect(result.allowed).toBe(false);
    expect(result.retryAfterSeconds).toBeGreaterThan(0);
  });

  it('reports the exact remaining wait, counted from the oldest surviving attempt', () => {
    const clock = fakeClock();
    const store = new RateLimitStore(WINDOW_MS, clock.now);

    store.recordFailure('a@example.com'); // t=0
    clock.advance(60_000); // t=60s
    for (let i = 0; i < 4; i++) {
      store.recordFailure('a@example.com');
    }

    // Oldest attempt (t=0) ages out at t=900s. Currently at t=60s -> 840s left.
    const result = store.check('a@example.com', 5);
    expect(result.allowed).toBe(false);
    expect(result.retryAfterSeconds).toBe(840);
  });

  it('rolls the window rather than resetting at a fixed boundary', () => {
    const clock = fakeClock();
    const store = new RateLimitStore(WINDOW_MS, clock.now);

    for (let i = 0; i < 5; i++) {
      store.recordFailure('a@example.com');
    }
    expect(store.check('a@example.com', 5).allowed).toBe(false);

    // Just past the window since the *first* failure - it alone ages out.
    clock.advance(WINDOW_MS + 1);
    // A fresh failure re-fills to 1, well under the threshold of 5.
    store.recordFailure('a@example.com');
    expect(store.check('a@example.com', 5).allowed).toBe(true);
  });

  it('checking while throttled does not extend the wait', () => {
    const clock = fakeClock();
    const store = new RateLimitStore(WINDOW_MS, clock.now);

    for (let i = 0; i < 5; i++) {
      store.recordFailure('a@example.com');
    }

    const first = store.check('a@example.com', 5);
    clock.advance(1000);
    const second = store.check('a@example.com', 5);

    expect(second.retryAfterSeconds).toBeLessThanOrEqual(first.retryAfterSeconds);
  });

  it('clears the failure count, so a subsequent failure starts counting from zero', () => {
    const store = new RateLimitStore(WINDOW_MS);

    for (let i = 0; i < 5; i++) {
      store.recordFailure('a@example.com');
    }
    expect(store.check('a@example.com', 5).allowed).toBe(false);

    store.clear('a@example.com');
    expect(store.check('a@example.com', 5).allowed).toBe(true);

    store.recordFailure('a@example.com');
    const result = store.check('a@example.com', 5);
    expect(result.allowed).toBe(true);
  });

  it('tracks keys independently', () => {
    const store = new RateLimitStore(WINDOW_MS);

    for (let i = 0; i < 5; i++) {
      store.recordFailure('a@example.com');
    }

    expect(store.check('a@example.com', 5).allowed).toBe(false);
    expect(store.check('b@example.com', 5).allowed).toBe(true);
  });

  it('sweep drops keys whose every timestamp has aged out', () => {
    const clock = fakeClock();
    const store = new RateLimitStore(WINDOW_MS, clock.now);

    store.recordFailure('a@example.com');
    expect(store.size).toBe(1);

    clock.advance(WINDOW_MS + 1);
    store.sweep();

    expect(store.size).toBe(0);
  });

  it('sweep leaves a key with some still-live timestamps in place', () => {
    const clock = fakeClock();
    const store = new RateLimitStore(WINDOW_MS, clock.now);

    store.recordFailure('a@example.com'); // t=0, will expire
    clock.advance(WINDOW_MS - 1000);
    store.recordFailure('a@example.com'); // still live when we sweep

    store.sweep();

    expect(store.size).toBe(1);
    expect(store.check('a@example.com', 5).allowed).toBe(true);
  });

  it('evicts the least-recently-active key once the entry cap is exceeded', () => {
    const store = new RateLimitStore(WINDOW_MS, Date.now, 3);

    store.recordFailure('a@example.com');
    store.recordFailure('b@example.com');
    store.recordFailure('c@example.com');
    expect(store.size).toBe(3);

    store.recordFailure('d@example.com');

    expect(store.size).toBe(3);
    // 'a' was least recently touched, so it was evicted - its count reset to zero.
    expect(store.check('a@example.com', 1).allowed).toBe(true);
    expect(store.check('d@example.com', 1).allowed).toBe(false);
  });

  it('does not evict a key that keeps getting fresh failures', () => {
    const store = new RateLimitStore(WINDOW_MS, Date.now, 2);

    store.recordFailure('a@example.com');
    store.recordFailure('b@example.com');
    // Touching 'a' again moves it to the back, so 'b' becomes least-recent.
    store.recordFailure('a@example.com');
    store.recordFailure('c@example.com');

    expect(store.size).toBe(2);
    expect(store.check('b@example.com', 1).allowed).toBe(true);
  });
});
