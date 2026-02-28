# Roadmap

> Work items from STATE_OF_THE_CODE.md diagnostic — February 27, 2026
> Grouped by theme. Each item is self-contained.

---

## Group A — Correctness & Safety

> Bugs, silent failures, and missing error feedback. Small fixes, high confidence.

### A1. Fix harvest date preview timezone assumption

**File:** `web/src/ui/twig-view/sprout-form.ts:55`

**The problem:** `getEndDate()` calls `end.setUTCHours(15, 0, 0, 0)` — hardcoded to 9am Central Time (UTC-6). A user in Tokyo (UTC+9) sees a harvest date preview that's 15 hours off. A user in London (UTC+0) sees dates that end at 3pm instead of 9am.

**What this affects:** Only the "Ends on..." preview text in the planting form. Actual sprout readiness is computed from `plantedAt + durationMs` in `derive.ts`, which doesn't use this function. So this is a cosmetic bug, not a data integrity issue — but it's misleading.

**The fix:** Replace the hardcoded UTC offset with local time:
```typescript
end.setHours(9, 0, 0, 0) // 9am in user's local timezone
```
Or read the hour from user profile if they've set a timezone. The simplest correct fix is local time — it matches the 6am reset boundary convention which also uses local time (`setHours(RESET_HOUR, 0, 0, 0)` in `calculations.ts`).

**Effort:** 1 line change + update the comment. Add a test that verifies the result is in local time.

---

### A2. Fix iOS silent `.distantPast` timestamp fallback

**File:** `ios/Trunk/Extensions/DateFormatting.swift:27-30`

**The problem:** `ISO8601.parse()` returns `Date.distantPast` (January 1, year 1) when both format attempts fail. This means:
- A sprout with a corrupt `plantedAt` timestamp silently becomes `.distantPast`
- `isSproutReady()` computes `Date().timeIntervalSince(.distantPast) * 1000` → enormous number → returns `true`
- The sprout appears harvestable when it shouldn't be
- Any date display shows "January 1, 0001" or similar garbage

**What triggers this:** Corrupt data from a bad sync, a manually edited export, or a future schema change that alters the timestamp format. Unlikely today, but the failure mode is silent and wrong.

**The fix:** Return an `Optional<Date>` and force callers to handle `nil`:
```swift
static func parse(_ timestamp: String) -> Date? {
    withFractional.date(from: timestamp)
        ?? withoutFractional.date(from: timestamp)
}
```

This is a breaking change — every call site needs `guard let` or `?? Date()` with a deliberate default. That's the point. The callers should decide what to do with unparseable timestamps, not silently get year 1.

**Effort:** Medium. Change the return type, then fix ~15 call sites in EventDerivation.swift, SoilHistoryService.swift, DataExportService.swift, and various views. Most can use `guard let date = ISO8601.parse(timestamp) else { continue }` to skip corrupt events. `isSproutReady()` should return `false` for unparseable plantedAt. Build will catch every site.

---

### A3. Verify `getWeekResetTime` divergence is resolved

**File:** `web/.reports/dead-code-analysis.md:86-100`

**The problem (as reported):** The February 6 dead-code analysis documented two `getWeekResetTime` implementations — one resetting Sunday, one Monday. The divergence would cause the UI to show "resets Sunday" while derivation uses Monday.

**Current status:** As of today, `derive.ts` imports `getWeekResetTime` from `calculations.ts`. There is only one implementation. The code at `calculations.ts:72-74` uses `(dayOfWeek + 6) % 7` which is Monday-based. This appears to be already fixed.

**What to do:** Write a focused verification test that exercises the full chain — `getWeekResetTime()` → `getNextSunReset()` → compare against `deriveSunAvailable()` — to confirm the UI countdown and the derivation agree on when sun resets. Then update `dead-code-analysis.md` to close the investigation with "resolved" status.

**Effort:** Small. One test + doc update. Mostly verification that the fix holds.

---

### A4. Wire quota error callback to visible warning

**File:** `web/src/bootstrap/ui.ts:101-102`

