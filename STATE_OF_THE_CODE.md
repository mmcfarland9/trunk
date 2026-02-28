# State of the Code

> Diagnostic report — February 27, 2026
> Covers: web (TypeScript/Vite), iOS (Swift/SwiftUI), shared specs

---

## 1. Architecture As-Is

### Event Sourcing Pipeline

The core architecture is event-sourced and it works. Both platforms maintain an append-only log of `TrunkEvent`s (6 types: plant, water, harvest, uproot, sun_shone, leaf_created). State is derived by replaying the full event log through `deriveState()`.

**Web pipeline:**
```
localStorage → initEventStore() → events[] (in-memory)
                                       ↓
                                  deriveState(events)
                                       ↓
                              DerivedState (cached in store.ts)
                                       ↓
                         UI reads via getState(), getSoilAvailable(), etc.
```

**iOS pipeline:**
```
events-cache.json → EventStore.shared.events[]
                          ↓
                    EventDerivation.deriveState(from:)
                          ↓
                    DerivedState (cached in EventStore)
                          ↓
                    ProgressionViewModel.refresh()
                          ↓
                    SwiftUI views observe @Published/@Observable
```

**Derivation is a full replay every time.** On cache miss (any event append invalidates the cache), `deriveState()` sorts all events by timestamp, deduplicates by `client_id` (or composite key fallback), then replays every event sequentially computing soil capacity, soil available, sprout states, water entries, sun entries, and four index maps (`activeSproutsByTwig`, `sproutsByTwig`, `sproutsByLeaf`, `leavesByTwig`).

The cache invalidation strategy is correct but aggressive — *any* event append clears *all* caches (derived state, water available, sun available, watering streak). Water/sun caches have an additional time-boundary check that avoids recomputation if the clock hasn't crossed a 6am reset.

### State Management

**Web:** Module-level singletons. `store.ts` holds `events[]` and all caches as private module variables, exports getter functions. `view-state.ts` holds navigation state (view mode, active branch/twig, hover, focus) the same way. `state/index.ts` re-exports both into a single import surface plus `calculations.ts` and `presets.ts`.

There is no reactive system. UI updates are imperative — when something changes, calling code must explicitly call `updateStats()`, `updateSidebarSprouts()`, `updateSoilMeter()`, etc. The call chains from event append to UI update are traced through callback objects passed at initialization, not through subscriptions or signals.

**iOS:** `@Observable` / `@ObservableObject` with Combine. `EventStore.shared` is `@MainActor ObservableObject`, `ProgressionViewModel` subscribes to its `objectWillChange` and re-derives cached resource values. SwiftUI handles the rest via standard view invalidation.

### Rendering

**Web:** Vanilla DOM. No framework. The entire UI is built in `dom-builder/` (4 files) using a mix of `innerHTML` (dialogs, sidebar, cards) and programmatic `createElement` (header, tree nodes, charts). `AppContext` carries every DOM reference as a flat object. Layout is CSS grid + absolute positioning. Tree node wind animation runs in a persistent `requestAnimationFrame` loop in `layout.ts`. The radar chart polygon vertices are updated every frame from animated branch positions.

**iOS:** SwiftUI with `TimelineView(.animation)` for wind. `TreeCanvasView` uses magnification gestures and Canvas drawing for guide lines. Branch/twig nodes are SwiftUI buttons with Unicode box-drawing characters. Charts use Swift Charts framework.

### Sync Lifecycle

Both platforms implement the same sync protocol (documented in `shared/sync-protocol.md`):

1. **Smart sync** on auth: retry pending uploads → check cache validity → incremental pull (events since `LAST_SYNC_KEY`) or full pull (all events, merge with local pending).
2. **Push** on every local event: optimistic append → Supabase insert → track `client_id` in pending set on failure.
3. **Realtime** subscription: Postgres CDC filtered by `user_id` → deduplicate by `client_id` → append unique events.
4. **Visibility sync**: tab/app focus → smart sync.

Web sync is split across 8 files in `services/sync/`. iOS sync is split across 5 extensions on `SyncService`. Both handle the same edge cases (duplicate key 23505, stale pending IDs, cache version mismatch).

