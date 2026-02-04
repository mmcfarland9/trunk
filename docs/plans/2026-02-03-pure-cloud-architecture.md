# Pure Cloud Architecture

> **For Claude:** Execute this plan directly. Remove ALL legacy local storage. Cloud is the single source of truth.

**Goal:** Both web and iOS derive ALL state from cloud events. No legacy localStorage, no SwiftData, no nodeState.

**Architecture:**
```
Supabase events table (source of truth)
        ↓
   pullEvents()
        ↓
   Local cache (performance only, disposable)
        ↓
   EventStore (in-memory)
        ↓
   deriveState()
        ↓
   UI renders
```

---

## Cache Strategy: Stale-While-Revalidate

**Flow:**
1. App opens → load cached events from disk (instant)
2. `deriveState()` → show UI immediately
3. Pull fresh events from cloud (background)
4. If changed → update cache → re-derive → update UI

**Cache rules:**
- Cache is NOT source of truth (cloud is)
- Cache is disposable - if corrupted, fetch from cloud
- Single cache key per platform:
  - Web: `trunk-events-cache` in localStorage
  - iOS: `events-cache.json` in app cache directory

---

## Web Cleanup

### DELETE these files:
- `src/state/resources.ts` - Legacy localStorage state
- `src/state/node-state.ts` - Legacy nodeState object
- `src/state/migrations.ts` - No local data to migrate
- `src/events/migrate.ts` - No legacy migration needed
- `src/events/rebuild.ts` - No nodeState to rebuild

### MODIFY these files:

**`src/state/index.ts`** - Only export:
- View state functions (getViewMode, etc.)
- Pure calculation functions (calculateSoilCost, etc.)
- Remove all nodeState, resource exports

**`src/ui/twig-view.ts`** - Remove:
- All `nodeState` references
- `setSprouts()` function
- `saveState()` calls
- Read sprouts from `getState().sprouts`

**`src/ui/leaf-view.ts`** - Remove:
- All `nodeState` references
- Read leaves from `getState().leaves`

**`src/ui/editor.ts`** - Remove:
- `nodeState` references for labels/notes
- Store labels/notes as events (or remove if not needed)

**`src/ui/node-ui.ts`** - Remove:
- `nodeState` references
- Read node data from derived state

**`src/features/log-dialogs.ts`** - Remove:
- Legacy log reading from nodeState
- Read from `getState().sunEntries`

**`src/features/harvest-dialog.ts`** - Already updated, verify no legacy

**`src/features/water-dialog.ts`** - Remove:
- `addWaterEntry()` legacy call (event append is enough)

**`src/features/shine-dialog.ts`** - Remove:
- `addSunEntry()` legacy call (event append is enough)

**`src/main.ts`** - Simplify to:
- Init auth
- Pull events from cloud (with cache)
- Render UI
- Subscribe to realtime

**`src/services/sync-service.ts`** - Remove:
- `rebuildNodeStateFromEvents()`
- Any nodeState references

### KEEP these files:
- `src/events/store.ts` - Core EventStore
- `src/events/derive.ts` - State derivation
- `src/events/types.ts` - Event types
- `src/events/index.ts` - Public exports
- `src/state/view-state.ts` - In-memory view state (not persisted)

---

## iOS Cleanup

### DELETE these files:
- `Models/Sprout.swift` - SwiftData model
- `Models/WaterEntry.swift` - SwiftData model
- `Models/SunEntry.swift` - SwiftData model
- `Models/NodeData.swift` - SwiftData model
- `Models/Leaf.swift` - SwiftData model
- `Services/DataExportService.swift` - No local data to export

### DELETE these test files:
- `TrunkTests/SproutModelTests.swift` - Tests deleted SwiftData model

### MODIFY these files:

**`TrunkApp.swift`** - Remove:
- `.modelContainer()` setup
- All SwiftData configuration

**`ContentView.swift`** - Remove:
- `@Query` property wrappers
- SwiftData environment
- Use `EventStore.getState()` instead

**`Views/TwigDetailView.swift`** - Remove:
- SwiftData queries
- `@Environment(\.modelContext)`
- Read from `EventStore.getState()`

**`Views/BranchView.swift`** - Remove:
- SwiftData references
- Read from derived state

**`Views/Dialogs/ShineView.swift`** - Already pushes events, remove:
- Any remaining SwiftData references

**`Views/SettingsView.swift`** - Remove:
- Local data references

### KEEP these files:
- `Services/SyncService.swift` - Cloud sync
- `Services/EventStore.swift` - In-memory store
- `Services/EventDerivation.swift` - State derivation
- `Services/AuthService.swift` - Supabase auth
- `TrunkTests/EventDerivationTests.swift` - Derivation tests

---

## Success Criteria

Run these checks after completion:

```bash
# Web: No localStorage (except cache key)
grep -r "localStorage" web/src/ | grep -v "events-cache" | grep -v test

# Web: No nodeState
grep -r "nodeState" web/src/

# iOS: No SwiftData
grep -r "@Model\|@Query\|modelContainer\|ModelContext" ios/Trunk/

# Tests pass
cd web && npm test
cd ios && xcodebuild test
```

**E2E verification:**
1. Login on web
2. Plant a sprout
3. See sprout appear on iOS (same account)
4. Soil values match on both platforms

---

## Task Order

### Phase 1: Web cleanup
1. Add events cache layer to sync-service
2. Delete legacy files (resources.ts, node-state.ts, migrations.ts, migrate.ts, rebuild.ts)
3. Update state/index.ts exports
4. Update UI files to read from derived state only
5. Update feature files to remove legacy mutations
6. Run tests, fix any breaks

### Phase 2: iOS cleanup
1. Add events cache layer to SyncService
2. Delete SwiftData models
3. Remove modelContainer from TrunkApp
4. Update all views to use EventStore.getState()
5. Delete legacy tests, run remaining tests

### Phase 3: Cross-platform verification
1. Fresh install on both platforms
2. Login with same account
3. Create sprouts, water, harvest
4. Verify identical state on both
