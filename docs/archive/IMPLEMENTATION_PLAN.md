# Implementation Plan: Technical Debt & Architecture Improvements

**Generated**: 2026-02-15
**Status**: Planning Phase
**Estimated Total Effort**: 6-8 weeks (280-360 hours)

---

## 1. Executive Summary

This document consolidates detailed implementation plans from five parallel planning agents, covering critical fixes, cross-platform consistency, code quality improvements, architectural optimization, and cleanup tasks.

### Total Effort by Phase

| Phase | Duration | Effort (hours) | Risk Level | Parallelizable |
|-------|----------|----------------|------------|----------------|
| **Phase 1**: Critical Correctness & Security | 1-2 weeks | 12-16 | CRITICAL-MEDIUM | Sequential (recommended order) |
| **Phase 2**: Cross-Platform Consistency | 2-3 weeks | 18-23 | LOW-MEDIUM | Fully parallel |
| **Phase 3**: Code Quality & Maintainability | 3-4 weeks | 26-36 | MEDIUM-HIGH | Web/iOS tracks parallel |
| **Phase 4**: Architecture & Performance | 4-6 weeks | 160-240 | MEDIUM-HIGH | Partially parallel |
| **Phase 5**: Cleanup & Documentation | 1 day | 5.25 | LOW | Fully parallel |
| **TOTAL** | **6-8 weeks** | **280-360** | - | - |

### Priority Distribution

- **CRITICAL**: 1 item (M2 - hardcoded token)
- **HIGH**: 10 items (security, correctness, architecture)
- **MEDIUM**: 7 items (consistency, refactoring)
- **LOW**: 3 items (cleanup, documentation)

---

## 2. Dependency Graph

```
PHASE 1 (Sequential - blocking for Phase 3)
  M2 (token security) ──┐
  M21 (array bounds)    │
  H7 (DOM access) ──────┼──► PHASE 3 (Web refactoring)
  H5 (timestamps)       │
                        └──► PHASE 2 (Can run in parallel)

PHASE 2 (All parallel)
  H1 (cross-platform tests) ──┐
  H10 (error handling)        │──► No blockers, independent
  M19 (ID generation)         │
  M13 (sync protocol docs)  ──┘

PHASE 3 (Two parallel tracks)
  H7 completion ──► H6 (split main.ts) ──┐
                    H2 (dom-builder)     │──► Web track
                    H4 (twig-view) ──────┘

  H9 (iOS views) ──────────────────────────► iOS track (independent)

PHASE 4 (Partially sequential)
  H8 (event derivation) ──► H13 (optimize loops)

  H3 (complete event sourcing) ──┐
  M8 (split sync services) ──────┼──► Can run in parallel with H8/H13

PHASE 5 (All parallel)
  M1, L3, M15 ──► Quick wins, no dependencies
```

### Critical Path

**M2 → H7 → H6 → H8 → H13** (longest sequential chain: ~4-5 weeks)

### Recommended Execution Order

1. **Week 1-2**: Phase 1 (M2 → M21 → H7 → H5)
2. **Week 2-3**: Phase 2 (all items parallel) + start Phase 3 iOS track (H9)
3. **Week 3-4**: Phase 3 Web track (H6 → H2 → H4)
4. **Week 4-8**: Phase 4 (H8 → H13, then H3 || M8)
5. **Week 8**: Phase 5 (all items parallel, 1 day)

---

## 3. Risk Assessment Summary

### Critical Risks (Immediate Action Required)

| Item | Risk | Impact | Mitigation |
|------|------|--------|------------|
| **M2** | Exposed Supabase token in `.mcp.json` | Security breach, data access | Rotate token immediately, add to .gitignore, create template |
| **H7** | 76 unsafe DOM assertions | Runtime crashes on malformed HTML | Add `requireElement()` helper with descriptive errors |
| **H6** | Complex initialization refactor | App won't start if order wrong | Draw dependency graph first, use async/await, rollback plan |
| **H3** | Event sourcing migration | Data loss risk | Create backup, migration flag, rollback procedure |

### Medium Risks (Plan Carefully)

| Item | Risk | Mitigation |
|------|------|------------|
| **H5** | Timestamp format change | Use backward-compatible parser, only new events affected |
| **M19** | ID generation change | Only affects new IDs, existing preserved in event log |
| **H4** | Twig-view stateful refactor | Preserve closure variables, test delegation pattern thoroughly |
| **H9** | iOS view state propagation | Test @Bindable, navigation flows, chart gestures |
| **H8** | Event derivation performance | Rollback to legacy, feature flag, run both in parallel 1 week |
| **M8** | Sync service split | Backward-compatible facade, feature flag, legacy fallback |

### Low Risks (Standard Testing)

All Phase 2 items, H2, H13, Phase 5 items.

---

## 4. Detailed Phase Breakdown

### PHASE 1: Critical Correctness & Security (12-16 hours)

**Goal**: Fix security vulnerabilities and correctness issues that could cause data loss or crashes.

**Recommended Order**: M2 → M21 → H7 → H5

#### M2: Secure Hardcoded Access Token (1 hour) ⚠️ CRITICAL

**Problem**: `.mcp.json` contains Supabase access token in plaintext, checked into version control.

**Impact**: Security breach - anyone with repo access can read/write user data.

**Files**:
- `.mcp.json` (contains token)
- `.gitignore` (add .mcp.json)
- `docs/ONBOARDING.md` (setup instructions)

**Implementation**:
1. Create `.mcp.example.json` template:
   ```json
   {
     "mcpServers": {
       "supabase": {
         "command": "npx",
         "args": ["-y", "@modelcontextprotocol/server-supabase", "--access-token", "${SUPABASE_ACCESS_TOKEN}"]
       }
     }
   }
   ```
2. Add `.mcp.json` to `.gitignore`
3. Rotate token in Supabase console immediately
4. Update `docs/ONBOARDING.md`:
   ```markdown
   ## MCP Setup
   1. Copy `.mcp.example.json` to `.mcp.json`
   2. Get access token from Supabase console
   3. Replace `${SUPABASE_ACCESS_TOKEN}` with actual token
   ```

**Acceptance Criteria**:
- [ ] Token rotated in Supabase
- [ ] `.mcp.json` added to `.gitignore`
- [ ] `.mcp.example.json` template created
- [ ] `docs/ONBOARDING.md` updated with setup instructions
- [ ] Old token no longer works

**Rollback**: Revert `.gitignore`, restore old token (not recommended).

---

#### M21: Add Array Bounds Checks (2 hours)

**Problem**: `web/src/services/sync-service.ts:122` accesses `syncEvents[syncEvents.length - 1]` without checking if array is empty.

**Impact**: Runtime crash when syncing empty event log.

**Files**:
- `web/src/services/sync-service.ts`
- `web/src/tests/sync-service.test.ts`

**Implementation**:
```typescript
// Before (line 122)
const lastSyncedTimestamp = syncEvents[syncEvents.length - 1].created_at

// After
if (syncEvents.length === 0) {
  // No events synced yet - this is the first sync
  return null // or appropriate default
}
const lastSyncedTimestamp = syncEvents[syncEvents.length - 1].created_at
```

**New Tests** (`sync-service.test.ts`):
```typescript
describe('sync-service edge cases', () => {
  it('handles empty sync events array', async () => {
    // Setup: mock Supabase to return empty array
    // Expect: No crash, returns null or default
  })

  it('handles single event in array', async () => {
    // Setup: mock Supabase to return 1 event
    // Expect: Uses that event's timestamp
  })
})
```

**Acceptance Criteria**:
- [ ] Guard clause added before array access
- [ ] Tests cover empty array scenario
- [ ] Tests cover single-item array
- [ ] No remaining unchecked array access in sync-service.ts

**Rollback**: Remove guard clause, delete tests.

---

#### H7: Fix Unsafe DOM Element Access (3-4 hours)

**Problem**: `web/src/ui/dom-builder.ts:532-607` has 76 `querySelector(...)!` calls that force non-null assertion.

**Impact**: Runtime crashes if HTML structure changes or elements missing.

**Files**:
- `web/src/ui/dom-builder.ts`
- `web/src/utils/dom-helpers.ts` (new)
- `web/src/tests/dom-builder.test.ts`

**Implementation**:

1. Create `web/src/utils/dom-helpers.ts`:
```typescript
export function requireElement<T extends Element>(
  parent: Element | Document,
  selector: string,
  description: string
): T {
  const element = parent.querySelector<T>(selector)
  if (!element) {
    throw new Error(
      `Required element not found: ${description} (selector: "${selector}")`
    )
  }
  return element
}
```

2. Replace all 76 instances in `dom-builder.ts`:
```typescript
// Before
const waterBtn = mainHeader.querySelector('.water-btn')!

// After
const waterBtn = requireElement<HTMLButtonElement>(
  mainHeader,
  '.water-btn',
  'Water button in main header'
)
```

3. Add tests:
```typescript
describe('requireElement', () => {
  it('returns element when found', () => {
    const div = document.createElement('div')
    div.innerHTML = '<button class="test">Click</button>'
    const btn = requireElement(div, '.test', 'test button')
    expect(btn.textContent).toBe('Click')
  })

  it('throws descriptive error when not found', () => {
    const div = document.createElement('div')
    expect(() =>
      requireElement(div, '.missing', 'missing button')
    ).toThrow('Required element not found: missing button (selector: ".missing")')
  })
})
```

**Acceptance Criteria**:
- [ ] `requireElement()` helper created in `web/src/utils/dom-helpers.ts`
- [ ] Zero remaining `querySelector(...)!` in dom-builder.ts
- [ ] All 76 calls replaced with `requireElement()`
- [ ] Descriptive error messages for each element
- [ ] Unit tests pass
- [ ] No visual regressions

**Rollback**: Revert to `querySelector(...)!` calls, delete helper.

---

#### H5: Standardize Timestamp Format (6-8 hours)

**Problem**: iOS generates timestamps without milliseconds (e.g., `2024-01-15T10:30:00Z`), web always includes them (e.g., `2024-01-15T10:30:00.123Z`). This causes sync conflicts and ordering issues.

**Impact**: Events from different platforms can't be reliably ordered by timestamp.

**Files**:
- `ios/Trunk/Extensions/DateFormatting.swift`
- `ios/TrunkTests/DateFormattingTests.swift` (new)
- `web/src/tests/timestamp-validation.test.ts` (new)
- `shared/schemas/events.schema.json`
- `shared/protocols.md` (new)
- `shared/test-fixtures/timestamp-validation.json` (new)

**Implementation**:

1. **iOS Fix** (`DateFormatting.swift:33-39`):
```swift
// Before
public static func formatEventTimestamp(_ date: Date) -> String {
  let formatter = ISO8601DateFormatter()
  formatter.formatOptions = [.withInternetDateTime]
  return formatter.string(from: date)
}

// After
public static func formatEventTimestamp(_ date: Date) -> String {
  let formatter = ISO8601DateFormatter()
  formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
  return formatter.string(from: date)
}
```

2. **Schema Update** (`shared/schemas/events.schema.json`):
```json
{
  "timestamp": {
    "type": "string",
    "pattern": "^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}\\.\\d{3}Z$",
    "description": "ISO 8601 timestamp with milliseconds (YYYY-MM-DDTHH:mm:ss.SSSZ)"
  }
}
```

3. **Protocol Documentation** (`shared/protocols.md`):
```markdown
## Timestamp Format

All event timestamps MUST use ISO 8601 format with milliseconds:

**Format**: `YYYY-MM-DDTHH:mm:ss.SSSZ`

**Examples**:
- Valid: `2024-01-15T10:30:00.123Z`
- Valid: `2024-01-15T10:30:00.000Z`
- Invalid: `2024-01-15T10:30:00Z` (missing milliseconds)
- Invalid: `2024-01-15T10:30:00.12Z` (only 2 digits)

**Platform Implementation**:
- Web: `new Date().toISOString()` (always includes .SSS)
- iOS: `ISO8601DateFormatter` with `.withFractionalSeconds`

**Parsing**: Both platforms MUST accept timestamps with or without milliseconds for backward compatibility.
```

4. **Test Fixture** (`shared/test-fixtures/timestamp-validation.json`):
```json
{
  "validTimestamps": [
    "2024-01-15T10:30:00.123Z",
    "2024-01-15T10:30:00.000Z",
    "2024-12-31T23:59:59.999Z"
  ],
  "invalidTimestamps": [
    "2024-01-15T10:30:00Z",
    "2024-01-15T10:30:00.12Z",
    "2024-01-15 10:30:00.123Z",
    "2024-01-15T10:30:00.123"
  ]
}
```