---

## 2. Health by Module

### Tier 1: Solid — Clean and Stable

**`shared/` — Source of Truth**
The shared constants, schemas, formulas, and test fixtures are the backbone of cross-platform parity. `constants.json` defines every numeric value once. `generate-constants.js` produces both TypeScript and Swift constants. The 10+ test fixture files cover derivation parity, capacity rewards, week boundaries, edge cases, and cross-platform validation. This is the best-maintained part of the codebase.

**`web/src/events/derive.ts` — Derivation Engine**
Pure functions, no side effects, thorough deduplication, correct soil accounting with `roundSoil()` to prevent float drift. Four index maps built post-replay for O(1) lookup. Well-tested (59+ test files, 95%+ line coverage). The `getEventDedupeKey` function handles both `client_id` and composite fallback correctly.

**`web/src/utils/` — Pure Utilities**
Small, focused files. `calculations.ts` (129 lines), `escape-html.ts` (9 lines), `twig-id.ts` (13 lines), `dom-helpers.ts` (11 lines). Each does one thing. `validate-import.ts` (197 lines) is the largest but handles real complexity — legacy state migration, validation with warnings, sanitization.

**`ios/Trunk/Services/ProgressionService.swift` — Formula Engine**
Pure struct. `soilCost()`, `capacityReward()`, `diminishingReturns()`, `harvestDate()`, `progress()`. Matches web calculations exactly. Well-tested.

**`ios/Trunk/Services/EventDerivation.swift` — iOS Derivation**
Faithful port of web `derive.ts`. Same deduplication, same soil rounding, same index structures. Validated against shared test fixtures.

**`ios/Trunk/Resources/Theme.swift` — Design System**
Adaptive colors via `UIColor { traitCollection in ... }`, spacing scale, type scale, button styles, view modifiers. Clean abstraction.

### Tier 2: Functional — Works but Has Rough Edges

**`web/src/events/store.ts` — Event Store**
Works correctly. The cache invalidation is sound. But it's a god-module — 11 private module variables, 25+ exported functions, every subsystem imports from it. The `validateEvent()` function is duplicated in `sync-types.ts` as `validateSyncPayload()` to break a circular dependency, which means validation logic exists in two places.

**`web/src/ui/layout.ts` — Layout Engine (455 lines)**
`positionNodes()` computes elliptical orbits, `drawGuideLines()` renders canvas lines, `startWind()` runs the RAF loop. Uses `WeakMap` position caches (good), per-frame `getBoundingClientRect` cache (good). But the wind loop runs *continuously* even when the overview is off-screen, computing wind for all 72 nodes every frame. The `applyWind()` function inside the RAF loop calls `ctx.radarTick?.()` which triggers a full radar chart vertex update every frame — that's 8 SVG point recalculations per frame even when the radar chart is hidden via CSS `opacity: 0`.

**`web/src/ui/twig-view/index.ts` — Twig View Orchestrator (412 lines)**
Manages the full sprout lifecycle UI. Closure-based state via `FormState`. Delegated click handler dispatches via `closest('[data-action]')`. Works, but `CLEANUP.md` already flagged it as "HARD: decompose twig-view/index.ts" — it mixes form management, event handlers, keyboard navigation, and view lifecycle in one file.

**`web/src/features/navigation.ts` — View State Machine (246 lines)**
Manages overview↔branch↔twig transitions with CSS class toggling and async fade-out sequences. Uses module-level `setTimeout` IDs and a `Map<number, number>` for per-branch fade timeouts. Correct behavior but fragile — the timing relies on CSS transition durations matching JS timeouts.

**`web/src/services/sync/` — Sync Subsystem (8 files)**
Well-structured after a refactoring pass. Each file has a clear responsibility. The circular dependency between `operations.ts` and `status.ts` is handled via dependency injection (`setStatusDependencies()`), which works but adds indirection. The `LAST_SYNC_KEY` is defined in `pull.ts` but referenced from `operations.ts` — should be in a shared constants location.

