# Elegance Refactor Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Transform the Trunk codebase from B+ (82/100) to A-grade elegance through foundation fixes, pattern consistency, function decomposition, and incremental event sourcing migration—without changing outward design.

**Architecture:** Four-phase refactor: (1) Fix shared foundations (constants, schemas), (2) Enforce pattern consistency (immutability, ISO dates), (3) Decompose large functions, (4) Complete event sourcing migration incrementally.

**Tech Stack:** TypeScript, Vite, Vitest, Swift, shared JSON schemas

---

## Phase 1: Foundation Fixes

### Task 1.1: Fix Max Capacity in formulas.md

**Files:**
- Modify: `shared/formulas.md:47,54,100-101`

**Step 1: Update diminishing returns example**

Change line 47 from:
```
- `diminishingFactor` = `max(0, (1 - currentCapacity / maxCapacity)^1.5)`
```
to reference 120 (already correct, but example uses 100).

Change line 54 from:
```
  - `diminishingFactor = (1 - 50/100)^1.5 = 0.5^1.5 ≈ 0.3536`
```
to:
```
  - `diminishingFactor = (1 - 50/120)^1.5 ≈ 0.4787`
```

**Step 2: Update progression curve section**

Change lines 99-101 from:
```
Starting capacity: 10
Maximum capacity: 100
```
to:
```
Starting capacity: 10
Maximum capacity: 120
```

**Step 3: Update game phases**

Change lines 102-114 to use 120 as the denominator in all ranges.

**Step 4: Verify no other 100 references**

Run: `grep -n "100" shared/formulas.md`
Expected: Only the test case on line 144 should remain (currentCapacity=90 is valid test data).

**Step 5: Commit**

```bash
git add shared/formulas.md
git commit -m "fix: update formulas.md max capacity from 100 to 120"
```

---

### Task 1.2: Update Sprout Schema States

**Files:**
- Modify: `shared/schemas/sprout.schema.json:25-29`

**Step 1: Update state enum**

Change:
```json
"state": {
  "type": "string",
  "enum": ["active", "completed"],
  "description": "Current lifecycle state (active = growing, completed = harvested)"
}
```
to:
```json
"state": {
  "type": "string",
  "enum": ["active", "completed", "uprooted"],
  "description": "Lifecycle state: active (growing), completed (harvested), uprooted (abandoned)"
}
```

**Step 2: Run schema validation**

Run: `cd web && npm test -- --run sprout`
Expected: Tests pass (schema is documentation, not runtime validation).

**Step 3: Commit**

```bash
git add shared/schemas/sprout.schema.json
git commit -m "fix: add uprooted state to sprout schema, remove draft"
```

---

### Task 1.3: Create Unified Constants Generator

**Files:**
- Create: `shared/generate-constants.js`
- Modify: `shared/generate-swift-constants.js` (rename to backup)
- Create: `web/src/generated/constants.ts`

**Step 1: Write the test for generated TypeScript constants**

Create `web/src/tests/generated-constants.test.ts`:
```typescript
import { describe, it, expect } from 'vitest'
import * as generated from '../generated/constants'
import sharedConstants from '../../../shared/constants.json'

describe('generated constants', () => {
  it('matches shared constants soil values', () => {
    expect(generated.SOIL_STARTING_CAPACITY).toBe(sharedConstants.soil.startingCapacity)
    expect(generated.SOIL_MAX_CAPACITY).toBe(sharedConstants.soil.maxCapacity)
  })

  it('matches shared constants water values', () => {
    expect(generated.WATER_DAILY_CAPACITY).toBe(sharedConstants.water.dailyCapacity)
    expect(generated.WATER_RESET_HOUR).toBe(sharedConstants.water.resetHour)
  })

  it('matches shared constants sun values', () => {
    expect(generated.SUN_WEEKLY_CAPACITY).toBe(sharedConstants.sun.weeklyCapacity)
    expect(generated.SUN_RESET_HOUR).toBe(sharedConstants.sun.resetHour)
  })

  it('exports planting costs', () => {
    expect(generated.PLANTING_COSTS['2w'].fertile).toBe(2)
    expect(generated.PLANTING_COSTS['1y'].barren).toBe(24)
  })

  it('exports season data', () => {
    expect(generated.SEASONS['3m'].baseReward).toBe(1.95)
    expect(generated.SEASONS['1y'].label).toBe('1 year')
  })
})
```