5. **iOS Tests** (`ios/TrunkTests/DateFormattingTests.swift`):
```swift
func testTimestampFormatIncludesMilliseconds() {
  let date = Date()
  let timestamp = DateFormatting.formatEventTimestamp(date)

  // Should match pattern: YYYY-MM-DDTHH:mm:ss.SSSZ
  let pattern = #"^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$"#
  let regex = try! NSRegularExpression(pattern: pattern)
  let matches = regex.matches(in: timestamp, range: NSRange(timestamp.startIndex..., in: timestamp))

  XCTAssertEqual(matches.count, 1, "Timestamp must include milliseconds: \(timestamp)")
}

func testTimestampHasExactlyThreeDecimalDigits() {
  let timestamp = DateFormatting.formatEventTimestamp(Date())
  let components = timestamp.split(separator: ".")
  let fractional = components[1].prefix(3)

  XCTAssertEqual(fractional.count, 3, "Must have exactly 3 decimal digits")
}

func testTimestampEndsWithZ() {
  let timestamp = DateFormatting.formatEventTimestamp(Date())
  XCTAssertTrue(timestamp.hasSuffix("Z"), "Timestamp must be in UTC (end with Z)")
}
```

6. **Web Tests** (`web/src/tests/timestamp-validation.test.ts`):
```typescript
import { describe, it, expect } from 'vitest'
import timestampFixture from '../../shared/test-fixtures/timestamp-validation.json'

const TIMESTAMP_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/

describe('Timestamp Format', () => {
  it('generates timestamps with milliseconds', () => {
    const timestamp = new Date().toISOString()
    expect(timestamp).toMatch(TIMESTAMP_PATTERN)
  })

  it('validates correct timestamp formats', () => {
    timestampFixture.validTimestamps.forEach(ts => {
      expect(ts).toMatch(TIMESTAMP_PATTERN)
    })
  })

  it('rejects invalid timestamp formats', () => {
    timestampFixture.invalidTimestamps.forEach(ts => {
      expect(ts).not.toMatch(TIMESTAMP_PATTERN)
    })
  })
})
```

**Acceptance Criteria**:
- [ ] All iOS timestamps include exactly 3 millisecond digits
- [ ] All web timestamps include exactly 3 millisecond digits
- [ ] Schema validates timestamp pattern
- [ ] `shared/protocols.md` documents standard
- [ ] iOS tests pass (format, digits, UTC)
- [ ] Web tests pass (format validation)
- [ ] Cross-platform test fixture created

**Backward Compatibility**: iOS parser already handles both formats via `ISO8601DateFormatter` - only new events affected.

**Rollback**: Remove `.withFractionalSeconds`, revert schema pattern.

---

### PHASE 2: Cross-Platform Consistency (18-23 hours)

**Goal**: Ensure identical behavior across web and iOS platforms through shared specifications and test fixtures.

**Execution**: All items can run in parallel - no internal dependencies.

#### H1: Cross-Platform Business Logic Tests (6-8 hours)

**Problem**: No automated tests verify that web and iOS implement business logic identically.

**Impact**: Platforms can drift silently, causing sync conflicts and user confusion.

**Files**:
- `shared/test-fixtures/cross-platform-validation.json` (new, ~800 lines)
- `web/src/tests/cross-platform-parity.test.ts` (new, ~300 lines)
- `ios/TrunkTests/CrossPlatformParityTests.swift` (new, ~400 lines)
- `ios/TrunkTests/TestFixtureLoader.swift` (new, ~50 lines)
- `.github/workflows/cross-platform-parity.yml` (new)

**Implementation**:

1. **Test Fixture** (`shared/test-fixtures/cross-platform-validation.json`):
```json
{
  "soilCostTests": [
    {
      "name": "2 week fertile sprout",
      "season": "2w",
      "environment": "fertile",
      "expected": 2
    },
    {
      "name": "1 year barren sprout",
      "season": "1y",
      "environment": "barren",
      "expected": 24
    }
    // ... 10 total (all season × environment combinations)
  ],

  "capacityRewardTests": [
    {
      "name": "negative capacity (edge case)",
      "baseSoilCost": 5,
      "environment": "firm",
      "result": 3,
      "currentCapacity": -10,
      "expected": 0
    },
    {
      "name": "max capacity ceiling",
      "baseSoilCost": 12,
      "environment": "barren",
      "result": 5,
      "currentCapacity": 119.5,
      "expected": 0.5
    },
    {
      "name": "fractional result",
      "baseSoilCost": 8,
      "environment": "firm",
      "result": 4,
      "currentCapacity": 50,
      "expected": 5.23
    }
    // ... 15 total (edge cases + normal cases)
  ],

  "resetTimeTests": [
    {
      "name": "water reset at 6am local",
      "currentTime": "2024-01-15T05:59:59Z",
      "timezone": "America/Los_Angeles",
      "expected": "2024-01-15T14:00:00Z"
    },
    {
      "name": "DST spring forward",
      "currentTime": "2024-03-10T10:00:00Z",
      "timezone": "America/Los_Angeles",
      "expected": "2024-03-11T13:00:00Z"
    },
    {
      "name": "leap day",
      "currentTime": "2024-02-29T10:00:00Z",
      "timezone": "UTC",
      "expected": "2024-03-01T06:00:00Z"
    },
    {
      "name": "year boundary",
      "currentTime": "2024-12-31T23:59:59Z",
      "timezone": "Pacific/Auckland",
      "expected": "2025-01-01T18:00:00Z"
    }
    // ... 20 total (DST, leap days, year boundaries, timezones)
  ],

  "resourceAvailabilityTests": [
    {
      "name": "water fully available",
      "waterCapacity": 3,
      "waterEntriesSince6am": [],
      "expected": 3
    },
    {
      "name": "water partially used",
      "waterCapacity": 3,
      "waterEntriesSince6am": [
        { "timestamp": "2024-01-15T10:00:00.123Z" },
        { "timestamp": "2024-01-15T15:30:00.456Z" }
      ],
      "expected": 1
    },
    {
      "name": "sun available on Monday",
      "sunCapacity": 1,
      "sunEntriesSinceMonday6am": [],
      "currentDay": "Monday",
      "expected": 1
    },
    {
      "name": "sun used this week",
      "sunCapacity": 1,
      "sunEntriesSinceMonday6am": [
        { "timestamp": "2024-01-15T12:00:00.789Z" }
      ],
      "currentDay": "Wednesday",
      "expected": 0
    }
    // ... 15 total
  ],

  "eventDerivationTests": [
    {
      "name": "empty log",
      "events": [],
      "expected": {
        "soilCapacity": 10,
        "soilAvailable": 10,
        "sprouts": [],
        "leaves": []
      }
    },
    {
      "name": "sprout lifecycle",
      "events": [
        {
          "type": "sprout-planted",
          "sproutId": "sprout-123",
          "twigId": "branch-0-twig-0",
          "title": "Test Goal",
          "season": "1m",
          "environment": "fertile",
          "soilCost": 3,
          "timestamp": "2024-01-01T10:00:00.000Z"
        },
        {
          "type": "sprout-watered",
          "sproutId": "sprout-123",
          "note": "Made progress",
          "timestamp": "2024-01-02T10:00:00.000Z"
        },
        {
          "type": "sprout-harvested",
          "sproutId": "sprout-123",
          "result": 4,
          "timestamp": "2024-02-01T10:00:00.000Z"
        }
      ],
      "expected": {
        "soilCapacity": 11.23,
        "soilAvailable": 11.28,
        "sprouts": [
          {
            "id": "sprout-123",
            "state": "completed",
            "result": 4,
            "waterEntries": 1
          }
        ]
      }
    },
    {
      "name": "capacity clamping at max",
      "events": [
        /* ... events that would exceed 120 capacity ... */
      ],
      "expected": {
        "soilCapacity": 120.0
      }
    },
    {
      "name": "event ordering",
      "events": [
        /* ... out-of-order events ... */
      ],
      "expected": {
        /* ... correct derived state ... */
      }
    },
    {
      "name": "duplicate event handling",
      "events": [
        { "type": "sprout-planted", "sproutId": "sprout-123", /* ... */ },
        { "type": "sprout-planted", "sproutId": "sprout-123", /* ... */ }
      ],
      "expected": {
        "sprouts": [/* single sprout, not duplicated */]
      }
    }
    // ... 30 total
  ]
}
```

2. **Web Tests** (`web/src/tests/cross-platform-parity.test.ts`):
```typescript
import { describe, it, expect } from 'vitest'
import fixture from '../../shared/test-fixtures/cross-platform-validation.json'
import { calculateSoilCost, calculateCapacityReward } from '../utils/calculations'
import { getNextWaterReset, getNextSunReset } from '../utils/reset-times'
import { getWaterAvailable, getSunAvailable } from '../events/derive'
import { deriveState } from '../events/derive'

describe('Cross-Platform Parity: Soil Costs', () => {
  fixture.soilCostTests.forEach(test => {
    it(test.name, () => {
      const actual = calculateSoilCost(test.season, test.environment)
      expect(actual).toBe(test.expected)
    })
  })
})

describe('Cross-Platform Parity: Capacity Rewards', () => {
  fixture.capacityRewardTests.forEach(test => {
    it(test.name, () => {
      const actual = calculateCapacityReward(
        test.baseSoilCost,
        test.environment,
        test.result,
        test.currentCapacity
      )
      expect(actual).toBeCloseTo(test.expected, 2)
    })
  })
})

describe('Cross-Platform Parity: Reset Times', () => {
  fixture.resetTimeTests.forEach(test => {
    it(test.name, () => {
      const currentTime = new Date(test.currentTime)
      const actual = getNextWaterReset(currentTime, test.timezone)
      expect(actual.toISOString()).toBe(test.expected)
    })
  })
})

describe('Cross-Platform Parity: Resource Availability', () => {
  fixture.resourceAvailabilityTests.forEach(test => {
    it(test.name, () => {
      // Setup mock event log with water/sun entries
      // Call getWaterAvailable() or getSunAvailable()
      // Assert matches expected
    })
  })
})

describe('Cross-Platform Parity: Event Derivation', () => {
  fixture.eventDerivationTests.forEach(test => {
    it(test.name, () => {
      const state = deriveState(test.events)
      expect(state.soilCapacity).toBeCloseTo(test.expected.soilCapacity, 2)
      expect(state.soilAvailable).toBeCloseTo(test.expected.soilAvailable, 2)
      expect(state.sprouts).toMatchObject(test.expected.sprouts)
    })
  })
})
```

3. **iOS Tests** (`ios/TrunkTests/CrossPlatformParityTests.swift`):
```swift
import XCTest
@testable import Trunk

class CrossPlatformParityTests: XCTestCase {
  var fixture: CrossPlatformFixture!

  override func setUp() {
    fixture = TestFixtureLoader.loadCrossPlatformFixture()
  }

  func testSoilCosts() {
    for test in fixture.soilCostTests {
      let actual = Calculations.calculateSoilCost(
        season: Season(rawValue: test.season)!,
        environment: Environment(rawValue: test.environment)!
      )
      XCTAssertEqual(actual, test.expected, test.name)
    }
  }

  func testCapacityRewards() {
    for test in fixture.capacityRewardTests {
      let actual = Calculations.calculateCapacityReward(
        baseSoilCost: test.baseSoilCost,
        environment: Environment(rawValue: test.environment)!,
        result: test.result,
        currentCapacity: test.currentCapacity
      )
      XCTAssertEqual(actual, test.expected, accuracy: 0.01, test.name)
    }
  }

  func testResetTimes() {
    for test in fixture.resetTimeTests {
      let currentTime = ISO8601DateFormatter().date(from: test.currentTime)!
      let timezone = TimeZone(identifier: test.timezone)!
      let actual = ResetTimes.getNextWaterReset(from: currentTime, timezone: timezone)
      XCTAssertEqual(actual.iso8601String, test.expected, test.name)
    }
  }

  func testResourceAvailability() {
    for test in fixture.resourceAvailabilityTests {
      // Setup mock event log
      // Call resourceAvailability functions
      // Assert matches expected
    }
  }

  func testEventDerivation() {
    for test in fixture.eventDerivationTests {
      let state = EventDerivation.deriveState(from: test.events)
      XCTAssertEqual(state.soilCapacity, test.expected.soilCapacity, accuracy: 0.01, test.name)
      XCTAssertEqual(state.soilAvailable, test.expected.soilAvailable, accuracy: 0.01, test.name)
      XCTAssertEqual(state.sprouts.count, test.expected.sprouts.count, test.name)
    }
  }
}
```