**`ios/Trunk/Services/EventStore.swift` — iOS Event Store**
Debounced disk writes (0.5s), `flushToDisk()` on background scene phase, `CachedEventStore: Codable, Sendable` for file I/O. Works well. Same cache-invalidation pattern as web (clear all caches on any mutation). The `EventCacheIO` actor properly isolates file I/O from `@MainActor`.

**`ios/Trunk/Services/SyncService.swift` + Extensions (6 files)**
Functional port of web sync. Same smart sync flow, same pending upload tracking, same realtime subscription pattern. `SyncOperations.swift` is the heaviest extension.

### Tier 3: Fragile — Works but Be Careful

**`web/src/bootstrap/ui.ts` — UI Initialization (exports: `updateSoilMeter`, `updateWaterMeter`, `celebrateMeter`)**
`CLEANUP.md` flags this as "HARD: split bootstrap/ui.ts". It's the wiring hub — initializes all 8 dialog systems, twig view, leaf view, sidebar sprouts, soil chart, radar chart, and back buttons. Every callback chain for meter updates, celebration animations, and chart refreshes is defined here. The function `initializeUI()` is ~150 lines of sequential setup. The real issue: `updateSoilMeter` and `updateWaterMeter` are exported as module-level functions that close over elements from `initializeUI` — this means they can only be called after initialization, with no compile-time enforcement.

**`web/src/features/progress.ts` — Sidebar Progress (303 lines)**
Module-level mutable callback storage (`storedWaterClick`, `storedHarvestClick`). Three display modes (twig flat-list, branch twig-grouped, overview branch-grouped) with different DOM structures. `updateSidebarSprouts()` rebuilds the entire sprout list on every call — `replaceChildren()` followed by full DOM reconstruction. No diffing, no incremental update.

**`web/src/ui/node-ui.ts` — Node Labels (401 lines)**
`formatTwigBoxLabel()` uses a Canvas 2D `measureText()` call to score line-break candidates against a 16:9 target ratio. This creates a temporary canvas for text measurement on every twig label format call. The function is pure and deterministic — the same label always produces the same output — but the result is never cached.

**`web/src/ui/dom-builder/build-dialogs.ts` — Dialog Construction (323 lines)**
Seven dialog elements built via `innerHTML` HTML strings. The `trapFocus()` utility queries `querySelectorAll` for focusable elements on every call. These are static structures that don't change after construction, so the re-query is wasteful but harmless. The larger concern: no aria-live regions, no announced state changes.

**`web/src/styles/dialogs.css` — 1,716 lines**
The largest CSS file by far. Seven different dialog styles, each with their own structural conventions. Some use `.is-*` state modifiers consistently, others use inline `style.display` toggling from JavaScript. No CSS custom properties for dialog-shared values (border radius, backdrop blur, z-index) — they're hardcoded identically across all seven dialog blocks.

**`ios/Trunk/Views/TreeCanvasView.swift` — Tree Canvas**
`TimelineView(.animation)` triggers full view evaluation every frame when visible. `branchPositions` array recomputed every frame. Guide lines drawn via Canvas every frame. The `@State branchPositions` array is updated in the `TimelineView` content closure, which will trigger SwiftUI's state change detection on every frame even when positions haven't meaningfully changed (floating point equality).

**`ios/Trunk/Views/BranchView.swift` — Branch Detail**
Same `TimelineView(.animation)` pattern. Creates `TwigNode` views for all 8 twigs every frame inside the timeline content block. Wind offsets computed per-frame for all nodes.

---

## 3. Technical Debt Inventory

### Acknowledged but Unresolved

1. **Two `getWeekResetTime` implementations with DIFFERENT behavior** (`web/.reports/dead-code-analysis.md` documents this): one resets on Sunday (UI countdown), one on Monday (derivation for sun availability). Flagged as "potential bug" — never resolved.

2. **CLEANUP.md Hard items (H1, H2):** `bootstrap/ui.ts` and `twig-view/index.ts` remain monolithic. Identified as needing decomposition but marked as too risky for the cleanup pass.

3. **Hardcoded timezone in `sprout-form.ts`:** `getEndDate()` uses `setUTCHours(15, 0, 0, 0)` — hardcoded 9am CST regardless of user timezone. This means harvest dates display incorrectly for users not in Central Time.

