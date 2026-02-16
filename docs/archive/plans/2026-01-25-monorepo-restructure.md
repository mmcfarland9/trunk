# Monorepo Restructure Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Restructure the Trunk repository into a monorepo with separate web and iOS app folders, plus a shared specifications folder.

**Architecture:** Move all web app code to `./web/`, create `./shared/` for constants and schemas, set up skeleton `./app/` for future iOS development. Use `git mv` to preserve file history. Keep docs, CI/CD, and git at root level.

**Tech Stack:** Git, npm, TypeScript, Vite, JSON Schema

---

## Overview

**Current structure:**
```
trunk/
├── src/           → Move to web/src/
├── assets/        → Move to web/assets/
├── index.html     → Move to web/
├── package.json   → Move to web/
├── tsconfig.json  → Move to web/
├── docs/          → Stay at root
└── .github/       → Stay at root (update paths)
```

**Target structure:**
```
trunk/
├── web/           ← All current web app code
├── app/           ← iOS app (skeleton for now)
├── shared/        ← Constants, schemas, formulas
├── docs/          ← Stays at root
├── .github/       ← Stays at root (updated)
└── README.md      ← New monorepo overview
```

---

## Task 1: Create Directory Structure

**Files:**
- Create: `web/` (directory)
- Create: `app/` (directory)
- Create: `shared/` (directory)
- Create: `shared/schemas/` (directory)
- Create: `shared/assets/` (directory)

**Step 1: Create web directory**

Run:
```bash
mkdir web
```

Expected: Directory created successfully

**Step 2: Create app directory**

Run:
```bash
mkdir app
```

Expected: Directory created successfully

**Step 3: Create shared directory structure**

Run:
```bash
mkdir -p shared/schemas shared/assets
```

Expected: Directories created successfully

**Step 4: Verify structure**

Run:
```bash
ls -la | grep -E "^d.*web|app|shared"
```

Expected: Should see web/, app/, shared/ directories

**Step 5: Commit directory structure**

Run:
```bash
git add web/.gitkeep app/.gitkeep shared/.gitkeep || true
git commit --allow-empty -m "chore: create monorepo directory structure"
```

Expected: Commit created (empty commit if .gitkeep not needed)

---

## Task 2: Move Web App Files (Preserve Git History)

**Files:**
- Move: `src/` → `web/src/`
- Move: `assets/` → `web/assets/`
- Move: `index.html` → `web/index.html`
- Move: `package.json` → `web/package.json`
- Move: `package-lock.json` → `web/package-lock.json`
- Move: `tsconfig.json` → `web/tsconfig.json`
- Move: `vitest.config.ts` → `web/vitest.config.ts`
- Move: `dist/` → `web/dist/` (if exists)

**Step 1: Move source code**

Run:
```bash
git mv src web/
```

Expected: `src/` moved to `web/src/`, git tracks as rename

**Step 2: Move assets**

Run:
```bash
git mv assets web/
```

Expected: `assets/` moved to `web/assets/`, git tracks as rename

**Step 3: Move HTML entry point**

Run:
```bash
git mv index.html web/
```

Expected: `index.html` moved to `web/index.html`

**Step 4: Move package files**

Run:
```bash
git mv package.json web/
git mv package-lock.json web/
```

Expected: Both package files moved to `web/`

**Step 5: Move TypeScript config**

Run:
```bash
git mv tsconfig.json web/
```

Expected: `tsconfig.json` moved to `web/`

**Step 6: Move Vitest config**

Run:
```bash
git mv vitest.config.ts web/
```

Expected: `vitest.config.ts` moved to `web/`

**Step 7: Move dist if it exists**

Run:
```bash
if [ -d "dist" ]; then git mv dist web/; fi
```

Expected: `dist/` moved to `web/dist/` if it exists

**Step 8: Verify all files moved**

Run:
```bash
ls web/
```

Expected: Should see src/, assets/, index.html, package.json, package-lock.json, tsconfig.json, vitest.config.ts

**Step 9: Commit web app move**

Run:
```bash
git status
git commit -m "chore: move web app files to ./web folder

Preserves git history using git mv.
Web app now lives in ./web/ subdirectory."
```

Expected: Commit shows all moves as renames

---

## Task 3: Extract Shared Constants

