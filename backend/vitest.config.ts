import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    // Values needed so importing env.ts during tests doesn't exit the
    // process — the real database used by integration tests is set up
    // separately in the test-harness feature (SCRUM-52).
    env: {
      NODE_ENV: 'test',
      PORT: '4000',
      DATABASE_URL: 'postgresql://postgres:postgres@localhost:5432/abra_test',
      CORS_ORIGIN: 'http://localhost:5173',
      JWT_SECRET: 'test-only-secret-at-least-32-characters-long',
      LOG_LEVEL: 'silent',
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/**/*.ts'],
      exclude: [
        'node_modules/**',
        'dist/**',
        'coverage/**',
        '**/*.d.ts',
        '**/*.config.*',
        '**/*.test.ts',
        // Prisma's generated client and migration SQL aren't hand-written
        // logic — counting them would understate real coverage.
        'src/generated/**',
        'prisma/migrations/**',
      ],
      thresholds: {
        lines: 60,
      },
    },
  },
});
