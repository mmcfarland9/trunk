# Summary

> Full arc of the February 2026 work — audit through implementation.

---

## 1. Where We Started

The codebase was a working solo project with solid foundations (event sourcing, cross-platform parity via shared constants, minimal dependencies, 95%+ line coverage on web) and a clear set of risks that had been accumulating quietly.

**Original audit (PROPOSAL.md, Feb 15)** identified 75 findings across 5 agents:

- **13 HIGH** — god objects (`dom-builder.ts` at 595 lines, `twig-view.ts` at 709 lines, `main.ts` at 563 lines), cross-platform business logic duplication (400+ lines), incomplete event sourcing migration, unsafe DOM access, timestamp inconsistency, monolithic iOS views
- **25 MEDIUM** — hardcoded access token in `.mcp.json`, unused Swift extensions, sync complexity, duplicate validation logic, ID generation divergence, nested O(n²) loops
- **20 LOW** — stale docs, magic numbers, naming inconsistencies, circular import risks

The biggest structural risks were:
1. **Performance at scale** — full O(n) event replay on every cache miss, 60fps animation loops computing wind for 72 nodes even when off-screen, full DOM rebuilds in sidebar
2. **Accidental platform divergence** — duplicate validation logic in two files, manual export field mapping, iOS silently returning `.distantPast` for bad timestamps
3. **Maintainability ceiling** — `bootstrap/ui.ts` as the wiring hub for all callbacks, module-level mutable state everywhere, no reactive system

**The test suite was broad but had gaps**: ~800 tests across 42 files, ~85% statement coverage, ~70% branch coverage. No tests for edge cases like double uproot, 6am boundaries, adversarial inputs, or sync round-trips.

---

## 2. What We Did

### Phase 1: Triage (CLEANUP.md, Feb 23-24)

Systematic audit and cleanup. Every item categorized EASY/MEDIUM/HARD.

**Completed (9 EASY + 6 MEDIUM):**
- Deleted 5 dead files: `error-codes.ts`, `trunk-map-preset.json`, `validation-rules.md`, `event-derivation-algorithm.md`, unused reset interval constants
- Switched layout caches from `Map` to `WeakMap` (memory leak fix)
- Replaced `Array.flat()` with push loop in `getActiveSprouts()`
- Cached `getBoundingClientRect()` calls per frame in `drawGuideLines()` (layout thrashing fix)
- Pre-computed Date objects in 5 event filter functions (numeric ms comparison)
- Extracted shared `sortEventsByTimestamp()` to eliminate duplicate O(n log n) sorts
- Split `operations.ts` (473 → ~170 lines) into `sync/pull.ts`, `sync/push.ts`, `sync/retry.ts`, `sync/timeout.ts`
- Updated ARCHITECTURE.md, INTERFACES.md, ONBOARDING.md, IDEAS.md

**Deferred (2 HARD):** H1 (`bootstrap/ui.ts` decomposition) and H2 (`twig-view/index.ts` decomposition) — flagged as needing design before extraction.

### Phase 2: Test Expansion (TEST_AUDIT.md, Feb 22)

Added **18 test files with 374 new tests** across four batches:

| Batch | Tests | Coverage |
|-------|-------|----------|
| Core Logic (derive edge cases, soil charting, radar charting, watering streak) | 86 | Events module to 96.45% stmts |
| State & UI Logic (date formatting, twig ID parsing, sync types, view state, form validation) | 110 | Utils to 91.74% stmts |
| Sync & Data Integrity (cache, round-trip, concurrency, offline, payload validation) | 70 | Sync to 94.75% stmts |
| Edge Case Sweep (zero state, boundaries, adversarial, time) | 108 | Branch coverage from ~70% to 86.88% |

**Total unit tests went from ~800 to 1,174. Statement coverage from ~85% to 95.66%. Branch coverage from ~70% to 86.88%.**

Tests documented a real bug: **double uproot soil refund** — `deriveState` guards state transition but doesn't guard the soil accounting line, so soil is returned twice on duplicate uproot events.

### Phase 3: Diagnostic (STATE_OF_THE_CODE.md, Feb 27)

Full diagnostic report covering every module across web, iOS, and shared. Tiered assessment:

- **Tier 1 (Solid):** shared constants/fixtures, `derive.ts`, `utils/`, iOS `ProgressionService`, iOS `EventDerivation`, iOS `Theme`
- **Tier 2 (Functional):** `store.ts`, `layout.ts`, `twig-view/index.ts`, `navigation.ts`, sync subsystem, iOS EventStore, iOS SyncService
- **Tier 3 (Fragile):** `bootstrap/ui.ts`, `progress.ts`, `node-ui.ts`, `build-dialogs.ts`, `dialogs.css` (1,716 lines), iOS `TreeCanvasView`, iOS `BranchView`

