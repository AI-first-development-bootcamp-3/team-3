const DEFAULT_MAX_ENTRIES = 10_000;

export interface RateLimitCheckResult {
  allowed: boolean;
  /** Seconds until the oldest counted attempt ages out of the window. 0 when allowed. */
  retryAfterSeconds: number;
}

/**
 * In-memory, per-process count of failed attempts within a rolling window,
 * keyed by an arbitrary string (an email or a client address). Counters are
 * lost on restart and are not shared across replicas — accepted trade-offs,
 * see openspec/changes/login-rate-limiting/design.md.
 */
export class RateLimitStore {
  private readonly attempts = new Map<string, number[]>();

  constructor(
    private readonly windowMs: number,
    // A thunk, not a bare `Date.now` reference: the latter captures the
    // native function once at construction time, which is invisible to
    // vi.useFakeTimers() patching the global `Date` afterwards. This form
    // re-reads the current global `Date` on every call.
    private readonly now: () => number = () => Date.now(),
    private readonly maxEntries: number = DEFAULT_MAX_ENTRIES,
  ) {}

  /**
   * Read-only — never records anything, so calling this while already
   * throttled does not extend the wait.
   */
  check(key: string, maxAttempts: number): RateLimitCheckResult {
    const timestamps = this.prune(key);
    const oldest = timestamps[0];

    if (timestamps.length < maxAttempts || oldest === undefined) {
      return { allowed: true, retryAfterSeconds: 0 };
    }

    const remainingMs = this.windowMs - (this.now() - oldest);
    return { allowed: false, retryAfterSeconds: Math.max(1, Math.ceil(remainingMs / 1000)) };
  }

  recordFailure(key: string): void {
    const timestamps = this.prune(key);
    timestamps.push(this.now());
    // Delete-then-set moves the key to the end of Map iteration order, so
    // eviction below can treat the front of the map as least-recently-active.
    this.attempts.delete(key);
    this.attempts.set(key, timestamps);
    this.evictOverCap();
  }

  clear(key: string): void {
    this.attempts.delete(key);
  }

  /** Drops every key. Test-only: gives each test a clean counter. */
  reset(): void {
    this.attempts.clear();
  }

  /** Drops keys whose every timestamp has aged out. Safe to call on a timer. */
  sweep(): void {
    const cutoff = this.now() - this.windowMs;
    for (const [key, timestamps] of this.attempts) {
      const pruned = timestamps.filter((timestamp) => timestamp > cutoff);
      if (pruned.length === 0) {
        this.attempts.delete(key);
      } else if (pruned.length !== timestamps.length) {
        this.attempts.set(key, pruned);
      }
    }
  }

  get size(): number {
    return this.attempts.size;
  }

  private prune(key: string): number[] {
    const cutoff = this.now() - this.windowMs;
    const existing = this.attempts.get(key) ?? [];
    return existing.filter((timestamp) => timestamp > cutoff);
  }

  private evictOverCap(): void {
    while (this.attempts.size > this.maxEntries) {
      const oldestKey = this.attempts.keys().next().value;
      if (oldestKey === undefined) {
        return;
      }
      this.attempts.delete(oldestKey);
    }
  }
}