**Files:**
- Create: `shared/constants.json`
- Reference: `web/src/constants.ts`
- Reference: `web/src/state.ts`

**Step 1: Create constants.json with extracted values**

Create `shared/constants.json`:
```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "Trunk Shared Constants",
  "description": "Constants shared between web and iOS apps",
  "soil": {
    "startingCapacity": 10,
    "maxCapacity": 100,
    "recoveryPerWater": 0.05,
    "recoveryPerSun": 0.35
  },
  "water": {
    "dailyCapacity": 3,
    "resetHour": 6
  },
  "sun": {
    "weeklyCapacity": 1,
    "resetHour": 6
  },
  "seasons": {
    "2w": {
      "label": "2 weeks",
      "durationDays": 14,
      "baseCost": 2,
      "baseReward": 0.8
    },
    "1m": {
      "label": "1 month",
      "durationDays": 30,
      "baseCost": 3,
      "baseReward": 1.5
    },
    "3m": {
      "label": "3 months",
      "durationDays": 90,
      "baseCost": 5,
      "baseReward": 3.0
    },
    "6m": {
      "label": "6 months",
      "durationDays": 180,
      "baseCost": 8,
      "baseReward": 5.0
    },
    "1y": {
      "label": "1 year",
      "durationDays": 365,
      "baseCost": 12,
      "baseReward": 8.0
    }
  },
  "environments": {
    "fertile": {
      "label": "Fertile",
      "costMultiplier": 1.0,
      "rewardMultiplier": 1.1
    },
    "firm": {
      "label": "Firm",
      "costMultiplier": 1.5,
      "rewardMultiplier": 1.75
    },
    "barren": {
      "label": "Barren",
      "costMultiplier": 2.0,
      "rewardMultiplier": 2.4
    }
  },
  "results": {
    "1": { "multiplier": 0.4 },
    "2": { "multiplier": 0.55 },
    "3": { "multiplier": 0.7 },
    "4": { "multiplier": 0.85 },
    "5": { "multiplier": 1.0 }
  },
  "tree": {
    "branchCount": 8,
    "twigCount": 8
  },
  "storage": {
    "nodeDataKey": "trunk-notes-v1",
    "resourcesKey": "trunk-resources-v1",
    "notificationsKey": "trunk-notifications-v1",
    "lastExportKey": "trunk-last-export"
  }
}
```

**Step 2: Verify JSON is valid**

Run:
```bash
cat shared/constants.json | python3 -m json.tool > /dev/null && echo "Valid JSON"
```

Expected: "Valid JSON"

**Step 3: Commit shared constants**

Run:
```bash
git add shared/constants.json
git commit -m "feat: extract shared constants to JSON

Constants now live in shared/constants.json for use by both
web and iOS apps. Includes soil, water, sun, seasons,
environments, results, tree structure, and storage keys."
```

Expected: Commit created with new file

---

## Task 4: Create Data Schemas

**Files:**
- Create: `shared/schemas/sprout.schema.json`
- Create: `shared/schemas/leaf.schema.json`
- Create: `shared/schemas/node-data.schema.json`

**Step 1: Create sprout schema**

Create `shared/schemas/sprout.schema.json`:
```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "Sprout",
  "description": "A goal being cultivated on the tree",
  "type": "object",
  "properties": {
    "id": {
      "type": "string",
      "description": "Unique identifier"
    },
    "title": {
      "type": "string",
      "description": "Goal description"
    },
    "season": {
      "type": "string",
      "enum": ["2w", "1m", "3m", "6m", "1y"],
      "description": "Time commitment duration"
    },
    "environment": {
      "type": "string",
      "enum": ["fertile", "firm", "barren"],
      "description": "Difficulty level"
    },
    "state": {
      "type": "string",
      "enum": ["draft", "active", "completed", "failed"],
      "description": "Current lifecycle state"
    },
    "soilCost": {
      "type": "number",
      "minimum": 0,
      "description": "Soil capacity spent to plant this sprout"
    },
    "result": {
      "type": "number",
      "minimum": 1,
      "maximum": 5,
      "description": "Outcome rating (1-5) when harvested"
    },
    "leafId": {
      "type": "string",
      "description": "ID of leaf (saga) this sprout belongs to"
    },
    "plantedAt": {
      "type": "string",
      "format": "date-time",
      "description": "ISO timestamp when sprout was planted"
    },
    "harvestedAt": {
      "type": "string",
      "format": "date-time",
      "description": "ISO timestamp when sprout was harvested"
    },
    "createdAt": {
      "type": "string",
      "format": "date-time",
      "description": "ISO timestamp when sprout was created as draft"
    },
    "bloom1": { "type": "string" },
    "bloom3": { "type": "string" },
    "bloom5": { "type": "string" },
    "waterEntries": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "timestamp": { "type": "string", "format": "date-time" },
          "note": { "type": "string" }
        },
        "required": ["timestamp"]
      }
    }
  },
  "required": ["id", "title", "season", "environment", "state", "soilCost"]
}
```

