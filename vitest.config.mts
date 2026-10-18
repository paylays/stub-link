import path from 'node:path';
import { defineConfig } from 'vitest/config';

const alias = { '@': path.resolve(process.cwd(), 'src') };

try {
  process.loadEnvFile('.env');
} catch {
  // No .env file: rely on the shell environment.
}

export default defineConfig(() => {
  return {
    test: {
      env: Object.fromEntries(Object.entries(process.env).filter((e): e is [string, string] => e[1] !== undefined)),
      projects: [
        {
          resolve: { alias },
          test: {
            name: 'unit',
            environment: 'node',
            include: ['tests/unit/**/*.test.ts'],
          },
        },
        {
          resolve: { alias },
          test: {
            name: 'integration',
            environment: 'node',
            include: ['tests/integration/**/*.test.ts'],
            fileParallelism: false,
            pool: 'forks',
            env: {
              // The app must only ever see the test database during integration runs.
              DATABASE_URL: process.env.TEST_DATABASE_URL ?? '',
              APP_URL: process.env.APP_URL ?? 'http://localhost:3000',
              HASH_SECRET: process.env.HASH_SECRET ?? '',
            },
            globalSetup: ['tests/integration/global-setup.ts'],
            setupFiles: ['tests/integration/setup.ts'],
          },
        },
      ],
    },
  };
});
