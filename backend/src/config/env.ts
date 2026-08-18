import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  CORS_ORIGIN: z
    .string()
    .min(1, 'CORS_ORIGIN is required (comma-separated list of allowed origins)')
    .transform((value) =>
      value
        .split(',')
        .map((origin) => origin.trim())
        .filter(Boolean),
    ),
  // HS256 signing key. 32 chars is the practical floor for a symmetric secret.
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  // Default session lifetime, in seconds. 28800 = 8 hours.
  JWT_EXPIRES_IN_SECONDS: z.coerce.number().int().positive().default(28800),
  // Lifetime, in seconds, when the caller opts into "remember me" at login.
  // 604800 = 7 days.
  JWT_REMEMBER_ME_EXPIRES_IN_SECONDS: z.coerce.number().int().positive().default(604800),
  // Local-filesystem root for uploaded attachments — a mounted volume in
  // Docker/production. Free-tier container filesystems are ephemeral; see
  // backend/README.md -> File storage.
  STORAGE_DIR: z.string().min(1).default('./storage/uploads'),
  // 'silent' is a real pino level that disables logging entirely (used in tests).
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
  // Failed-attempt throttle on /login and /me/password. Both thresholds count
  // failures within the same rolling window; the address threshold assumes
  // ~10 people can plausibly share one office NAT address (5 * 10 = 50), so
  // it never trips before every one of them has exhausted their own email
  // threshold. See openspec/changes/login-rate-limiting/design.md.
  RATE_LIMIT_EMAIL_MAX_ATTEMPTS: z.coerce.number().int().positive().default(5),
  RATE_LIMIT_IP_MAX_ATTEMPTS: z.coerce.number().int().positive().default(50),
  RATE_LIMIT_WINDOW_SECONDS: z.coerce.number().int().positive().default(900),
  // Requests one authenticated caller may make to the report write routes
  // within that same window — every request counts, not just failures. A
  // person saves a day of work a handful of times; 60 per 15 minutes leaves
  // room for retries and an impatient reload while still bounding how fast one
  // token can drive multi-row inserts.
  RATE_LIMIT_WRITE_MAX_REQUESTS: z.coerce.number().int().positive().default(60),
  // Requests to the report read routes (the monthly list) one *address* may
  // make within that same window. Address-keyed, not subject-keyed, because
  // this limiter runs ahead of `authenticate` (see writeRateLimit.middleware.ts)
  // so there is no verified identity yet. Sized as a generous per-person read
  // budget — a page load plus heavy month navigation is well under 60 — times
  // the same ~10-people-per-office-NAT assumption as RATE_LIMIT_IP_MAX_ATTEMPTS.
  RATE_LIMIT_READ_MAX_REQUESTS: z.coerce.number().int().positive().default(600),
  // Requests one *address* may make to routes that guard `authenticate` with an
  // address-keyed limiter while still applying a per-caller one afterwards (see
  // authGuardRateLimit). Deliberately the loosest of these caps: it is the outer
  // limit on a key a whole office can share, so it is there to stop an
  // unauthenticated flood, not to shape one caller's traffic.
  RATE_LIMIT_AUTH_GUARD_MAX_REQUESTS: z.coerce.number().int().positive().default(1200),
  // Requests to POST /logout one *address* may make within that same window.
  // Address-keyed, not subject-keyed, because this limiter deliberately runs
  // ahead of `authenticate` (see writeRateLimit.middleware.ts), so there is no
  // verified identity yet. Sized on the same ~10-people-per-office-NAT
  // assumption as RATE_LIMIT_IP_MAX_ATTEMPTS: logging out is a handful of
  // requests per person per window, so 60 leaves ample headroom.
  RATE_LIMIT_LOGOUT_MAX_REQUESTS: z.coerce.number().int().positive().default(60),
  // Durable lockout tier above the in-memory throttle: derived from
  // login_attempts rows rather than a stored flag, so it survives restart
  // and is shared across replicas. Threshold and window must sit above the
  // throttle's so ordinary mistyping never reaches this tier - see
  // openspec/changes/login-account-lockout/design.md.
  LOCKOUT_MAX_ATTEMPTS: z.coerce.number().int().positive().default(10),
  LOCKOUT_WINDOW_HOURS: z.coerce.number().int().positive().default(24),
  LOCKOUT_DURATION_MINUTES: z.coerce.number().int().positive().default(30),
  // How many reverse-proxy hops in front of this service to trust when
  // resolving a client's address from X-Forwarded-For. Passed straight to
  // Express's `trust proxy` setting. Disabled by default: trusting a proxy
  // that isn't there lets any client pick its own rate-limit bucket by
  // forging the header. 'true' trusts the first hop; a positive integer
  // trusts that many hops; a comma-separated list trusts specific addresses
  // or CIDR ranges (Express's own accepted forms).
  TRUST_PROXY: z.string().default('false'),
  // Supabase Storage configuration for persisting Absence documents
  SUPABASE_URL: z.string().min(1, 'SUPABASE_URL is required'),
  SUPABASE_ANON_KEY: z.string().min(1, 'SUPABASE_ANON_KEY is required'),
  SUPABASE_SERVICE_KEY: z.string().min(1, 'SUPABASE_SERVICE_KEY is required'),
}).refine((data) => data.JWT_REMEMBER_ME_EXPIRES_IN_SECONDS >= data.JWT_EXPIRES_IN_SECONDS, {
  message: 'JWT_REMEMBER_ME_EXPIRES_IN_SECONDS must be >= JWT_EXPIRES_IN_SECONDS',
  path: ['JWT_REMEMBER_ME_EXPIRES_IN_SECONDS'],
}).refine((data) => data.RATE_LIMIT_IP_MAX_ATTEMPTS >= data.RATE_LIMIT_EMAIL_MAX_ATTEMPTS, {
  message: 'RATE_LIMIT_IP_MAX_ATTEMPTS must be >= RATE_LIMIT_EMAIL_MAX_ATTEMPTS',
  path: ['RATE_LIMIT_IP_MAX_ATTEMPTS'],
}).refine((data) => data.LOCKOUT_MAX_ATTEMPTS > data.RATE_LIMIT_EMAIL_MAX_ATTEMPTS, {
  message: 'LOCKOUT_MAX_ATTEMPTS must be > RATE_LIMIT_EMAIL_MAX_ATTEMPTS, so the throttle catches ordinary mistyping before the lock does',
  path: ['LOCKOUT_MAX_ATTEMPTS'],
}).refine((data) => data.LOCKOUT_WINDOW_HOURS * 3600 > data.RATE_LIMIT_WINDOW_SECONDS, {
  message: 'LOCKOUT_WINDOW_HOURS must be longer than RATE_LIMIT_WINDOW_SECONDS',
  path: ['LOCKOUT_WINDOW_HOURS'],
});