**Step 2: Create leaf schema**

Create `shared/schemas/leaf.schema.json`:
```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "Leaf",
  "description": "A saga (trajectory) of related sprouts",
  "type": "object",
  "properties": {
    "id": {
      "type": "string",
      "description": "Unique identifier"
    },
    "name": {
      "type": "string",
      "description": "User-provided name for the saga"
    },
    "createdAt": {
      "type": "string",
      "format": "date-time",
      "description": "ISO timestamp when leaf was created"
    }
  },
  "required": ["id", "name", "createdAt"]
}
```

**Step 3: Create node-data schema**

Create `shared/schemas/node-data.schema.json`:
```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "NodeData",
  "description": "Data for a node (trunk, branch, or twig)",
  "type": "object",
  "properties": {
    "label": {
      "type": "string",
      "description": "User-customized label for this node"
    },
    "note": {
      "type": "string",
      "description": "User notes for this node"
    },
    "sprouts": {
      "type": "array",
      "items": { "$ref": "sprout.schema.json" },
      "description": "Goals cultivated on this node (twigs only)"
    },
    "leaves": {
      "type": "array",
      "items": { "$ref": "leaf.schema.json" },
      "description": "Sagas on this node (twigs only)"
    }
  },
  "required": ["label", "note"]
}
```

**Step 4: Validate schemas**

Run:
```bash
for file in shared/schemas/*.json; do
  cat "$file" | python3 -m json.tool > /dev/null && echo "✓ $file valid"
done
```

Expected: All schemas validate

**Step 5: Commit schemas**

Run:
```bash
git add shared/schemas/
git commit -m "feat: add JSON schemas for data structures

Defines Sprout, Leaf, and NodeData schemas for validation
and type generation in both web and iOS apps."
```

Expected: Commit created with 3 new schema files

---

## Task 5: Move Preset Map to Shared

**Files:**
- Move: `web/assets/trunk-map-preset.json` → `shared/assets/trunk-map-preset.json`
- Modify: `web/src/state.ts:3`

**Step 1: Move preset file**

Run:
```bash
git mv web/assets/trunk-map-preset.json shared/assets/
```

Expected: File moved, git tracks as rename

**Step 2: Update import in state.ts**

Edit `web/src/state.ts` line 3:

Before:
```typescript
import presetData from '../assets/trunk-map-preset.json'
```

After:
```typescript
import presetData from '../../shared/assets/trunk-map-preset.json'
```

**Step 3: Verify import still works**

Run:
```bash
cd web && npm install && npm run build
```

Expected: Build succeeds with no import errors

**Step 4: Commit preset move**

Run:
```bash
git add web/src/state.ts shared/assets/trunk-map-preset.json
git commit -m "chore: move trunk-map-preset to shared assets

Default branch/twig labels now in shared/ for use by both
web and iOS apps."
```

Expected: Commit shows file move and import update

---

## Task 6: Create Shared Formulas Documentation

**Files:**
- Create: `shared/formulas.md`

**Step 1: Create formulas documentation**

