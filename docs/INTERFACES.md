# Interfaces & APIs

## Event Store API (web/src/events/)

### Public API (web/src/events/index.ts)

**Event Log Access:**
```typescript
getEvents(): readonly TrunkEvent[]
getState(): DerivedState
```

**Event Mutations:**
```typescript
appendEvent(event: TrunkEvent): void
appendEvents(events: TrunkEvent[]): void
replaceEvents(events: TrunkEvent[]): void  // For import
```

**Resource Getters:**
```typescript
getSoilAvailable(): number
getSoilCapacity(): number
getWaterAvailable(now?: Date): number
getSunAvailable(now?: Date): number
getWaterCapacity(): number

canAffordSoil(cost: number): boolean
canAffordWater(cost?: number): boolean
canAffordSun(cost?: number): boolean
```

**Query Helpers:**
```typescript
getSproutsForTwig(state: DerivedState, twigId: string): DerivedSprout[]
getLeavesForTwig(state: DerivedState, twigId: string): DerivedLeaf[]
getActiveSprouts(state: DerivedState): DerivedSprout[]
getCompletedSprouts(state: DerivedState): DerivedSprout[]
getSproutsByLeaf(state: DerivedState, leafId: string): DerivedSprout[]
getLeafById(state: DerivedState, leafId: string): DerivedLeaf | undefined
getAllWaterEntries(state: DerivedState, getTwigLabel?: (twigId: string) => string): ExtendedWaterEntry[]
```

**Time Queries:**
```typescript
checkSproutWateredToday(sproutId: string, now?: Date): boolean
wasSproutWateredThisWeek(events: readonly TrunkEvent[], sproutId: string, now?: Date): boolean
wasSproutWateredToday(events: readonly TrunkEvent[], sproutId: string, now?: Date): boolean
wasShoneThisWeek(events: readonly TrunkEvent[], now?: Date): boolean
getTodayResetTime(now?: Date): Date
getWeekResetTime(now?: Date): Date
```

**ID Generation:**
```typescript
generateSproutId(): string  // Returns "sprout-{uuid}"
generateLeafId(): string    // Returns "leaf-{uuid}"
```

**Event Store Setup:**
```typescript
initEventStore(): void
setEventStoreErrorCallbacks(quotaCallback: () => void, errorCallback?: (error: unknown) => void): void
setEventSyncCallback(callback: ((event: TrunkEvent) => void) | null): void
startVisibilityCacheInvalidation(): void  // Invalidate cached water/sun on tab visibility change
```

**Event Validation:**
```typescript
validateEvent(event: unknown): event is TrunkEvent
```

---

## Derivation API (web/src/events/derive.ts)

**Core Derivation:**
```typescript
deriveState(events: readonly TrunkEvent[]): DerivedState
deriveWaterAvailable(events: readonly TrunkEvent[], now?: Date): number
deriveSunAvailable(events: readonly TrunkEvent[], now?: Date): number
```

**Legacy Conversion:**
```typescript
toSprout(derived: DerivedSprout): Sprout  // Convert to legacy format
```

**Soil History:**
```typescript
deriveSoilLog(events: readonly TrunkEvent[]): SoilLogEntry[]
computeRawSoilHistory(events: readonly TrunkEvent[]): SoilHistoryPoint[]
bucketSoilData(
  points: SoilHistoryPoint[],
  range: SoilChartRange,
  now?: Date
): SoilChartPoint[]
```

---

## View State API (web/src/state/view-state.ts)

```typescript
getViewMode(): ViewMode  // 'overview' | 'branch' | 'twig' | 'leaf'
setViewModeState(mode: ViewMode, branchIndex?: number, twigId?: string): void

getActiveBranchIndex(): number | null
getActiveTwigId(): string | null
getHoveredBranchIndex(): number | null
setHoveredBranchIndex(index: number | null): void
getHoveredTwigId(): string | null
setHoveredTwigId(id: string | null): void

getFocusedNode(): HTMLButtonElement | null
setFocusedNodeState(node: HTMLButtonElement | null): void
getActiveNode(): HTMLButtonElement | null
setActiveNode(node: HTMLButtonElement | null): void

isBranchView(): boolean
isTwigView(): boolean
```

