# CLAUDE.md

This file provides guidance to Claude Code when working with this repository.

## Monorepo Structure

**This is a monorepo with multiple projects:**

- `web/` - Vite + TypeScript web application
- `app/` - Swift + SwiftUI iOS application (in development)
- `shared/` - Platform-agnostic constants, schemas, and specifications

**When working on web app:**
- Change directory to `web/`
- Run `npm install` and `npm run dev` from `web/`
- All build commands run from `web/` directory

**When working on iOS app:**
- Change directory to `app/`
- Open `Trunk.xcodeproj` in Xcode

**Shared specifications:**
- Constants: `shared/constants.json`
- Schemas: `shared/schemas/*.schema.json`
- Formulas: `shared/formulas.md`
- Default map: `shared/assets/trunk-map-preset.json`

**Related documentation:**
- [ARCHITECTURE.md](docs/ARCHITECTURE.md) — System diagrams, event sourcing, module relationships
- [ONBOARDING.md](docs/ONBOARDING.md) — Quick start, common tasks, gotchas
- [DATA_MODEL.md](docs/DATA_MODEL.md) — Entity relationships, storage keys, constants
- [INTERFACES.md](docs/INTERFACES.md) — Module APIs, extension points

---

## Build Commands (Web App)

```bash
cd web
npm run dev           # Start Vite development server
npm run build         # Compile TypeScript and build for production
npm run preview       # Preview production build locally
npm test              # Run unit tests (Vitest)
npm run test:watch    # Run tests in watch mode
npm run test:coverage # Run tests with coverage report
npm run test:e2e      # Run E2E tests (Playwright)
npm run test:mutation # Run mutation tests (Stryker)
```

TypeScript strict mode handles type checking (`noUnusedLocals`, `noUnusedParameters`).

---

## What is Trunk?

Trunk is a **personal growth and goal-tracking application** built around gardening metaphors. Users cultivate "sprouts" (goals) on a visual tree structure, nurturing them with daily attention ("water") and weekly reflection ("sun") to grow their capacity over time.

**Philosophy**: Growth is slow, deliberate, and intrinsically rewarding—like cultivating a bonsai tree. The system rewards patience, commitment, and honest effort over decades, not sprints.

**Tagline**: "Reap what you sow"

---

## Conceptual Model

### The Tree Structure (64 Twigs)

```
                    TRUNK (root/overview)
                       │
        ┌──────┬───────┼───────┬──────┐
     BRANCH  BRANCH  BRANCH  BRANCH  ... (8 total)
        │
   ┌────┼────┐
  TWIG TWIG TWIG ... (8 per branch = 64 total)
```

- **Trunk**: The root of your life map. Overview of all branches.
- **Branches** (8): Major life domains (e.g., "Health", "Career", "Relationships")
- **Twigs** (64): Specific facets within each domain (e.g., "Movement", "Nutrition" under Health)

Each twig can hold **sprouts** (goals) and **leaves** (sagas of related goals).

### Sprouts (Goals)

A **sprout** is a goal you're cultivating. Key properties:

| Property | Description |
|----------|-------------|
| **Title** | What you're trying to accomplish |
| **Season** | Duration: 2w, 1m, 3m, 6m, 1y |
| **Environment** | Difficulty: fertile (easy), firm (stretch), barren (hard) |
| **State** | draft → active → completed/failed |
| **Bloom** | Success criteria at 1/5, 3/5, 5/5 outcomes |
| **Result** | 1-5 scale when harvested |

**Lifecycle**: Draft → Plant (costs soil) → Grow (water daily) → Harvest (gain capacity)

### Leaves (Sagas)

A **leaf** is a named trajectory of related sprouts—a continuing story. Each leaf has a name that describes the saga (e.g., "Learning Piano", "Fitness Journey"). Multiple active sprouts can belong to the same leaf, allowing concurrent work on related goals.

### Resources: Soil, Water, Sun

| Resource | Represents | Capacity | Restores | Used For |
|----------|------------|----------|----------|----------|
| **Soil** | Focus/energy budget | Grows over lifetime (10→120) | Goal completion, journaling | Planting sprouts |
| **Water** | Daily attention | 3/day | 6:00 AM local | Watering active sprouts |
| **Sun** | Weekly reflection | 1/week | 6:00 AM Monday | Shining on any twig |

**Key insight**: Water requires active sprouts. Sun works on any twig, so you can always reflect even with no active goals.