**Step 2: Run test to verify it fails**

Run: `cd web && npm test -- --run generated-constants`
Expected: FAIL with "Cannot find module '../generated/constants'"

**Step 3: Create the generator script**

Create `shared/generate-constants.js`:
```javascript
#!/usr/bin/env node
/**
 * Generates constants for both Swift and TypeScript from constants.json
 *
 * Usage: node generate-constants.js
 * Output:
 *   - ../ios/Trunk/Generated/SharedConstants.swift
 *   - ../web/src/generated/constants.ts
 */

const fs = require('fs')
const path = require('path')

const constantsPath = path.join(__dirname, 'constants.json')
const swiftOutputPath = path.join(__dirname, '../ios/Trunk/Generated/SharedConstants.swift')
const tsOutputPath = path.join(__dirname, '../web/src/generated/constants.ts')

const constants = JSON.parse(fs.readFileSync(constantsPath, 'utf8'))

// === TypeScript Generation ===

const typescript = `//
// constants.ts
// Trunk Web
//
// AUTO-GENERATED from shared/constants.json
// DO NOT EDIT DIRECTLY - run 'node shared/generate-constants.js'
//

// Soil
export const SOIL_STARTING_CAPACITY = ${constants.soil.startingCapacity}
export const SOIL_MAX_CAPACITY = ${constants.soil.maxCapacity}
export const SOIL_RECOVERY_PER_WATER = ${constants.soil.recoveryRates.waterUse}
export const SOIL_RECOVERY_PER_SUN = ${constants.soil.recoveryRates.sunUse}

export const PLANTING_COSTS = ${JSON.stringify(constants.soil.plantingCosts, null, 2)} as const

export const ENVIRONMENT_MULTIPLIERS = ${JSON.stringify(constants.soil.environmentMultipliers, null, 2)} as const

export const RESULT_MULTIPLIERS = ${JSON.stringify(constants.soil.resultMultipliers, null, 2)} as const

// Water
export const WATER_DAILY_CAPACITY = ${constants.water.dailyCapacity}
export const WATER_RESET_HOUR = ${constants.water.resetHour}

// Sun
export const SUN_WEEKLY_CAPACITY = ${constants.sun.weeklyCapacity}
export const SUN_RESET_HOUR = ${constants.sun.resetHour}

// Seasons
export const SEASONS = ${JSON.stringify(constants.seasons, null, 2)} as const

// Environments
export const ENVIRONMENTS = ${JSON.stringify(constants.environments, null, 2)} as const

// Results
export const RESULTS = ${JSON.stringify(constants.results, null, 2)} as const

// Tree Structure
export const BRANCH_COUNT = ${constants.tree.branchCount}
export const TWIG_COUNT = ${constants.tree.twigCount}

export const BRANCHES = ${JSON.stringify(constants.tree.branches, null, 2)} as const

// Storage Keys
export const STORAGE_KEYS = ${JSON.stringify(constants.storage.keys, null, 2)} as const

export const EXPORT_REMINDER_DAYS = ${constants.storage.exportReminderDays}
`

// === Swift Generation (keep existing) ===

const swift = fs.readFileSync(path.join(__dirname, 'generate-swift-constants.js'), 'utf8')
  .split('const swift = `')[1]
  .split('`;')[0]
// Actually, let's just keep the existing swift generator logic inline