Create `shared/formulas.md`:
```markdown
# Trunk Progression System Formulas

This document defines the mathematical formulas that govern the Trunk progression system. Both web and iOS apps must implement these formulas identically to ensure consistent behavior.

## Constants

See `constants.json` for all numeric constants referenced below.

---

## Soil Cost Calculation

Determines how much soil capacity is required to plant a sprout.

**Formula:**
```
soilCost = baseCost × environmentMultiplier
```

**Where:**
- `baseCost` = `constants.seasons[season].baseCost`
- `environmentMultiplier` = `constants.environments[environment].costMultiplier`

**Example:**
- 3-month sprout in firm environment: `5 × 1.5 = 7.5` → rounds to 8

**Implementation note:** Always round up (ceiling) the final result.

---

## Capacity Reward Calculation

Determines how much permanent soil capacity is gained when harvesting a sprout.

**Formula:**
```
reward = baseReward × envMultiplier × resultMultiplier × diminishingFactor
```

**Where:**
- `baseReward` = `constants.seasons[season].baseReward`
- `envMultiplier` = `constants.environments[environment].rewardMultiplier`
- `resultMultiplier` = `constants.results[result].multiplier`
- `diminishingFactor` = `max(0, (1 - currentCapacity / maxCapacity)^1.5)`

**Diminishing Returns:**
The `^1.5` exponent provides more generous early growth while still slowing significantly as you approach max capacity (100).

**Example:**
- 6-month sprout, barren environment, result=5, current capacity=50:
  - `baseReward = 5.0`
  - `envMultiplier = 2.4`
  - `resultMultiplier = 1.0`
  - `diminishingFactor = (1 - 50/100)^1.5 = 0.5^1.5 ≈ 0.3536`
  - `reward = 5.0 × 2.4 × 1.0 × 0.3536 ≈ 4.24`

**Implementation note:** Do NOT round - keep decimal precision for soil capacity.

---

## Soil Recovery

Soil capacity slowly recovers through regular activities.

**Water Recovery:**
- Gain: `+0.05` soil capacity per sprout watered
- Max per day: `3 waters × 0.05 = 0.15` capacity
- Max per week: `≈1.05` capacity

**Sun Recovery:**
- Gain: `+0.35` soil capacity per twig shone
- Frequency: Once per week per twig

**Total weekly recovery** (if watering daily and shining once):
- Water: `≈1.05`
- Sun: `0.35`
- **Total: ≈1.4 soil capacity per week**

---

## Water & Sun Reset Times

Both water and sun reset at **6:00 AM local time**.

**Water:** Resets daily at 6:00 AM
- Capacity goes back to 3
- Previous day's water entries remain in history

**Sun:** Resets weekly on Monday at 6:00 AM
- Capacity goes back to 1
- Previous week's sun entries remain in history

**Implementation note:** Use ISO week calculation (Monday = week start). Compare week numbers, not day counts.

---

## Progression Curve

Starting capacity: 10
Maximum capacity: 100

**Early game (0-30 capacity):**
- Diminishing factor ≈ 0.7-1.0
- Near-full rewards
- Rapid growth

**Mid game (30-70 capacity):**
- Diminishing factor ≈ 0.3-0.7
- Moderate growth slowdown

**Late game (70-100 capacity):**
- Diminishing factor ≈ 0.0-0.3
- Significant slowdown
- Approaching max capacity asymptotically

**Time to max capacity:** ~20 years of consistent effort (by design).

See `docs/progression-system.md` for detailed projection tables.

---

## Implementation Checklist

For each platform, verify:
- [ ] Soil cost calculation matches formula exactly
- [ ] Capacity reward calculation matches formula exactly
- [ ] Diminishing returns uses exponent 1.5 (not 2.0)
- [ ] Soil recovery rates match constants
- [ ] Water/sun reset at 6:00 AM local time
- [ ] Week calculation uses ISO weeks (Monday start)
- [ ] All numeric constants imported from `constants.json`

---

## Testing

Both platforms should pass identical test cases:

```
Input: 3m season, firm environment, result=4, currentCapacity=50
Expected: soilCost=8, reward≈3.18

Input: 1y season, barren environment, result=5, currentCapacity=90
Expected: soilCost=24, reward≈2.15
```
```

**Step 2: Commit formulas documentation**

Run:
```bash
git add shared/formulas.md
git commit -m "docs: add progression system formulas

Mathematical specifications for both web and iOS to implement
identically. Covers soil costs, capacity rewards, diminishing
returns, and recovery rates."
```

Expected: Commit created with formulas.md

---

## Task 7: Create Shared README

**Files:**
- Create: `shared/README.md`

**Step 1: Create shared README**

