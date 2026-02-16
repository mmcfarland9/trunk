# CSS/JS Refactor Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Delete dead code and restructure CSS/JS into clean, minimal, maintainable system

**Architecture:** Split monolithic files into logical components, expand design tokens, add smoke tests

**Tech Stack:** Vanilla TypeScript, Vite, no framework

---

## Baseline (recorded)

- **Total LOC:** ~12,000 lines
- **CSS:** 62.35 kB (10.37 kB gzipped)
- **JS:** 152.39 kB (34.30 kB gzipped)
- **Files:** 19 source files

---

## Phase 1: Dead Code Identification

### Task 1: Audit CSS selectors

**Files:**
- Analyze: `src/styles/components.css`
- Analyze: `src/styles/layout.css`
- Analyze: `src/styles/base.css`

**Steps:**
1. Extract all CSS selectors from stylesheets
2. Search for each selector in HTML templates and JS class toggles
3. Mark selectors as used/unused
4. Document findings

---

### Task 2: Audit JS exports and functions

**Files:**
- Analyze: `src/ui/dom-builder.ts`
- Analyze: `src/main.ts`
- Analyze: `src/features/*.ts`

**Steps:**
1. List all exported functions
2. Trace imports and usage
3. Identify dead code paths
4. Document findings

---

## Phase 2: Deletion Pass

### Task 3: Remove unused CSS

**Files:**
- Modify: `src/styles/components.css`

**Steps:**
1. Delete unused selectors identified in Task 1
2. Run build to verify no errors
3. Commit: `refactor: remove unused CSS selectors`

---

### Task 4: Remove unused JS

**Files:**
- Modify: identified files from Task 2

**Steps:**
1. Delete unused functions and exports
2. Run build to verify no errors
3. Commit: `refactor: remove unused JS code`

---

## Phase 3: CSS Restructure

### Task 5: Extract and expand tokens

**Files:**
- Create: `src/styles/tokens.css`
- Create: `src/styles/reset.css`
- Modify: `src/styles/base.css` (delete, content moved)

**Steps:**
1. Create tokens.css with all design tokens (colors, spacing, typography, borders, shadows)
2. Create reset.css with box-sizing and body reset
3. Update index.css imports
4. Run build to verify
5. Commit: `refactor: extract tokens and reset CSS`

---

### Task 6: Split components.css into logical files

**Files:**
- Create: `src/styles/buttons.css`
- Create: `src/styles/cards.css`
- Create: `src/styles/dialogs.css`
- Create: `src/styles/sidebar.css`
- Create: `src/styles/meters.css`
- Modify: `src/styles/components.css` (delete after split)

**Steps:**
1. Extract button styles to buttons.css
2. Extract card/folder styles to cards.css
3. Extract dialog styles to dialogs.css
4. Extract sidebar styles to sidebar.css
5. Extract meter styles to meters.css
6. Update index.css imports
7. Delete components.css
8. Run build to verify
9. Commit: `refactor: split components.css into logical files`

---

### Task 7: Consolidate and rename for consistency

**Files:**
- Modify: all new CSS files

**Steps:**
1. Establish naming convention (BEM-lite: `component-element` with `.is-state` modifiers)
2. Rename inconsistent classes
3. Update JS references to renamed classes
4. Consolidate duplicate rules
5. Replace magic numbers with tokens
6. Run build to verify
7. Commit: `refactor: consolidate CSS and apply consistent naming`

---

## Phase 4: JS Restructure

### Task 8: Split dom-builder.ts

**Files:**
- Create: `src/ui/shell.ts`
- Create: `src/ui/sidebar.ts`
- Create: `src/ui/map-canvas.ts`
- Create: `src/ui/dialogs.ts`
- Modify: `src/ui/dom-builder.ts` (slim down to orchestrator)

**Steps:**
1. Extract header/body/logo creation to shell.ts
2. Extract side panel creation to sidebar.ts
3. Extract canvas/branch group creation to map-canvas.ts
4. Extract dialog DOM creation to dialogs.ts
5. Update dom-builder.ts to import and compose
6. Run build to verify
7. Commit: `refactor: split dom-builder into component modules`

---

### Task 9: Extract dialog logic from main.ts

**Files:**
- Create: `src/features/water-dialog.ts`
- Create: `src/features/shine-dialog.ts`
- Create: `src/features/sprouts-dialog.ts`
- Modify: `src/main.ts`

**Steps:**
1. Extract water dialog state and handlers to water-dialog.ts
2. Extract shine dialog state and handlers to shine-dialog.ts
3. Extract sprouts dialog logic to sprouts-dialog.ts
4. Update main.ts to import and initialize
5. Run build to verify
6. Commit: `refactor: extract dialog logic from main.ts`

---

### Task 10: Clean up remaining files

**Files:**
- Modify: `src/ui/twig-view.ts`
- Modify: `src/features/progress.ts`

**Steps:**
1. Remove any dead code
2. Consolidate duplicate logic
3. Improve clarity (early returns, small helpers)
4. Run build to verify
5. Commit: `refactor: clean up twig-view and progress modules`

---

## Phase 5: Verification

### Task 11: Create smoke tests

**Files:**
- Create: `src/tests/smoke.test.ts`
- Modify: `package.json` (add test script if needed)

**Steps:**
1. Install vitest if not present
2. Create smoke test that:
   - Initializes app
   - Asserts critical DOM elements exist (header, canvas, sidebar, dialogs)
   - Asserts no console errors
3. Run tests
4. Commit: `test: add smoke tests for critical DOM elements`

---

### Task 12: Final verification and metrics

**Steps:**
1. Run full build
2. Compare before/after metrics:
   - File count
   - Total LOC
   - Bundle sizes
3. Manual verification of key states:
   - Overview mode
   - Branch view
   - Twig view with sprouts
   - Water/Shine dialogs
   - Responsive breakpoints
4. Document results

---

## Success Criteria

- [ ] All unused code removed
- [ ] CSS split into 8+ logical files
- [ ] dom-builder.ts under 300 lines
- [ ] main.ts under 300 lines
- [ ] Smoke tests passing
- [ ] No visual/behavioral regressions
- [ ] Bundle size same or smaller