const swiftContent = `//
//  SharedConstants.swift
//  Trunk
//
//  AUTO-GENERATED from shared/constants.json
//  DO NOT EDIT DIRECTLY - run 'node shared/generate-constants.js'
//

import Foundation

// MARK: - Shared Constants

enum SharedConstants {

    // MARK: - Soil

    enum Soil {
        static let startingCapacity: Double = ${constants.soil.startingCapacity}
        static let maxCapacity: Double = ${constants.soil.maxCapacity}

        /// Planting costs by season and environment
        static let plantingCosts: [String: [String: Int]] = [
${Object.entries(constants.soil.plantingCosts).map(([season, envs]) =>
    `            "${season}": [${Object.entries(envs).map(([env, cost]) => `"${env}": ${cost}`).join(', ')}]`
).join(',\n')}
        ]

        /// Environment multipliers for rewards
        static let environmentMultipliers: [String: Double] = [
${Object.entries(constants.soil.environmentMultipliers).map(([env, mult]) =>
    `            "${env}": ${mult}`
).join(',\n')}
        ]

        /// Result multipliers (1-5 scale)
        static let resultMultipliers: [Int: Double] = [
${Object.entries(constants.soil.resultMultipliers).map(([result, mult]) =>
    `            ${result}: ${mult}`
).join(',\n')}
        ]

        /// Recovery rates
        static let waterRecovery: Double = ${constants.soil.recoveryRates.waterUse}
        static let sunRecovery: Double = ${constants.soil.recoveryRates.sunUse}
    }

    // MARK: - Water

    enum Water {
        static let dailyCapacity: Int = ${constants.water.dailyCapacity}
        static let resetHour: Int = ${constants.water.resetHour}
    }

    // MARK: - Sun

    enum Sun {
        static let weeklyCapacity: Int = ${constants.sun.weeklyCapacity}
        static let resetHour: Int = ${constants.sun.resetHour}
    }

    // MARK: - Seasons

    enum Seasons {
        static let baseRewards: [String: Double] = [
${Object.entries(constants.seasons).map(([season, data]) =>
    `            "${season}": ${data.baseReward}`
).join(',\n')}
        ]

        static let durations: [String: Int] = [
${Object.entries(constants.seasons).map(([season, data]) =>
    `            "${season}": ${data.durationMs}`
).join(',\n')}
        ]

        static let labels: [String: String] = [
${Object.entries(constants.seasons).map(([season, data]) =>
    `            "${season}": "${data.label}"`
).join(',\n')}
        ]
    }

    // MARK: - Environments

    enum Environments {
        static let labels: [String: String] = [
${Object.entries(constants.environments).map(([env, data]) =>
    `            "${env}": "${data.label}"`
).join(',\n')}
        ]

        static let descriptions: [String: String] = [
${Object.entries(constants.environments).map(([env, data]) =>
    `            "${env}": "${data.description}"`
).join(',\n')}
        ]

        static let formHints: [String: String] = [
${Object.entries(constants.environments).map(([env, data]) =>
    `            "${env}": "${data.formHint}"`
).join(',\n')}
        ]
    }

    // MARK: - Results

    enum Results {
        static let labels: [Int: String] = [
${Object.entries(constants.results).map(([result, data]) =>
    `            ${result}: "${data.label}"`
).join(',\n')}
        ]

        static let descriptions: [Int: String] = [
${Object.entries(constants.results).map(([result, data]) =>
    `            ${result}: "${data.description}"`
).join(',\n')}
        ]
    }

    // MARK: - Tree

    enum Tree {
        static let branchCount: Int = ${constants.tree.branchCount}
        static let twigCount: Int = ${constants.tree.twigCount}

        static let branchNames: [String] = [
${constants.tree.branches.map(b => `            "${b.name}"`).join(',\n')}
        ]

        static let branchDescriptions: [String] = [
${constants.tree.branches.map(b => `            "${b.description}"`).join(',\n')}
        ]

        /// Twig labels indexed by [branchIndex][twigIndex]
        static let twigLabels: [[String]] = [
${constants.tree.branches.map(b =>
    `            [${b.twigs.map(t => `"${t}"`).join(', ')}]`
).join(',\n')}
        ]

        /// Get twig label for a given branch and twig index
        static func twigLabel(branchIndex: Int, twigIndex: Int) -> String {
            guard branchIndex >= 0, branchIndex < twigLabels.count,
                  twigIndex >= 0, twigIndex < twigLabels[branchIndex].count else {
                return "Twig \\(twigIndex + 1)"
            }
            return twigLabels[branchIndex][twigIndex]
        }

        /// Get branch name for a given index
        static func branchName(_ index: Int) -> String {
            guard index >= 0, index < branchNames.count else {
                return "Branch \\(index + 1)"
            }
            return branchNames[index]
        }
    }
}
`