---

## Twig View API (web/src/ui/twig-view/index.ts)

```typescript
buildTwigView(mapPanel: HTMLElement, callbacks: TwigViewCallbacks): TwigViewApi

interface TwigViewApi {
  container: HTMLDivElement
  open: (twigNode: HTMLButtonElement) => void
  close: () => void
  isOpen: () => boolean
  refresh: () => void
}

interface TwigViewCallbacks {
  onClose: () => void
  onSave: () => void
  onSoilChange?: () => void
  onNavigate?: (direction: 'prev' | 'next') => HTMLButtonElement | null
  onOpenLeaf?: (leafId: string, twigId: string, branchIndex: number) => void
  onWaterClick?: (sprout: { id: string, title: string }) => void
  onHarvestClick?: (sprout: { /* sprout details */ }) => void
}
```

---

## Sync API (web/src/services/sync/)

### Public API (web/src/services/sync/index.ts)

**Operations:**
```typescript
pushEvent(event: TrunkEvent): Promise<{ error: string | null }>
smartSync(): Promise<SyncResult>
forceFullSync(): Promise<SyncResult>
deleteAllEvents(): Promise<{ error: string | null }>
startVisibilitySync(): void  // Auto-sync on tab visibility change
```

**Realtime Subscription:**
```typescript
subscribeToRealtime(onEvent: (event: TrunkEvent) => void): void
unsubscribeFromRealtime(): void
```

**Status & Metadata:**
```typescript
getDetailedSyncStatus(): DetailedSyncStatus  // 'synced' | 'syncing' | 'pendingUpload' | 'offline'
subscribeSyncMetadata(callback: (meta: SyncMetadata) => void): void

interface SyncMetadata {
  status: DetailedSyncStatus
  lastConfirmedTimestamp: string | null
  pendingCount: number
}
```

---

## AppContext (passed to all features)

```typescript
interface AppContext {
  // DOM references (from dom-builder/index.ts)
  elements: AppElements

  // Branch/twig hierarchy
  branchGroups: Array<{
    group: HTMLElement
    branch: HTMLButtonElement
    twigs: HTMLButtonElement[]
  }>

  // Quick lookups
  allNodes: HTMLButtonElement[]
  nodeLookup: Map<string, HTMLButtonElement>

  // Sub-APIs
  twigView?: TwigViewApi
  leafView?: LeafViewApi

  // Auth
  getUserDisplayName?: () => string
}
```

---

## State Module (web/src/state/index.ts)

Convenience re-exports from other modules:

- **View state** (from `state/view-state.ts`): `getViewMode`, `setViewModeState`, `getActiveTwigId`, `getActiveBranchIndex`, etc.
- **Resource getters** (from `events/store.ts`): `getSoilAvailable`, `getSoilCapacity`, `canAffordSoil`, `getWaterAvailable`, etc.
- **Calculations** (from `utils/calculations.ts`): `calculateSoilCost`, `calculateCapacityReward`, `getTodayResetTime`, etc.
- **Presets** (from `utils/presets.ts`): `getPresetLabel`, `getPresetNote`

---

## Extension Points

### Adding a New Event Type

1. **Define event type** in `web/src/events/types.ts`:
```typescript
export interface MyNewEvent extends BaseEvent {
  type: 'my_new_event'
  myField: string
}

export type TrunkEvent = ... | MyNewEvent
```

2. **Add derivation logic** in `web/src/events/derive.ts`:
```typescript
case 'my_new_event': {
  // Update derived state based on event
  break
}
```

3. **Update `shared/constants.json`** → `eventTypes` array, then run `npm run generate` from `web/` to regenerate `web/src/generated/constants.ts`.

### Adding a New Dialog

1. **Create feature file** with setup function:
```typescript
export function setupMyDialog(
  ctx: AppContext,
  callbacks: MyCallbacks
): void {
  // Wire up dialog logic
}
```