4. **Test Fixture Loader** (`ios/TrunkTests/TestFixtureLoader.swift`):
```swift
struct CrossPlatformFixture: Codable {
  let soilCostTests: [SoilCostTest]
  let capacityRewardTests: [CapacityRewardTest]
  let resetTimeTests: [ResetTimeTest]
  let resourceAvailabilityTests: [ResourceAvailabilityTest]
  let eventDerivationTests: [EventDerivationTest]
}

class TestFixtureLoader {
  static func loadCrossPlatformFixture() -> CrossPlatformFixture {
    let url = Bundle(for: Self.self)
      .url(forResource: "cross-platform-validation", withExtension: "json", subdirectory: "../shared/test-fixtures")!
    let data = try! Data(contentsOf: url)
    return try! JSONDecoder().decode(CrossPlatformFixture.self, from: data)
  }
}
```

5. **CI Pipeline** (`.github/workflows/cross-platform-parity.yml`):
```yaml
name: Cross-Platform Parity

on: [push, pull_request]

jobs:
  web:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: cd web && npm install
      - run: cd web && npm run test:cross-platform

  ios:
    runs-on: macos-latest
    steps:
      - uses: actions/checkout@v4
      - run: xcodebuild test -project ios/Trunk.xcodeproj -scheme Trunk -destination 'platform=iOS Simulator,name=iPhone 15'
```

**Acceptance Criteria**:
- [ ] 90+ test cases in shared fixture
- [ ] All web tests pass
- [ ] All iOS tests pass
- [ ] CI pipeline runs both platforms
- [ ] All tests produce identical results

**Rollback**: Delete test files, remove CI pipeline.

---

#### H10: Error Handling Alignment (4-5 hours)

**Problem**: Web and iOS show different error messages for the same failures.

**Impact**: Inconsistent user experience, harder to debug cross-platform issues.

**Files**:
- `shared/error-codes.json` (new, ~200 lines)
- `web/src/utils/error-codes.ts` (new, ~60 lines)
- `ios/Trunk/Utils/ErrorCodes.swift` (new, ~80 lines)
- `ios/Trunk/Services/AuthService.swift` (update error enum)
- `docs/ARCHITECTURE.md` (add error handling section)

**Implementation**:

1. **Error Code Registry** (`shared/error-codes.json`):
```json
{
  "auth": {
    "NOT_CONFIGURED": {
      "code": "AUTH_001",
      "defaultMessage": "Supabase authentication is not configured",
      "userMessage": "Sign-in is currently unavailable. Please try again later."
    },
    "INVALID_CODE": {
      "code": "AUTH_002",
      "defaultMessage": "Invalid or expired verification code",
      "userMessage": "That code didn't work. Please check and try again."
    },
    "CODE_EXPIRED": {
      "code": "AUTH_003",
      "defaultMessage": "Verification code has expired",
      "userMessage": "Your code has expired. Request a new one."
    },
    "RATE_LIMITED": {
      "code": "AUTH_004",
      "defaultMessage": "Too many sign-in attempts",
      "userMessage": "Too many attempts. Please wait a moment and try again."
    }
  },

  "sync": {
    "NOT_CONFIGURED": {
      "code": "SYNC_001",
      "defaultMessage": "Supabase sync is not configured",
      "userMessage": "Sync is currently unavailable. Please try again later."
    },
    "NOT_AUTHENTICATED": {
      "code": "SYNC_002",
      "defaultMessage": "User not authenticated for sync",
      "userMessage": "Please sign in to sync your data."
    },
    "NETWORK_ERROR": {
      "code": "SYNC_003",
      "defaultMessage": "Network request failed",
      "userMessage": "Couldn't connect. Check your internet connection."
    },
    "CONFLICT": {
      "code": "SYNC_004",
      "defaultMessage": "Sync conflict detected",
      "userMessage": "Sync conflict detected. Your local changes have been preserved."
    }
  },

  "validation": {
    "TITLE_TOO_LONG": {
      "code": "VAL_001",
      "defaultMessage": "Sprout title exceeds maximum length",
      "userMessage": "Title is too long (max 100 characters)."
    },
    "INSUFFICIENT_SOIL": {
      "code": "VAL_002",
      "defaultMessage": "Not enough soil available",
      "userMessage": "Not enough soil to plant this sprout."
    },
    "NO_WATER": {
      "code": "VAL_003",
      "defaultMessage": "No water available",
      "userMessage": "No water available. Refills at 6:00 AM."
    },
    "NO_SUN": {
      "code": "VAL_004",
      "defaultMessage": "No sun available",
      "userMessage": "No sun available. Refills Monday at 6:00 AM."
    }
  }
}
```

2. **Web Error Utilities** (`web/src/utils/error-codes.ts`):
```typescript
import errorRegistry from '../../shared/error-codes.json'

export type ErrorCategory = 'auth' | 'sync' | 'validation'
export type ErrorCode = string // e.g., 'AUTH_001'

export interface ErrorInfo {
  code: ErrorCode
  defaultMessage: string
  userMessage: string
}

export function mapErrorToCode(
  category: ErrorCategory,
  errorKey: string
): ErrorInfo | null {
  const categoryErrors = errorRegistry[category]
  if (!categoryErrors) return null

  const error = categoryErrors[errorKey]
  if (!error) return null

  return error as ErrorInfo
}

export function getUserMessage(
  category: ErrorCategory,
  errorKey: string
): string {
  const info = mapErrorToCode(category, errorKey)
  return info?.userMessage ?? 'An unexpected error occurred.'
}

// Usage example:
// const message = getUserMessage('auth', 'INVALID_CODE')
// // Returns: "That code didn't work. Please check and try again."
```

3. **iOS Error Utilities** (`ios/Trunk/Utils/ErrorCodes.swift`):
```swift
import Foundation

enum ErrorCategory: String {
  case auth
  case sync
  case validation
}

struct ErrorInfo: Codable {
  let code: String
  let defaultMessage: String
  let userMessage: String
}

typealias ErrorRegistry = [String: [String: ErrorInfo]]

class ErrorCodes {
  private static let registry: ErrorRegistry = {
    guard let url = Bundle.main.url(forResource: "error-codes", withExtension: "json", subdirectory: "shared"),
          let data = try? Data(contentsOf: url),
          let decoded = try? JSONDecoder().decode(ErrorRegistry.self, from: data) else {
      fatalError("Could not load error-codes.json")
    }
    return decoded
  }()

  static func getUserMessage(category: ErrorCategory, errorKey: String) -> String {
    guard let categoryErrors = registry[category.rawValue],
          let error = categoryErrors[errorKey] else {
      return "An unexpected error occurred."
    }
    return error.userMessage
  }

  static func getErrorInfo(category: ErrorCategory, errorKey: String) -> ErrorInfo? {
    registry[category.rawValue]?[errorKey]
  }
}

// Usage example:
// let message = ErrorCodes.getUserMessage(category: .auth, errorKey: "INVALID_CODE")
// // Returns: "That code didn't work. Please check and try again."
```

4. **Update iOS AuthService** (`ios/Trunk/Services/AuthService.swift`):
```swift
// Before
enum AuthError: Error {
  case notConfigured
  case invalidCode
  case codeExpired
  case rateLimited
}

// After
enum AuthError: Error {
  case notConfigured
  case invalidCode
  case codeExpired
  case rateLimited

  var code: String {
    switch self {
    case .notConfigured: return "AUTH_001"
    case .invalidCode: return "AUTH_002"
    case .codeExpired: return "AUTH_003"
    case .rateLimited: return "AUTH_004"
    }
  }

  var userMessage: String {
    switch self {
    case .notConfigured: return ErrorCodes.getUserMessage(category: .auth, errorKey: "NOT_CONFIGURED")
    case .invalidCode: return ErrorCodes.getUserMessage(category: .auth, errorKey: "INVALID_CODE")
    case .codeExpired: return ErrorCodes.getUserMessage(category: .auth, errorKey: "CODE_EXPIRED")
    case .rateLimited: return ErrorCodes.getUserMessage(category: .auth, errorKey: "RATE_LIMITED")
    }
  }
}
```

5. **Documentation** (`docs/ARCHITECTURE.md`):
```markdown
## Error Handling

### Cross-Platform Error Codes

All errors are defined in `shared/error-codes.json` with:
- **code**: Unique identifier (e.g., `AUTH_001`)
- **defaultMessage**: Technical description for logging
- **userMessage**: User-friendly message for UI

### Categories

- **auth**: Authentication/sign-in errors
- **sync**: Data synchronization errors
- **validation**: Input validation errors

### Web Implementation

```typescript
import { getUserMessage } from './utils/error-codes'

try {
  await signIn(email)
} catch (error) {
  const message = getUserMessage('auth', 'INVALID_CODE')
  showErrorToast(message)
}
```

### iOS Implementation

```swift
do {
  try await signIn(email: email)
} catch let error as AuthError {
  let message = error.userMessage
  showErrorAlert(message)
}
```

### Adding New Errors

1. Add to `shared/error-codes.json`
2. Both platforms automatically pick up new codes
3. No code changes needed if using `getUserMessage()`
```

**Acceptance Criteria**:
- [ ] Error registry created with all current error scenarios
- [ ] Web shows identical messages to iOS for same errors
- [ ] iOS error enums include code properties
- [ ] Documentation added to ARCHITECTURE.md
- [ ] All auth/sync error paths tested

**Rollback**: Delete shared registry, revert to hardcoded messages.

---

#### M19: ID Generation Standardization (3-4 hours)

**Problem**: Web generates IDs with `Date.now() + random string`, iOS uses timestamp + UUID. Formats differ and could theoretically collide.

**Impact**: Potential ID collisions, inconsistent ID format across platforms.

**Files**:
- `web/src/events/derive.ts` (update ID generation)
- `ios/Trunk/Services/SyncService.swift` (update ID generation)
- `shared/protocols.md` (document ID format)
- `web/src/tests/id-generation.test.ts` (new)
- `ios/TrunkTests/IDGenerationTests.swift` (new)

**Implementation**:

1. **Web Updates** (`web/src/events/derive.ts:352-361`):
```typescript
// Before
function generateSproutId(): string {
  return `sprout-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