Create `shared/README.md`:
```markdown
# Shared Specifications

This folder contains platform-agnostic specifications shared between the web app (`../web`) and iOS app (`../app`).

## Contents

### `constants.json`
Numeric constants, enums, and configuration values used by both platforms.

**Usage (Web):**
```typescript
import constants from '../shared/constants.json'
const maxSoil = constants.soil.maxCapacity
```

**Usage (iOS):**
```swift
// Parse JSON or generate Swift constants from this file
struct Constants {
    static let maxSoilCapacity = 100
}
```

### `schemas/`
JSON Schema definitions for data structures (Sprout, Leaf, NodeData).

**Purpose:**
- Validation of imported/exported data
- Type generation for TypeScript (web)
- Type generation for Swift (iOS)
- Contract between platforms

**Usage (Web):**
```typescript
// Types already exist in src/types.ts
// Use schemas for validation during import
```

**Usage (iOS):**
```swift
// Generate Swift types from schemas using tools like:
// - quicktype
// - JSONSchema2Swift
```

### `assets/trunk-map-preset.json`
Default labels for branches and twigs.

**Structure:**
```json
{
  "trunk": { "label": "My Life", "branches": [...] },
  "branches": [
    {
      "defaultLabel": "Health",
      "twigs": [
        { "defaultLabel": "Movement" },
        { "defaultLabel": "Nutrition" },
        ...
      ]
    },
    ...
  ]
}
```

### `formulas.md`
Mathematical specifications for the progression system.

**Critical for consistency:**
Both platforms MUST implement these formulas identically to ensure users have the same experience regardless of platform.

## Guidelines

### Adding New Constants

1. Add to `constants.json`
2. Update this README with usage examples
3. Update both web and iOS implementations
4. Add test cases to verify consistency

### Modifying Schemas

1. Update the schema file
2. Bump schema version if breaking change
3. Update data migrations in both platforms
4. Test import/export compatibility

### Changing Formulas

1. Update `formulas.md`
2. Add rationale and migration notes
3. Update both platforms
4. Run cross-platform validation tests

## Validation

To ensure cross-platform consistency:

1. Both platforms should import the same `constants.json`
2. Both platforms should validate data against the same schemas
3. Both platforms should produce identical outputs for the same inputs

Example test case:
```
Input: 3m season, firm environment, result=4, currentCapacity=50
Expected: soilCost=8, capacityReward≈3.18
```

Both web and iOS should pass this test.
```

**Step 2: Commit shared README**

Run:
```bash
git add shared/README.md
git commit -m "docs: add shared folder README

Explains purpose of shared/ and how both platforms use
constants, schemas, assets, and formulas."
```

Expected: Commit created

---

## Task 8: Update Web TypeScript Config

**Files:**
- Modify: `web/tsconfig.json`

**Step 1: Add path alias for shared**

Edit `web/tsconfig.json`, add to `compilerOptions`:

```json
{
  "compilerOptions": {
    // ... existing options ...
    "paths": {
      "@shared/*": ["../shared/*"]
    }
  },
  "include": ["src"]
}
```

**Step 2: Verify TypeScript recognizes alias**

Run:
```bash
cd web && npx tsc --noEmit
```

Expected: No type errors related to shared imports

**Step 3: Commit tsconfig update**

Run:
```bash
git add web/tsconfig.json
git commit -m "chore: add @shared path alias to TypeScript config

Web app can now import from @shared/* for shared constants
and schemas."
```

Expected: Commit created

---

## Task 9: Update Web Vitest Config

**Files:**
- Modify: `web/vitest.config.ts`

**Step 1: Add resolve alias**

Edit `web/vitest.config.ts`:

```typescript
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'jsdom',
    setupFiles: './src/tests/setup.ts'
  },
  resolve: {
    alias: {
      '@shared': new URL('../shared', import.meta.url).pathname
    }
  }
})
```

**Step 2: Verify tests can import shared**

Run:
```bash
cd web && npm test
```

Expected: All tests pass (64 tests)

**Step 3: Commit vitest config update**

Run:
```bash
git add web/vitest.config.ts
git commit -m "chore: add @shared alias to Vitest config

Tests can now import shared constants and schemas."
```

Expected: Commit created

---

## Task 10: Update GitHub Actions Workflows

**Files:**
- Modify: `.github/workflows/claude.yml`
- Modify: `.github/workflows/claude-code-review.yml`