### Silent Accumulation

4. **Duplicate validation logic:** `store.ts:validateEvent()` and `sync-types.ts:validateSyncPayload()` implement the same per-type validation independently. Neither calls the other — changes to one must be manually mirrored to the other.

5. **Event listener leaks in `login-view.ts`:** `destroyLoginView()` nulls the `elements` reference but doesn't remove the event listeners attached to the form submit buttons. The login view is typically created once and destroyed once, so this doesn't cause a practical issue, but it's not clean.

6. **Module-level mutable state everywhere (web):** `store.ts` (11 private vars), `view-state.ts` (7 private vars), `progress.ts` (2 stored callbacks), `shine-dialog.ts` (recentPrompts array), `water-dialog.ts` (recentPrompts array), `login-view.ts` (elements + currentEmail), `navigation.ts` (timeout IDs + fade map). This is the architectural trade-off of "no framework" — state management is manual. It works, but there's no lifecycle management, no cleanup guarantees, no visibility into what's initialized vs. uninitialized.

7. **`console.warn` in production code:** `progress-panel.ts` line ~234 has a `console.warn` for "standalone sprouts" (those without a `leafId`). This should be structurally impossible per the data model (all sprouts require a `leafId`), but the warn is there as a safety net.

8. **Empty error handling in `account-dialog.ts`:** Line ~237 has `if (error) { }` — save errors are silently swallowed. No user feedback on profile save failure.

9. **iOS `DateFormatting.swift` silent fallback:** `ISO8601.parse()` tries two date formats, then falls back to `.distantPast` on failure. This means invalid timestamps silently become January 1, year 1 instead of surfacing an error.

10. **`computeRawSoilHistory` doesn't cap at MAX_SOIL_CAPACITY:** In `soil-charting.ts`, the raw soil history replay doesn't apply the capacity ceiling that `deriveState` does. This means the soil chart could theoretically show capacity above 120 after a large harvest chain.

### Patterns That Drifted

11. **Show/hide inconsistency (web):** Some elements use CSS class toggling (`.is-hidden`, `.hidden`), others use `style.display = 'none'`/`''`, others use the `hidden` attribute. Dialogs use `dialog.hidden = true/false`. The sidebar expand/collapse uses `is-collapsed` class with max-height animation. No single convention.

12. **DOM templating inconsistency:** `innerHTML` HTML strings (dialogs, sidebar, cards, twig view panel) coexist with programmatic `createElement` (header, tree nodes, charts). Both work fine. The issue is that `innerHTML` paths use `escapeHtml()` for XSS prevention but programmatic paths use `textContent` — the security model differs by construction method.

13. **Callback wiring complexity:** `bootstrap/ui.ts` is the central switchboard. Every feature's side effects (meter updates, chart refreshes, celebration animations) are wired through callbacks that close over DOM elements. Adding a new post-action effect requires modifying `initializeUI()` and threading the callback through the feature's API. This is O(features × effects) complexity.

---

## 4. Consistency Assessment — Web vs. iOS

### Agreements (Verified)

| Area | Status |
|------|--------|
| Soil cost table (15 combos) | Identical — shared constants |
| Capacity reward formula | Identical — same diminishing returns exponent (1.5) |
| Water reset (6am daily) | Identical — both use local time |
| Sun reset (Monday 6am) | Identical — both use ISO week Monday |
| Event types (6) | Identical — same names, same payloads |
| Deduplication strategy | Identical — `client_id` primary, composite key fallback |
| Soil rounding | Identical — `(value * 100).rounded() / 100` |
| Sync protocol | Identical — same smart sync, pending retry, realtime |
| Tree geometry | Identical — same angle formula, same seed formula |
| Wind seeding | Identical — seed = `97 + index * 41` |
| Prompt system | Identical — same generic/specific pools from shared JSON |

### Intentional Platform Differences

