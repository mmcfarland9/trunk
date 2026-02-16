# Trunk Codebase Improvement Proposal

**Date**: 2026-02-15
**Reviewers**: 5 parallel specialized agents (Shared Code, Dead Code, Consistency, Architecture, Correctness)
**Scope**: Full monorepo analysis (web/, ios/, shared/)

---

## Executive Summary: Top 10 Highest-Impact Items

The following items represent the most critical improvements considering both severity and breadth of impact:

1. **[H1] Cross-Platform Business Logic Duplication** - 400+ lines of soil/water/sun/event derivation logic duplicated across web TypeScript and iOS Swift. Requires dual maintenance and creates drift risk.

2. **[H2] God Object: dom-builder.ts buildApp()** - 595-line function constructing entire DOM tree inline. Single most complex function in web codebase.

3. **[H3] Incomplete Event Sourcing Migration** - Dual state system with legacy nodeState and event-sourced state creates two sources of truth and migration debt.

4. **[H4] God Object: twig-view.ts buildTwigView()** - 709-line function mixing UI construction, business logic, and event handling for sprout CRUD.

5. **[H5] Date Format Timestamp Inconsistency** - JavaScript always includes milliseconds, iOS varies. Creates sync/comparison issues across platforms.

6. **[H6] Massive Entry Point (main.ts)** - 563-line entry point with 21 imports handling auth, sync, UI init, and event wiring. High coupling.

7. **[H7] Unsafe DOM Element Access** - Multiple forced non-null assertions on querySelector results without validation. Runtime crash risk.

8. **[H8] Complex Event Derivation** - 724-line derive.ts replaying all events linearly O(n) per call. Performance and maintainability concerns.

9. **[H9] Monolithic iOS Views** - SproutsView (796 lines) and TodayView (768 lines) handling filtering, sorting, rendering, and actions inline.

10. **[H10] Error Handling Philosophy Mismatch** - Web returns `{ error: string | null }`, iOS uses Swift `throws`. Fundamentally different patterns across platforms.

---

## HIGH SEVERITY

### H1. Cross-Platform Business Logic Duplication
**Reviews**: Shared Code (S1-S5), Architecture (A9)
**Files**:
- Soil progression: `ios/Trunk/Services/ProgressionService.swift:14-95` vs `web/src/utils/calculations.ts:19-41`
- Event derivation: `ios/Trunk/Services/EventDerivation.swift:119-160` vs `web/src/events/derive.ts:72-188` (400+ lines)
- Water/Sun resets: `ios/Trunk/Services/EventDerivation.swift:325-374` vs `web/src/utils/calculations.ts:48-97`
- Water/Sun availability: `ios/Trunk/Services/EventDerivation.swift:378-398` vs `web/src/events/derive.ts:197-219`
- Uproot refunds: `ios/Trunk/Services/EventDerivation.swift:259-277` vs `web/src/events/derive.ts:142-151`

**Impact**: Any formula change requires dual updates. High drift risk. Maintenance burden.

**Recommendation**:
- Add cross-platform validation tests using shared test fixtures from `shared/test-fixtures/`
- Ensure both platforms pass identical assertions for formulas in `shared/formulas.md`
- Add test cases for edge cases: week boundaries, DST transitions, timezone handling
- Consider generating Swift derivation code from shared specification

### H2. God Object: dom-builder.ts buildApp()
**Review**: Architecture (A1)
**File**: `web/src/ui/dom-builder.ts:20-615` (595 lines)

**Impact**: Single function constructs entire DOM tree inline. Unmaintainable, untestable, high complexity.

**Recommendation**:
- Extract sections: `buildHeader()`, `buildBody()`, `buildDialogs()` as separate functions
- Target <100 lines per function
- Each section should return its DOM subtree independently
- Update tests to verify each section independently

### H3. Incomplete Event Sourcing Migration
**Review**: Architecture (A3)
**Files**: `web/src/state/index.ts`, `web/src/events/store.ts`, `web/src/main.ts`

**Impact**: Two sources of truth:
- Legacy `nodeState` (labels, notes in `trunk-notes-v1`)
- Event-sourced state (sprouts, resources derived from `trunk-events-v1`)

Creates migration debt, unclear ownership, and state synchronization burden.

