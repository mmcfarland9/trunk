# Known Issues

Sorted by severity descending. Each entry appears once regardless of how many documents identified it.

Status: **FIXED** | **DEFERRED** (with reason) | **RESOLVED** (non-issue)

---

## Critical

### 1. Double uproot returns soil twice — FIXED

**What:** `deriveState` applies `soilReturned` unconditionally before checking sprout state. The state guard (`sprout.state === 'active'`) only protects the state transition, not the soil accounting line above it. A duplicate `sprout_uprooted` event inflates `soilAvailable`.

**Files:** `web/src/events/derive.ts`

**Fix:** Moved soil return inside the `if (sprout && sprout.state === 'active')` guard. Tests updated to expect correct behavior.

---

### 2. iOS DataExport truncates fractional soil values to Int — FIXED

**What:** `DataExportService.swift` declares `soilCost: Int?` and `soilReturned: Int?`. The schema and web use `number`/`Double`. Fractional values (e.g., `soilReturned: 3.75`) are truncated to integers on export, then re-imported with wrong values.

**Files:** `ios/Trunk/Services/DataExportService.swift`

**Fix:** Changed `soilCost` and `soilReturned` from `Int?` to `Double?`, factory param from `Int` to `Double`, and `getInt` to `getDouble` in `convertSyncEventToTrunkEvent`.

---

### 3. iOS harvest events never include reflection field — FIXED

**What:** `HarvestSproutView.swift` pushes `sprout_harvested` events without `reflection`. No reflection input exists in the iOS harvest UI.

**Files:** `ios/Trunk/Views/Dialogs/HarvestSproutView.swift`

**Fix:** Added `@State reflection` property, TextField in harvest UI, and conditional `reflection` field in push payload when non-empty.

---

## High

### 4. `validateEvent()` doesn't enforce several required schema fields — FIXED

**What:** Per-type validation was incomplete — missing checks for `leafId`, `content`, `soilReturned`, `twigLabel`, `twigId` across event types.

**Files:** `web/src/events/types.ts`

**Fix:** Added missing field checks for all always-required fields. `prompt` intentionally omitted from validation for backward compatibility with pre-prompt production events (documented in code comment). `MAX_TITLE_LENGTH` remains a UI-only constraint.

---

### 5. iOS `leafId` conditionally omitted on sprout_planted push — FIXED

**What:** `CreateSproutView` only included `leafId` in the payload when a leaf was selected. Schema requires `leafId`.

**Files:** `ios/Trunk/Views/Dialogs/CreateSproutView.swift`

**Fix:** Changed from conditional `if let leafId` to `guard let leafId` before payload construction. Plant button already disabled when no leaf selected via `isValid`.

---

### 6. `computeRawSoilHistory` doesn't cap capacity at MAX_SOIL_CAPACITY — FIXED

**What:** The soil charting replay didn't apply `Math.min(capacity, MAX_SOIL_CAPACITY)` on harvest events the way `deriveState` does.

**Files:** `web/src/events/soil-charting.ts`

**Fix:** Added `Math.min(capacity + event.capacityGained, MAX_SOIL_CAPACITY)` and imported the constant.

---

### 7. Uproot of non-existent sprout still returns soil — FIXED

**What:** When a `sprout_uprooted` event references a `sproutId` that was never planted, `soilAvailable` was still increased. Same root cause as bug #1.

**Files:** `web/src/events/derive.ts`

**Fix:** Same fix as #1 — soil return now inside the sprout existence + active state guard. Tests updated.

---

## Medium

### 8. iOS EventDerivation silently defaults missing required fields to empty string — FIXED

**What:** `sun_shone` derivation defaults `twigId`, `twigLabel`, and `content` to `""` when missing, producing blank reflections.

**Files:** `ios/Trunk/Services/EventDerivation.swift`

**Fix:** `processSunShone` now uses `guard let` for required fields — malformed events are skipped instead of producing empty entries.

---

### 9. Event log grows unbounded — no compaction — DEFERRED

**What:** The event log grows forever. Every `deriveState()` replays all events from the start.

**Files:** `web/src/events/store.ts`, `ios/Trunk/Services/EventStore.swift`

**Deferred:** Design document written (`docs/archive/plans/event-log-compaction.md`). Largest remaining architectural change — requires snapshot schema, cross-platform parity, and migration logic.

---

### 10. Show/hide inconsistency across web UI — DEFERRED

