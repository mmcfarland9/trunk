# Test Coverage Audit

*Generated: 2026-02-22*

## Summary

| Metric | Before | After | Delta |
|--------|--------|-------|-------|
| Test files (web unit) | 42 | 57 | +15 |
| Test files (web E2E) | 11 | 11 | -- |
| Test files (iOS) | 7 | 7 | -- |
| Total unit tests | ~800 | 1,174 | +374 |
| Statement coverage | ~85% | 95.66% | +~11% |
| Branch coverage | ~70% | 86.88% | +~17% |
| Function coverage | ~80% | 93.86% | +~14% |
| Line coverage | ~87% | 96.53% | +~10% |

Coverage thresholds (vitest.config.ts): lines/functions/statements 70%, branches 60% -- all exceeded.

---

## 1. Current Coverage by Module

### events/ (96.45% stmts, 86.84% branch)

| File | Stmts | Branch | Funcs | Tests |
|------|-------|--------|-------|-------|
| derive.ts | 98.69% | 92.20% | 96.77% | derive.test.ts, derive-edge-cases.test.ts, events.test.ts, parity.test.ts, shared-fixtures.test.ts |
| store.ts | 87.96% | 76.00% | 86.66% | store.test.ts, sync-roundtrip.test.ts |
| soil-charting.ts | 100% | 95.83% | 100% | soil-charting.test.ts |
| radar-charting.ts | 100% | 85.71% | 100% | radar-charting.test.ts |
| types.ts | 100% | 100% | 100% | (type definitions, covered transitively) |

**Covered functions**: deriveState, deriveWaterAvailable, deriveSunAvailable, wasSproutWateredThisWeek, wasSproutWateredToday, wasShoneThisWeek, getSproutsForTwig, getLeavesForTwig, getActiveSprouts, getCompletedSprouts, toSprout, getLeafById, getSproutsByLeaf, getAllWaterEntries, deriveWateringStreak, generateSproutId, generateLeafId, computeRawSoilHistory, bucketSoilData, deriveSoilLog, computeBranchEngagement

**Uncovered lines in store.ts** (87.96%): startVisibilityCacheInvalidation (document.addEventListener path), setEventSyncCallback, setEventStoreErrorCallbacks — these wire up side effects that are harder to unit test.

### services/sync/ (94.75% stmts, 88.37% branch)

| File | Stmts | Branch | Funcs | Tests |
|------|-------|--------|-------|-------|
| cache.ts | 100% | 100% | 100% | sync-cache.test.ts |
| operations.ts | 92.45% | 83.72% | 85.71% | sync-operations.test.ts, sync-concurrency.test.ts, sync-offline.test.ts |
| pending-uploads.ts | 100% | 100% | 100% | pending-uploads.test.ts |
| realtime.ts | 100% | 96.00% | 100% | realtime.test.ts |
| status.ts | 100% | 100% | 100% | sync-status.test.ts |

**Uncovered in operations.ts**: retryPendingUploads exponential backoff internals, startVisibilitySync document listener, some error recovery paths in pullEvents.

### services/ (90.47% stmts)

| File | Stmts | Branch | Funcs | Tests |
|------|-------|--------|-------|-------|
| sync-types.ts | 90.47% | 95.45% | 100% | sync-types.test.ts, sync-payload-validation.test.ts |

**Uncovered**: Line 81 (edge case in syncToLocalEvent fallback).

### utils/ (91.74% stmts, 87.22% branch)

| File | Stmts | Branch | Funcs | Tests |
|------|-------|--------|-------|-------|
| calculations.ts | 100% | 93.75% | 100% | calculations.test.ts, capacity-reward.test.ts, water.test.ts, sun.test.ts |
| date-formatting.ts | 100% | 100% | 100% | date-formatting.test.ts |
| debounce.ts | 100% | 100% | 100% | utils.test.ts |
| dom-helpers.ts | 100% | 100% | 100% | dom-helpers.test.ts |
| escape-html.ts | 100% | 100% | 100% | escape-html.test.ts, utils.test.ts |
| presets.ts | 100% | 100% | 100% | presets.test.ts |
| safe-storage.ts | 100% | 100% | 100% | safe-storage.test.ts |
| sprout-labels.ts | 100% | 100% | 100% | sprout-labels.test.ts |
| twig-id.ts | 100% | 100% | 100% | twig-id-parsing.test.ts |
| validate-import.ts | 81.11% | 83.20% | 100% | validate-import.test.ts |