Documented 13 specific technical debt items, 3 pattern drift issues, and 6 quiet platform divergences.

### Phase 4: Roadmap (ROADMAP.md, Feb 27)

Structured into 3 groups with concrete implementations:

- **Group A (Correctness):** A1 harvest date timezone fix, A2 iOS `.distantPast` fallback, A3 week reset verification, A4 quota error callback
- **Group B (Cross-platform):** B1-B2 event log compaction (design doc), B3-B4 field coverage tests
- **Group C (Architecture + Features):** C1-C2 decompose `bootstrap/ui.ts` and `twig-view/index.ts`, C3 dark mode, C4 edit sprout

### Phase 5: Implementation (web + iOS CHANGELOGs)

All four roadmap groups were executed:

**Correctness fixes:**
- Harvest date preview: `setUTCHours(15)` → `setHours(9)` (local time)
- iOS `ISO8601.parse()`: returns `Date?` instead of `.distantPast`
- Week reset verification test confirming Monday 6am boundary agreement
- Quota warning banner with persistent "Storage full" UI and Export button
- Profile save error feedback (was silently swallowed)
- Cmd+Arrow keyboard guard during text editing

**Cross-platform:**
- Field coverage test fixture (`shared/test-fixtures/field-coverage.json`) with maximal events for all 6 types
- 32 field coverage tests verifying sync round-trip and `deriveState()` field preservation
- Event log compaction design document written (`docs/archive/plans/event-log-compaction.md`)

**Architecture:**
- Decomposed `bootstrap/ui.ts` (383 → ~105 lines) into `meters.ts`, `charts.ts`, `dialogs.ts`
- Decomposed `twig-view/index.ts` (417 → 350 lines) into `confirm.ts`, `keyboard.ts`, `leaf-select.ts`

**New features:**
- **Edit sprout** — new `sprout_edited` event type, sparse field merge, inline edit form on active sprout cards
- **Dark mode** — OS auto-detection via `prefers-color-scheme`, manual Light/Dark/Auto toggle, saved to localStorage
- Celebration feedback (pulse animation on resource meters)
- Watering streak counter
- Keyboard shortcuts (W/S/H for daily actions)
- Soil capacity chart with range picker and hover scrub
- Life balance radar chart overlaid on tree map
- CSS custom properties for dialog tokens (replaced 42 hardcoded values)
- Removed 34 orphaned CSS selectors (~260 lines)
- Removed duplicate `validateSyncPayload()` (now imports shared `validateEvent()`)

**Performance (7 optimizations):**
- Event sort pre-check: O(n) scan skips sort when already ordered
- Selective cache invalidation (water event only clears water/streak caches)
- `getEvents()` returns internal array directly with `readonly` enforcement
- Wind animation loop pauses in twig/leaf view
- Twig label formatting cached via Map
- Sidebar sprout list dirty check (skips rebuild when unchanged)
- Canvas `getBoundingClientRect()` cached with 100ms TTL

**iOS work:**
- `InteractiveBranchNode`, `BranchCenterNode`, `TwigNode`, `CanvasDotGuideLines` made Equatable (reduces re-evaluation)
- `branchSproutData` converted from computed to `@State`
- Radar polygon tracks branch wind animation
- Upcoming Harvests sheet with VoiceOver accessibility
- Sign-out button, E2E test login
- Watering streak counter, celebration feedback

**Totals across the arc:** ~132 files changed, ~10,300 lines added, ~2,000 lines removed across 40 commits.

### Phase 6: Ideas Generation (IDEAS.md)

Four research agents generated a structured catalog of 54 forward-looking ideas across 4 categories: 17 missing features, 15 unexpected features, 12 UX leverage points, 25 data insights. Three items were already completed and marked done (soil chart, radar chart, watering streak).

---

## 3. Where We Are Now

### Solid

- **Event sourcing core** — `derive.ts` is clean, correct, pure, and well-tested (96.45% statement coverage). Handles dedup, soil rounding, four index maps. Both platforms validated against shared fixtures.
- **Cross-platform parity** — shared constants, test fixtures, generated code. Field coverage tests now catch any field dropped during sync or export.
- **Test suite** — 1,174 unit tests, 57 test files, 95.66% statement coverage, 86.88% branch coverage. Edge cases, adversarial inputs, and time boundaries all covered.
- **Performance** — selective cache invalidation, sort pre-check, wind loop pausing, label caching, dirty-check sidebar. The hot path (derivation) is fast for current scale.
- **Dependencies** — one runtime dep (Supabase JS SDK) on web. Two on iOS. Zero deprecated packages.
- **Architecture** — `bootstrap/ui.ts` and `twig-view/index.ts` decomposed. Sync split into 4 focused modules. Clear module boundaries documented.