**The problem:** The quota error callback is currently:
```typescript
setEventStoreErrorCallbacks(() => {}, () => {})
```
Two no-ops. If localStorage fills up, `saveEvents()` fails silently and events exist only in memory until the page is closed, at which point they're lost forever.

**The fix:** Show a persistent banner or dialog:
```typescript
setEventStoreErrorCallbacks(
  () => {
    // Show "Storage full" warning with export button
    showQuotaWarning(elements)
  },
  (error) => {
    console.error('Event storage failed:', error)
  }
)
```

The warning should:
- Be dismissible but reappear on next failed save
- Include an "Export Data" button that triggers the existing export flow
- Explain that data may be lost if the browser is closed
- Suggest clearing old browser data or using a different browser

**Effort:** Small. ~1 hour. Build the warning banner HTML, wire the callback, test with a mock quota error.

---

## Group B — Cross-platform Durability

> Event log scaling and platform parity. The event system's long-term health.

### B1. Event log size management — snapshot checkpoints

**The problem:** The event log grows forever. Every `deriveState()` call replays ALL events from the beginning. Every `saveEvents()` writes the entire array to localStorage. localStorage has a ~5MB limit (browser-dependent).

**Scale math:** A user who waters 3 sprouts daily for 2 years generates:
- ~2,190 water events
- ~365 sun events (weekly)
- ~100 plant/harvest/uproot events
- Total: ~2,655 events
- At ~200 bytes/event JSON: ~530KB
- At 5 years: ~1.3MB — approaching localStorage limits

The `QuotaExceededError` handler exists (`safe-storage.ts`, `store.ts`) but is wired to a no-op callback in `bootstrap/ui.ts`. If the quota is hit, events are lost silently.

**The fix (two phases):**

**Phase A — Wire the quota error callback (small):** Covered by item A4.

**Phase B — Snapshot checkpoints (medium-large):** Implement periodic state snapshots that allow truncating old events:
1. After N events (e.g., 500) or on explicit "compact" action, compute `deriveState(events)` and save the snapshot with a `snapshotAt` timestamp.
2. Only keep events after `snapshotAt` in localStorage. The snapshot provides the base state.
3. `deriveState()` starts from the snapshot instead of replaying from the beginning.
4. Both platforms need this — web (localStorage) and iOS (JSON file).
5. The snapshot format needs to be part of the shared spec so exports still work (export = snapshot + remaining events, or just replay to full event list for export).

This is an architectural change. It touches `store.ts`, `derive.ts`, `EventStore.swift`, `EventDerivation.swift`, the import/export pipeline, and the sync protocol (snapshots are local-only, not synced). It needs a design document before implementation.

**Effort:** Phase B is a multi-day project with a design phase. See B2 for the design document.

---

### B2. Event log compaction (design document)

**This is the design phase for B1 Phase B.** Don't implement yet — write the spec first.

**Questions the design doc must answer:**
1. **Snapshot format:** What fields does a snapshot contain? Full `DerivedState`? Just soil/sprout/leaf state? What about water/sun entries that need time-window queries?
2. **Compaction trigger:** Automatic at N events? Manual user action? On export? All three?
3. **Sync interaction:** Snapshots are local-only (the server has the full event log). How does full sync interact with a local snapshot? Does it replace the snapshot + events, or merge?
4. **Import/export:** An export needs the full event history for portability. Does export replay snapshot + events into a flat event list? Or does the export format include snapshots?
5. **Cross-platform:** Both web and iOS need identical snapshot formats and compaction logic. Add to shared spec?
6. **Migration:** Existing users have no snapshot. First compaction creates one from full replay. What version field identifies "has snapshot" vs. "legacy full log"?
7. **Rollback:** If compaction introduces a bug, can users recover? The server has the full log — force full sync restores everything.

**Deliverable:** A markdown document in `docs/archive/plans/` following the existing plan format. Include pseudocode for the compaction algorithm, the snapshot schema, and the modified derivation flow.

**Effort:** Half a day of design. No code.

---

### B3. Duplicate export field mapping between platforms

**Files:**
- `web/src/events/types.ts` — TrunkEvent interfaces (source of truth)
- `web/src/services/sync-types.ts` — `localToSyncPayload()` and `syncToLocalEvent()`
- `ios/Trunk/Services/DataExportService.swift` — `TrunkEvent` struct with factory methods
- `ios/Trunk/Services/SyncEvent.swift` — `SyncEvent` struct, `JSONValue` enum