**Step 1: Update claude.yml paths**

Edit `.github/workflows/claude.yml`, update checkout step (no changes needed - already has fetch-depth: 1)

Note: GitHub Actions run from repository root, so no path changes needed. Claude Code action will see the monorepo structure.

**Step 2: Add comment about monorepo**

Add comment at top of `.github/workflows/claude.yml`:

```yaml
# Monorepo structure: web app lives in ./web/, iOS app in ./app/
name: Claude Code
# ... rest of file unchanged
```

**Step 3: Repeat for claude-code-review.yml**

Add same comment to `.github/workflows/claude-code-review.yml`

**Step 4: Commit workflow updates**

Run:
```bash
git add .github/workflows/
git commit -m "docs: add monorepo comments to GitHub workflows

Note that web app is now in ./web/ subdirectory."
```

Expected: Commit created

---

## Task 11: Update Root .gitignore

**Files:**
- Modify: `.gitignore`

**Step 1: Add iOS-specific ignores**

Add to `.gitignore`:

```gitignore
# Existing content stays...

# iOS
*.xcodeproj/xcuserdata/
*.xcworkspace/xcuserdata/
*.xcodeproj/project.xcworkspace/xcuserdata/
DerivedData/
*.pbxuser
*.mode1v3
*.mode2v3
*.perspectivev3
*.ipa
*.dSYM.zip
*.dSYM

# Xcode
build/
*.moved-aside

# CocoaPods (if used)
Pods/

# Swift Package Manager (if used)
.swiftpm/
```

**Step 2: Commit updated gitignore**

Run:
```bash
git add .gitignore
git commit -m "chore: add iOS-specific entries to .gitignore

Ignores Xcode user data, build artifacts, and dependencies."
```

Expected: Commit created

---

## Task 12: Create Root README

**Files:**
- Create: `README.md`

**Step 1: Create monorepo README**

Create `README.md`:

```markdown
# Trunk

**Reap what you sow**

A personal growth and goal-tracking application built around gardening metaphors. Cultivate "sprouts" (goals) on a visual tree structure, nurturing them with daily attention ("water") and weekly reflection ("sun") to grow your capacity over time.

## Monorepo Structure

```
trunk/
├── web/           # Web application (Vite + TypeScript)
├── app/           # iOS application (Swift + SwiftUI)
├── shared/        # Shared constants, schemas, and specifications
└── docs/          # Documentation and planning
```

## Projects

### Web App (`./web`)

Vite-based web application running on modern browsers.

**Development:**
```bash
cd web
npm install
npm run dev
```

**Build:**
```bash
cd web
npm run build
```

**Test:**
```bash
cd web
npm test
```

See [web/README.md](./web/README.md) for details.

### iOS App (`./app`)

Native iOS application built with Swift and SwiftUI.

**Status:** In development

See [app/README.md](./app/README.md) for details.

### Shared Specs (`./shared`)

Platform-agnostic constants, data schemas, and formulas.

See [shared/README.md](./shared/README.md) for details.

## Philosophy

Growth is slow, deliberate, and intrinsically rewarding—like cultivating a bonsai tree. The system rewards patience, commitment, and honest effort over decades, not sprints.

## Documentation

- [Progression System](./docs/progression-system.md) - Mathematical formulas and growth curves
- [Planning Documents](./docs/plans/) - Implementation plans and design docs
- [CLAUDE.md](./CLAUDE.md) - AI assistant instructions
- [AGENTS.md](./AGENTS.md) - Agent documentation

## Contributing

See individual project READMEs for development workflows.

## License

Private project - All rights reserved
```

**Step 2: Commit root README**

Run:
```bash
git add README.md
git commit -m "docs: create monorepo README

Explains project structure and how to work with web and iOS
apps in the monorepo."
```

Expected: Commit created

---

## Task 13: Create Web README

**Files:**
- Create: `web/README.md`

**Step 1: Create web-specific README**

Create `web/README.md`:

```markdown
# Trunk Web App

Vite-based web application for Trunk personal growth tracking.

## Development

**Install dependencies:**
```bash
npm install
```

**Run dev server:**
```bash
npm run dev
```

Visit http://localhost:5173

**Run tests:**
```bash
npm test           # Run once
npm run test:watch # Watch mode
```

**Build for production:**
```bash
npm run build
```

**Preview production build:**
```bash
npm run preview
```

## Project Structure

```
web/
├── src/
│   ├── main.ts              # Entry point
│   ├── constants.ts         # Web-specific constants
│   ├── state.ts             # Global state management
│   ├── types.ts             # TypeScript types
│   ├── features/            # Feature modules
│   ├── ui/                  # UI components
│   ├── utils/               # Utility functions
│   └── tests/               # Test files
├── assets/                  # Static assets
├── index.html               # HTML entry point
├── package.json             # Dependencies
├── tsconfig.json            # TypeScript config
└── vitest.config.ts         # Test config
```

## Shared Dependencies

This web app imports shared constants and schemas from `../shared/`:

```typescript
import constants from '@shared/constants.json'
```

See [../shared/README.md](../shared/README.md) for details.

## Tech Stack

- **Build Tool:** Vite (using Rolldown variant)
- **Language:** TypeScript (strict mode)
- **Testing:** Vitest + jsdom
- **Storage:** localStorage

## Key Features

- Tree-based life organization (8 branches × 8 twigs)
- Sprout (goal) cultivation with seasons and environments
- Daily watering and weekly sun reflection
- Progressive soil capacity growth system
- Import/export for data backup

## Code Style

- Indentation: 2 spaces
- Files: kebab-case.ts
- Exports: camelCase
- CSS: kebab-case with .is-* state modifiers

## TypeScript

Strict mode enabled:
- noUnusedLocals
- noUnusedParameters
- Target: ES2022
```

**Step 2: Commit web README**

Run:
```bash
git add web/README.md
git commit -m "docs: create web app README

Development instructions and project structure for web app."
```

Expected: Commit created

---

## Task 14: Create iOS App Skeleton

**Files:**
- Create: `app/README.md`

**Step 1: Create iOS README**

Create `app/README.md`:

