# Interfaces & APIs

## State API (web/src/events/index.ts)

### Reading State

```typescript
// Node data
getNodeData(nodeId: string): NodeData
getAllSprouts(): Sprout[]
getActiveSprouts(): Sprout[]
getSproutsForTwig(twigId: string): Sprout[]

// Resources (derived from logs)
getSoilAvailable(): number
getSoilCapacity(): number
getWaterAvailable(): number
getWaterCapacity(): number
getSunAvailable(): number

// Logs
getSunLog(): SunEntry[]
getSoilLog(): SoilEntry[]
```

### Mutating State

```typescript
// Node data
updateNodeData(nodeId: string, data: Partial<NodeData>): void
saveState(): void  // Persist to localStorage

// Sprout operations
addSprout(twigId: string, sprout: Sprout): void
updateSprout(twigId: string, sproutId: string, updates: Partial<Sprout>): void
removeSprout(twigId: string, sproutId: string): void

// Resource operations
spendSoil(amount: number, reason: string): void
earnSoilCapacity(amount: number, reason: string): void
useWater(sproutId: string, note: string): void
useSun(twigId: string, note: string): void
```

---

## View State API (web/src/state.ts)

```typescript
getViewMode(): 'overview' | 'branch' | 'twig' | 'leaf'
setViewMode(mode: ViewMode): void

getActiveBranchIndex(): number | null
setActiveBranchIndex(idx: number | null): void

getActiveTwigId(): string | null
setActiveTwigId(id: string | null): void

getHoveredBranchIndex(): number | null
setHoveredBranchIndex(idx: number | null): void

getFocusedNode(): HTMLElement | null
setFocusedNode(el: HTMLElement | null): void
```

---

## Navigation API (web/src/features/navigation.ts)

```typescript
setupNavigation(ctx: AppContext, callbacks: NavCallbacks): void

interface NavCallbacks {
  onPositionNodes: () => void
  onUpdateStats: () => void
  onFocusTrunk: () => void
  onFocusBranch: (index: number) => void
  onFocusTwig: (twigId: string) => void
}

// Programmatic navigation
zoomToBranch(ctx: AppContext, branchIndex: number): void
zoomToTwig(ctx: AppContext, twigId: string): void
zoomOut(ctx: AppContext): void
```

---

## Twig View API (web/src/ui/twig-view.ts)

```typescript
createTwigView(ctx: AppContext): TwigViewAPI

interface TwigViewAPI {
  show(twigId: string): void
  hide(): void
  refresh(): void
  getCurrentTwigId(): string | null
}
```

---

## Editor API (web/src/ui/editor.ts)

```typescript
createEditor(elements: Elements): EditorAPI

interface EditorAPI {
  open(nodeId: string, field: 'label' | 'note'): void
  close(): void
  isOpen(): boolean
}
```

---

## Dialog APIs

All dialogs follow this pattern:

```typescript
setupXxxDialog(ctx: AppContext, callbacks: XxxCallbacks): void

// Example: Water Dialog
interface WaterCallbacks {
  onWaterUsed: () => void
  onSproutUpdated: () => void
}
```

---

## AppContext (passed to all features)

```typescript
interface AppContext {
  // DOM references (from dom-builder.ts)
  elements: {
    app: HTMLElement
    canvas: HTMLElement
    sidebar: HTMLElement
    trunk: HTMLButtonElement
    // ... all named elements
  }

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
  editor: EditorAPI
  twigView: TwigViewAPI
  leafView: LeafViewAPI
}
```

---

## Extension Points

### Adding a New Dialog

1. Create feature file with setup function:
```typescript
export function setupMyDialog(
  ctx: AppContext,
  callbacks: MyCallbacks
): void {
  // Get trigger element from ctx.elements
  // Add event listeners
  // Call callbacks on completion
}
```

2. Add DOM in `dom-builder.ts`:
```typescript
const myDialog = createElement('dialog', 'my-dialog')
// ... build structure
return { ...elements, myDialog }
```

3. Wire in `main.ts`:
```typescript
setupMyDialog(ctx, {
  onComplete: () => updateStats(ctx)
})
```

### Adding a New Derived Value

In `web/src/events/derive.ts`:
```typescript
export function getMyDerivedValue(): number {
  const events = getEventLog()
  return events
    .filter(e => e.type === 'relevant')
    .reduce((acc, e) => /* compute */, 0)
}
```

---

## iOS ProgressionService (ios/Trunk/Services/ProgressionService.swift)

```swift
class ProgressionService {
  // Soil costs
  func plantingCost(season: Season, environment: Environment) -> Int

  // Capacity rewards
  func harvestReward(
    season: Season,
    environment: Environment,
    result: Int,
    currentCapacity: Double
  ) -> Double

  // Resource checks
  func waterAvailable(entries: [WaterEntry], capacity: Int) -> Int
  func sunAvailable(entries: [SunEntry], capacity: Int) -> Int
}
```

---

## Shared Schemas (shared/schemas/)

JSON Schema files for validation:

| Schema | Validates |
|--------|-----------|
| `sprout.schema.json` | Sprout object structure |
| `leaf.schema.json` | Leaf object structure |
| `node-data.schema.json` | NodeData structure |
| `events.schema.json` | Event log entries |

Use for:
- Import validation (`web/src/utils/validate-import.ts`)
- Type generation (if using json-schema-to-typescript)
- Cross-platform contract enforcement

---

## Test Fixtures (shared/test-fixtures/)

| Fixture | Purpose |
|---------|---------|
| `minimal-state.json` | Bare minimum valid state |
| `full-state.json` | Comprehensive example |
| `edge-cases.json` | Boundary conditions |
| `legacy-v1.json` | Migration testing |

Import in tests:
```typescript
import minimalState from '../../../shared/test-fixtures/minimal-state.json'
```

---

## Related Documentation

- [CLAUDE.md](../CLAUDE.md) — Detailed codebase guide
- [ARCHITECTURE.md](./ARCHITECTURE.md) — System overview and diagrams
- [ONBOARDING.md](./ONBOARDING.md) — Quick start and common tasks
- [DATA_MODEL.md](./DATA_MODEL.md) — Entity relationships and storage
