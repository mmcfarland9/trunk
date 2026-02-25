# CLEANUP.md — Codebase Audit (Phase 1)

**Date:** 2026-02-23
**Scope:** web/, ios/, shared/, docs/
**Status:** Phase 2 complete (2026-02-24) — all EASY and MEDIUM items implemented

---

## EASY (< 30 min, no risk)

### ~~E1. Delete orphaned error-codes module~~
**Agent:** Dead Code
**File:** `web/src/utils/error-codes.ts` (entire file)
**Issue:** All 5 exports (`getErrorInfo`, `getUserMessage`, `getErrorCode`, `ErrorInfo`, `ErrorCategory`) are never imported anywhere. Planned error-handling system that was never wired in.
**Action:** ~~Delete file. Run `npm run build` to verify.~~
**Result:** Done. File deleted, ARCHITECTURE.md error handling section updated.

### ~~E2. Delete unused reset interval constants~~
**Agent:** Dead Code
**File:** `web/src/generated/constants.ts:157,159`
**Issue:** `WATER_RESET_INTERVAL_MS` and `SUN_RESET_INTERVAL_MS` are never referenced. App uses `getNextWaterReset()`/`getNextSunReset()` functions instead.
**Action:** ~~Remove both constants. These are generated from `shared/constants.json` — remove from source if present there too.~~
**Result:** Done. Removed from `constants.ts`, `constants.json`, and `generate-constants.js`.

### ~~E3. Delete orphaned shared/assets/trunk-map-preset.json~~
**Agent:** Dead Code
**File:** `shared/assets/trunk-map-preset.json` (8 KB)
**Issue:** Not referenced anywhere. Branch/twig labels now live in `shared/constants.json` under `tree.branches`.
**Action:** ~~Delete file.~~
**Result:** Done.

### ~~E4. Delete stale shared/docs/validation-rules.md~~
**Agent:** Dead Code
**File:** `shared/docs/validation-rules.md` (9 KB)
**Issue:** Incomplete spec, not referenced in code or docs. Implementation exists in `web/src/utils/validate-import.ts` but diverged from this spec.
**Action:** ~~Delete file.~~
**Result:** Done.

### ~~E5. Delete stale shared/docs/event-derivation-algorithm.md~~
**Agent:** Dead Code
**File:** `shared/docs/event-derivation-algorithm.md` (13.3 KB)
**Issue:** Language-agnostic algorithm spec that's out of sync with actual implementations in `derive.ts` and `EventDerivation.swift`.
**Action:** ~~Delete file. Both platform implementations are the source of truth.~~
**Result:** Done.

### ~~E6. Switch layout caches to WeakMap~~
**Agent:** Performance
**File:** `web/src/ui/layout.ts:52-53`
**Issue:** `positionCache` and `twigRadiusCache` use `Map<HTMLElement, ...>` — entries persist even after elements are removed from DOM (memory leak edge case).
**Action:** ~~Change to `WeakMap<HTMLElement, ...>` for automatic GC.~~
**Result:** Done. Changed to `let` + `WeakMap` declarations.

### ~~E7. Replace Array.flat() with push loop in getActiveSprouts~~
**Agent:** Performance
**File:** `web/src/events/derive.ts:354`
**Issue:** `Array.from(state.activeSproutsByTwig.values()).flat()` creates unnecessary intermediate arrays.
**Action:** ~~Replace with direct push loop.~~
**Result:** Done.

### ~~E8. Update IDEAS.md — mark completed features~~
**Agent:** Docs Staleness
**File:** `IDEAS.md`
**Issue:** D1 (watering streak counter), D4 (radar chart), A11 (soil chart) listed as unimplemented but are in CHANGELOG as completed.
**Action:** ~~Move to a "Completed" section or annotate as done.~~
**Result:** Done. Items struck through with "DONE" annotations.

### ~~E9. Update ONBOARDING.md — add protocols reference~~
**Agent:** Docs Staleness
**File:** `docs/ONBOARDING.md`
**Issue:** Doesn't mention `shared/protocols.md` (timestamp/ID standards) which developers need for cross-platform work.
**Action:** ~~Add 1-line reference.~~
**Result:** Done.

---

## MEDIUM (refactor, some risk)

### ~~M1. Cache getBoundingClientRect calls in drawGuideLines~~
**Agent:** Performance
**File:** `web/src/ui/layout.ts:163-264`
**Issue:** Called every animation frame (60Hz). Reads `getBoundingClientRect()` 8+ times per frame on multiple elements — triggers layout thrashing.
**Action:** ~~Cache all bounding rects at the start of the function using a local Map, then read from cache. Clear per frame.~~
**Result:** Done. Added `getCachedRect()` helper with per-frame `rectCache` Map.
**Risk:** Low — pure performance optimization, no behavioral change.

### ~~M2. Pre-compute Date objects in event filters~~
**Agent:** Performance
**File:** `web/src/events/derive.ts:283-334`
**Issue:** `new Date(e.timestamp)` created per event in `deriveWaterAvailable`, `deriveSunAvailable`, and related functions. Repeated on every state read.
**Action:** ~~Pre-compute `resetTime.getTime()` once and compare numeric timestamps.~~
**Result:** Done. All 5 filter functions now use `resetMs` numeric comparison.
**Risk:** Low — equivalent comparison, just faster.