**What:** Four different patterns for showing/hiding elements across 11 files.

**Files:** Multiple web UI files

**Deferred:** Cosmetic inconsistency with no behavioral impact. Unifying requires touching UI code across most features with regression risk.

---

### 11. `progress.ts` full DOM rebuild on every update — DEFERRED

**What:** `updateSidebarSprouts()` calls `replaceChildren()` and reconstructs the entire sprout list DOM on every call.

**Files:** `web/src/features/progress.ts`

**Deferred:** Dirty-check optimization already mitigates the hot path. Full fix requires virtual DOM diffing or incremental updates — substantial for a vanilla DOM codebase.

---

### 12. iOS TreeCanvasView / BranchView per-frame re-evaluation — DEFERRED

**What:** `TimelineView(.animation)` triggers full view body evaluation every frame (~60fps).

**Files:** `ios/Trunk/Views/TreeCanvasView.swift`, `ios/Trunk/Views/BranchView.swift`

**Deferred:** Equatable conformance and `@State` conversion already reduce cost significantly. Remaining per-frame evaluation is inherent to `TimelineView(.animation)`.

---

### 13. Existing test fixtures violate schema (`prompt` missing on water events) — FIXED

**What:** Several `sprout_watered` events in test fixtures lacked the `prompt` field. Several `sprout_planted` events lacked `leafId`.

**Files:** `shared/test-fixtures/event-derivation.json`, multiple test files

**Fix:** Added `prompt` to all water events and `leafId` to all plant events in fixtures and tests.

---

### 14. iOS bloom fields sent as empty string vs web `undefined` — FIXED

**What:** When bloom fields are empty, iOS pushed `""` while web omits the field entirely.

**Files:** `ios/Trunk/Views/Dialogs/CreateSproutView.swift`

**Fix:** Bloom fields (`bloomWither`, `bloomBudding`, `bloomFlourish`) now conditionally added to payload only when non-empty, matching web behavior.

---

## Low

### 15. Event listener leak in `login-view.ts` — DEFERRED

**What:** `destroyLoginView()` sets `elements = null` but doesn't remove event listeners.

**Files:** `web/src/ui/login-view.ts`

**Deferred:** Zero practical impact — parent DOM removal garbage-collects listeners in all modern browsers. Theoretical only.

---

### 16. `dialogs.css` has no shared abstractions (1,716 lines) — DEFERRED

**What:** Seven dialog styles with hardcoded duplicate values. CSS custom properties added for tokens but structural consolidation not done.

**Files:** `web/src/styles/dialogs.css`

**Deferred:** Dialogs rarely change. File is maintainable despite size. Refactoring is large, low-value, and carries visual regression risk.

---

### 17. `formatTwigBoxLabel()` Canvas 2D scoring complexity — DEFERRED

**What:** Overengineered text measurement and line-break scoring for 1-3 word twig labels.

**Files:** `web/src/ui/node-ui.ts`

**Deferred:** Caching eliminated the performance issue. Complexity remains but each label computed at most once.

---

### 18. iOS EventDerivation defaults `soilCost` and `soilReturned` to 0 for malformed events — FIXED

**What:** `getDouble(payload, "soilCost") ?? 0` processes malformed events as free (0 cost).

**Files:** `ios/Trunk/Services/EventDerivation.swift`

**Fix:** `soilCost` and `soilReturned` now use `guard let` — malformed events with missing required soil fields are skipped.

---

### 19. Sync status UI consumption undefined — DEFERRED

**What:** Sync failure UI consumption pattern marked as TBD in a REVIEW comment.

**Files:** `web/src/services/sync/status.ts`

**Deferred:** Design decision pending — toast vs. inline banner vs. status indicator. Current header sync indicator covers common cases.

---

### 20. Capacity decay not implemented — DEFERRED

**What:** Flat ~0.1/week capacity decay when inactive was mentioned in the soil economy tuning design.

**Files:** `docs/archive/plans/2026-01-19-soil-economy-tuning-design.md`

**Deferred:** Intentionally deferred. Adds complexity and requires separate testing. Core economy tuning prioritized first.

---

## Summary

| Status | Count | Items |
|--------|-------|-------|
| FIXED | 11 | #1, #2, #3, #4, #5, #6, #7, #8, #13, #14, #18 |
| DEFERRED | 9 | #9, #10, #11, #12, #15, #16, #17, #19, #20 |