**Recommendation**:
- Complete migration: Move labels/notes to events (add `node-label-changed`, `node-note-changed` event types)
- Update `deriveState()` to derive node data from events
- Deprecate `trunk-notes-v1` localStorage key
- Provide one-time migration for existing users
- Update all documentation to reflect single source of truth

### H4. God Object: twig-view.ts buildTwigView()
**Review**: Architecture (A2)
**File**: `web/src/ui/twig-view.ts:94-803` (709 lines)

**Impact**: Single function handles sprout CRUD, forms, rendering, and events. Mixes UI construction, business logic, and event handlers.

**Recommendation**:
- Split into focused functions:
  - `buildTwigPanel()` - Outer structure
  - `buildSproutForm()` - Form UI construction
  - `renderSproutCards()` - Sprout list rendering
  - `handleSproutActions()` - Event orchestration
- Extract form validation logic to separate module
- Target <150 lines per function

### H5. Date Format Timestamp Inconsistency
**Review**: Consistency (C1)
**Files**: `web/src/` (54+ instances of `new Date().toISOString()`) vs `ios/Trunk/` (ISO8601DateFormatter with inconsistent fractional seconds)

**Impact**:
- JavaScript always includes milliseconds: `2026-02-15T12:34:56.789Z`
- iOS varies based on formatter configuration
- Creates sync comparison issues, event ordering edge cases

**Recommendation**:
- Standardize on UTC with millisecond precision for both platforms
- Update shared schemas (`shared/schemas/*.schema.json`) to require millisecond precision
- Add timestamp validation tests
- Document standard format in `shared/formulas.md` or new `shared/protocols.md`

### H6. Massive Entry Point with High Coupling
**Review**: Architecture (A4)
**File**: `web/src/main.ts` (563 lines, 21 imports)

**Impact**: Entry point does everything: auth, sync, UI init, event wiring. High coupling, difficult to test in isolation.

**Recommendation**:
- Extract bootstrap modules:
  - `bootstrap/auth.ts` - `initAuth()`
  - `bootstrap/sync.ts` - `initSync()`
  - `bootstrap/ui.ts` - `initUI()`
  - `bootstrap/events.ts` - `wireEventHandlers()`
- `main.ts` becomes thin orchestrator calling bootstrap modules
- Each module testable in isolation

### H7. Unsafe DOM Element Access
**Review**: Correctness (R1)
**File**: `web/src/ui/dom-builder.ts:532-607`

**Impact**: Multiple `!` non-null assertions on `querySelector` results without validation. Runtime crash risk if DOM structure changes.

**Examples**:
```typescript
const sidebar = document.querySelector('.sidebar')!
const header = document.querySelector('.header')!
```

**Recommendation**:
- Add null checks with descriptive error messages:
```typescript
const sidebar = document.querySelector('.sidebar')
if (!sidebar) throw new Error('Failed to find .sidebar element')
```
- Or create helper: `requireElement(selector)` that throws on null
- Add DOM structure validation tests

### H8. Complex Event Derivation
**Review**: Architecture (A6)
**File**: `web/src/events/derive.ts:1-724` (single file, 724 lines)

**Impact**:
- Single file handles all state derivation
- `deriveState()` replays all events linearly O(n) per call
- Called on every render - performance risk with large event logs
- Difficult to maintain and test comprehensively

**Recommendation**:
- Split into focused modules:
  - `derive-sprouts.ts` - Sprout state derivation
  - `derive-resources.ts` - Soil/water/sun derivation
  - `derive-charts.ts` - Chart data bucketing
- Add memoization to cache derived state
- Implement incremental derivation (only replay new events)
- Profile performance with large datasets (1000+ events)

### H9. Monolithic iOS Views
**Review**: Architecture (A5)
**Files**:
- `ios/Trunk/Views/SproutsView.swift` (796 lines)
- `ios/Trunk/Views/TodayView.swift` (768 lines)

**Impact**: Views handle filtering, sorting, rendering, and actions all inline. Difficult to test, reuse, and maintain.

**Recommendation**:
- Extract reusable components:
  - `SproutFilterBar` - Filtering UI
  - `SproutListItem` - Individual sprout card
  - `WaterSection` - Water journaling section
  - `ShineSection` - Sun reflection section