---

## Navigation & Views

Four view modes with zoom-style navigation:

```
OVERVIEW ──scroll/click──► BRANCH ──scroll/click──► TWIG ──click leaf──► LEAF
    ▲                          ▲                        ▲
    └────── scroll up ─────────┴──── scroll up ─────────┘
```

| View | Shows | Sidebar Content |
|------|-------|-----------------|
| **Overview** | All 8 branches around trunk | Global stats, all active sprouts |
| **Branch** | Single branch with 8 twigs | Branch stats, branch's sprouts |
| **Twig** | Full twig detail panel | Sprout management, create/edit/harvest |
| **Leaf** | Leaf saga view | Sprout chain history |

**Hover behavior**: In overview, hovering a branch highlights it and shows its sprouts in sidebar.

### Keyboard Navigation

| Key | Context | Action |
|-----|---------|--------|
| `Escape` | Any dialog open | Close dialog |
| `Escape` | Twig view | Return to branch view |
| `Escape` | Branch view | Return to overview |
| `1-8` | Overview (not hovering) | Jump to branch N |
| `1-8` | Overview (hovering branch) | Jump to twig N in hovered branch |
| `1-8` | Branch view | Jump to twig N in current branch |
| `←` / `→` | Branch view | Cycle to previous/next branch |
| `←` / `→` | Twig view | Navigate to previous/next twig |
| `d` then `b` | Anywhere | Toggle debug panel (within 500ms) |

Visual keyboard hints appear in the sidebar when shortcuts are available for the current view.

---

## Progression System

### Soil Economy

**Starting capacity**: 10 (enough for a few concurrent goals)
**Maximum capacity**: 120 (mythical ceiling after ~50 years; realistic limit ~100)

**Planting costs** (soil spent):

| Season | Fertile | Firm | Barren |
|--------|---------|------|--------|
| 2 weeks | 2 | 3 | 4 |
| 1 month | 3 | 5 | 6 |
| 3 months | 5 | 8 | 10 |
| 6 months | 8 | 12 | 16 |
| 1 year | 12 | 18 | 24 |

**Capacity rewards** when harvesting: `base × environment × result × diminishing`

- **Environment multipliers**: Fertile 1.1x, Firm 1.75x, Barren 2.4x (risk rewarded)
- **Result multipliers**: 1→0.4, 2→0.55, 3→0.7, 4→0.85, 5→1.0 (showing up counts)
- **Diminishing returns**: `(1 - capacity/120)^1.5` — growth slows dramatically near max

**Recovery rates**:
- Water: +0.05 soil per use (3/day max = ~1.05/week)
- Sun: +0.35 soil per use (1/week)

See `shared/formulas.md` for full formulas (both platforms must implement identically).

---

## Data Model

### Storage

All data persists to localStorage:

| Key | Contents |
|-----|----------|
| `trunk-events-v1` | Event log (event-sourced actions: plant, water, harvest, etc.) |
| `trunk-notes-v1` | Legacy node data (labels, notes, sprouts, leaves), sun log, soil log |
| `trunk-resources-v1` | Legacy resource state (being deprecated, resources now derived) |
| `trunk-notifications-v1` | Email notification preferences |
| `trunk-last-export` | Timestamp of last JSON export |

**Note**: The system is transitioning to event sourcing. New actions append to `trunk-events-v1`, and state is derived from the event log rather than stored directly.

### Key Types (src/types.ts)

```typescript
// The main data for each node (trunk, branch, or twig)
type NodeData = {
  label: string
  note: string
  sprouts?: Sprout[]
  leaves?: Leaf[]
}

// A goal being cultivated
type Sprout = {
  id: string
  title: string
  season: '2w' | '1m' | '3m' | '6m' | '1y'
  environment: 'fertile' | 'firm' | 'barren'
  state: 'draft' | 'active' | 'completed' | 'failed'
  soilCost: number
  result?: number  // 1-5 when harvested
  leafId?: string  // if part of a leaf saga
  waterEntries?: WaterEntry[]
  // ... bloom descriptions, dates, etc.
}

// A saga of related sprouts
type Leaf = {
  id: string
  name: string     // User-provided name for the saga
  createdAt: string
}
```

### Node IDs

- Trunk: `trunk`
- Branches: `branch-0` through `branch-7`
- Twigs: `branch-{branchIdx}-twig-{twigIdx}` (e.g., `branch-2-twig-5`)

### Preset Labels

