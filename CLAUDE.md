# CLAUDE.md

This file provides guidance to Claude Code when working with this repository.

## Monorepo Structure

**This is a monorepo with multiple projects:**

- `web/` - Vite + TypeScript web application
- `ios/` - Swift + SwiftUI iOS application (in development)
- `shared/` - Platform-agnostic constants, schemas, and specifications

**When working on web app:**
- Change directory to `web/`
- Run `npm install` and `npm run dev` from `web/`
- All build commands run from `web/` directory

**When working on iOS app:**
- Change directory to `ios/`
- Open `Trunk.xcodeproj` in Xcode

**Shared specifications:**
- Constants: `shared/constants.json`
- Schemas: `shared/schemas/*.schema.json`
- Formulas: `shared/formulas.md`
- Default map: `shared/assets/trunk-map-preset.json`

**Related documentation:**
- [ARCHITECTURE.md](docs/ARCHITECTURE.md) — System diagrams, event sourcing, sync architecture
- [ONBOARDING.md](docs/ONBOARDING.md) — Quick start, common tasks, contributing
- [DATA_MODEL.md](docs/DATA_MODEL.md) — Entity relationships, event types, storage
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
| **State** | active → completed or uprooted |
| **Bloom** | Success criteria at 1/5, 3/5, 5/5 outcomes |
| **Result** | 1-5 scale when harvested |

**Lifecycle**: Plant (costs soil) → Grow (water daily) → Harvest (gain capacity) or Uproot (partial refund)

### Leaves (Sagas)

A **leaf** is a named trajectory of related sprouts—a continuing story. Each leaf has a name that describes the saga (e.g., "Learning Piano", "Fitness Journey"). Multiple active sprouts can belong to the same leaf, allowing concurrent work on related goals.

### Resources: Soil, Water, Sun

| Resource | Represents | Capacity | Restores | Used For |
|----------|------------|----------|----------|----------|
| **Soil** | Focus/energy budget | Grows over lifetime (10→120) | Harvesting (soil cost returned + capacity gained), watering (+0.05/water), shining (+0.35/sun) | Planting sprouts |
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
| `Cmd+←` / `Cmd+→` | Branch view | Cycle to previous/next branch |
| `←` / `→` | Twig view | Navigate to previous/next twig |
| `d` then `b` | Anywhere | Toggle debug panel (within 500ms) |

Visual keyboard hints appear in the sidebar when shortcuts are available for the current view.

---

## Progression System

Soil capacity grows from 10 to ~100 over years of consistent goal completion. Planting costs and capacity rewards scale with season length and difficulty. See `shared/formulas.md` for complete formulas (both platforms must implement identically).

---

## Data Model

State is fully event-sourced. See [docs/DATA_MODEL.md](docs/DATA_MODEL.md) for entity relationships, event types, and storage details.

---

## Module Architecture

Key directories (full architecture in [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)):

- `bootstrap/` — App initialization (auth, events, sync, ui)
- `events/` — Event sourcing core (store, derive, soil-charting)
- `services/sync/` — Cloud sync modules (operations, cache, pending-uploads, realtime, status)
- `features/` — Business logic (navigation, dialogs, progress)
- `ui/` — DOM construction (dom-builder/, twig-view/, layout, node-ui)
- `state/` — View state (in-memory navigation)
- `utils/` — Pure utilities

---


---

## Key Patterns

**AppContext**: Central context object passed to most functions, contains all DOM element references, node lookup maps, and feature APIs (twigView, leafView, etc.).

**Callback Objects**: Features receive callbacks to coordinate with other modules without direct imports. See [docs/INTERFACES.md](docs/INTERFACES.md) for module APIs.

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
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | System diagrams, event sourcing, sync architecture |
| [docs/ONBOARDING.md](docs/ONBOARDING.md) | Quick start, common tasks, contributing |
| [docs/DATA_MODEL.md](docs/DATA_MODEL.md) | Entity relationships, event types, storage |
| [docs/INTERFACES.md](docs/INTERFACES.md) | Module APIs, extension points |
| [docs/RUNBOOK.md](docs/RUNBOOK.md) | Deployment, common issues |
| [docs/VERSIONING.md](docs/VERSIONING.md) | Version strategy, release process |