- Move business logic to ViewModels or Services
- Target <300 lines per view file

### H10. Error Handling Philosophy Mismatch
**Review**: Consistency (C2)
**Files**:
- Web: `web/src/services/auth-service.ts` returns `{ error: string | null }`
- iOS: `ios/Trunk/Services/AuthService.swift` uses Swift `throws`

**Impact**: Fundamentally different error recovery patterns. Web must check error field, iOS uses try/catch. Difficult to maintain consistent UX.

**Recommendation**:
- Document platform-specific error handling patterns in `docs/ARCHITECTURE.md`
- Create shared error code enums in `shared/error-codes.json`
- Both platforms map to same user-facing error messages
- Add cross-platform error handling tests

### H11. State Management Architecture Divergence
**Review**: Consistency (C3)
**Files**:
- Web: `web/src/state/` (module-level functions, mutable exports)
- iOS: `ios/Trunk/` (@Observable, @Published, reactive state)

**Impact**: Completely different state management philosophies. Hard to reason about cross-platform behavior.

**Recommendation**:
- Justified by platform idioms (JavaScript modules vs SwiftUI reactivity)
- Document architectural differences in `docs/ARCHITECTURE.md`
- Ensure both derive from same event log
- Add integration tests verifying identical state derivation

### H12. Event Type Union Missing in iOS
**Review**: Consistency (C4)
**Files**:
- Web: `web/src/events/types.ts` (TypeScript discriminated union)
- iOS: `ios/Trunk/Services/EventDerivation.swift` (string-based switch)

**Impact**: iOS more prone to runtime errors from typos or missing event type handlers. No compile-time exhaustiveness checking.

**Recommendation**:
- Consider Swift enum with associated values:
```swift
enum Event {
  case sproutPlanted(SproutPlantedEvent)
  case sproutWatered(SproutWateredEvent)
  // ... compiler enforces exhaustive handling
}
```
- Or document as acceptable platform difference
- Add runtime tests for all event types

### H13. O(n²) Nested Loops Performance Risk
**Review**: Architecture (A8)
**Files**:
- `web/src/features/progress.ts:53-59`
- `web/src/ui/twig-view.ts:442-461`

**Impact**: Nested forEach/reduce/filter chains: branches → twigs → sprouts. Executes on every render. Performance degrades with scale.

**Recommendation**:
- Flatten loops where possible
- Cache computed values in derived state
- Use memoization for expensive calculations
- Profile with large datasets (8 branches × 8 twigs × 20 sprouts = 1280 items)
- Consider indexed lookups instead of nested iteration

---

## MEDIUM SEVERITY

### M1. Unused Swift Extension: View+SwipeBack.swift
**Review**: Dead Code (D1)
**File**: `ios/Trunk/Extensions/View+SwipeBack.swift` (35 lines)

**Impact**: Defines `swipeBackEnabled()` modifier with ZERO usages. Dead code increases cognitive load.

**Recommendation**: Delete file entirely or document if intended for future use.

### M2. Hardcoded Access Token in .mcp.json
**Review**: Dead Code (D2)
**File**: `.mcp.json`

**Impact**: Contains Supabase access token in plaintext. Security risk if accidentally committed.

**Recommendation**:
- Replace with environment variable reference: `"access_token": "${SUPABASE_ACCESS_TOKEN}"`
- Add `.mcp.json` to `.gitignore`
- Provide `.mcp.example.json` template
- Rotate exposed token immediately

### M3. JSON Schemas Not Consumed by Code
**Review**: Dead Code (D3)
**Files**: `shared/schemas/events.schema.json`, `leaf.schema.json`, `node-data.schema.json`, `sprout.schema.json`

**Impact**: Schemas not imported or used for runtime validation. Documentation value only.

**Recommendation**:
- Integrate with runtime validation library (Zod for web, Codable for iOS)
- Or move to `docs/schemas/` with README explaining documentation purpose
- Add schema validation tests

### M4. Enum Naming: Season vs SproutSeason
**Review**: Consistency (C5)
**Files**: `web/src/types.ts:8` vs `ios/Trunk/Services/EventDerivation.swift:14`

**Impact**: Web uses `Season`, iOS uses `SproutSeason`. Inconsistent naming creates confusion.