```markdown
# Trunk iOS App

Native iOS application for Trunk personal growth tracking.

**Status:** Initial setup - development not started

## Planned Structure

```
app/
├── Trunk.xcodeproj/         # Xcode project
├── Trunk/                   # App source code
│   ├── TrunkApp.swift       # App entry point
│   ├── Models/              # Data models
│   ├── Views/               # SwiftUI views
│   ├── ViewModels/          # MVVM view models
│   ├── Services/            # Business logic
│   └── Resources/           # Assets, constants
├── TrunkTests/              # Unit tests
└── TrunkUITests/            # UI tests
```

## Shared Dependencies

The iOS app will use shared specifications from `../shared/`:

- `constants.json` - Numeric constants and configuration
- `schemas/*.schema.json` - Data structure contracts
- `formulas.md` - Progression system formulas
- `assets/trunk-map-preset.json` - Default tree labels

Constants will be parsed from JSON or generated as Swift code.

## Tech Stack (Planned)

- **Language:** Swift
- **UI Framework:** SwiftUI
- **Architecture:** MVVM
- **Storage:** SwiftData or CoreData
- **Minimum iOS:** 17.0

## Design Principles

**Touch-first:** No hover effects, large tap targets, swipe gestures

**Feature parity:** Match web app features but optimize for mobile UX:
- Tree navigation optimized for smaller screens
- Simplified menus for tap interaction
- Native iOS patterns (sheets, navigation, etc.)

**Offline-first:** All data stored locally, no cloud sync initially

## Development

Not yet started. When ready:

1. Create Xcode project
2. Set up folder structure
3. Generate Swift types from JSON schemas
4. Implement progression system (verify against formulas.md)
5. Build UI layer

## Testing

Cross-platform validation tests will ensure iOS matches web behavior:

```
Input: 3m season, firm environment, result=4, currentCapacity=50
Expected: soilCost=8, capacityReward≈3.18
```

Both platforms must produce identical results.
```

**Step 2: Commit iOS README**

Run:
```bash
git add app/README.md
git commit -m "docs: create iOS app README

Skeleton documentation for future iOS development.
Explains planned structure and shared dependencies."
```

Expected: Commit created

---

## Task 15: Update CLAUDE.md for Monorepo

**Files:**
- Modify: `CLAUDE.md`

**Step 1: Add monorepo section to CLAUDE.md**

Add at the very beginning of `CLAUDE.md` (after the title):

```markdown
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

---

## Build Commands (Web App)

```bash
cd web
npm run dev      # Start Vite development server
npm run build    # Compile TypeScript and build for production
npm run preview  # Preview production build locally
```

[Rest of CLAUDE.md continues unchanged...]
```

**Step 2: Commit CLAUDE.md update**

Run:
```bash
git add CLAUDE.md
git commit -m "docs: update CLAUDE.md for monorepo structure

Add monorepo navigation guidance for AI assistants."
```

Expected: Commit created

---

## Task 16: Verify Web App Still Works

**Files:**
- Test: All web app functionality

**Step 1: Install dependencies**

Run:
```bash
cd web && npm install
```

Expected: Dependencies install successfully

**Step 2: Run tests**

Run:
```bash
npm test
```

Expected: All 64 tests pass

**Step 3: Build production**

Run:
```bash
npm run build
```

Expected: Build succeeds, creates dist/ folder

**Step 4: Start dev server**

Run:
```bash
npm run dev
```

Expected: Server starts on http://localhost:5173

**Step 5: Manual smoke test**

Open browser, verify:
- [ ] Tree structure displays
- [ ] Can click branches to zoom in
- [ ] Can create sprouts
- [ ] Can water sprouts
- [ ] Import/export works

**Step 6: Stop dev server**

Press Ctrl+C

Expected: Server stops cleanly

**Step 7: Return to root**

Run:
```bash
cd ..
```

Expected: Back at monorepo root

---

## Task 17: Final Verification and Commit

**Files:**
- Verify: Entire monorepo structure

**Step 1: Check git status**

Run:
```bash
git status
```

Expected: Working tree clean (all changes committed)

**Step 2: Verify directory structure**

Run:
```bash
tree -L 2 -I 'node_modules|dist|.git' .
```

Expected output:
```
.
├── app
│   └── README.md
├── docs
│   ├── future-ideas-archive.md
│   ├── getting-started-plan.md
│   ├── plans
│   └── progression-system.md
├── shared
│   ├── README.md
│   ├── assets
│   ├── constants.json
│   ├── formulas.md
│   └── schemas
├── web
│   ├── README.md
│   ├── assets
│   ├── index.html
│   ├── package-lock.json
│   ├── package.json
│   ├── src
│   ├── tsconfig.json
│   └── vitest.config.ts
├── AGENTS.md
├── CLAUDE.md
├── README.md
└── .github
```

**Step 3: Verify all tests still pass**

Run:
```bash
cd web && npm test && cd ..
```

Expected: All 64 tests pass

**Step 4: Check git log**

Run:
```bash
git log --oneline -20
```

Expected: See all commits from this plan

**Step 5: Create completion marker**

Run:
```bash
git tag -a monorepo-v1 -m "Monorepo restructure complete

- Web app moved to ./web/
- Shared specs in ./shared/
- iOS skeleton in ./app/
- All tests passing"
```

Expected: Tag created

---

## Verification Checklist

After completing all tasks, verify:

- [ ] All web app files in `web/` directory
- [ ] Shared constants in `shared/constants.json`
- [ ] Schemas in `shared/schemas/`
- [ ] Formulas documented in `shared/formulas.md`
- [ ] Preset map in `shared/assets/`
- [ ] iOS skeleton in `app/`
- [ ] Root README explains monorepo
- [ ] Each subfolder has README
- [ ] CLAUDE.md updated for monorepo
- [ ] .gitignore includes iOS entries
- [ ] GitHub workflows documented
- [ ] All 64 tests pass
- [ ] Web app builds successfully
- [ ] Git history preserved (files show as renames)
- [ ] No broken imports
- [ ] TypeScript compiles with no errors

---

## Next Steps

After this restructure is complete:

1. **Web development continues** in `./web/` folder
2. **iOS development begins** by creating Xcode project in `./app/`
3. **Shared specs evolve** as both platforms need new constants or schemas

**To start iOS development:**
1. Open Xcode
2. Create new SwiftUI App project in `app/` folder
3. Set up folder structure (Models, Views, ViewModels, Services)
4. Generate Swift types from JSON schemas
5. Implement progression system (validate against `shared/formulas.md`)

See `app/README.md` for detailed iOS setup plan.