**Uncovered in validate-import.ts**: Some sanitization branches for legacy field names.

### state/ (100% stmts)

| File | Stmts | Branch | Funcs | Tests |
|------|-------|--------|-------|-------|
| view-state.ts | 100% | 84.61% | 100% | navigation.test.ts, state.test.ts, view-state-transitions.test.ts |

### features/ (96.39% stmts, 89.20% branch)

| File | Stmts | Branch | Funcs | Tests |
|------|-------|--------|-------|-------|
| progress.ts | 96.27% | 92.06% | 90.62% | features-progress.test.ts |
| shine-dialog.ts | 93.75% | 84.21% | 100% | shine-dialog.test.ts |
| water-dialog.ts | 100% | 89.47% | 100% | water-dialog.test.ts |

**Uncovered in progress.ts**: Lines 302-311 (leaf-grouped display edge case).

### ui/ (89-100% stmts)

| File | Stmts | Branch | Funcs | Tests |
|------|-------|--------|-------|-------|
| dom-builder/*.ts | 99.23% | 67.85% | 100% | build-dialogs.test.ts, dom-builder.integration.test.ts |
| twig-view/form-validation.ts | 100% | 100% | 100% | form-validation.test.ts, form-validation-edge-cases.test.ts |
| progress-panel.ts | 89.68% | 73.07% | 70.58% | features-progress.test.ts |

### generated/ (100%)

| File | Stmts | Branch | Funcs | Tests |
|------|-------|--------|-------|-------|
| constants.ts | 100% | 100% | 100% | generated-constants.test.ts |

---

## 2. Critical Gaps (P0-P1)

### P0: Data Integrity

| Gap | Risk | Status |
|-----|------|--------|
| Double uproot soil refund | Edge tests found: state guard prevents re-transition but soil IS returned twice (no guard on soil accounting line) | **BUG DOCUMENTED** in edge-cases-adversarial.test.ts |
| validateEvent doesn't enforce MAX_TITLE_LENGTH | UI constraint only — server/event layer accepts any length | **DOCUMENTED** |
| store.ts visibility cache invalidation | 12% uncovered — document.addEventListener paths not tested | Low risk (browser API) |

### P1: Sync

| Gap | Risk | Status |
|-----|------|--------|
| retryPendingUploads backoff timing | Internal exponential backoff not tested for timing accuracy | Medium risk |
| pullEvents partial failure recovery | Some error paths in operations.ts L235, L469-470 uncovered | Medium risk |
| startVisibilitySync | Document visibility listener not tested | Low risk (browser API) |

---

## 3. Important Gaps (P2-P3)

### P2: State/UI Logic

| Gap | Status |
|-----|--------|
| progress-panel.ts (70.58% funcs) | createBranchFolder, renderLeafGroupedSprouts partially tested |
| build-header.ts (25% branch) | Export reminder conditional, sync indicator states |
| build-tree-nodes.ts (50% branch) | Feature flag / conditional node creation |

### P3: Utilities

| Gap | Status |
|-----|--------|
| validate-import.ts (81% stmts) | Legacy field sanitization branches |
| error-codes.ts | Not unit tested (loads JSON from bundle) |
| wind.ts | Not unit tested (deterministic PRNG — tested via cross-platform parity) |

---

## 4. iOS-Specific Gaps

iOS has 7 test files covering core logic parity:

| File | Coverage |
|------|----------|
| EventDerivationTests.swift | Core derivation (mirrors derive.test.ts) |
| ParityTests.swift | Cross-platform fixture validation |
| ProgressionServiceTests.swift | soilCost, capacityReward, harvestDate, uprootRefund |
| SproutModelTests.swift | Season/Environment/State enums |
| DataExportServiceTests.swift | Export/import round-trip |
| SunPromptsTests.swift | Prompt selection, {twig} replacement |
| ViewHelpersTests.swift | relativeTime, resultToEmoji |

**iOS gaps** (not tested):
- SyncService.swift: smartSync, pushEvent, realtime subscription, pending uploads
- AuthService.swift: OTP flow, session management
- EventStore.swift: Cache invalidation, debounced disk writes
- SoilHistoryService.swift: Soil charting (web equivalent is now tested)
- Wind.swift: PRNG output (tested implicitly via parity fixtures)
- EventCacheIO.swift: Async file I/O

---

## 5. New Test Files Added (18 files, 374 tests)

### Core Logic (Task #2 — 86 tests)
- `derive-edge-cases.test.ts` — 25 tests: out-of-order sorting, capacity clamping, dedup, invalid transitions, floating-point precision
- `soil-charting.test.ts` — 26 tests: all event types, all 7 bucket ranges, deriveSoilLog
- `radar-charting.test.ts` — 17 tests: branch engagement scoring, normalization, unknown sproutIds
- `watering-streak.test.ts` — 18 tests: consecutive days, gap reset, 6am boundary, multi-sprout

### State & UI Logic (Task #3 — 110 tests)
- `date-formatting.test.ts` — 19 tests: all month/day combos, leap year, epoch, far-future
- `twig-id-parsing.test.ts` — 20 tests: all 64 valid IDs, malformed, boundary indices
- `sync-types.test.ts` — 22 tests: payload conversion for all 6 event types, round-trip, validation
- `view-state-transitions.test.ts` — 22 tests: full navigation cycle, state isolation, boundaries
- `form-validation-edge-cases.test.ts` — 27 tests: title/leaf/bloom length limits, whitespace, soil display

### Sync & Data Integrity (Task #4 — 70 tests)
- `sync-cache.test.ts` — 13 tests: isCacheValid, set/clear/invalidate, localStorage key format
- `sync-roundtrip.test.ts` — 7 tests: export→clear→replace→verify identity
- `sync-concurrency.test.ts` — 4 tests: C17 guard, C4 pending preservation
- `sync-offline.test.ts` — 6 tests: push failure→pending, idempotency, success cleanup
- `sync-payload-validation.test.ts` — 40 tests: all 6 event types valid/invalid/extra/iOS format

### Edge Case Sweep (Task #5 — 108 tests)
- `edge-cases-zero-state.test.ts` — 23 tests: empty logs, no localStorage, all defaults
- `edge-cases-boundaries.test.ts` — 31 tests: 6am reset exact boundary, capacity cap, result range
- `edge-cases-adversarial.test.ts` — 26 tests: double harvest/uproot, water completed sprouts, unicode, non-existent refs
- `edge-cases-time.test.ts` — 28 tests: midnight, DST, 500+ events, duplicate timestamps, multi-year spans

---

## 6. Behavioral Findings from Tests

Tests documented several noteworthy behaviors:

1. **Double uproot refund bug**: `deriveState` guards state transition (won't set state=uprooted twice) but does NOT guard the soil refund line — soil is returned twice. See `edge-cases-adversarial.test.ts`.

2. **validateEvent is permissive**: Does not enforce MAX_TITLE_LENGTH (60 chars). Title length is a UI-only constraint. Events with 1000-char titles are accepted.

3. **Watering completed sprouts**: Water entry IS added to the sprout's waterEntries array, but soil recovery is correctly NOT applied (guarded by active state check on the recovery line).

4. **Harvesting non-existent sprout**: Silently skipped — no capacity gained, no error thrown.

5. **6am boundary**: An event at exactly 06:00:00.000 counts as the NEW day. 05:59:59.999 counts as the previous day.

---

## 7. Recommendations

### Immediate (bugs found by tests)
1. **Fix double uproot soil refund** — Add state guard before soil accounting in derive.ts
2. **Consider server-side title length validation** — Currently UI-only

### Short-term (coverage gaps)
3. Add tests for `progress-panel.ts` remaining functions (70.58% function coverage)
4. Add tests for `validate-import.ts` legacy sanitization branches
5. Add iOS sync tests (SyncService, AuthService)

### Medium-term
6. Add mutation testing baseline (`npm run test:mutation` already configured with Stryker)
7. Add iOS parity tests for soil charting (web now tested, iOS equivalent not)
8. Test `error-codes.ts` and `wind.ts` utilities directly