**Recommendation**: Align naming (`Season` is cleaner) or add comment explaining iOS naming choice to avoid Swift standard library conflict.

### M5. Storage Key Inline Strings in iOS
**Review**: Consistency (C7)
**File**: `ios/Trunk/Services/SyncService.swift:44-47`

**Impact**: iOS uses inline string literals (`"trunk-events-v1"`) instead of generated constants. Typo risk.

**Recommendation**: Generate storage key constants for iOS from `shared/constants.json` like web does.

### M6. Derived Prefix Inconsistency
**Review**: Consistency (C9)
**Files**: `web/src/types.ts` (WaterEntry, SunEntry, Leaf, Sprout) vs iOS (DerivedWaterEntry, DerivedSunEntry, DerivedLeaf, DerivedSprout)

**Impact**: iOS naming is more accurate (types are derived from events). Web naming implies stored types.

**Recommendation**: Consider aligning web to use `Derived*` prefix or document naming rationale in `docs/DATA_MODEL.md`.

### M7. Large Average Function Size
**Review**: Architecture (A10)
**Files**:
- `web/src/ui/leaf-view.ts` (avg 135 lines/function)
- `web/src/features/harvest-dialog.ts` (163 lines/function)

**Impact**: Functions exceeding 100 lines are harder to test and reason about.

**Recommendation**: Extract subfunctions for validation, calculation, and UI update. Target <100 lines per function.

### M8. Sync Service Complexity
**Review**: Architecture (A11)
**Files**:
- `web/src/services/sync-service.ts` (492 lines)
- `ios/Trunk/Services/SyncService.swift` (472 lines)

**Impact**: Single service handles pull, push, realtime, cache, and conflict resolution. High complexity.

**Recommendation**:
- Split into focused services:
  - `SyncPullService` - Fetch remote events
  - `SyncPushService` - Push local events
  - `RealtimeService` - Realtime subscriptions
  - `CacheManager` - Last sync tracking
- Sync orchestrator coordinates services

### M9. Unclear Data Flow: Resources Derived Multiple Places
**Review**: Architecture (A12)
**Files**: `web/src/state/index.ts:26-37`, `web/src/events/store.ts`, `web/src/events/derive.ts:197-219`

**Impact**: `getSoilAvailable()` exported from `state/` but implemented in `events/` - non-obvious indirection.

**Recommendation**:
- Consolidate in single module (`events/derive.ts` owns resource derivation)
- `state/index.ts` should only re-export with clear comments
- Document data flow in module header comments

### M10. Deep Nesting in Render Functions
**Review**: Architecture (A13)
**Files**:
- `web/src/ui/twig-view.ts:293-360`
- `web/src/ui/twig-view.ts:362-408`

**Impact**: Template strings with 4-5 levels of nesting, ternaries inside ternaries. Hard to read.

**Recommendation**:
- Extract template helpers: `renderSproutCard()`, `renderLeafBadge()`
- Use early returns for conditionals
- Consider template system (lit-html, htm) for complex UI

### M11. iOS View State Management Scattered
**Review**: Architecture (A14)
**Files**:
- `ios/Trunk/Views/SproutsView.swift:30-36`
- `ios/Trunk/Views/TodayView.swift:16-28`

**Impact**: @State declarations mixed with cached state. Redundant `cachedSprouts`/`cachedState` properties.

**Recommendation**: Introduce ViewState struct with computed derived properties. Consolidate state declarations.

### M12. Chart Bucketing Complexity
**Review**: Architecture (A15)
**File**: `web/src/events/derive.ts:578-639`

**Impact**: Complex time-bucketing with calendar snapping, semimonthly boundaries. 60+ lines, hard to verify correctness.

**Recommendation**:
- Extract `generateBucketBoundaries()`, `interpolateDataPoints()` as pure functions
- Add extensive unit tests for edge cases
- Document bucketing algorithm with examples

### M13. Replicated Sync Logic Across Platforms
**Review**: Architecture (A16)
**Files**: `web/src/services/sync-service.ts`, `ios/Trunk/Services/SyncService.swift`

**Impact**: Similar but not identical sync protocols. Behavior could diverge.

**Recommendation**:
- Document sync protocol specification in `shared/sync-protocol.md`
- Add E2E cross-platform sync tests
- Ensure both platforms handle same edge cases identically

