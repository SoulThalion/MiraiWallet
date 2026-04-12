import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals:     true,
    environment: 'node',
    // Sequential — prevents concurrent DDL conflicts on shared MySQL test DB
    pool:        'forks',
    poolOptions: { forks: { singleFork: true } },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'html'],
      include:  ['src/**/*.ts'],
      exclude:  ['src/scripts/**', 'src/server.ts', 'src/types/**'],
    },
    testTimeout: 30000,
  },
})