### Still Fragile

- **`progress.ts`** (70.58% function coverage) — full DOM rebuild on every update, three display modes with different construction paths, module-level mutable callback storage.
- **`dialogs.css`** (1,716 lines) — seven dialog styles, no shared abstractions. CSS custom properties added for tokens but structural refactoring not done.
- **`node-ui.ts` `formatTwigBoxLabel()`** — Canvas 2D text measurement is now cached, but the function itself remains complex (16:9 aspect ratio scoring for line breaks).
- **iOS animation per-frame cost** — `TimelineView(.animation)` still triggers full view evaluation every frame. Equatable conformance mitigates but doesn't eliminate.
- **Double uproot soil refund** — documented bug, not yet fixed. `deriveState` guards state transition but not soil accounting.

### New but Unproven

- **Edit sprout** (`sprout_edited` event) — new event type added to shared schema, constants, derivation, validation, and sync. Not yet exercised in production with real user data.
- **Dark mode** — auto-detection + manual toggle. Not yet verified across all 7 dialog styles and chart rendering contexts.
- **Event log compaction** — design document written with full pseudocode, snapshot schema, and 10 test scenarios. Implementation not started.
- **Field coverage tests** — verify sync round-trip field preservation. Only covers web; iOS equivalent not yet written.

### Known Remaining Issues

- **`validateEvent` is permissive** — doesn't enforce `MAX_TITLE_LENGTH` (60 chars). UI-only constraint.
- **Event listener leaks in `login-view.ts`** — `destroyLoginView()` nulls elements but doesn't remove listeners. Practical impact: none (created and destroyed once).
- **Module-level mutable state** — still pervasive across web. `store.ts` (11 vars), `view-state.ts` (7 vars), `progress.ts`, `navigation.ts`, etc. The "no framework" trade-off.
- **`computeRawSoilHistory` doesn't cap at `MAX_SOIL_CAPACITY`** — soil chart could show capacity >120 after large harvest chains.
- **Show/hide inconsistency** — CSS classes (`.is-hidden`, `.hidden`), `style.display`, `hidden` attribute, `is-collapsed` all coexist.
- **Hardcoded timezone in soil charting** — less critical than the harvest date fix (which landed), but same class of issue.
- **iOS sync not unit tested** — SyncService, AuthService, EventStore cache invalidation all untested.

---

## 4. What's Next

### Highest Value (from Roadmap + IDEAS.md)

1. **Fix double uproot soil refund** — one-line guard in `derive.ts` before the soil accounting line. Real bug, easy fix.

2. **Implement event log compaction** — design doc is written (`docs/archive/plans/event-log-compaction.md`), implementation checklist defined. This is the most important architectural work remaining. A daily user hits localStorage pressure around year 3-5.

3. **iOS field coverage tests** — web has 32 tests verifying sync round-trip. iOS has nothing equivalent. The fixture exists; the Swift test needs writing.

4. **iOS sync unit tests** — biggest iOS coverage gap. SyncService is critical path with zero test coverage.

### Worth Revisiting (from IDEAS.md)

| Item | Why |
|------|-----|
| A2. Rename leaf | Small, fills obvious UX gap |
| A4. Search/filter sprouts on web | iOS has it, web doesn't |
| A6. Early harvest | Simple `isReady()` relaxation, maybe reduced reward |
| A14. Undo last action | Event sourcing makes `event_reverted` natural |
| B1. Compost heap | Adds meaning to uproot, fits gardening metaphor |
| B7. Time capsule letters | Small, emotionally resonant, sealed at plant / revealed at harvest |
| C1. Post-action celebration | Done on meters; extend to visual tree feedback |
| D5. Neglected branch nudge | All data exists, small derivation + display |
| D7. Harvest success rate by season/environment | All data exists, useful for user self-knowledge |
| D25. At-risk sprout detection | Flags sprouts unwatered for X days relative to season |

### Not Worth Prioritizing

- **H3 from PROPOSAL (complete event sourcing migration for node labels/notes)** — the legacy `nodeState` system works and doesn't interact with the event system. Migration adds risk for minimal gain.
- **H8 from PROPOSAL (split derive.ts into derive-sprouts/derive-resources/derive-charts)** — `derive.ts` is a cohesive event replay loop. The diagnostic confirmed splitting would hurt readability. Compaction is the right scaling answer, not splitting the replay.
- **Framework adoption** — the vanilla DOM approach works. Adding a reactive system now would be a rewrite, not an improvement.

---

*Generated February 28, 2026. Covers 40 commits, ~132 files changed, ~10,300 lines added across audit → triage → testing → diagnostic → roadmap → implementation.*
