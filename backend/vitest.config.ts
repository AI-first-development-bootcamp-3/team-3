import { defineConfig } from 'vitest/config';
import { testEnv } from './src/test/testEnv.js';

export default defineConfig({
  test: {
    environment: 'node',
    // Values needed so importing env.ts during tests doesn't exit the
    // process, and so the test database (distinct from development) is what
    // every test, and globalSetup's migration run, connects to.
    env: testEnv,
    globalSetup: ['./src/test/globalSetup.ts'],
    // All test files share one real Postgres database. Vitest's default
    // parallel-file execution would let one file's resetDatabase() truncate
    // rows another file is mid-test with — running files sequentially trades
    // some suite speed for the isolation the "no leaked state" requirement
    // actually needs.
    fileParallelism: false,
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