### ~~M3. Deduplicate event sorting between derive and soil-charting~~
**Agent:** Performance
**File:** `web/src/events/derive.ts:108-110`, `web/src/events/soil-charting.ts:55-57`
**Issue:** Both `deriveState()` and `computeRawSoilHistory()` independently sort events with `[...events].sort(...)`. Duplicate O(n log n) work.
**Action:** ~~Either ensure EventStore returns pre-sorted events, or sort once in a shared utility and pass sorted arrays to both.~~
**Result:** Done. Extracted shared `sortEventsByTimestamp()` into `events/sort-events.ts`. Both modules now import from the shared utility.
**Risk:** Low-medium — need to verify EventStore insertion order guarantees.

### ~~M4. Extract sync retry logic~~
**Agent:** Modularity
**File:** `web/src/services/sync/operations.ts` (473 lines)
**Issue:** Handles pull, push, retry with backoff, cache management, and visibility-based sync all in one file.
**Action:** ~~Extract `retryPendingUploads` and backoff logic into `sync/retry.ts`, `pushEvent` into `sync/push.ts`, `pullEvents` into `sync/pull.ts`. Coordinator stays at ~150 lines.~~
**Result:** Done. Created `sync/pull.ts`, `sync/push.ts`, `sync/retry.ts`, `sync/timeout.ts`. Operations.ts reduced from 473 to ~170 lines.
**Risk:** Medium — sync is critical path, needs careful testing.

### ~~M5. Update ARCHITECTURE.md — add missing modules~~
**Agent:** Docs Staleness
**File:** `docs/ARCHITECTURE.md`
**Issue:** Module graph missing: `ui/soil-chart.ts`, `ui/radar-chart.ts`, `events/radar-charting.ts`, `utils/wind.ts`.
**Action:** ~~Add these to the module graph diagram with brief descriptions.~~
**Result:** Done. Added radar-charting.ts, wind.ts, soil-chart.ts, radar-chart.ts. Updated shared assets section. Cleaned up stale error-codes reference.
**Risk:** None (docs only).

### ~~M6. Extend INTERFACES.md — document new APIs~~
**Agent:** Docs Staleness
**File:** `docs/INTERFACES.md`
**Issue:** Missing API documentation for Radar Charting (`events/radar-charting.ts`) and Soil Charting (`events/soil-charting.ts`, `ui/soil-chart.ts`) modules.
**Action:** ~~Add sections with function signatures and usage examples.~~
**Result:** Done. Added Radar Charting API, Soil Charting API, and Soil Chart UI sections.
**Risk:** None (docs only).

---

## HARD (architectural, needs design)

### H1. Split bootstrap/ui.ts into feature modules
**Agent:** Modularity
**File:** `web/src/bootstrap/ui.ts` (338 lines)
**Issue:** Orchestrates initialization for water, harvest, shine, log, account dialogs, charts, and progress. Each feature's init logic could be its own module.
**Action:** Create `bootstrap/features/water.ts`, `bootstrap/features/harvest.ts`, etc. Main `ui.ts` imports and calls each in sequence.
**Impact:** Clearer feature boundaries, easier to add/remove features.
**Risk:** Medium — touches initialization order, needs integration testing.

### H2. Decompose twig-view/index.ts
**Agent:** Modularity
**File:** `web/src/ui/twig-view/index.ts` (412 lines)
**Issue:** Mixes form state management, UI rendering, event handling, dialog management, and navigation callbacks.
**Action:** Extract dialog management into `twig-view/dialogs.ts`, rendering filters into `twig-view/rendering.ts`.
**Impact:** More testable, clearer separation of concerns.
**Risk:** Medium — twig view is complex, regression risk in extraction.

---

## Out of Scope (Validated as Acceptable)

These were investigated and confirmed as intentional/acceptable:

- **Soil charting logic duplication** (`soil-charting.ts` vs `derive.ts`) — Documented design decision (lines 3-8 of soil-charting.ts). Charting needs per-event snapshots, derive needs final state.
- **Cross-platform event derivation** (`derive.ts` 528 lines / `EventDerivation.swift` 580 lines) — Intentional ports. Constants properly shared via `shared/constants.json`.
- **`deriveState()` function length** (169 lines) — Cohesive event replay loop. Splitting would hurt readability of the event sourcing core.
- **`layout.ts` size** (442 lines) — Well-organized with clear function separation by concern.
- **Large test files** (`derive.test.ts` 1126 lines, `sync-operations.test.ts` 645 lines) — Justified by business logic complexity.
- **iOS codebase** — Zero dead code detected. Clean, well-structured.

---

## Implementation Order (Phase 2)

~~**Batch 1 — Quick wins (E1-E9):** ~30 min total. Delete dead files, fix constants, update docs. Zero risk.~~

~~**Batch 2 — Performance (M1-M3):** ~2 hours. Layout thrashing fix has highest impact. All are behavioral no-ops.~~

~~**Batch 3 — Refactoring (M4-M6, H1-H2):** ~1 day. Sync extraction and twig-view decomposition need test coverage first.~~

**Remaining:** H1 and H2 (architectural, deferred to future session).
