/**
 * Stryker Mutation Testing Configuration
 *
 * Mutation testing verifies your tests can catch bugs by introducing
 * small changes (mutations) to your code and checking if tests fail.
 *
 * Run: npm run test:mutation
 *
 * Metrics:
 * - Killed: Test failed (good - mutation was caught)
 * - Survived: Test passed (bad - mutation wasn't caught)
 * - No coverage: No test covers this code
 * - Timeout: Mutation caused infinite loop
 *
 * Goal: >80% mutation score
 */

/** @type {import('@stryker-mutator/api').PartialStrykerOptions} */
export default {
  // Use Vitest as the test runner
  testRunner: 'vitest',

  // Files to mutate (your source code)
  mutate: [
    'src/**/*.ts',
    '!src/**/*.test.ts',
    '!src/**/*.spec.ts',
    '!src/tests/**',
    '!src/vite-env.d.ts',
  ],

  // Vitest-specific configuration
  vitest: {
    configFile: 'vitest.config.ts',
  },

  // Reporter configuration
  reporters: ['html', 'clear-text', 'progress'],
  htmlReporter: {
    fileName: 'reports/mutation/index.html',
  },

  // Thresholds for CI/CD
  thresholds: {
    high: 80,
    low: 60,
    break: 50, // Fail if score drops below 50%
  },

  // Performance settings
  concurrency: 4,
  timeoutMS: 10000,
  timeoutFactor: 2,

  // Incremental mode for faster re-runs
  incremental: true,
  incrementalFile: '.stryker-incremental.json',

  // Ignore specific mutations that are noise
  ignorers: [],

  // Disable specific mutators if needed
  // mutator: {
  //   excludedMutations: ['StringLiteral']
  // },

  // Log level
  logLevel: 'info',

  // Clean up temp files
  cleanTempDir: true,
}