| Area | Web | iOS | Reason |
|------|-----|-----|--------|
| Wind amplitude | 3pt branches / 6pt twigs | 6pt branches / 8pt twigs | Different visual scales |
| Radar minimum score | 0 | 0.08 | iOS needs minimum visibility |
| Navigation model | Scroll/click zoom | Tab bar + sheet navigation | Platform conventions |
| Tree rendering | CSS absolute positioning + canvas | SwiftUI + Canvas drawing | Platform rendering |
| Authentication | Supabase JS SDK + OTP | Supabase Swift SDK + OTP | SDK difference |
| Disk cache | localStorage (sync) | JSON file (async actor) | Platform storage |
| Haptics | None | UIImpactFeedbackGenerator | iOS only |

### Quiet Divergences (Likely Drift)

1. **Watering streak calculation:** Web derives streak from 6am-boundary day keys. iOS `ProgressionViewModel` caches streak and refreshes via `objectWillChange`. The *calculation* is the same, but the *cache invalidation timing* differs — web invalidates on any event append, iOS invalidates when `ProgressionViewModel.refresh()` is called (which happens on sync complete and scene phase change, but not on every local event append).

2. **Sprout "ready" check:** Web `isReady()` in `sprout-cards.ts` checks `Date.now() >= plantedAt + durationMs`. iOS `isSproutReady()` in `TwigIdParser.swift` does the same but parses `plantedAt` via `ISO8601.parse()` which can silently return `.distantPast` on invalid timestamps — making the sprout appear ready when it shouldn't be.

3. **Water dialog sprout selection:** Web `selectDailySprouts()` sorts by last water timestamp (least recently watered first) and picks up to 3. iOS `TodayView.selectDailySprouts()` does the same. But web's `openWaterDialog()` also accepts a `targetSproutId` parameter for direct watering from the twig view — iOS has separate `WaterSproutView` (single) and `WaterDailySproutsView` (multi), which is a different UX flow.

4. **Soil chart bucketing:** Both implement fixed-interval, semimonthly, and adaptive strategies. Web adaptive uses `spanMs / targetNodes` with `Math.max(interval, 3600000)` (1 hour min). iOS adaptive uses the same formula. However, the semimonthly range sets differ: web's `CHART_BUCKETS` config defines ranges `6m` and `ytd` as semimonthly; iOS's `SharedConstants.Chart.semimonthlyRanges` should match but is generated from the same source, so this should be consistent. Worth verifying.

5. **Error display:** Web shows inline error text in dialogs. iOS shows error via `.alert()` modifier or inline text. The messages may not be identical — web reads from `generated/constants.ts` error messages, iOS reads from `ErrorCodes.swift` which loads `shared/error-codes.json`. Both sources should produce the same text, but the display formatting differs.

6. **Export format:** Web exports version 4 JSON with `events[]` array of `TrunkEvent` objects. iOS `DataExportService` exports the same format but converts through `TrunkEvent` intermediary struct. The field mapping is done manually — any new event fields added to one platform need manual addition to the other's export service.

---

## 5. Dependency Health

### Web (`web/package.json`)

| Package | Version | Status | Notes |
|---------|---------|--------|-------|
| `@supabase/supabase-js` | ^2.93.3 | **Only runtime dep** | Appropriate — the sole external dependency |
| `vite` | overridden to `rolldown-vite@7.2.5` | Cutting edge | Rust-based bundler. Bold choice. |
| `typescript` | ~5.9.3 | Current | Good |
| `vitest` | ^3.1.2 | Current | Good |
| `@playwright/test` | ^1.51.1 | Current | Good |
| `@biomejs/biome` | ^2.4.2 | Current | Good — replaces ESLint+Prettier |
| `@stryker-mutator/*` | ^8.8.0 | Current | Mutation testing — serious about quality |
| `lefthook` | ^1.11.13 | Current | Pre-commit hooks |
| `jsdom` | ^26.0.0 | Current | Test environment |

**Assessment:** Extremely lean. One runtime dependency. All dev dependencies are current. No deprecated packages. No lock file rot visible. The `rolldown-vite` override is the only adventurous choice — if it breaks, fallback to standard Vite is trivial.

### iOS

| Package | Notes |
|---------|-------|
| Supabase Swift SDK | Via Swift Package Manager |
| Swift Charts | System framework |
| No other dependencies | |