2. **Add DOM elements** in `web/src/ui/dom-builder/build-dialogs.ts`.

3. **Wire in `web/src/bootstrap/ui.ts`**:
```typescript
setupMyDialog(ctx, {
  onComplete: () => updateStats(ctx)
})
```

---

## iOS ProgressionService (ios/Trunk/Services/ProgressionService.swift)

```swift
struct ProgressionService {
  // Soil costs
  static func soilCost(season: Season, environment: SproutEnvironment) -> Int

  // Capacity rewards
  static func capacityReward(
    season: Season,
    environment: SproutEnvironment,
    result: Int,
    currentCapacity: Double
  ) -> Double

  // Diminishing returns curve
  static func diminishingReturns(currentCapacity: Double) -> Double

  // Resource recovery rates
  static var waterRecovery: Double
  static var sunRecovery: Double

  // Sprout timeline
  static func harvestDate(plantedAt: Date, season: Season) -> Date
  static func progress(plantedAt: Date, season: Season) -> Double
}
```

---

## iOS Event Derivation (ios/Trunk/Services/EventDerivation.swift)

Free functions (not struct methods):

```swift
// Core derivation
func deriveState(from events: [SyncEvent]) -> DerivedState

// Resource availability
func deriveWaterAvailable(from events: [SyncEvent], now: Date) -> Int
func deriveSunAvailable(from events: [SyncEvent], now: Date) -> Int

// Time resets
func getTodayResetTime(now: Date) -> Date
func getWeekResetTime(now: Date) -> Date

// Helper queries
func getActiveSprouts(from state: DerivedState) -> [DerivedSprout]
func getCompletedSprouts(from state: DerivedState) -> [DerivedSprout]
func getSproutsForTwig(from state: DerivedState, twigId: String) -> [DerivedSprout]
func getLeavesForTwig(from state: DerivedState, twigId: String) -> [DerivedLeaf]
func isSproutReady(_ sprout: DerivedSprout) -> Bool
```

---

## iOS SyncService (ios/Trunk/Services/SyncService.swift)

```swift
@MainActor
final class SyncService: ObservableObject {
  @Published var syncStatus: SyncStatus
  @Published private(set) var detailedSyncStatus: DetailedSyncStatus
  @Published private(set) var lastConfirmedTimestamp: String?

  func pushEvent(type: String, payload: [String: Any]) async throws
  func smartSync() async -> SyncResult
  func forceFullSync() async -> SyncResult
  func subscribeToRealtime()
  func unsubscribeFromRealtime()
}
```

---

## iOS DataExportService (ios/Trunk/Services/DataExportService.swift)

Handles JSON export/import of the full event log, mirroring web's export functionality.

```swift
class DataExportService {
  static func generateExport(events: [SyncEvent]) -> ExportPayload
  static func exportToJSON(_ payload: ExportPayload) throws -> Data
  static func parseImport(_ data: Data) throws -> ExportPayload
}
```

---

## iOS SoilHistoryService (ios/Trunk/Services/SoilHistoryService.swift)

Computes soil capacity history for charting. iOS counterpart of web's `events/soil-charting.ts`.

```swift
struct SoilHistoryService {
  static func computeSoilHistory() -> [RawSoilSnapshot]  // Uses EventStore.shared.events
  static func bucketSoilHistory(
    _ rawHistory: [RawSoilSnapshot],
    range: SoilChartRange,
    now: Date
  ) -> [SoilChartPoint]
}
```

---

## Related Documentation

- [CLAUDE.md](../CLAUDE.md) — Codebase guide (system prompt)
- [ARCHITECTURE.md](./ARCHITECTURE.md) — System diagrams, event sourcing, sync architecture
- [ONBOARDING.md](./ONBOARDING.md) — Quick start, common tasks, contributing
- [DATA_MODEL.md](./DATA_MODEL.md) — Entity relationships, event types, storage
- [RUNBOOK.md](./RUNBOOK.md) — Deployment, common issues
- [VERSIONING.md](./VERSIONING.md) — Version strategy, release process