**The problem:** When a new field is added to an event type (e.g., adding `bloomWither` to `sprout_planted`), four files across two platforms must be updated manually:
1. Web `types.ts` interface
2. Web `sync-types.ts` payload mapping
3. iOS `SyncEvent` payload extraction
4. iOS `DataExportService` export mapping

If any one is missed, that field silently disappears during sync or export on one platform. There's no compile-time or test-time check that catches this — the shared test fixtures validate known fields but won't catch a field that was added to web and forgotten on iOS.

**The fix:** Add a cross-platform field coverage test to the shared test fixtures — see B4 for implementation details.

**Effort:** Medium. New fixture file + ~6 test cases per platform. Design the maximal events carefully to cover all optional fields.

---

### B4. Cross-platform field coverage test fixture

**This is the implementation of B3.**

**Create `shared/test-fixtures/field-coverage.json`:**
```json
{
  "description": "Maximal events with every field populated — verifies no field is dropped during sync/export round-trips",
  "events": [
    {
      "type": "sprout_planted",
      "timestamp": "2026-01-15T10:00:00.000Z",
      "client_id": "2026-01-15T10:00:00.000Z-abcd1234",
      "sproutId": "sprout-aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
      "twigId": "branch-0-twig-0",
      "title": "Test sprout with all fields",
      "season": "3m",
      "environment": "firm",
      "soilCost": 8,
      "leafId": "leaf-aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
      "bloomWither": "Wither description",
      "bloomBudding": "Budding description",
      "bloomFlourish": "Flourish description"
    }
  ]
}
```
...with one maximal event per type (6 total).

**Web test** (`web/src/tests/field-coverage.test.ts`):
- Load fixture → `localToSyncPayload()` → `syncToLocalEvent()` → compare every field against original
- Load fixture → `deriveState()` → verify bloom fields, reflection, prompt all survive

**iOS test** (`ios/TrunkTests/FieldCoverageTests.swift`):
- Load fixture → convert to `SyncEvent` → derive → verify all fields
- Load fixture → export via `DataExportService` → import → verify all fields

**Effort:** Small-medium. ~2 hours. The fixture design is the hard part — enumerate every optional field for every event type.

---

## Group C — Architecture & Features

> File decomposition and new user-facing capabilities. Maintainability + product.

### C1. Decompose `bootstrap/ui.ts` wiring hub

**File:** `web/src/bootstrap/ui.ts` (338 lines)

**The problem:** `initializeUI()` is the switchboard where every feature's side effects are wired. Every dialog, chart, meter update, and celebration animation callback is defined here. Adding a new post-action effect (e.g., "play a sound after harvesting") requires:
1. Reading the full 150-line `initializeUI()` to find the right callback chain
2. Threading the new callback through the feature's API
3. Hoping you didn't miss a code path

**Why it hasn't been fixed:** CLEANUP.md flagged this as "HARD" and skipped it. The risk is that splitting it wrong introduces bugs in the callback wiring.

**The decomposition strategy:**
1. Extract meter update functions into `bootstrap/meters.ts` — `updateSoilMeter()`, `updateWaterMeter()`, `celebrateMeter()` already exist as standalone functions, they just need to move.
2. Extract chart initialization into `bootstrap/charts.ts` — `buildSoilChart()` and `buildRadarChart()` setup + the `updateCharts()` helper.
3. Extract dialog initialization into `bootstrap/dialogs.ts` — the 8 `init*Dialog()` calls + their callback wiring.
4. `bootstrap/ui.ts` becomes a thin orchestrator that calls the three extractees and returns `DialogAPIs`.

Each extraction can be done independently and tested by running the existing test suite + manual smoke test.

**Effort:** Medium. ~3 hours of careful extraction. No new functionality, no behavior change.

---

### C2. Decompose `twig-view/index.ts` orchestrator

**File:** `web/src/ui/twig-view/index.ts` (412 lines)