**Assessment:** Even leaner. Two dependencies, one of which is a system framework.

### What Could Be Dropped

- Nothing. The dependency surface is already minimal.

### What's Doing Too Much

- `shared/constants.json` (350+ lines) is the single source of truth for *everything* — soil costs, season durations, tree labels, prompt pools, chart config, storage keys, event types, validation limits. This is by design and works well for cross-platform parity, but it means the generate script must handle an increasingly complex structure.

---

## 6. Code Quality Distribution

### Best Code

**`web/src/utils/calculations.ts`** — Pure functions, clear naming, direct constant references, no side effects, fully tested. Each function does exactly one thing. 129 lines, zero debt.

**`shared/test-fixtures/`** — The test fixture files are arguably the most valuable code in the repo. They encode exact expected behavior for both platforms. `derivation-parity.json` includes step-by-step soil calculation logs. `cross-platform-validation.json` covers all 15 cost combos, 19 reward cases, and 5 water + 4 sun reset boundary cases. This is what makes cross-platform correctness possible.

**`web/src/events/derive.ts`** — The derivation engine is clean, correct, and pure. `deriveState()` is a straightforward fold over sorted, deduplicated events. The four post-replay index maps are built once and frozen. `roundSoil()` prevents float drift. No mutation of input data.

**`ios/Trunk/Services/ProgressionService.swift`** — Pure struct, zero state, four formula functions. Direct port of web calculations. Clear, testable, correct.

**`web/src/utils/escape-html.ts`** — 9 lines. Uses the browser's built-in HTML escaping via `textContent → innerHTML` round-trip. No regex, no library, no bugs.

### Worst Code

**`web/src/styles/dialogs.css` (1,716 lines)** — Seven dialog styles in one file with no shared abstractions. Values like `border-radius: 2px`, `backdrop-filter: blur(4px)`, `z-index: 1000`, and `background: rgba(255,255,255,0.97)` are hardcoded identically 7+ times. ASCII box-drawing border decorations are inline character strings in `content` properties. The file is maintainable only because dialogs rarely change.

**`web/src/bootstrap/ui.ts`** — The wiring hub. Every feature callback flows through here. Adding a new post-action effect (e.g., "update badge count after watering") requires modifying this file, finding the right callback chain, and threading the update through. It's correct, but it's the kind of code where every change requires reading the whole function to understand the side effect graph.

**`web/src/features/progress.ts`** — Module-level mutable callback storage. Three different display modes with three different DOM construction paths. Full DOM rebuild on every update. The function `updateSidebarSprouts()` is 80+ lines of conditional branching that dispatches to different rendering functions based on view mode and hover state.

**`web/src/ui/node-ui.ts` `formatTwigBoxLabel()`** — Creates a temporary Canvas 2D context to measure text, computes all possible line-break positions, scores each against a target aspect ratio, picks the best split — all to format a 1-3 word twig label into a box. This runs for every twig label on every sync. The results are deterministic but not cached.

### The Middle

Most of the codebase lives in a comfortable middle. The features/ directory files (water-dialog, harvest-dialog, shine-dialog, etc.) all follow the same closure-based pattern: receive elements, wire listeners, emit events via `appendEvent()`, return an API object. They're not beautiful, but they're consistent and predictable. The iOS views follow standard SwiftUI patterns — some are verbose (CreateSproutView at ~200 lines) but none are architecturally wrong.

---

## Summary

This is a well-built solo project. The event sourcing architecture is correct and the cross-platform parity infrastructure (shared constants, test fixtures, generated code) is impressive for a project this size. The dependency surface is minimal. Test coverage is high (95%+ lines on web).

The main risks are:
1. **Performance at scale** — full event replay on every cache miss, continuous animation loops even when off-screen, full DOM rebuilds in sidebar
2. **Accidental divergence** — duplicate validation logic, manual export field mapping, iOS silent `.distantPast` fallback
3. **Maintainability ceiling** — `bootstrap/ui.ts` callback wiring, module-level mutable state, no reactive system

None of these are urgent. The app works correctly. But they're the places where bugs will emerge as the event log grows and features accumulate.
