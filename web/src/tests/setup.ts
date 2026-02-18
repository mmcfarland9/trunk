/**
 * Test setup file - runs before each test file.
 * Sets up mocks and global test environment.
 */

import { beforeEach } from 'vitest'

// Mock localStorage
const storage: Record<string, string> = {}

Object.defineProperty(globalThis, 'localStorage', {
  value: {
    getItem: (key: string) => storage[key] ?? null,
    setItem: (key: string, value: string) => {
      storage[key] = value
    },
    removeItem: (key: string) => {
      delete storage[key]
    },
    clear: () => Object.keys(storage).forEach((k) => delete storage[k]),
    get length() {
      return Object.keys(storage).length
    },
    key: (index: number) => Object.keys(storage)[index] ?? null,
  },
  writable: true,
})

// Reset localStorage between tests
beforeEach(() => {
  Object.keys(storage).forEach((k) => delete storage[k])
})