### M14. Hover Detection Complexity
**Review**: Architecture (A17)
**File**: `web/src/features/hover-branch.ts:1-247`

**Impact**: Custom hover zones, mouse tracking, debouncing, pixel-perfect collision detection. Complex spatial logic.

**Recommendation**:
- Extract `HoverZone` class with clear interface
- Extract `HitTestService` for collision detection
- Use declarative zone configuration
- Add visual debugging mode

### M15. No Clear Module Boundaries
**Review**: Architecture (A18)
**Files**: `web/src/features/`, `web/src/ui/`

**Impact**: `features/` and `ui/` both contain business logic and rendering. Unclear separation of concerns.

**Recommendation**:
- Enforce convention:
  - `ui/` = pure rendering (no business logic)
  - `features/` = orchestration (coordinates UI + state)
  - `domain/` = pure business rules (new directory)
- Document in `docs/ARCHITECTURE.md`

### M16. iOS TreeCanvasView Complexity
**Review**: Architecture (A19)
**File**: `ios/Trunk/Views/TreeCanvasView.swift:1-443`

**Impact**: Handles layout, animations, hit detection, zoom, keyboard shortcuts all in one view.

**Recommendation**:
- Extract:
  - `BranchLayoutEngine` - Position calculations
  - `ZoomAnimationController` - Zoom transitions
  - `KeyboardShortcutHandler` - Keyboard navigation
- View becomes thin coordinator

### M17. Sprout State Helpers Duplicated
**Review**: Shared Code (S6)
**Files**:
- `ios/Trunk/Services/EventDerivation.swift:416-440`
- `web/src/events/derive.ts:260-283`

**Impact**: `getSproutsForTwig()`, `getLeavesForTwig()`, `getActiveSprouts()`, `getCompletedSprouts()` duplicated.

**Recommendation**: Low priority - functions are trivial. Add shared test fixtures if drift becomes concern.

### M18. Sprout Progress & Readiness Duplicated
**Review**: Shared Code (S7)
**Files**: `ios/Trunk/Services/ProgressionService.swift:80-94` vs inline calculations in web

**Impact**: Progress percentage calculation (elapsed / duration) duplicated.

**Recommendation**: Add test fixture for progress calculation with edge cases (just planted, nearly complete, overdue).

### M19. ID Generation Patterns Differ
**Review**: Shared Code (S8), Consistency (C13)
**Files**:
- `ios/Trunk/Services/EventDerivation.swift` (custom `randomString(length: 6)`)
- `web/src/events/derive.ts:352-361` (`crypto.randomUUID()`)

**Impact**: Different ID formats. Potential collision risk with short random strings.

**Recommendation**:
- Document ID format in `shared/protocols.md`
- Consider UUID for both platforms (better collision resistance)
- Add regex validation tests

### M20. End Date Calculation Duplicated
**Review**: Shared Code (S9)
**Files**:
- `ios/Trunk/Services/ProgressionService.swift:80-83`
- `web/src/events/derive.ts:316-323`

**Impact**: `harvestDate()` / `calculateEndDate()` - add season duration to planted date.

**Recommendation**: Add test cases for season durations + timezone edge cases (DST transitions).

### M21. Array Access Without Bounds Check
**Review**: Correctness (R3)
**File**: `web/src/services/sync-service.ts:122`

**Impact**: `syncEvents[syncEvents.length - 1].created_at` without checking empty array. Runtime error risk.

**Recommendation**:
```typescript
if (syncEvents.length === 0) return null
const lastSync = syncEvents[syncEvents.length - 1].created_at
```

### M22. Event Sorting by Timestamp Without Validation
**Review**: Correctness (R4)
**File**: `web/src/events/derive.ts:81-83`

**Impact**: Invalid Date objects result in NaN, causing silent sort failures. Events processed in wrong order.

**Recommendation**:
- Validate timestamps before sorting
- Handle NaN in sort comparator: `(a, b) => (a - b) || 0`
- Add test for invalid timestamp handling

### M23. Timestamp-Based Deduplication Edge Case
**Review**: Correctness (R5)
**File**: `web/src/services/sync-service.ts:113-115`

**Impact**: Uses timestamp equality for dedup. Could fail with identical timestamps from rapid actions.