Default twig labels come from `shared/assets/trunk-map-preset.json`. Each twig has a default label that shows if the user hasn't customized it.

---

## Module Architecture

```
src/
├── main.ts              # Entry point, wires everything together
├── types.ts             # All TypeScript type definitions
├── constants.ts         # BRANCH_COUNT, TWIG_COUNT, STORAGE_KEY, etc.
├── state.ts             # Legacy state: nodeState, migrations, persistence
│
├── events/              # Event-sourced state (new architecture)
│   ├── index.ts         # Public API exports
│   ├── types.ts         # Event type definitions
│   ├── store.ts         # Event persistence (localStorage)
│   ├── derive.ts        # State derivation from events
│   ├── migrate.ts       # Migration from legacy state to events
│   └── rebuild.ts       # Rebuild state from event log
│
├── features/            # Feature modules (business logic)
│   ├── navigation.ts    # View switching, zoom transitions
│   ├── progress.ts      # Stats calculation, sidebar sprout lists
│   ├── status.ts        # Status bar messages
│   ├── hover-branch.ts  # Branch/twig hover detection
│   ├── import-export.ts # JSON backup/restore
│   ├── water-dialog.ts  # Water journaling modal
│   ├── harvest-dialog.ts # Harvest sprout modal
│   ├── shine-dialog.ts  # Sun reflection modal
│   └── log-dialogs.ts   # History view modals (water can, sun ledge, soil bag)
│
├── ui/                  # UI construction and rendering
│   ├── dom-builder.ts   # Builds entire DOM tree, exports elements
│   ├── node-ui.ts       # Node rendering, focus updates
│   ├── editor.ts        # Inline label/note editor modal
│   ├── layout.ts        # Positioning, SVG guides, wind animation
│   ├── twig-view.ts     # Twig detail panel (sprout management)
│   └── leaf-view.ts     # Leaf saga panel
│
├── utils/               # Utility functions
│   ├── debounce.ts      # Debounce helper
│   ├── escape-html.ts   # XSS prevention
│   ├── safe-storage.ts  # localStorage wrapper with error handling
│   ├── sprout-labels.ts # Season/environment label helpers
│   └── validate-import.ts # Import validation
│
├── tests/               # Unit and integration tests
│   ├── setup.ts         # Test utilities
│   └── *.test.ts        # Test files (20+)
│
└── styles/              # Modular CSS
    ├── index.css        # Imports all other CSS
    ├── base.css         # Reset, CSS variables, foundational styles
    ├── layout.css       # App shell grid/flexbox
    ├── buttons.css      # Button component styles
    ├── cards.css        # Card component styles
    ├── nodes.css        # Trunk/branch/twig node styles
    ├── editor.css       # Editor modal
    ├── sidebar.css      # Side panel styles
    ├── dialogs.css      # All dialog modals
    └── twig-view.css    # Twig detail panel styles
```

### Key File Responsibilities

| File | Purpose |
|------|---------|
| `main.ts` | Initializes app, wires up all event listeners, coordinates features |
| `state.ts` | Legacy state management: nodeState, migrations, persistence |
| `events/store.ts` | Event log: append, get, export events |
| `events/derive.ts` | Derives current state by replaying events |
| `dom-builder.ts` | Constructs entire DOM, returns `elements` object and `branchGroups` |
| `twig-view.ts` | Complex panel for sprout CRUD: create, edit, plant, harvest, uproot |
| `leaf-view.ts` | Leaf saga view: chronological history of related sprouts |
| `navigation.ts` | View transitions with CSS class changes and callbacks |
| `layout.ts` | Calculates node positions, draws SVG guide lines, wind animation |

---

## State Management

Trunk uses a **dual state system** during transition to event sourcing:

### Legacy State (`state.ts`)

The `nodeState` object holds node data (labels, notes), keyed by node ID:

```typescript
const nodeState: Record<string, NodeData> = {
  'trunk': { label: 'My Life', note: '...' },
  'branch-0': { label: 'Health', note: '...' },
  'branch-0-twig-0': { label: 'Movement', note: '...', sprouts: [...], leaves: [...] },
  // ...
}
```

Changes auto-persist to localStorage via `saveState()`.

### Event-Sourced State (`events/`)

The new architecture stores actions as immutable events. State is derived by replaying the log:

```typescript
// Append events (never modify)
appendEvent({ type: 'sprout-planted', sproutId, twigId, ... })
appendEvent({ type: 'sprout-watered', sproutId, note, ... })
appendEvent({ type: 'sprout-harvested', sproutId, result, ... })

// Derive current state
const state = deriveState(getEvents())
// state.soilCapacity, state.soilAvailable, state.sprouts, state.leaves
```

**Anti-cheat benefit**: Resources are derived from logs, not stored counters:

```typescript
// Water/sun availability derived from action timestamps
getWaterAvailable()  // = capacity - countWaterEntriesSince(6amToday)
getSunAvailable()    // = capacity - countSunEntriesSince(6amMonday)
```

### View State (in-memory)

```typescript
getViewMode()           // 'overview' | 'branch' | 'twig' | 'leaf'
getActiveBranchIndex()  // Which branch is zoomed into (null if overview)
getActiveTwigId()       // Which twig is open (null if not in twig/leaf view)
getHoveredBranchIndex() // Which branch is being hovered (overview only)
getFocusedNode()        // Currently focused DOM element for sidebar display
```

### Logs (legacy, in nodeState)

```typescript
sunLog: SunEntry[]   // All sun reflections with timestamps
soilLog: SoilEntry[] // All soil gains/losses with reasons
```

Full history is preserved for accurate state reconstruction from exports.

---

## Key Patterns

### Callback Objects

Features receive callback objects to communicate with other parts of the app:

```typescript
const navCallbacks = {
  onPositionNodes: () => positionNodes(ctx),
  onUpdateStats: () => { updateStats(ctx); updateSidebarSprouts(ctx) },
  onFocusTrunk: () => { /* ... */ },
}

setupHoverBranch(ctx, navCallbacks)
```

### AppContext

Central context object passed to most functions:

```typescript
const ctx: AppContext = {
  elements,      // All DOM element references
  branchGroups,  // Array of { group, branch, twigs[] } for each branch
  allNodes,      // All clickable node buttons
  nodeLookup,    // Map<nodeId, HTMLButtonElement>
  editor,        // Editor API
  twigView,      // Twig panel API
  leafView,      // Leaf panel API
}
```

### CSS State Classes

- `.is-active` - Active/selected state
- `.is-expanded` - Expanded sections
- `.is-collapsed` - Collapsed sections
- `.hidden` - Display none
- `.is-hovered` - Hover state
- `.is-ready` - Sprout ready to harvest

### View Mode CSS

The canvas element gets classes for zoom state:

```css
.canvas.is-overview { /* all branches visible */ }
.canvas.is-branch { /* zoomed to single branch */ }
.canvas.is-twig { /* twig panel open */ }
```

---

## Debug Tools

**Access**: Press `d` then `b` within 500ms to toggle the debug panel.

**Features**:
- **Debug hover zones**: Visualize branch hover detection areas
- **Advance clock**: Jump forward in time (for testing sprout timelines)
- **Reset soil**: Reset resources to starting values
- **Clear all sprouts**: Remove all sprouts from all twigs

---

## Import/Export

**Export**: Downloads `trunk{timestamp}.json` with:
- Version number
- All node data (labels, notes, sprouts, leaves)
- Sun log and soil log

**Import**: Replaces all data after confirmation. Validates structure and ignores unknown node IDs.

Export reminder appears after 7 days without export.

---

## Code Style

- **Indentation**: 2 spaces
- **TypeScript**: Strict mode (`noUnusedLocals`, `noUnusedParameters`)
- **Target**: ES2022 with ESNext modules
- **Naming**:
  - Files: `kebab-case.ts`
  - Exports: `camelCase`
  - Constants: `UPPER_SNAKE_CASE`
  - CSS classes: `kebab-case` with `.is-*` state modifiers

## Commit Guidelines

Use Conventional Commits: `feat:`, `fix:`, `docs:`, `chore:`, `refactor:`, `test:`

---

## Additional Documentation

| Document | Purpose |
|----------|---------|
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | System diagrams, event sourcing, cross-platform parity |
| [docs/ONBOARDING.md](docs/ONBOARDING.md) | Quick start, common tasks, debugging tips |
| [docs/DATA_MODEL.md](docs/DATA_MODEL.md) | Entity relationships, storage keys, constants reference |
| [docs/INTERFACES.md](docs/INTERFACES.md) | Module APIs, extension points, test fixtures |
| [docs/future-ideas-archive.md](docs/future-ideas-archive.md) | Archived feature designs (Flowerdex, etc.) |