// Ensure output directories exist
function ensureDir(filePath) {
  const dir = path.dirname(filePath)
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
}

ensureDir(swiftOutputPath)
ensureDir(tsOutputPath)

fs.writeFileSync(tsOutputPath, typescript)
console.log(\`Generated \${tsOutputPath}\`)

fs.writeFileSync(swiftOutputPath, swiftContent)
console.log(\`Generated \${swiftOutputPath}\`)
`

**Step 4: Run the generator**

Run: `node shared/generate-constants.js`
Expected: "Generated ../web/src/generated/constants.ts" and "Generated ../ios/Trunk/Generated/SharedConstants.swift"

**Step 5: Run test to verify it passes**

Run: `cd web && npm test -- --run generated-constants`
Expected: PASS

**Step 6: Update package.json with generate script**

Add to `web/package.json` scripts:
```json
"generate": "node ../shared/generate-constants.js"
```

**Step 7: Commit**

```bash
git add shared/generate-constants.js web/src/generated/constants.ts web/src/tests/generated-constants.test.ts web/package.json
git commit -m "feat: unified constants generator for TypeScript and Swift"
```

---

### Task 1.4: Migrate state.ts to Use Generated Constants

**Files:**
- Modify: `web/src/state.ts`
- Modify: `web/src/constants.ts`

**Step 1: Update web/src/constants.ts to re-export from generated**

Replace contents of `web/src/constants.ts` with:
```typescript
// Re-export generated constants
export {
  BRANCH_COUNT,
  TWIG_COUNT,
  STORAGE_KEYS,
} from './generated/constants'

// Storage key alias for backward compatibility
export const STORAGE_KEY = STORAGE_KEYS.nodeData

// UI-specific constants (not from shared)
export const STATUS_DEFAULT_MESSAGE = 'Saves locally.'
export const ZOOM_TRANSITION_DURATION = 420
export const EDITOR_OPEN_DELAY = 220
export const GUIDE_ANIMATION_DURATION = 520
```

**Step 2: Update state.ts imports**

Replace the sharedConstants import at line 4:
```typescript
import sharedConstants from '../../shared/constants.json'
```
with:
```typescript
import {
  SOIL_STARTING_CAPACITY,
  SOIL_MAX_CAPACITY,
  SOIL_RECOVERY_PER_WATER,
  SOIL_RECOVERY_PER_SUN,
  PLANTING_COSTS,
  ENVIRONMENT_MULTIPLIERS,
  RESULT_MULTIPLIERS,
  SEASONS,
  WATER_DAILY_CAPACITY,
  WATER_RESET_HOUR,
  SUN_WEEKLY_CAPACITY,
  STORAGE_KEYS,
} from './generated/constants'
```

**Step 3: Replace all sharedConstants references**

Update the following lines:
- Line 108: `RESOURCES_STORAGE_KEY` → use `STORAGE_KEYS.resources`
- Line 126-127: Use `SOIL_STARTING_CAPACITY`, `SOIL_MAX_CAPACITY`
- Line 132-133: Use `SOIL_RECOVERY_PER_WATER`, `SOIL_RECOVERY_PER_SUN`
- Line 136: Use `PLANTING_COSTS`
- Line 143-145: Use `SEASONS`, `ENVIRONMENT_MULTIPLIERS`, `RESULT_MULTIPLIERS`
- Line 192-193: Use `WATER_DAILY_CAPACITY`, `SUN_WEEKLY_CAPACITY`
- Line 197: Use `WATER_RESET_HOUR`
- Line 1057: Use `STORAGE_KEYS.settings`

**Step 4: Run tests**

Run: `cd web && npm test`
Expected: All tests pass.

**Step 5: Commit**

```bash
git add web/src/constants.ts web/src/state.ts
git commit -m "refactor: migrate state.ts to use generated constants"
```

---

## Phase 2: Pattern Consistency

### Task 2.1: Create Date Utilities Module

**Files:**
- Create: `web/src/utils/date.ts`
- Create: `web/src/tests/date.test.ts`

**Step 1: Write the failing tests**

Create `web/src/tests/date.test.ts`:
```typescript
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  getTodayResetTime,
  getWeekResetTime,
  getNextDailyReset,
  getNextWeeklyReset,
  formatResetTime,
  toISOString,
  parseISOString,
} from '../utils/date'

describe('date utilities', () => {
  beforeEach(() => {
    // Mock: Wednesday, Jan 15, 2025 at 10:00 AM
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2025-01-15T10:00:00'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('getTodayResetTime', () => {
    it('returns 6am today when after 6am', () => {
      const reset = getTodayResetTime()
      expect(reset.getHours()).toBe(6)
      expect(reset.getMinutes()).toBe(0)
      expect(reset.getDate()).toBe(15)
    })

    it('returns 6am yesterday when before 6am', () => {
      vi.setSystemTime(new Date('2025-01-15T05:00:00'))
      const reset = getTodayResetTime()
      expect(reset.getDate()).toBe(14)
      expect(reset.getHours()).toBe(6)
    })
  })

  describe('getWeekResetTime', () => {
    it('returns most recent Sunday 6am', () => {
      // Jan 15 is Wednesday, Sunday was Jan 12
      const reset = getWeekResetTime()
      expect(reset.getDay()).toBe(0) // Sunday
      expect(reset.getDate()).toBe(12)
      expect(reset.getHours()).toBe(6)
    })
  })

  describe('toISOString', () => {
    it('converts date to ISO string', () => {
      const date = new Date('2025-01-15T10:30:00Z')
      expect(toISOString(date)).toBe('2025-01-15T10:30:00.000Z')
    })
  })

  describe('parseISOString', () => {
    it('parses ISO string to date', () => {
      const date = parseISOString('2025-01-15T10:30:00.000Z')
      expect(date.toISOString()).toBe('2025-01-15T10:30:00.000Z')
    })
  })
})
```

**Step 2: Run test to verify it fails**

Run: `cd web && npm test -- --run date`
Expected: FAIL with "Cannot find module '../utils/date'"

**Step 3: Implement date utilities**

Create `web/src/utils/date.ts`:
```typescript
/**
 * Centralized date utilities for Trunk.
 * All timestamps use ISO 8601 strings for storage.
 * Reset times are at 6 AM local time.
 */

import { WATER_RESET_HOUR } from '../generated/constants'

// Debug clock offset (manipulated by debug panel)
let clockOffset = 0

export function getDebugNow(): number {
  return Date.now() + clockOffset
}

export function getDebugDate(): Date {
  return new Date(getDebugNow())
}

export function advanceClockByDays(days: number): void {
  clockOffset += days * 24 * 60 * 60 * 1000
}

export function setDebugDate(date: Date): void {
  clockOffset = date.getTime() - Date.now()
}

export function resetDebugClock(): void {
  clockOffset = 0
}

/**
 * Get the most recent daily reset time (6am today or yesterday if before 6am)
 */
export function getTodayResetTime(): Date {
  const now = getDebugDate()
  const reset = new Date(now)
  reset.setHours(WATER_RESET_HOUR, 0, 0, 0)

  if (now < reset) {
    reset.setDate(reset.getDate() - 1)
  }
  return reset
}

/**
 * Get the most recent weekly reset time (Sunday at 6am)
 */
export function getWeekResetTime(): Date {
  const now = getDebugDate()
  const reset = new Date(now)
  reset.setHours(WATER_RESET_HOUR, 0, 0, 0)

  // Find most recent Sunday
  const daysSinceSunday = reset.getDay()
  reset.setDate(reset.getDate() - daysSinceSunday)

  // If today is Sunday but before 6am, go back a week
  if (now.getDay() === 0 && now < reset) {
    reset.setDate(reset.getDate() - 7)
  }

  return reset
}

/**
 * Get next daily reset time
 */
export function getNextDailyReset(): Date {
  const reset = getTodayResetTime()
  reset.setDate(reset.getDate() + 1)
  return reset
}

/**
 * Get next weekly reset time
 */
export function getNextWeeklyReset(): Date {
  const reset = getWeekResetTime()
  reset.setDate(reset.getDate() + 7)
  return reset
}

/**
 * Format reset time for display: "Resets Wed 01/22 at 6:00 AM"
 */
export function formatResetTime(date: Date): string {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const day = days[date.getDay()]
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const dayNum = String(date.getDate()).padStart(2, '0')

  let hours = date.getHours()
  const ampm = hours >= 12 ? 'PM' : 'AM'
  hours = hours % 12 || 12
  const minutes = String(date.getMinutes()).padStart(2, '0')

  return `Resets ${day} ${month}/${dayNum} at ${hours}:${minutes} ${ampm}`
}

/**
 * Convert Date to ISO 8601 string
 */
export function toISOString(date: Date): string {
  return date.toISOString()
}

/**
 * Parse ISO 8601 string to Date
 */
export function parseISOString(isoString: string): Date {
  return new Date(isoString)
}

/**
 * Get ISO week string (YYYY-Www) for grouping
 */
export function getWeekString(date: Date): string {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() + 4 - (d.getDay() || 7))
  const yearStart = new Date(d.getFullYear(), 0, 1)
  const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
  return `${d.getFullYear()}-W${weekNo}`
}

/**
 * Get date string (YYYY-MM-DD) for grouping
 */
export function getDateString(date: Date): string {
  return date.toISOString().split('T')[0]
}
```

**Step 4: Run test to verify it passes**

Run: `cd web && npm test -- --run date`
Expected: PASS

**Step 5: Commit**

```bash
git add web/src/utils/date.ts web/src/tests/date.test.ts
git commit -m "feat: add centralized date utilities module"
```

---

### Task 2.2: Fix Immutability Violations in state.ts

**Files:**
- Modify: `web/src/state.ts`

**Step 1: Find all mutations**

Run: `grep -n "\.length = 0\|\.push(\|delete " web/src/state.ts`

Known mutations to fix:
- Line 538: `sunLog.length = 0` → reassign empty array
- Line 541: `soilLog.length = 0` → reassign empty array
- Line 630: `nodeState[twigId].leaves.push(leaf)` → spread operator
- Line 653: `sprout.waterEntries.push(...)` → spread operator
- Line 671: `sunLog.push(...)` → spread operator
- Line 882: `soilLog.push(...)` → spread operator
- Line 950: `delete nodeState[key]` → reassign filtered object

**Step 2: Refactor to immutable patterns**

For each mutation, create a new array/object instead of mutating.

Example fix for line 538:
```typescript
// Before (mutation)
sunLog.length = 0

// After (immutable - but sunLog is exported, so we need a different approach)
// Since sunLog is an exported mutable reference, we'll splice in place
// OR refactor to use a getter pattern
```

**Note:** This task requires careful refactoring because `sunLog` and `soilLog` are exported as mutable arrays. The proper fix is to:
1. Make them private
2. Export getter functions
3. Export append functions that create new arrays

This is a larger refactor that ties into Phase 4 (event sourcing). For now, document the violations and defer to Phase 4.

**Step 3: Commit documentation**

```bash
git add -A
git commit -m "docs: document immutability violations for Phase 4 migration"
```

---

## Phase 3: Function Decomposition

### Task 3.1: Extract buildSproutForm from twig-view.ts

**Files:**
- Create: `web/src/ui/twig-view/sprout-form.ts`
- Modify: `web/src/ui/twig-view.ts`

**Step 1: Write test for sprout form builder**

Create `web/src/tests/sprout-form.test.ts`:
```typescript
import { describe, it, expect, beforeEach } from 'vitest'
import { buildSproutForm, type SproutFormElements } from '../ui/twig-view/sprout-form'

describe('buildSproutForm', () => {
  let container: HTMLElement
  let elements: SproutFormElements

  beforeEach(() => {
    container = document.createElement('div')
    elements = buildSproutForm(container)
  })

  it('creates title input', () => {
    expect(elements.titleInput).toBeInstanceOf(HTMLInputElement)
    expect(elements.titleInput.placeholder).toContain('sprout')
  })

  it('creates season buttons', () => {
    expect(elements.seasonButtons).toHaveLength(5)
    expect(elements.seasonButtons[0].dataset.season).toBe('2w')
  })

  it('creates environment buttons', () => {
    expect(elements.envButtons).toHaveLength(3)
    expect(elements.envButtons[0].dataset.env).toBe('fertile')
  })

  it('creates bloom inputs', () => {
    expect(elements.witherInput).toBeInstanceOf(HTMLInputElement)
    expect(elements.buddingInput).toBeInstanceOf(HTMLInputElement)
    expect(elements.flourishInput).toBeInstanceOf(HTMLInputElement)
  })

  it('creates plant button', () => {
    expect(elements.plantButton).toBeInstanceOf(HTMLButtonElement)
    expect(elements.plantButton.disabled).toBe(true)
  })
})
```

**Step 2: Run test to verify it fails**

Run: `cd web && npm test -- --run sprout-form`
Expected: FAIL with "Cannot find module '../ui/twig-view/sprout-form'"

**Step 3: Extract sprout form builder**

Create `web/src/ui/twig-view/sprout-form.ts` with the form building logic extracted from `buildTwigView()`.

**Step 4: Run test to verify it passes**

Run: `cd web && npm test -- --run sprout-form`
Expected: PASS

**Step 5: Update twig-view.ts to use extracted module**

Import and use `buildSproutForm()` instead of inline HTML.

**Step 6: Run full test suite**

Run: `cd web && npm test`
Expected: All tests pass.

**Step 7: Commit**

```bash
git add web/src/ui/twig-view/sprout-form.ts web/src/ui/twig-view.ts web/src/tests/sprout-form.test.ts
git commit -m "refactor: extract buildSproutForm from twig-view.ts"
```

---

### Task 3.2: Extract buildSproutCard from twig-view.ts

**Files:**
- Create: `web/src/ui/twig-view/sprout-card.ts`
- Modify: `web/src/ui/twig-view.ts`

(Similar pattern to Task 3.1 - write test, fail, implement, pass, commit)

---

### Task 3.3: Split state.ts into Modules

**Files:**
- Create: `web/src/state/node-state.ts`
- Create: `web/src/state/view-state.ts`
- Create: `web/src/state/resources.ts`
- Create: `web/src/state/migrations.ts`
- Create: `web/src/state/index.ts`
- Remove: `web/src/state.ts`

**Step 1: Create state/index.ts that re-exports everything**

This maintains backward compatibility while splitting implementation.

**Step 2: Extract node-state.ts**

Move nodeState, loadState, saveState, normalizeNodeData, preset loading.

**Step 3: Extract view-state.ts**

Move viewMode, activeBranchIndex, activeTwigId, hoveredBranchIndex, focusedNode, activeNode and their getters/setters.

**Step 4: Extract resources.ts**

Move soil/water/sun state and APIs.

**Step 5: Extract migrations.ts**

Move MIGRATIONS, runMigrations, CURRENT_SCHEMA_VERSION.

**Step 6: Update all imports across codebase**

Find all `from '../state'` and `from './state'` imports, verify they still work with index.ts re-exports.

**Step 7: Run tests**

Run: `cd web && npm test`
Expected: All tests pass.

**Step 8: Commit**

```bash
git add web/src/state/ -A
git rm web/src/state.ts
git commit -m "refactor: split state.ts into focused modules"
```

---

## Phase 4: Event Sourcing Migration (Incremental)

### Task 4.1: Migrate Sprout State to Events

**Goal:** Remove sprouts from nodeState, derive entirely from events.

**Files:**
- Modify: `web/src/events/derive.ts`
- Modify: `web/src/state/node-state.ts`
- Modify: `web/src/ui/twig-view.ts`

**Step 1: Ensure all sprout operations go through events**

Audit twig-view.ts for any direct nodeState.sprouts mutations.

**Step 2: Remove sprouts from nodeState persistence**

Keep in-memory for backward compat but don't save to localStorage.

**Step 3: Derive sprouts from events on load**

In loadState(), populate sprouts by replaying events.

**Step 4: Run tests**

All tests should pass with derived sprouts.

**Step 5: Commit**

```bash
git add -A
git commit -m "refactor: derive sprouts from event log, remove from persistence"
```

---

### Task 4.2: Migrate Leaf State to Events

(Similar pattern to Task 4.1)

---

### Task 4.3: Migrate Resource State to Events

**Goal:** Remove resourceState, derive soil/water/sun entirely from events.

**Files:**
- Modify: `web/src/events/derive.ts`
- Modify: `web/src/state/resources.ts`

**Step 1: Add resource derivation functions**

`deriveSoilState()`, `deriveWaterState()`, `deriveSunState()` from event log.

**Step 2: Replace stored counters with derived values**

**Step 3: Remove legacy resource storage**

**Step 4: Run tests**

**Step 5: Commit**

```bash
git add -A
git commit -m "refactor: derive all resources from event log"
```

---

### Task 4.4: Remove Legacy Dual State

**Goal:** Clean up all legacy state code, leaving only event-sourced architecture.

**Files:**
- Modify: `web/src/state/index.ts`
- Remove: Legacy persistence code

**Step 1: Remove nodeState mutations**

**Step 2: Remove sunLog/soilLog direct arrays**

**Step 3: Update all callers to use event-derived state**

**Step 4: Final cleanup and documentation**

**Step 5: Commit**

```bash
git add -A
git commit -m "refactor: complete event sourcing migration, remove legacy state"
```

---

## Verification Checklist

After all phases:

- [ ] `npm test` passes (web)
- [ ] `npm run build` succeeds (web)
- [ ] `node shared/generate-constants.js` runs without error
- [ ] iOS builds with generated constants
- [ ] All immutability violations resolved
- [ ] state.ts split into <400 line modules
- [ ] twig-view.ts split into <400 line modules
- [ ] No direct localStorage access outside persistence layer
- [ ] All timestamps use ISO 8601 strings

---

## Summary

| Phase | Tasks | Estimated Steps |
|-------|-------|-----------------|
| 1. Foundation | 4 tasks | ~25 steps |
| 2. Patterns | 2 tasks | ~15 steps |
| 3. Decomposition | 3 tasks | ~30 steps |
| 4. Event Sourcing | 4 tasks | ~40 steps |
| **Total** | **13 tasks** | **~110 steps** |

Each step is 2-5 minutes. Total estimated time: 4-9 hours of focused work.
