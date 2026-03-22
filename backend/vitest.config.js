import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals:     true,
    environment: 'node',
    // Sequential execution — prevents concurrent DDL conflicts on shared MySQL test DB
    pool:        'forks',
    poolOptions: { forks: { singleFork: true } },
    // Load test env vars before any test file runs
    env:         { NODE_ENV: 'test' },
    setupFiles:  [],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'html'],
      include:  ['src/**/*.js'],
      exclude:  ['src/scripts/**', 'src/server.js'],
    },
    testTimeout: 30000,   // MySQL connections can be slower than SQLite
  },
})
