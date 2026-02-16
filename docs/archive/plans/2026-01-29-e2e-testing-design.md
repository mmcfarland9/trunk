# E2E Testing Design: Playwright (Web) + Maestro (iOS)

**Date:** 2026-01-29
**Status:** Ready for implementation

---

## Overview

End-to-end tests for both web and iOS platforms, designed to:
- Catch regressions on code changes
- Verify cross-platform parity
- Document and validate core user journeys

---

## Directory Structure

```
web/
├── e2e/                          # Playwright tests
│   ├── helpers.ts                # Shared utilities
│   ├── sprout-lifecycle.spec.ts
│   ├── resource-management.spec.ts
│   ├── navigation.spec.ts
│   └── data-portability.spec.ts

app/
├── .maestro/
│   └── flows/
│       ├── smoke-test.yaml       # Basic navigation (working)
│       ├── sprout-lifecycle.yaml
│       ├── resource-management.yaml
│       └── navigation.yaml

shared/
└── test-fixtures/
    └── baseline-state.json       # Known state for data portability tests
```

---

## Playwright (Web)

### Setup

Playwright MCP is installed for Claude Code:
```bash
claude mcp add playwright -- npx @playwright/mcp@latest
```

Dev server runs on `http://localhost:5173`.

### Key Patterns

**Keyboard navigation is more reliable than clicking animated elements:**
```typescript
// Wind animation makes branch nodes "unstable" for clicks
await page.keyboard.press('1')  // Branch 1
await page.keyboard.press('1')  // Twig 1
```

**Form interactions:**
```typescript
await page.getByRole('textbox', { name: 'Describe this sprout' }).fill('Run 3x per week')
await page.getByRole('button', { name: '1m' }).click()
await page.getByRole('button', { name: 'Firm' }).click()
```

**Required fields for planting a sprout:**
1. Title (sprout description)
2. Season (2w, 1m, 3m, 6m, 1y)
3. Environment (Fertile, Firm, Barren)
4. If creating new leaf: leaf name is required
5. All three bloom descriptions (wither, budding, flourish)

**Assertions:**
```typescript
await expect(page.getByText('Growing (1)')).toBeVisible()
await expect(page.getByText('5.00/10.00')).toBeVisible()  // Soil after planting
```

### Learnings

- Accessibility snapshots work better than screenshots for element selection
- The Plant button stays disabled until ALL required fields are filled
- Leaf dropdown: selecting "+ Create new leaf" reveals a name field that must be filled

---

## Maestro (iOS)

### Prerequisites

```bash
# Install Maestro
curl -Ls "https://get.maestro.mobile.dev" | bash

# Install Java (required)
brew install openjdk
export PATH="/opt/homebrew/opt/openjdk/bin:$PATH"

# Add Maestro to PATH
export PATH="$PATH:$HOME/.maestro/bin"
```

### App Details

- **Bundle ID:** `mpmcf.Trunk`
- **Target Device:** iPhone 17

### Build & Install

```bash
# Build for simulator
cd app
xcodebuild -project Trunk.xcodeproj -scheme Trunk \
  -destination 'platform=iOS Simulator,name=iPhone 17' \
  -derivedDataPath build clean build

# Boot simulator
xcrun simctl boot "iPhone 17"
open -a Simulator

# Install app
xcrun simctl install booted build/Build/Products/Debug-iphonesimulator/Trunk.app
```

### Working Smoke Test

`app/.maestro/flows/smoke-test.yaml`:
```yaml
appId: mpmcf.Trunk
name: Smoke Test - Basic Navigation
---

# Launch the app (don't clear state - it corrupts SwiftData)
- launchApp:
    clearState: false

# Wait for app to fully load
- extendedWaitUntil:
    visible: "Today"
    timeout: 10000

# Navigate to Trunk tab
- tapOn: "Trunk"

# Verify we see branches
- assertVisible: "CORE"
- assertVisible: "BRAIN"

# Navigate to CORE branch
- tapOn: "CORE"

# Verify we see twigs
- assertVisible: "movement"
```

### Run Tests

```bash
export PATH="/opt/homebrew/opt/openjdk/bin:$PATH:$HOME/.maestro/bin"
export MAESTRO_CLI_NO_ANALYTICS=1
maestro test .maestro/flows/smoke-test.yaml
```

### Critical Learnings

1. **DO NOT use `clearState`** - It corrupts SwiftData database and causes crashes on next launch:
   ```
   Exception: _assertionFailure at TrunkApp.swift:26
   sharedModelContainer initialization fails
   ```

2. **Text matching is case-sensitive:**
   - Tab bar: `"Today"`, `"Trunk"` (title case)
   - Branch names: `"CORE"`, `"BRAIN"` (uppercase)
   - Twig names: `"movement"`, `"strength"` (lowercase)

3. **Debug artifacts location:** `~/.maestro/tests/YYYY-MM-DD_HHMMSS/`
   - Screenshots on failure
   - Command logs with UI hierarchy

4. **If app won't launch after corrupted state:**
   ```bash
   xcrun simctl uninstall booted mpmcf.Trunk
   xcrun simctl install booted build/Build/Products/Debug-iphonesimulator/Trunk.app
   ```

---

## Test Scenarios (Both Platforms)

### Sprout Lifecycle
1. Create sprout on empty twig
2. Water active sprout
3. Harvest ready sprout (result 4/5)
4. Harvest with minimum result (result 1/5)

### Resource Management
1. Deplete all water (3 uses)
2. Use weekly sun
3. Verify soil recovery after water/sun

### Navigation
1. Overview → Branch → Twig → back
2. Keyboard shortcuts (web only)
3. Tab switching (iOS only)

### Data Portability
1. Export → Import round-trip (same platform)
2. Cross-platform: iOS export → Web import
3. Cross-platform: Web export → iOS import

---

## Next Steps

When ready to implement:
1. Expand Playwright tests beyond the existing `sprout-lifecycle.spec.ts`
2. Add accessibility identifiers to iOS views for more reliable Maestro selection
3. Create `shared/test-fixtures/baseline-state.json` for data portability tests
4. Consider CI integration (GitHub Actions for web, Maestro Cloud for iOS)