**The problem:** Mixes form management (season/environment selection, leaf select, bloom inputs), event handlers (delegated click dispatch), keyboard navigation (Escape, Cmd+Arrow), view lifecycle (open/close/refresh), and confirm dialog state (Promise-based). The `buildTwigView()` function is 300+ lines.

**Why it matters:** This is the primary interaction surface — where users plant sprouts, water them, and harvest. Any bug fix or feature addition here requires understanding all five concerns.

**The decomposition strategy:**
1. `twig-view/keyboard.ts` — Extract the document keydown handler. It already has a clean boundary (the `handleKeydown` function).
2. `twig-view/confirm.ts` — Extract the confirm dialog Promise pattern. It's self-contained (`showConfirm`/`hideConfirm` + `confirmResolve` state).
3. `twig-view/leaf-select.ts` — Extract leaf dropdown management (populate, "create new" option, change handler). It has clear inputs (twigId) and outputs (selectedLeafId).
4. Leave form management + lifecycle in `index.ts` — this is the irreducible core.

**Effort:** Medium. ~3 hours. Same risk profile as the `bootstrap/ui.ts` decomposition — no behavior change, just file boundaries.

---

### C3. Dark mode

**The groundwork is already laid:**
- Web: `base.css` has a full CSS custom property system (`--ink`, `--paper`, `--wood`, `--twig`, `--water`, `--sun`, etc.). Switching to dark mode means defining alternate values under `@media (prefers-color-scheme: dark)` or a `.dark` class toggle.
- iOS: `Theme.swift` already uses adaptive `UIColor { traitCollection in ... }` for every color. Adding dark variants means adding the `.dark` case to each closure.

**What needs design work:**
- The paper/parchment texture (`radial-gradient` noise + crosshatch `::after` pattern in `base.css`) needs a dark equivalent. A dark wood grain or slate texture would fit the gardening metaphor.
- The ASCII box-drawing characters (branch/twig labels) need to stay readable on dark backgrounds — likely means inverting from dark-on-light to light-on-dark.
- Soil chart and radar chart colors need contrast-checked dark variants.
- Dialog overlays (`--dialog-bg`, `--dialog-overlay`) need dark values — the new CSS custom properties from the cleanup make this a single-location change.

**Implementation:**
1. Design phase: Pick dark palette values. Test contrast ratios for all text/background combinations.
2. Web: Add `@media (prefers-color-scheme: dark) { :root { ... } }` block in `base.css` with dark token values. Add user preference toggle in account dialog (auto/light/dark).
3. iOS: Add dark cases to every color in `Theme.swift`. SwiftUI handles the rest automatically.
4. Test: Both platforms in both modes.

**Effort:** Large. 1-2 days for web, 1 day for iOS. Most of the time is design, not code.

---

### C4. Edit sprout (post-plant field modification)

**What users need:** Fixing a typo in a sprout title. Changing bloom descriptions after gaining clarity. Possibly reassigning to a different leaf.

**What's NOT editable:** Season, environment, soil cost — these are economic commitments made at plant time. Changing them after the fact would break the soil accounting.

**Implementation as a new event type:**

```typescript
interface SproutEditedEvent extends BaseEvent {
  type: 'sprout_edited'
  sproutId: string
  // Only include fields that changed (sparse update)
  title?: string
  bloomWither?: string
  bloomBudding?: string
  bloomFlourish?: string
  leafId?: string // reassign to different leaf
}
```

**Changes needed:**
1. `shared/schemas/events.schema.json` — add `sprout_edited` definition
2. `shared/constants.json` — add to `eventTypes` array
3. `shared/generate-constants.js` — regenerate (automatic)
4. `web/src/events/types.ts` — add interface + union member
5. `web/src/events/derive.ts` — handle in replay: merge edited fields into existing `DerivedSprout`
6. `ios/Trunk/Services/EventDerivation.swift` — same
7. UI: Add edit button on sprout cards → open edit form pre-filled with current values → emit `sprout_edited` on save
8. Sync: payload mapping in `sync-types.ts` and iOS `SyncOperations`
9. Shared test fixtures: add edit scenarios to `event-derivation.json`

**Effort:** Medium-large. ~1 day. Most of it is UI (edit form) and cross-platform parity testing.
