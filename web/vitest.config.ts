import { defineConfig } from 'vitest/config'

// Pin the timezone so date-sensitive derivations (6am-local resets, watering
// streak) are deterministic across machines and match CI (which runs in UTC).
// Without this, the watering-streak parity fixture would compute differently
// depending on the developer's local timezone.
process.env.TZ = 'UTC'

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/tests/setup.ts'],
    exclude: ['e2e/**', 'node_modules/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'json-summary'],
      reportsDirectory: './coverage',
      exclude: [
        'node_modules/**',
        'e2e/**',
        'src/tests/**',
        '**/*.d.ts',
        '**/*.config.*',
      ],
    },
  },
})