export type Env = z.infer<typeof envSchema>;

export type TrustProxySetting = boolean | number | string[];

/**
 * Parses TRUST_PROXY into whatever form Express's `trust proxy` setting
 * expects. Kept separate from the schema (which just validates a string) so
 * it's testable on its own — this is the part with real security weight.
 */
export function parseTrustProxy(value: string): TrustProxySetting {
  const trimmed = value.trim().toLowerCase();

  if (trimmed === '' || trimmed === 'false') {
    return false;
  }
  if (trimmed === 'true') {
    return true;
  }
  if (/^\d+$/.test(trimmed)) {
    return Number(trimmed);
  }

  return value
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
}

export class EnvValidationError extends Error {
  readonly issues: readonly string[];

  constructor(issues: readonly string[]) {
    super(
      `Invalid environment configuration:\n${issues.map((issue) => `  - ${issue}`).join('\n')}`,
    );
    this.name = 'EnvValidationError';
    this.issues = issues;
  }
}

/**
 * Pure validation, no process side effects — kept separate from the `env`
 * singleton below so config validation itself stays unit-testable.
 */
export function parseEnv(source: NodeJS.ProcessEnv): Env {
  const result = envSchema.safeParse(source);

  if (!result.success) {
    const issues = result.error.issues.map((issue) => {
      const path = issue.path.join('.') || '(root)';
      return `${path}: ${issue.message}`;
    });
    throw new EnvValidationError(issues);
  }

  return result.data;
}

function loadEnv(): Env {
  try {
    return parseEnv(process.env);
  } catch (error) {
    if (error instanceof EnvValidationError) {
      console.error(error.message);
      process.exit(1);
    }
    throw error;
  }
}

export const env = loadEnv();