function generateLeafId(): string {
  return `leaf-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

// After
function generateSproutId(): string {
  return `sprout-${crypto.randomUUID()}`
}

function generateLeafId(): string {
  return `leaf-${crypto.randomUUID()}`
}
```

2. **iOS Updates** (`ios/Trunk/Services/SyncService.swift:338`):
```swift
// Before (line 338)
private func generateSproutId() -> String {
  let timestamp = Int(Date().timeIntervalSince1970 * 1000)
  return "\(timestamp)-\(randomString(length: 6))"
}

// Delete helper (lines 454-457)
private func randomString(length: Int) -> String {
  let letters = "abcdefghijklmnopqrstuvwxyz0123456789"
  return String((0..<length).map { _ in letters.randomElement()! })
}

// After
private func generateSproutId() -> String {
  return "sprout-\(UUID().uuidString.lowercased())"
}

private func generateLeafId() -> String {
  return "leaf-\(UUID().uuidString.lowercased())"
}
```

3. **Protocol Documentation** (`shared/protocols.md`):
```markdown
## ID Generation

### Format

All entity IDs MUST follow the pattern: `{prefix}-{uuid}`

**Prefix Values**:
- Sprouts: `sprout-`
- Leaves: `leaf-`

**UUID Format**: Standard UUID v4, lowercase, hyphenated

**Examples**:
- Valid: `sprout-550e8400-e29b-41d4-a716-446655440000`
- Valid: `leaf-6ba7b810-9dad-11d1-80b4-00c04fd430c8`
- Invalid: `sprout-1234567890-abc123` (not a UUID)
- Invalid: `SPROUT-550E8400-E29B-41D4-A716-446655440000` (uppercase)

**Regex Pattern**: `^(sprout|leaf)-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$`

### Platform Implementation

**Web**:
```typescript
function generateSproutId(): string {
  return `sprout-${crypto.randomUUID()}`
}
```

**iOS**:
```swift
func generateSproutId() -> String {
  return "sprout-\(UUID().uuidString.lowercased())"
}
```

### Backward Compatibility

- Existing IDs in different formats are preserved in event log
- Both formats coexist indefinitely
- Only NEW IDs use UUID format
```

4. **Web Tests** (`web/src/tests/id-generation.test.ts`):
```typescript
import { describe, it, expect } from 'vitest'
import { generateSproutId, generateLeafId } from '../events/derive'

const ID_PATTERN = /^(sprout|leaf)-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/

describe('ID Generation', () => {
  it('generates sprout IDs in correct format', () => {
    const id = generateSproutId()
    expect(id).toMatch(ID_PATTERN)
    expect(id).toMatch(/^sprout-/)
  })

  it('generates leaf IDs in correct format', () => {
    const id = generateLeafId()
    expect(id).toMatch(ID_PATTERN)
    expect(id).toMatch(/^leaf-/)
  })

  it('generates unique IDs', () => {
    const ids = new Set([
      generateSproutId(),
      generateSproutId(),
      generateSproutId(),
      generateSproutId(),
      generateSproutId()
    ])
    expect(ids.size).toBe(5)
  })

  it('uses lowercase UUIDs', () => {
    const id = generateSproutId()
    expect(id).toBe(id.toLowerCase())
  })
})
```

5. **iOS Tests** (`ios/TrunkTests/IDGenerationTests.swift`):
```swift
import XCTest
@testable import Trunk

class IDGenerationTests: XCTestCase {
  let idPattern = try! NSRegularExpression(
    pattern: #"^(sprout|leaf)-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$"#
  )

  func testGeneratesSproutIDsInCorrectFormat() {
    let id = SyncService.generateSproutId()
    let range = NSRange(id.startIndex..., in: id)
    XCTAssertNotNil(idPattern.firstMatch(in: id, range: range))
    XCTAssertTrue(id.hasPrefix("sprout-"))
  }

  func testGeneratesLeafIDsInCorrectFormat() {
    let id = SyncService.generateLeafId()
    let range = NSRange(id.startIndex..., in: id)
    XCTAssertNotNil(idPattern.firstMatch(in: id, range: range))
    XCTAssertTrue(id.hasPrefix("leaf-"))
  }

  func testGeneratesUniqueIDs() {
    let ids = Set([
      SyncService.generateSproutId(),
      SyncService.generateSproutId(),
      SyncService.generateSproutId(),
      SyncService.generateSproutId(),
      SyncService.generateSproutId()
    ])
    XCTAssertEqual(ids.count, 5)
  }

  func testUsesLowercaseUUIDs() {
    let id = SyncService.generateSproutId()
    XCTAssertEqual(id, id.lowercased())
  }
}
```

**Acceptance Criteria**:
- [ ] All new sprout IDs match `sprout-{uuid}` format
- [ ] All new leaf IDs match `leaf-{uuid}` format
- [ ] Web validation tests pass
- [ ] iOS validation tests pass
- [ ] Existing IDs preserved in event log
- [ ] Protocol documentation complete

**Backward Compatibility**: Only affects NEW IDs. Existing IDs in event log unchanged. Both formats coexist permanently.

**Rollback**: Revert to old generation logic, delete tests.

---

#### M13: Sync Protocol Documentation (5-6 hours)

**Problem**: Sync implementation details scattered across code comments, no single source of truth.

**Impact**: Hard to maintain consistency, onboarding friction, easier to introduce bugs.

**Files**:
- `shared/sync-protocol.md` (new, ~400 lines)
- `docs/ARCHITECTURE.md` (add sync section + diagram)
- `web/src/tests/sync-protocol.test.ts` (new)
- `ios/TrunkTests/SyncProtocolTests.swift` (new)

**Implementation**:

1. **Protocol Specification** (`shared/sync-protocol.md`):
```markdown
# Trunk Sync Protocol

## Overview

Trunk uses a local-first, optimistic sync architecture with Supabase as the central event store.

## Sync Strategies

### 1. Pull (Incremental)

Fetch events created since last sync:

**Request**:
```sql
SELECT * FROM events
WHERE created_at > :lastSyncTimestamp
ORDER BY created_at ASC
```

**Response**: Array of events ordered by server `created_at`

**Process**:
1. Get `lastSyncTimestamp` from cache (`trunk-last-sync`)
2. Query events newer than timestamp
3. Append to local event log (deduplicated by `client_timestamp`)
4. Update cache with latest `created_at`
5. Derive state from full event log

### 2. Push (Optimistic)

Upload locally created events to server:

**Request**:
```sql
INSERT INTO events (client_id, event_type, event_data, client_timestamp)
VALUES (:clientId, :eventType, :eventData, :clientTimestamp)
ON CONFLICT (client_id) DO NOTHING
```

**Response**: Success/failure per event

**Process**:
1. Get pending events (not yet synced)
2. Batch insert to server
3. Mark events as synced locally
4. On failure, keep in pending queue for retry

### 3. Smart Sync

Choose incremental vs full sync based on cache validity:

**Decision Logic**:
```
IF cacheVersion == expectedVersion:
  Use incremental sync (pull since lastSyncTimestamp)
ELSE:
  Use full sync (pull all events, rebuild state)
  Update cacheVersion
```

**Cache invalidation triggers**:
- App version update
- Manual cache clear
- Import/restore operation
- Migration completion

### 4. Realtime Subscription

Subscribe to new events via Supabase Realtime:

**Channel**: `events` table changes

**Filter**: `user_id = :currentUserId`

**Process**:
1. Subscribe on sign-in
2. Receive INSERT notifications
3. Append to local event log (deduplicated)
4. Derive state incrementally
5. Update UI

### 5. Retry Pending Uploads

Periodically retry events that failed to sync:

**Trigger**: Every 30 seconds while app active

**Process**:
1. Get pending events from local queue
2. Attempt push to server
3. Mark successful uploads as synced
4. Keep failures in queue for next retry

## Deduplication

Events are deduplicated by `client_timestamp` (unique per device):

**Strategy**: Before appending events from server, check if `client_timestamp` already exists in local log. If yes, skip.

**Guarantees**:
- No duplicate events in local log
- Idempotent sync (can safely retry)
- Events created on same device at same millisecond deduplicated

## Cache Management

### Cache Keys

- `trunk-cache-version`: App version string (e.g., `1.0.0`)
- `trunk-last-sync`: ISO 8601 timestamp of last successful sync

### Cache Validity

Cache is valid if:
```
localStorage.getItem('trunk-cache-version') === currentAppVersion
```

If invalid:
1. Clear cache
2. Perform full sync
3. Set `trunk-cache-version` to current version

### Cache Clearing

User can manually clear cache via settings:
1. Clear all localStorage keys
2. Perform full sync
3. Rebuild state from server events

## Conflict Resolution

**Strategy**: Last-write-wins by server `created_at`

**Process**:
1. Events always ordered by server `created_at` (not client timestamp)
2. Server `created_at` assigned on INSERT
3. Derivation replays events in order
4. Later events override earlier state

**Example**:
```
Device A: Creates sprout "sprout-123" at 10:00:00 local
Device B: Creates sprout "sprout-123" at 10:00:01 local
Server receives A first → created_at = 10:05:00
Server receives B second → created_at = 10:05:30
Derivation uses B's version (later created_at)
```

## Database Schema

### Events Table

```sql
CREATE TABLE events (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  client_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  event_data JSONB NOT NULL,
  client_timestamp TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(client_id)
);

CREATE INDEX idx_events_user_id ON events(user_id);
CREATE INDEX idx_events_created_at ON events(created_at);
CREATE INDEX idx_events_user_created ON events(user_id, created_at);
```

**Columns**:
- `id`: Auto-incrementing server ID
- `user_id`: Foreign key to authenticated user
- `client_id`: Unique event ID from device (format: `{eventType}-{uuid}`)
- `event_type`: Event type (e.g., `sprout-planted`, `sprout-watered`)
- `event_data`: Full event payload as JSON
- `client_timestamp`: Timestamp from device (for ordering within device)
- `created_at`: Server timestamp (for cross-device ordering)

**Unique Constraint**: `client_id` prevents duplicate inserts (enables idempotent push)

## Implementation Checklist

### Web

- [ ] Incremental pull (`syncService.pull()`)
- [ ] Optimistic push (`syncService.push()`)
- [ ] Smart sync with cache version check
- [ ] Realtime subscription (`syncService.subscribe()`)
- [ ] Retry pending uploads every 30s
- [ ] Deduplication by `client_timestamp`
- [ ] Cache management utilities
- [ ] Conflict resolution via ordered derivation

### iOS

- [ ] Incremental pull (`SyncService.pull()`)
- [ ] Optimistic push (`SyncService.push()`)
- [ ] Smart sync with cache version check
- [ ] Realtime subscription via Supabase Realtime
- [ ] Retry pending uploads every 30s
- [ ] Deduplication by `client_timestamp`
- [ ] Cache management utilities
- [ ] Conflict resolution via ordered derivation

## Testing Strategy

### Unit Tests

- Deduplication logic (duplicates filtered correctly)
- Cache validity checks (version matching)
- Pending queue management (add/remove/retry)

### Integration Tests

- Full sync flow (empty → pull all → derive state)
- Incremental sync flow (pull since timestamp)
- Push flow (local events → server → success)
- Retry flow (failed push → pending → retry → success)
- Conflict resolution (overlapping events from 2 devices)

### E2E Tests

- Multi-device sync (create event on A, appears on B)
- Offline → online (pending events uploaded on reconnect)
- Cache invalidation (app update → full sync)
```

2. **Architecture Documentation** (`docs/ARCHITECTURE.md` - add section):
```markdown
## Sync Architecture

### Overview

Trunk uses a **local-first, event-sourced sync architecture**. All user actions generate immutable events stored locally, then synced to Supabase.

### Sync Flow Diagram

```
┌─────────────┐
│   Device A  │
│  (Web/iOS)  │
└──────┬──────┘
       │
       │ 1. User action generates event
       │    (e.g., plant sprout)
       ▼
┌──────────────────┐
│  Local Event Log │ ◄─── Optimistic UI update
│  (localStorage)  │
└──────┬───────────┘
       │
       │ 2. Push event to server
       ▼
┌──────────────────┐
│  Supabase Events │
│      Table       │
└──────┬───────────┘
       │
       │ 3. Realtime broadcast
       ▼
┌─────────────┐
│   Device B  │ ◄─── 4. Receive event
│  (Web/iOS)  │      5. Append to local log
└─────────────┘      6. Derive state
                     7. Update UI
```

### Key Strategies

1. **Pull**: Fetch events since last sync (incremental)
2. **Push**: Upload local events (optimistic, retryable)
3. **Smart Sync**: Choose incremental vs full based on cache
4. **Realtime**: Subscribe to live event stream
5. **Retry**: Periodically retry failed uploads

### Deduplication

Events deduplicated by `client_timestamp` (unique per device). Same event received from server ignored if already in local log.

### Conflict Resolution

Last-write-wins by server `created_at`. Events ordered by server insertion time, not client timestamp.

### Implementation

See `shared/sync-protocol.md` for complete specification.
```

3. **Web Tests** (`web/src/tests/sync-protocol.test.ts`):
```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { deduplicateEvents, isCacheValid, buildPendingQueue } from '../services/sync-service'

describe('Sync Protocol: Deduplication', () => {
  it('filters duplicate events by client_timestamp', () => {
    const localLog = [
      { client_timestamp: '2024-01-01T10:00:00.000Z', type: 'sprout-planted' }
    ]
    const serverEvents = [
      { client_timestamp: '2024-01-01T10:00:00.000Z', type: 'sprout-planted' }, // duplicate
      { client_timestamp: '2024-01-01T11:00:00.000Z', type: 'sprout-watered' }  // new
    ]

    const result = deduplicateEvents(serverEvents, localLog)
    expect(result).toHaveLength(1)
    expect(result[0].client_timestamp).toBe('2024-01-01T11:00:00.000Z')
  })
})

describe('Sync Protocol: Cache Validity', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('returns true if cache version matches', () => {
    localStorage.setItem('trunk-cache-version', '1.0.0')
    expect(isCacheValid('1.0.0')).toBe(true)
  })

  it('returns false if cache version outdated', () => {
    localStorage.setItem('trunk-cache-version', '0.9.0')
    expect(isCacheValid('1.0.0')).toBe(false)
  })

  it('returns false if cache version missing', () => {
    expect(isCacheValid('1.0.0')).toBe(false)
  })
})

describe('Sync Protocol: Pending Queue', () => {
  it('adds events to pending queue on push failure', () => {
    // Test implementation
  })

  it('removes events from pending queue on successful retry', () => {
    // Test implementation
  })

  it('retries pending events in order', () => {
    // Test implementation
  })
})
```

4. **iOS Tests** (`ios/TrunkTests/SyncProtocolTests.swift`):
```swift
import XCTest
@testable import Trunk

class SyncProtocolTests: XCTestCase {
  func testDeduplicatesEventsByClientTimestamp() {
    let localLog = [
      Event(clientTimestamp: "2024-01-01T10:00:00.000Z", type: "sprout-planted", data: [:])
    ]
    let serverEvents = [
      Event(clientTimestamp: "2024-01-01T10:00:00.000Z", type: "sprout-planted", data: [:]), // duplicate
      Event(clientTimestamp: "2024-01-01T11:00:00.000Z", type: "sprout-watered", data: [:])  // new
    ]

    let result = SyncService.deduplicateEvents(serverEvents, localLog: localLog)
    XCTAssertEqual(result.count, 1)
    XCTAssertEqual(result[0].clientTimestamp, "2024-01-01T11:00:00.000Z")
  }

  func testCacheValidityWhenVersionMatches() {
    UserDefaults.standard.set("1.0.0", forKey: "trunk-cache-version")
    XCTAssertTrue(SyncService.isCacheValid(currentVersion: "1.0.0"))
  }

  func testCacheInvalidWhenVersionOutdated() {
    UserDefaults.standard.set("0.9.0", forKey: "trunk-cache-version")
    XCTAssertFalse(SyncService.isCacheValid(currentVersion: "1.0.0"))
  }

  func testAddsEventsToPendingQueueOnPushFailure() {
    // Test implementation
  }

  func testRemovesEventsFromPendingQueueOnSuccessfulRetry() {
    // Test implementation
  }
}
```

**Acceptance Criteria**:
- [ ] Complete sync protocol documented in `shared/sync-protocol.md`
- [ ] Architecture diagram added to `docs/ARCHITECTURE.md`
- [ ] Web sync tests pass (deduplication, cache, pending queue)
- [ ] iOS sync tests pass (deduplication, cache, pending queue)
- [ ] Both platforms implement protocol identically

**Rollback**: Delete documentation, delete tests.

---

### PHASE 3: Code Quality & Maintainability (26-36 hours)

**Goal**: Refactor large files into focused modules with clear responsibilities.

**Execution**: Web track (H6+H2+H4) and iOS track (H9) can run in parallel.

**Dependency**: Phase 1 H7 should complete first to avoid merge conflicts in dom-builder.ts.

**Recommended Web Order**: H6 first (reduces main.ts complexity) → H2 (dom-builder split) → H4 last (twig-view, most complex)

#### H6: Split main.ts (5-7 hours)

**Problem**: `web/src/main.ts` is 563 lines with complex initialization logic across auth, sync, UI, and events.

**Impact**: Hard to understand initialization order, difficult to test, high coupling.

**Files**:
- `web/src/bootstrap/auth.ts` (new, ~80 lines)
- `web/src/bootstrap/sync.ts` (new, ~90 lines)
- `web/src/bootstrap/ui.ts` (new, ~120 lines)
- `web/src/bootstrap/events.ts` (new, ~80 lines)
- `web/src/main.ts` (refactor to ~80 lines)
- `web/src/tests/bootstrap/*.test.ts` (new)

**Risk**: **MEDIUM-HIGH**
- Critical initialization order (auth → sync → UI → events)
- Circular dependency potential
- Global state (`hasSynced`, `loginView`) scattered
- Breaking initialization breaks entire app

**Mitigation**:
1. Draw dependency graph FIRST
2. Use async/await to enforce order
3. Consolidate global state into AppState object
4. Keep `main-legacy.ts` backup for 1 week

**Implementation**:

1. **Auth Bootstrap** (`web/src/bootstrap/auth.ts`):
```typescript
import type { AppContext } from '../types'
import { initAuthService } from '../services/auth-service'
import { getSession, onAuthStateChange } from '../lib/supabase'

export async function initAuthSystem(ctx: AppContext): Promise<void> {
  console.log('[Bootstrap] Initializing auth system...')

  // Initialize auth service
  initAuthService()

  // Check for existing session
  const session = await getSession()

  if (session) {
    console.log('[Bootstrap] User already signed in')
    ctx.loginView.hide()
    ctx.elements.canvas.classList.remove('hidden')
    return
  }

  // Show login if no session
  console.log('[Bootstrap] No session, showing login')
  ctx.loginView.show()

  // Listen for auth changes
  onAuthStateChange((event, session) => {
    if (event === 'SIGNED_IN' && session) {
      ctx.loginView.hide()
      ctx.elements.canvas.classList.remove('hidden')
      // Trigger sync in sync bootstrap
      window.dispatchEvent(new CustomEvent('auth:signed-in'))
    } else if (event === 'SIGNED_OUT') {
      ctx.loginView.show()
      ctx.elements.canvas.classList.add('hidden')
    }
  })
}
```

2. **Sync Bootstrap** (`web/src/bootstrap/sync.ts`):
```typescript
import type { AppContext } from '../types'
import { initialSync, setupRealtimeSubscription } from '../services/sync-service'

export async function initSyncSystem(
  ctx: AppContext,
  onSyncComplete: () => void
): Promise<void> {
  console.log('[Bootstrap] Initializing sync system...')

  let hasSynced = false

  // Perform initial sync if authenticated
  window.addEventListener('auth:signed-in', async () => {
    if (hasSynced) return

    console.log('[Bootstrap] Performing initial sync...')
    await initialSync()
    hasSynced = true
    console.log('[Bootstrap] Initial sync complete')

    onSyncComplete()

    // Setup realtime subscription
    setupRealtimeSubscription((newEvents) => {
      console.log(`[Bootstrap] Received ${newEvents.length} events via realtime`)
      onSyncComplete() // Refresh UI
    })
  })
}
```

3. **UI Bootstrap** (`web/src/bootstrap/ui.ts`):
```typescript
import type { AppContext } from '../types'
import { updateSoilDisplay, updateWaterDisplay, updateSunDisplay } from '../features/resource-display'
import { updateStats, updateSidebarSprouts } from '../features/progress'
import { positionNodes } from '../ui/layout'

export interface UICallbacks {
  updateSoilMeter: () => void
  updateWaterMeter: () => void
  updateSunMeter: () => void
  refreshUI: () => void
}

export function initUIComponents(
  ctx: AppContext,
  callbacks: {
    onPositionNodes: () => void
    onUpdateStats: () => void
  }
): UICallbacks {
  console.log('[Bootstrap] Initializing UI components...')

  // Initial layout
  callbacks.onPositionNodes()
  callbacks.onUpdateStats()

  // Resource meters
  const updateSoilMeter = () => updateSoilDisplay(ctx.elements.soilMeter)
  const updateWaterMeter = () => updateWaterDisplay(ctx.elements.waterMeter)
  const updateSunMeter = () => updateSunDisplay(ctx.elements.sunMeter)

  // Full UI refresh
  const refreshUI = () => {
    callbacks.onPositionNodes()
    callbacks.onUpdateStats()
    updateSoilMeter()
    updateWaterMeter()
    updateSunMeter()
  }

  // Initial render
  refreshUI()

  return {
    updateSoilMeter,
    updateWaterMeter,
    updateSunMeter,
    refreshUI
  }
}
```

4. **Event Bootstrap** (`web/src/bootstrap/events.ts`):
```typescript
import type { AppContext } from '../types'

export function wireGlobalEventHandlers(
  ctx: AppContext,
  navCallbacks: {
    onPositionNodes: () => void
    onUpdateStats: () => void
  }
): void {
  console.log('[Bootstrap] Wiring global event handlers...')

  // Window resize
  window.addEventListener('resize', () => {
    navCallbacks.onPositionNodes()
  })

  // Keyboard shortcuts
  window.addEventListener('keydown', (e) => {
    // Escape key handling
    if (e.key === 'Escape') {
      // Close any open dialog or view
      // ... (existing escape logic)
    }

    // Number keys for navigation
    if (e.key >= '1' && e.key <= '8') {
      // ... (existing number key logic)
    }

    // Arrow keys
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      // ... (existing arrow key logic)
    }

    // Debug panel (d + b within 500ms)
    // ... (existing debug logic)
  })

  // Custom app events
  window.addEventListener('app:refresh-ui', () => {
    navCallbacks.onPositionNodes()
    navCallbacks.onUpdateStats()
  })
}
```

5. **Refactored main.ts** (~80 lines):
```typescript
import { buildDom } from './ui/dom-builder'
import { setupNavigation } from './features/navigation'
import { setupHoverBranch } from './features/hover-branch'
import { positionNodes } from './ui/layout'
import { updateStats, updateSidebarSprouts } from './features/progress'
import { initAuthSystem } from './bootstrap/auth'
import { initSyncSystem } from './bootstrap/sync'
import { initUIComponents } from './bootstrap/ui'
import { wireGlobalEventHandlers } from './bootstrap/events'

async function bootstrap() {
  console.log('[Main] Starting Trunk...')

  // Build DOM
  const { elements, branchGroups, allNodes, nodeLookup, editor, twigView, leafView, loginView } = buildDom()
  document.body.appendChild(elements.app)

  // Build context
  const ctx = {
    elements,
    branchGroups,
    allNodes,
    nodeLookup,
    editor,
    twigView,
    leafView,
    loginView
  }

  // Shared callbacks
  const navCallbacks = {
    onPositionNodes: () => positionNodes(ctx),
    onUpdateStats: () => {
      updateStats(ctx)
      updateSidebarSprouts(ctx)
    }
  }

  // Bootstrap pipeline (ORDER MATTERS!)
  await initAuthSystem(ctx)                          // 1. Auth
  await initSyncSystem(ctx, navCallbacks.onUpdateStats) // 2. Sync
  const ui = initUIComponents(ctx, navCallbacks)     // 3. UI
  wireGlobalEventHandlers(ctx, navCallbacks)         // 4. Events

  // Setup features
  setupNavigation(ctx, navCallbacks)
  setupHoverBranch(ctx, navCallbacks)

  console.log('[Main] Trunk initialized successfully')
}

bootstrap().catch(error => {
  console.error('[Main] Bootstrap failed:', error)
  document.body.innerHTML = `
    <div style="padding: 2rem; text-align: center;">
      <h1>Failed to start Trunk</h1>
      <p>${error.message}</p>
    </div>
  `
})
```

6. **Tests** (`web/src/tests/bootstrap/auth.test.ts`):
```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { initAuthSystem } from '../../bootstrap/auth'

describe('Auth Bootstrap', () => {
  it('shows login if no session', async () => {
    const ctx = {
      loginView: { show: vi.fn(), hide: vi.fn() },
      elements: { canvas: document.createElement('div') }
    }

    // Mock no session
    vi.mock('../../lib/supabase', () => ({
      getSession: () => Promise.resolve(null)
    }))

    await initAuthSystem(ctx)

    expect(ctx.loginView.show).toHaveBeenCalled()
  })

  it('hides login if session exists', async () => {
    const ctx = {
      loginView: { show: vi.fn(), hide: vi.fn() },
      elements: { canvas: document.createElement('div') }
    }

    // Mock existing session
    vi.mock('../../lib/supabase', () => ({
      getSession: () => Promise.resolve({ user: { id: '123' } })
    }))

    await initAuthSystem(ctx)

    expect(ctx.loginView.hide).toHaveBeenCalled()
  })
})
```

**Dependency Graph**:
```
┌──────────┐
│   Auth   │ (must complete first)
└────┬─────┘
     │
     ▼
┌──────────┐
│   Sync   │ (depends on auth state)
└────┬─────┘
     │
     ▼
┌──────────┐
│    UI    │ (depends on synced data)
└────┬─────┘
     │
     ▼
┌──────────┐
│  Events  │ (wires everything together)
└──────────┘
```

**Acceptance Criteria**:
- [ ] main.ts <100 lines
- [ ] Each bootstrap module <120 lines
- [ ] Each bootstrap module independently testable
- [ ] Import count <10 per file
- [ ] App starts successfully
- [ ] All initialization steps logged to console
- [ ] No visual/functional regressions

**Rollback**: Restore `main-legacy.ts`, delete bootstrap/ directory.

---

#### H2: Refactor dom-builder.ts (4-6 hours)

**Problem**: Single 595-line function makes DOM construction hard to understand and modify.

**Impact**: Hard to find specific UI elements, can't test sections independently.

**Files**:
- `web/src/ui/dom-builder/build-header.ts` (new, ~70 lines)
- `web/src/ui/dom-builder/build-sidebar.ts` (new, ~80 lines)
- `web/src/ui/dom-builder/build-dialogs.ts` (new, ~250 lines)
- `web/src/ui/dom-builder/build-tree-nodes.ts` (new, ~120 lines)
- `web/src/ui/dom-builder/index.ts` (orchestrator, ~80 lines)
- `web/src/ui/dom-builder.ts` (DELETE after migration)

**Risk**: **LOW-MEDIUM**
- `allNodes` and `nodeLookup` built incrementally - must preserve order
- Inline template strings need careful extraction
- Element references used across modules

**Mitigation**:
- Keep build order identical
- Test visual parity thoroughly
- Screenshot before/after comparison

**Implementation**:

1. **Header Builder** (`web/src/ui/dom-builder/build-header.ts`):
```typescript
import { requireElement } from '../../utils/dom-helpers'

export interface HeaderElements {
  mainHeader: HTMLElement
  headerTitle: HTMLElement
  waterBtn: HTMLButtonElement
  sunBtn: HTMLButtonElement
  accountBtn: HTMLButtonElement
  soilMeter: HTMLElement
  waterMeter: HTMLElement
  sunMeter: HTMLElement
}

export function buildHeader(): HeaderElements {
  const mainHeader = document.createElement('header')
  mainHeader.className = 'main-header'
  mainHeader.innerHTML = `
    <div class="header-left">
      <h1 class="header-title">Trunk</h1>
    </div>
    <div class="header-center">
      <div class="resource-meters">
        <div class="soil-meter"></div>
        <div class="water-meter"></div>
        <div class="sun-meter"></div>
      </div>
    </div>
    <div class="header-right">
      <button class="water-btn">💧</button>
      <button class="sun-btn">☀️</button>
      <button class="account-btn">⚙️</button>
    </div>
  `

  return {
    mainHeader,
    headerTitle: requireElement(mainHeader, '.header-title', 'Header title'),
    waterBtn: requireElement(mainHeader, '.water-btn', 'Water button'),
    sunBtn: requireElement(mainHeader, '.sun-btn', 'Sun button'),
    accountBtn: requireElement(mainHeader, '.account-btn', 'Account button'),
    soilMeter: requireElement(mainHeader, '.soil-meter', 'Soil meter'),
    waterMeter: requireElement(mainHeader, '.water-meter', 'Water meter'),
    sunMeter: requireElement(mainHeader, '.sun-meter', 'Sun meter')
  }
}
```

2. **Sidebar Builder** (`web/src/ui/dom-builder/build-sidebar.ts`):
```typescript
export interface SidebarElements {
  sidebar: HTMLElement
  sidebarContent: HTMLElement
  nodeLabelDisplay: HTMLElement
  noteDisplay: HTMLElement
  editNoteBtn: HTMLButtonElement
  // ... other sidebar elements
}

export function buildSidebar(): SidebarElements {
  const sidebar = document.createElement('aside')
  sidebar.className = 'sidebar'
  sidebar.innerHTML = `
    <div class="sidebar-content">
      <div class="node-info">
        <h2 class="node-label-display"></h2>
        <div class="note-display"></div>
        <button class="edit-note-btn">Edit Note</button>
      </div>
      <div class="stats-section">
        <!-- stats content -->
      </div>
      <div class="sprouts-section">
        <h3>Active Sprouts</h3>
        <div class="sidebar-sprouts-list"></div>
      </div>
    </div>
  `

  return {
    sidebar,
    sidebarContent: requireElement(sidebar, '.sidebar-content', 'Sidebar content'),
    nodeLabelDisplay: requireElement(sidebar, '.node-label-display', 'Node label'),
    noteDisplay: requireElement(sidebar, '.note-display', 'Note display'),
    editNoteBtn: requireElement(sidebar, '.edit-note-btn', 'Edit note button')
    // ... other elements
  }
}
```

3. **Dialog Builder** (`web/src/ui/dom-builder/build-dialogs.ts`):
```typescript
export interface DialogElements {
  waterDialog: HTMLElement
  shineDialog: HTMLElement
  harvestDialog: HTMLElement
  uprootDialog: HTMLElement
  accountDialog: HTMLElement
  waterCanDialog: HTMLElement
  sunLedgeDialog: HTMLElement
  soilBagDialog: HTMLElement
  // ... dialog-specific elements
}

export function buildDialogs(): DialogElements {
  // Build each dialog
  const waterDialog = buildWaterDialog()
  const shineDialog = buildShineDialog()
  const harvestDialog = buildHarvestDialog()
  const uprootDialog = buildUprootDialog()
  const accountDialog = buildAccountDialog()
  const waterCanDialog = buildWaterCanDialog()
  const sunLedgeDialog = buildSunLedgeDialog()
  const soilBagDialog = buildSoilBagDialog()

  return {
    waterDialog,
    shineDialog,
    harvestDialog,
    uprootDialog,
    accountDialog,
    waterCanDialog,
    sunLedgeDialog,
    soilBagDialog
    // ... extract elements from each dialog
  }
}

function buildWaterDialog(): HTMLElement {
  const dialog = document.createElement('div')
  dialog.className = 'dialog water-dialog hidden'
  dialog.innerHTML = `
    <!-- water dialog content -->
  `
  return dialog
}

// ... similar for other dialogs
```

4. **Tree Nodes Builder** (`web/src/ui/dom-builder/build-tree-nodes.ts`):
```typescript
import type { BranchGroup } from '../types'

export interface TreeNodesResult {
  canvas: HTMLElement
  trunk: HTMLButtonElement
  branchGroups: BranchGroup[]
  allNodes: HTMLButtonElement[]
  nodeLookup: Map<string, HTMLButtonElement>
}

export function buildTreeNodes(): TreeNodesResult {
  const canvas = document.createElement('div')
  canvas.className = 'canvas is-overview'

  // Build trunk
  const trunk = document.createElement('button')
  trunk.className = 'node trunk-node'
  trunk.dataset.nodeId = 'trunk'
  trunk.innerHTML = '<span class="node-label">Trunk</span>'

  const allNodes: HTMLButtonElement[] = [trunk]
  const nodeLookup = new Map<string, HTMLButtonElement>()
  nodeLookup.set('trunk', trunk)

  // Build 8 branches
  const branchGroups: BranchGroup[] = []

  for (let i = 0; i < 8; i++) {
    const group = document.createElementNS('http://www.w3.org/2000/svg', 'g')
    group.setAttribute('data-branch-index', String(i))

    const branch = document.createElement('button')
    branch.className = 'node branch-node'
    branch.dataset.nodeId = `branch-${i}`
    branch.dataset.branchIndex = String(i)
    branch.innerHTML = `<span class="node-label">Branch ${i}</span>`

    allNodes.push(branch)
    nodeLookup.set(`branch-${i}`, branch)

    // Build 8 twigs per branch
    const twigs: HTMLButtonElement[] = []
    for (let j = 0; j < 8; j++) {
      const twig = document.createElement('button')
      twig.className = 'node twig-node'
      twig.dataset.nodeId = `branch-${i}-twig-${j}`
      twig.dataset.branchIndex = String(i)
      twig.dataset.twigIndex = String(j)
      twig.innerHTML = `<span class="node-label">Twig ${j}</span>`

      twigs.push(twig)
      allNodes.push(twig)
      nodeLookup.set(`branch-${i}-twig-${j}`, twig)
    }

    branchGroups.push({ group, branch, twigs })
  }

  // Assemble canvas
  canvas.appendChild(trunk)
  branchGroups.forEach(bg => {
    canvas.appendChild(bg.branch)
    bg.twigs.forEach(twig => canvas.appendChild(twig))
  })

  return {
    canvas,
    trunk,
    branchGroups,
    allNodes,
    nodeLookup
  }
}
```

5. **Orchestrator** (`web/src/ui/dom-builder/index.ts`):
```typescript
import { buildHeader } from './build-header'
import { buildSidebar } from './build-sidebar'
import { buildDialogs } from './build-dialogs'
import { buildTreeNodes } from './build-tree-nodes'
import type { DomBuilderResult } from '../types'

export function buildDom(): DomBuilderResult {
  console.log('[DomBuilder] Building DOM...')

  // Build sections
  const header = buildHeader()
  const sidebar = buildSidebar()
  const dialogs = buildDialogs()
  const tree = buildTreeNodes()

  // Create app container
  const app = document.createElement('div')
  app.className = 'app'

  // Assemble
  app.appendChild(header.mainHeader)
  app.appendChild(tree.canvas)
  app.appendChild(sidebar.sidebar)
  Object.values(dialogs).forEach(dialog => app.appendChild(dialog))

  // Build final result object
  const elements = {
    app,
    ...header,
    ...sidebar,
    ...dialogs,
    ...tree
  }

  console.log('[DomBuilder] DOM built successfully')

  return {
    elements,
    branchGroups: tree.branchGroups,
    allNodes: tree.allNodes,
    nodeLookup: tree.nodeLookup,
    editor: null, // created separately
    twigView: null,
    leafView: null,
    loginView: null
  }
}
```

**Acceptance Criteria**:
- [ ] No function >100 lines
- [ ] Each section in separate file
- [ ] All elements still accessible via returned objects
- [ ] Zero visual regressions (screenshot comparison)
- [ ] All tests pass
- [ ] Import count reasonable (<15 per file)

**Rollback**: Restore original `dom-builder.ts`, delete `dom-builder/` directory.

---

#### H4: Refactor twig-view.ts (6-8 hours)

**Problem**: Single 709-line function with complex form state, rendering, and event delegation.

**Impact**: Hard to modify sprout CRUD logic, can't test form independently.

**Files**:
- `web/src/ui/twig-view/build-panel.ts` (new, ~80 lines)
- `web/src/ui/twig-view/sprout-form.ts` (new, ~180 lines)
- `web/src/ui/twig-view/sprout-cards.ts` (new, ~150 lines)
- `web/src/ui/twig-view/event-handlers.ts` (new, ~120 lines)
- `web/src/ui/twig-view/form-validation.ts` (new, ~80 lines)
- `web/src/ui/twig-view/index.ts` (orchestrator, ~100 lines)
- `web/src/ui/twig-view.ts` (DELETE after migration)

**Risk**: **MEDIUM**
- Stateful closure variables (selectedSeason, selectedEnvironment)
- Delegated event pattern must be preserved
- Complex leaf grouping logic
- Many moving parts

**Mitigation**:
- Extract FormState type to encapsulate closure vars
- Test each rendering function as pure
- Preserve exact event delegation structure

**Implementation**:

1. **Panel Builder** (`web/src/ui/twig-view/build-panel.ts`):
```typescript
export function buildTwigPanel(): HTMLElement {
  const panel = document.createElement('div')
  panel.className = 'twig-detail-panel hidden'
  panel.innerHTML = `
    <div class="twig-panel-header">
      <h2 class="twig-panel-title"></h2>
      <button class="close-twig-btn">×</button>
    </div>
    <div class="twig-panel-content">
      <div class="sprout-form-section"></div>
      <div class="active-sprouts-section"></div>
      <div class="history-sprouts-section"></div>
      <div class="leaves-section"></div>
    </div>
  `
  return panel
}
```

2. **Form State & Builder** (`web/src/ui/twig-view/sprout-form.ts`):
```typescript
export interface FormState {
  selectedSeason: string | null
  selectedEnvironment: string | null
  editingSprout: Sprout | null
}

export function createFormState(): FormState {
  return {
    selectedSeason: null,
    selectedEnvironment: null,
    editingSprout: null
  }
}

export function buildSproutForm(): string {
  return `
    <div class="sprout-form">
      <input type="text" class="sprout-title-input" placeholder="What are you growing?">

      <div class="season-selector">
        <button class="season-btn" data-season="2w">2 weeks</button>
        <button class="season-btn" data-season="1m">1 month</button>
        <button class="season-btn" data-season="3m">3 months</button>
        <button class="season-btn" data-season="6m">6 months</button>
        <button class="season-btn" data-season="1y">1 year</button>
      </div>

      <div class="environment-selector">
        <button class="env-btn" data-environment="fertile">Fertile</button>
        <button class="env-btn" data-environment="firm">Firm</button>
        <button class="env-btn" data-environment="barren">Barren</button>
      </div>

      <div class="bloom-inputs">
        <input type="text" class="bloom-1-input" placeholder="Outcome at 1/5">
        <input type="text" class="bloom-3-input" placeholder="Outcome at 3/5">
        <input type="text" class="bloom-5-input" placeholder="Outcome at 5/5">
      </div>

      <button class="plant-sprout-btn">Plant Sprout</button>
      <button class="cancel-edit-btn hidden">Cancel</button>
    </div>
  `
}

export function updateFormFromState(form: HTMLElement, state: FormState): void {
  // Update season buttons
  form.querySelectorAll('.season-btn').forEach(btn => {
    btn.classList.toggle('is-active', btn.dataset.season === state.selectedSeason)
  })

  // Update environment buttons
  form.querySelectorAll('.env-btn').forEach(btn => {
    btn.classList.toggle('is-active', btn.dataset.environment === state.selectedEnvironment)
  })

  // If editing, populate fields
  if (state.editingSprout) {
    const titleInput = form.querySelector('.sprout-title-input') as HTMLInputElement
    titleInput.value = state.editingSprout.title
    // ... populate other fields
  }
}
```

3. **Card Renderers** (`web/src/ui/twig-view/sprout-cards.ts`):
```typescript
import type { Sprout, Leaf } from '../../types'
import { escapeHtml } from '../../utils/escape-html'
import { getSeasonLabel, getEnvironmentLabel } from '../../utils/sprout-labels'

export function renderActiveCard(sprout: Sprout): string {
  const isReady = sprout.state === 'active' && new Date() >= new Date(sprout.harvestDate)

  return `
    <div class="sprout-card ${isReady ? 'is-ready' : ''}" data-sprout-id="${sprout.id}">
      <div class="sprout-header">
        <h3>${escapeHtml(sprout.title)}</h3>
        <span class="sprout-season">${getSeasonLabel(sprout.season)}</span>
      </div>
      <div class="sprout-meta">
        <span>${getEnvironmentLabel(sprout.environment)}</span>
        <span>${sprout.waterEntries?.length || 0} waters</span>
      </div>
      <div class="sprout-actions">
        <button class="water-sprout-btn" data-sprout-id="${sprout.id}">Water</button>
        ${isReady ? `<button class="harvest-sprout-btn" data-sprout-id="${sprout.id}">Harvest</button>` : ''}
        <button class="edit-sprout-btn" data-sprout-id="${sprout.id}">Edit</button>
        <button class="uproot-sprout-btn" data-sprout-id="${sprout.id}">Uproot</button>
      </div>
    </div>
  `
}

export function renderHistoryCard(sprout: Sprout): string {
  const stateLabel = sprout.state === 'completed' ? `Completed (${sprout.result}/5)` : 'Failed'

  return `
    <div class="sprout-card history-card" data-sprout-id="${sprout.id}">
      <div class="sprout-header">
        <h3>${escapeHtml(sprout.title)}</h3>
        <span class="sprout-state">${stateLabel}</span>
      </div>
      <div class="sprout-meta">
        <span>${getSeasonLabel(sprout.season)}</span>
        <span>${getEnvironmentLabel(sprout.environment)}</span>
      </div>
    </div>
  `
}

export function renderLeafCard(leaf: Leaf, sprouts: Sprout[]): string {
  const active = sprouts.filter(s => s.state === 'active')
  const completed = sprouts.filter(s => s.state === 'completed')

  return `
    <div class="leaf-card" data-leaf-id="${leaf.id}">
      <div class="leaf-header">
        <h3>${escapeHtml(leaf.name)}</h3>
        <button class="view-leaf-btn" data-leaf-id="${leaf.id}">View Saga</button>
      </div>
      <div class="leaf-meta">
        <span>${active.length} active</span>
        <span>${completed.length} completed</span>
      </div>
    </div>
  `
}
```

4. **Event Handlers** (`web/src/ui/twig-view/event-handlers.ts`):
```typescript
import type { FormState } from './sprout-form'
import type { AppContext } from '../../types'

export function setupCardActions(
  panel: HTMLElement,
  ctx: AppContext,
  callbacks: {
    onWater: (sproutId: string) => void
    onHarvest: (sproutId: string) => void
    onEdit: (sproutId: string) => void
    onUproot: (sproutId: string) => void
    onViewLeaf: (leafId: string) => void
  }
): void {
  // Delegated event listener
  panel.addEventListener('click', (e) => {
    const target = e.target as HTMLElement

    if (target.matches('.water-sprout-btn')) {
      const sproutId = target.dataset.sproutId!
      callbacks.onWater(sproutId)
    } else if (target.matches('.harvest-sprout-btn')) {
      const sproutId = target.dataset.sproutId!
      callbacks.onHarvest(sproutId)
    } else if (target.matches('.edit-sprout-btn')) {
      const sproutId = target.dataset.sproutId!
      callbacks.onEdit(sproutId)
    } else if (target.matches('.uproot-sprout-btn')) {
      const sproutId = target.dataset.sproutId!
      callbacks.onUproot(sproutId)
    } else if (target.matches('.view-leaf-btn')) {
      const leafId = target.dataset.leafId!
      callbacks.onViewLeaf(leafId)
    }
  })
}

export function setupFormHandlers(
  form: HTMLElement,
  state: FormState,
  callbacks: {
    onSeasonSelect: (season: string) => void
    onEnvironmentSelect: (environment: string) => void
    onPlant: () => void
    onCancel: () => void
  }
): void {
  // Season selection
  form.addEventListener('click', (e) => {
    const target = e.target as HTMLElement

    if (target.matches('.season-btn')) {
      const season = target.dataset.season!
      callbacks.onSeasonSelect(season)
    } else if (target.matches('.env-btn')) {
      const environment = target.dataset.environment!
      callbacks.onEnvironmentSelect(environment)
    } else if (target.matches('.plant-sprout-btn')) {
      callbacks.onPlant()
    } else if (target.matches('.cancel-edit-btn')) {
      callbacks.onCancel()
    }
  })
}
```

5. **Form Validation** (`web/src/ui/twig-view/form-validation.ts`):
```typescript
export interface ValidationResult {
  valid: boolean
  error?: string
}

export function validateSproutForm(formData: {
  title: string
  season: string | null
  environment: string | null
}): ValidationResult {
  if (!formData.title.trim()) {
    return { valid: false, error: 'Title is required' }
  }

  if (formData.title.length > 100) {
    return { valid: false, error: 'Title is too long (max 100 characters)' }
  }

  if (!formData.season) {
    return { valid: false, error: 'Please select a season' }
  }

  if (!formData.environment) {
    return { valid: false, error: 'Please select an environment' }
  }

  return { valid: true }
}
```

6. **Orchestrator** (`web/src/ui/twig-view/index.ts`):
```typescript
import { buildTwigPanel } from './build-panel'
import { createFormState, buildSproutForm, updateFormFromState } from './sprout-form'
import { renderActiveCard, renderHistoryCard, renderLeafCard } from './sprout-cards'
import { setupCardActions, setupFormHandlers } from './event-handlers'
import { validateSproutForm } from './form-validation'
import type { TwigViewApi } from '../types'

export function createTwigView(ctx: AppContext): TwigViewApi {
  const panel = buildTwigPanel()
  const formState = createFormState()

  // Setup event handlers
  setupCardActions(panel, ctx, {
    onWater: (sproutId) => { /* ... */ },
    onHarvest: (sproutId) => { /* ... */ },
    onEdit: (sproutId) => { /* ... */ },
    onUproot: (sproutId) => { /* ... */ },
    onViewLeaf: (leafId) => { /* ... */ }
  })

  setupFormHandlers(panel, formState, {
    onSeasonSelect: (season) => {
      formState.selectedSeason = season
      updateFormFromState(panel, formState)
    },
    onEnvironmentSelect: (environment) => {
      formState.selectedEnvironment = environment
      updateFormFromState(panel, formState)
    },
    onPlant: () => {
      // Validate and plant
    },
    onCancel: () => {
      // Reset form
    }
  })

  return {
    open: (twigId) => {
      // Render sprouts for twig
      panel.classList.remove('hidden')
    },
    close: () => {
      panel.classList.add('hidden')
    },
    refresh: () => {
      // Re-render current twig
    }
  }
}
```

**Acceptance Criteria**:
- [ ] No function >150 lines
- [ ] Form logic separated from rendering
- [ ] Card rendering as pure functions
- [ ] `TwigViewApi` interface unchanged
- [ ] All sprout CRUD operations work identically
- [ ] Leaf grouping logic preserved
- [ ] No visual regressions

**Rollback**: Restore original `twig-view.ts`, delete `twig-view/` directory.

---

#### H9: Modularize iOS Views (11-15 hours)

**Problem**: `SproutsView.swift` (796 lines) and `TodayView.swift` (768 lines) are monolithic with mixed concerns.

**Impact**: Hard to modify, can't test components independently, navigation state hard to follow.

**Files Created**:
- `ios/Trunk/Views/Sprouts/SproutsListView.swift` (~200 lines)
- `ios/Trunk/Views/Sprouts/SproutFilterBar.swift` (~120 lines)
- `ios/Trunk/Views/Sprouts/SproutListRow.swift` (~110 lines, extracted)
- `ios/Trunk/Views/Sprouts/SproutDetailView.swift` (~330 lines, extracted)
- `ios/Trunk/ViewModels/SproutsViewModel.swift` (~150 lines)
- `ios/Trunk/Views/Today/WaterSectionView.swift` (~40 lines)
- `ios/Trunk/Views/Today/ShineSectionView.swift` (~40 lines)
- `ios/Trunk/Views/Today/NextHarvestView.swift` (~60 lines)
- `ios/Trunk/Views/Today/SoilChartView.swift` (~250 lines)
- `ios/Trunk/Services/SoilHistoryService.swift` (~200 lines)

**Files Modified**:
- `ios/Trunk/Views/SproutsView.swift` (796 → ~100 lines)
- `ios/Trunk/Views/TodayView.swift` (768 → ~180 lines)

**Risk**: **MEDIUM**
- @Bindable propagation across components
- Navigation state preservation
- Chart scrubbing gesture handling
- Cached state timing

**Mitigation**:
- Test all navigation flows after each extraction
- Verify @Bindable updates propagate
- Test chart interactions thoroughly
- Keep `SproutsView-legacy.swift` backup

**Implementation**:

1. **SproutsViewModel** (`ios/Trunk/ViewModels/SproutsViewModel.swift`):
```swift
import Foundation

@Observable
class SproutsViewModel {
  var searchText: String = ""
  var selectedFilter: SproutFilter = .all
  var selectedSort: SproutSort = .harvestDate

  enum SproutFilter {
    case all
    case active
    case completed
    case failed
  }

  enum SproutSort {
    case harvestDate
    case planted
    case alphabetical
  }

  func filteredSprouts(from sprouts: [Sprout]) -> [Sprout] {
    var filtered = sprouts

    // Apply filter
    switch selectedFilter {
    case .all:
      break
    case .active:
      filtered = filtered.filter { $0.state == .active }
    case .completed:
      filtered = filtered.filter { $0.state == .completed }
    case .failed:
      filtered = filtered.filter { $0.state == .failed }
    }

    // Apply search
    if !searchText.isEmpty {
      filtered = filtered.filter { $0.title.localizedCaseInsensitiveContains(searchText) }
    }

    // Apply sort
    switch selectedSort {
    case .harvestDate:
      filtered.sort { ($0.harvestDate ?? .distantFuture) < ($1.harvestDate ?? .distantFuture) }
    case .planted:
      filtered.sort { $0.plantedAt > $1.plantedAt }
    case .alphabetical:
      filtered.sort { $0.title.localizedCompare($1.title) == .orderedAscending }
    }

    return filtered
  }
}
```

2. **SproutFilterBar** (`ios/Trunk/Views/Sprouts/SproutFilterBar.swift`):
```swift
import SwiftUI

struct SproutFilterBar: View {
  @Bindable var viewModel: SproutsViewModel

  var body: some View {
    VStack(spacing: 12) {
      // Search
      HStack {
        Image(systemName: "magnifyingglass")
          .foregroundColor(.secondary)
        TextField("Search sprouts...", text: $viewModel.searchText)
      }
      .padding(8)
      .background(Color(.systemGray6))
      .cornerRadius(8)

      // Filters
      HStack {
        ForEach([SproutsViewModel.SproutFilter.all, .active, .completed, .failed], id: \.self) { filter in
          Button(action: { viewModel.selectedFilter = filter }) {
            Text(filterLabel(filter))
              .font(.caption)
              .padding(.horizontal, 12)
              .padding(.vertical, 6)
              .background(viewModel.selectedFilter == filter ? Color.blue : Color(.systemGray5))
              .foregroundColor(viewModel.selectedFilter == filter ? .white : .primary)
              .cornerRadius(6)
          }
        }
      }

      // Sort
      Picker("Sort", selection: $viewModel.selectedSort) {
        Text("Harvest Date").tag(SproutsViewModel.SproutSort.harvestDate)
        Text("Planted").tag(SproutsViewModel.SproutSort.planted)
        Text("Alphabetical").tag(SproutsViewModel.SproutSort.alphabetical)
      }
      .pickerStyle(.segmented)
    }
    .padding(.horizontal)
  }

  private func filterLabel(_ filter: SproutsViewModel.SproutFilter) -> String {
    switch filter {
    case .all: return "All"
    case .active: return "Active"
    case .completed: return "Completed"
    case .failed: return "Failed"
    }
  }
}
```

3. **SproutsListView** (`ios/Trunk/Views/Sprouts/SproutsListView.swift`):
```swift
import SwiftUI

struct SproutsListView: View {
  let sprouts: [Sprout]
  @Binding var selectedSprout: Sprout?

  var body: some View {
    List(sprouts) { sprout in
      SproutListRow(sprout: sprout)
        .contentShape(Rectangle())
        .onTapGesture {
          selectedSprout = sprout
        }
    }
    .listStyle(.plain)
  }
}
```

4. **Refactored SproutsView** (~100 lines):
```swift
import SwiftUI

struct SproutsView: View {
  @State private var sproutStore: SproutStore
  @State private var viewModel = SproutsViewModel()
  @State private var selectedSprout: Sprout?
  @State private var showingNewSprout = false

  init(sproutStore: SproutStore) {
    _sproutStore = State(initialValue: sproutStore)
  }

  var body: some View {
    NavigationStack {
      VStack(spacing: 0) {
        SproutFilterBar(viewModel: viewModel)
          .padding(.vertical, 8)

        SproutsListView(
          sprouts: viewModel.filteredSprouts(from: sproutStore.allSprouts),
          selectedSprout: $selectedSprout
        )
      }
      .navigationTitle("Sprouts")
      .toolbar {
        ToolbarItem(placement: .primaryAction) {
          Button(action: { showingNewSprout = true }) {
            Image(systemName: "plus")
          }
        }
      }
      .sheet(item: $selectedSprout) { sprout in
        SproutDetailView(sprout: sprout, sproutStore: sproutStore)
      }
      .sheet(isPresented: $showingNewSprout) {
        NewSproutView(sproutStore: sproutStore)
      }
    }
  }
}
```

5. **SoilHistoryService** (`ios/Trunk/Services/SoilHistoryService.swift`):
```swift
import Foundation

struct SoilHistoryService {
  static func computeRawHistory(from events: [Event]) -> [(date: Date, capacity: Double, available: Double)] {
    var history: [(date: Date, capacity: Double, available: Double)] = []
    var currentCapacity: Double = 10.0
    var currentAvailable: Double = 10.0

    // Sort events chronologically
    let sortedEvents = events.sorted { $0.timestamp < $1.timestamp }

    for event in sortedEvents {
      switch event.type {
      case "sprout-planted":
        let soilCost = event.data["soilCost"] as? Double ?? 0
        currentAvailable -= soilCost
      case "sprout-harvested":
        let capacityGain = event.data["capacityGain"] as? Double ?? 0
        currentCapacity += capacityGain
        currentAvailable += capacityGain
      case "sprout-watered":
        currentAvailable += 0.05
      case "sun-shined":
        currentAvailable += 0.35
      default:
        break
      }

      history.append((
        date: event.timestamp,
        capacity: min(currentCapacity, 120.0),
        available: min(currentAvailable, currentCapacity)
      ))
    }

    return history
  }

  static func bucketByWeek(history: [(date: Date, capacity: Double, available: Double)]) -> [(date: Date, capacity: Double, available: Double)] {
    // Group by week, take last value of each week
    var buckets: [Date: (capacity: Double, available: Double)] = [:]
    let calendar = Calendar.current

    for entry in history {
      let weekStart = calendar.dateInterval(of: .weekOfYear, for: entry.date)?.start ?? entry.date
      buckets[weekStart] = (entry.capacity, entry.available)
    }

    return buckets.map { (date: $0.key, capacity: $0.value.capacity, available: $0.value.available) }
      .sorted { $0.date < $1.date }
  }
}
```

6. **SoilChartView** (`ios/Trunk/Views/Today/SoilChartView.swift`):
```swift
import SwiftUI
import Charts

struct SoilChartView: View {
  let history: [(date: Date, capacity: Double, available: Double)]
  @State private var selectedDate: Date?

  var body: some View {
    VStack(alignment: .leading, spacing: 8) {
      Text("Soil History")
        .font(.headline)

      if history.isEmpty {
        Text("No data yet")
          .foregroundColor(.secondary)
          .frame(height: 200)
      } else {
        Chart {
          ForEach(history, id: \.date) { entry in
            LineMark(
              x: .value("Date", entry.date),
              y: .value("Capacity", entry.capacity)
            )
            .foregroundStyle(Color.brown)

            LineMark(
              x: .value("Date", entry.date),
              y: .value("Available", entry.available)
            )
            .foregroundStyle(Color.green)

            if let selectedDate = selectedDate,
               calendar.isDate(entry.date, inSameDayAs: selectedDate) {
              RuleMark(x: .value("Selected", entry.date))
                .foregroundStyle(.gray.opacity(0.3))
                .lineStyle(StrokeStyle(lineWidth: 2))
            }
          }
        }
        .frame(height: 200)
        .chartXAxis {
          AxisMarks(values: .stride(by: .weekOfYear)) { value in
            AxisValueLabel(format: .dateTime.month().day())
          }
        }
        .chartYAxis {
          AxisMarks(position: .leading)
        }
        .chartYScale(domain: 0...120)
        .chartLegend(position: .bottom)
        .chartAngleSelection(value: $selectedDate)
      }

      if let selectedDate = selectedDate,
         let entry = history.first(where: { calendar.isDate($0.date, inSameDayAs: selectedDate) }) {
        HStack {
          Text(entry.date, style: .date)
          Spacer()
          Text("Capacity: \(entry.capacity, specifier: "%.1f")")
          Text("Available: \(entry.available, specifier: "%.1f")")
        }
        .font(.caption)
        .foregroundColor(.secondary)
      }
    }
  }

  private var calendar: Calendar { Calendar.current }
}
```

7. **Refactored TodayView** (~180 lines):
```swift
import SwiftUI

struct TodayView: View {
  @State private var sproutStore: SproutStore
  @State private var eventStore: EventStore
  @State private var showingWaterDialog = false
  @State private var showingShineDialog = false

  init(sproutStore: SproutStore, eventStore: EventStore) {
    _sproutStore = State(initialValue: sproutStore)
    _eventStore = State(initialValue: eventStore)
  }

  var body: some View {
    ScrollView {
      VStack(spacing: 20) {
        // Resource meters
        ResourceMetersView(
          soilCapacity: sproutStore.soilCapacity,
          soilAvailable: sproutStore.soilAvailable,
          waterAvailable: sproutStore.waterAvailable,
          sunAvailable: sproutStore.sunAvailable
        )

        // Actions
        HStack(spacing: 12) {
          Button(action: { showingWaterDialog = true }) {
            Label("Water", systemImage: "drop.fill")
          }
          .disabled(sproutStore.waterAvailable == 0)

          Button(action: { showingShineDialog = true }) {
            Label("Shine", systemImage: "sun.max.fill")
          }
          .disabled(sproutStore.sunAvailable == 0)
        }

        // Sections
        WaterSectionView(sproutStore: sproutStore)
        ShineSectionView(sproutStore: sproutStore)
        NextHarvestView(sproutStore: sproutStore)

        // Soil chart
        SoilChartView(
          history: SoilHistoryService.bucketByWeek(
            history: SoilHistoryService.computeRawHistory(from: eventStore.allEvents)
          )
        )
        .padding()
      }
    }
    .navigationTitle("Today")
    .sheet(isPresented: $showingWaterDialog) {
      WaterDialogView(sproutStore: sproutStore)
    }
    .sheet(isPresented: $showingShineDialog) {
      ShineDialogView(sproutStore: sproutStore)
    }
  }
}
```

**Acceptance Criteria**:
- [ ] SproutsView <150 lines
- [ ] TodayView <200 lines
- [ ] Each subview <150 lines
- [ ] ViewModel handles all filter/sort logic
- [ ] All navigation flows work identically
- [ ] @Bindable updates propagate correctly
- [ ] Chart scrubbing gesture works
- [ ] No visual/functional regressions

**Rollback**: Restore `*-legacy.swift` files, delete new view/viewmodel files.

---

## 5. Rollback Strategies

### Phase 1: Critical Fixes

| Item | Rollback Strategy | Data Risk |
|------|-------------------|-----------|
| M2 | Revert .gitignore, restore old token (not recommended) | None |
| M21 | Remove guard clause, delete tests | None |
| H7 | Revert to `querySelector(...)!` calls, delete helper | None |
| H5 | Remove `.withFractionalSeconds`, revert schema | Low (new events affected) |

### Phase 2: Cross-Platform Consistency

| Item | Rollback Strategy | Data Risk |
|------|-------------------|-----------|
| H1 | Delete test files, remove CI pipeline | None |
| H10 | Delete shared registry, revert to hardcoded messages | None |
| M19 | Revert to old ID generation, delete tests | Low (new IDs affected) |
| M13 | Delete documentation files | None |

### Phase 3: Code Quality

| Item | Rollback Strategy | Data Risk |
|------|-------------------|-----------|
| H6 | Restore `main-legacy.ts`, delete bootstrap/ | None (keep backup 1 week) |
| H2 | Restore original `dom-builder.ts`, delete `dom-builder/` | None |
| H4 | Restore original `twig-view.ts`, delete `twig-view/` | None |
| H9 | Restore `*-legacy.swift` files, delete new views | None |

### Phase 4: Architecture

| Item | Rollback Strategy | Data Risk |
|------|-------------------|-----------|
| H8 | Feature flag `USE_LEGACY_DERIVE`, restore `derive-legacy.ts` | None (keep both 1 week) |
| H13 | Revert optimization, restore nested loops | None |
| H3 | Restore from `-backup` localStorage key, clear migration flag | Medium (test thoroughly!) |
| M8 | Feature flag `USE_LEGACY_SYNC`, restore `sync-service-legacy.ts` | Low (backward-compatible facade) |

### Phase 5: Cleanup

| Item | Rollback Strategy | Data Risk |
|------|-------------------|-----------|
| M1 | Restore deleted files from git history | None |
| L3 | Move docs back from archive/ | None |
| M15 | Delete MODULE_BOUNDARIES.md | None |

### Emergency Rollback Procedure

If critical issues arise:

1. **Identify affected phase** from error logs
2. **Check rollback table** above for specific item
3. **Execute rollback**:
   - Revert code changes via git
   - Restore backup files if available
   - Clear feature flags if applicable
4. **For data migrations (H3 only)**:
   - Restore from `trunk-*-backup` localStorage keys
   - Clear migration flag
   - Verify data integrity
5. **Deploy hotfix** if production affected
6. **Post-mortem**: Document what went wrong, update mitigation strategy

### Feature Flags

Use feature flags for high-risk changes:

```typescript
// web/src/feature-flags.ts
export const FEATURE_FLAGS = {
  USE_LEGACY_DERIVE: false,  // H8: Event derivation
  USE_LEGACY_SYNC: false,    // M8: Sync services
  USE_NODE_EVENTS: true      // H3: Event sourcing for nodes
}
```

Enable rollback via localStorage:

```typescript
localStorage.setItem('feature-flag-USE_LEGACY_DERIVE', 'true')
```

---

## Appendix: Testing Checklist

### Phase 1

- [ ] M2: Token rotated, template works, onboarding docs clear
- [ ] M21: Empty array doesn't crash, single item works
- [ ] H7: Missing element throws descriptive error, all 76 calls safe
- [ ] H5: iOS timestamps have .SSS, web timestamps have .SSS, schema validates

### Phase 2

- [ ] H1: All 90+ test cases pass on both platforms
- [ ] H10: Same error shows same message on both platforms
- [ ] M19: New IDs match UUID pattern on both platforms
- [ ] M13: Sync protocol implemented identically per spec

### Phase 3

- [ ] H6: App starts successfully, initialization logged, no regressions
- [ ] H2: Screenshot comparison shows zero visual changes
- [ ] H4: All sprout CRUD operations work, leaf grouping preserved
- [ ] H9: All navigation flows work, chart gestures work, @Bindable updates propagate

### Phase 4

- [ ] H8: Benchmark targets met (<1ms warm cache), output identical to original
- [ ] H13: 50%+ perf improvement, behavior unchanged
- [ ] H3: Migration creates backup, all node data derived from events
- [ ] M8: Backward-compatible API, all sync tests pass

### Phase 5

- [ ] M1: Dead code confirmed removed, no broken references
- [ ] L3: Archive organized, links updated
- [ ] M15: Module boundaries documented clearly

---

**End of Implementation Plan**