**Recommendation**: Use `clientId` (event ID) for deduplication instead of timestamp.

### M24. ISO8601 Timestamp Parsing Reliability (iOS)
**Review**: Correctness (R6)
**File**: `ios/Trunk/Services/EventDerivation.swift:463-464`

**Impact**: `parseTimestamp` always returns Date but parse could fail with invalid input.

**Recommendation**:
- Make `parseTimestamp` return `Date?`
- Handle nil at call sites with graceful fallback
- Add test for malformed timestamp handling

### M25. Realtime Deduplication Race Condition (iOS)
**Review**: Correctness (R7)
**File**: `ios/Trunk/Services/SyncService.swift:411-413`

**Impact**: Events array could be modified during async iteration. Rare race condition.

**Recommendation**: Capture snapshot of events array before async check:
```swift
let eventSnapshot = events
for event in eventSnapshot { ... }
```

---

## LOW SEVERITY

### L1. Unused devDependencies
**Review**: Dead Code (D4)
**File**: `web/package.json`

**Impact**: `@stryker-mutator/vitest-runner` and `@vitest/coverage-v8` may not be actively used.

**Recommendation**: Remove if not used, document in README if used occasionally.

### L2. Orphaned Asset File
**Review**: Dead Code (D5)
**File**: `web/assets/tree_icon_circle.png`

**Impact**: No references found in any source file. Unused asset.

**Recommendation**: Delete or move to `/design` archive folder.

### L3. Stale Documentation Files
**Review**: Dead Code (D6)
**Files**: `CODEBASE_REVIEW.md`, `REFACTOR_LOG.md`, `swiftui_best_practices.md`

**Impact**: Snapshot review from Feb 6, partially completed refactoring log, untracked notes.

**Recommendation**: Archive to `docs/archive/` or delete if superseded by newer docs.

### L4. Underutilized Test Fixtures
**Review**: Dead Code (D7)
**Files**: `shared/test-fixtures/edge-cases.json`, `minimal-state.json`, `full-state.json`, `legacy-v1.json`

**Impact**: Low usage count across tests. Unclear value.

**Recommendation**: Review each fixture; keep valuable ones, delete obsolete ones, document purpose in README.

### L5. Dialog vs View Naming Convention
**Review**: Consistency (C6)
**Files**: `web/src/features/*-dialog.ts` vs `ios/Trunk/Views/Dialogs/*View.swift`

**Impact**: Web uses "dialog", iOS uses "View" suffix. Minor naming difference.

**Recommendation**: Justified by platform conventions. Document mapping in `docs/ARCHITECTURE.md`.

### L6. Sprout State Enum Outdated Comments
**Review**: Consistency (C8)
**File**: `web/src/types.ts:9-11`

**Impact**: References removed "draft" and "failed" states. Confusing outdated comments.

**Recommendation**: Remove outdated comments, update to reflect current states.

### L7. Comment Style Inconsistency Within iOS
**Review**: Consistency (C10)

**Impact**: Some files use `//` headers, some use `// MARK:`. Minor style inconsistency.

**Recommendation**: Standardize on `// MARK:` for section headers in Swift.

### L8. Timestamp Field Naming Confusion
**Review**: Consistency (C11)

**Impact**: `timestamp` vs `clientTimestamp` vs `createdAt` not well documented. Unclear which to use where.

**Recommendation**: Add comments documenting field purposes. Update `docs/DATA_MODEL.md`.

### L9. AuthState loading vs isLoading
**Review**: Consistency (C12)

**Impact**: Web uses `loading`, iOS uses `isLoading`. Minor naming difference.

**Recommendation**: Document in `docs/ARCHITECTURE.md` or align naming.

### L10. Event Types Set Missing in iOS
**Review**: Consistency (C14)

**Impact**: Web has `VALID_EVENT_TYPES` Set for O(1) lookups, iOS only has array. Minor performance difference.

**Recommendation**: Add Set version in iOS for consistency.

### L11. Inconsistent Error Handling in Sync
**Review**: Architecture (A20)

**Impact**: Some errors thrown, some returned, some swallowed. Inconsistent patterns.

**Recommendation**: Standardize on Result type or error return convention. Document in module header.

### L12. Magic Numbers in Layout
**Review**: Architecture (A21)

**Impact**: Hardcoded positioning values scattered through layout code.

**Recommendation**: Extract to layout configuration object with named constants.

### L13. Test Files Too Large
**Review**: Architecture (A22)

**Impact**: `derive.test.ts` 1129 lines. Hard to navigate.

**Recommendation**: Split by domain: `derive-sprouts.test.ts`, `derive-resources.test.ts`, `derive-charts.test.ts`.

### L14. Circular Import Risk
**Review**: Architecture (A23)

**Impact**: `state/` re-exports creating fragile import chains.

**Recommendation**: Flatten exports. Use barrel exports sparingly.

### L15. iOS CreateSproutView Size
**Review**: Architecture (A24)

**Impact**: 415 lines. Could be more modular.

**Recommendation**: Extract `LeafPicker`, `SeasonEnvironmentSelector` as separate components.

### L16. Full State Derivation on Every Update
**Review**: Architecture (A25)

**Impact**: O(n) replays all events per call. Performance risk with large logs.

**Recommendation**: Implement incremental derivation or memoization. Profile with 1000+ events.

### L17. AppContext is Unstructured Bag
**Review**: Architecture (A26)

**Impact**: No clear interface. Difficult to reason about dependencies.

**Recommendation**: Define focused interfaces: `UIContext`, `StateContext`, `NavigationContext`. Use composition.

### L18. Midnight/Timezone Edge Cases in Reset Times
**Review**: Correctness (R8)

**Impact**: DST transitions could affect reset time calculations. Edge case risk.

**Recommendation**: Add comprehensive tests for DST transitions, leap days, timezone changes.

### L19. Zero Capacity / Negative Soil Edge Cases
**Review**: Correctness (R9)

**Impact**: Already handled with Math.max/min clamping ✅

**Recommendation**: None - existing implementation is correct.

### L20. Nanosecond Overflow in Task.sleep (iOS)
**Review**: Correctness (R10)

**Impact**: Very low risk with 0.5s interval. Theoretical overflow with huge values.

**Recommendation**: Add bounds check if sleep interval becomes configurable.

---

## Implementation Priority

### Phase 1: Critical Correctness & Security (1-2 weeks)
- H7: Unsafe DOM element access
- M2: Hardcoded access token
- M21: Array bounds checks
- H5: Timestamp format standardization

### Phase 2: Cross-Platform Consistency (2-3 weeks)
- H1: Cross-platform business logic tests
- H10: Error handling alignment
- M19: ID generation standardization
- M13: Sync protocol documentation

### Phase 3: Code Quality & Maintainability (3-4 weeks)
- H2: Refactor dom-builder.ts
- H4: Refactor twig-view.ts
- H6: Split main.ts entry point
- H9: Modularize iOS views

### Phase 4: Architecture & Performance (4-6 weeks)
- H3: Complete event sourcing migration
- H8: Split and optimize event derivation
- H13: Optimize nested loops
- M8: Split sync services

### Phase 5: Cleanup & Documentation (1-2 weeks)
- M1: Remove dead code
- L3: Archive stale docs
- M15: Document module boundaries
- Update all architecture documentation

---

## Metrics

**Total Findings**: 75 unique items (after deduplication)
- HIGH: 13 items
- MEDIUM: 25 items
- LOW: 20 items
- Already Correct: 2 items (noted for validation)

**Primary Risk Areas**:
1. Cross-platform consistency (16 findings)
2. Code complexity & maintainability (15 findings)
3. Architecture & performance (12 findings)
4. Correctness & safety (10 findings)
5. Dead code & dependencies (7 findings)

**Estimated Total Effort**: 12-17 weeks (can be parallelized across team members)

---

## Next Steps

1. **Review & Prioritize**: Team reviews this proposal and adjusts priorities based on business needs
2. **Create Issues**: Convert high-priority items to GitHub issues with acceptance criteria
3. **Assign Owners**: Assign architecture, web, and iOS leads to respective items
4. **Implement Incrementally**: Tackle Phase 1 items immediately, schedule others in sprint planning
5. **Track Progress**: Update this document with completion status as items are resolved

---

**Document Version**: 1.0
**Last Updated**: 2026-02-15
**Authors**: 5 Parallel Review Agents coordinated by Sonnet 4.5
