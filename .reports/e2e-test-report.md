# E2E Test Report

**Generated:** 2026-01-31
**Status:** ALL TESTS PASSING

## Summary

| Metric | Value |
|--------|-------|
| Total Tests | 44 |
| Passed | 44 (100%) |
| Failed | 0 |
| Duration | ~27s |

## Test Suites

### Navigation (12 tests)
- ✅ Starts in overview mode
- ✅ Clicks branch to enter branch view
- ✅ Clicks twig to enter twig view
- ✅ Escape returns from twig to branch view
- ✅ Escape returns from branch to overview
- ✅ Number key 1 jumps to branch 1
- ✅ Arrow keys cycle branches
- ✅ Hover on branch triggers sidebar update
- ✅ Trunk node always visible
- ✅ Double escape returns to overview
- ✅ Clicking trunk returns to overview

### Sprout Lifecycle (3 tests)
- ✅ Creating sprout goes directly to ACTIVE
- ✅ Harvesting with result 1 sets state to COMPLETED
- ✅ Harvesting with result 5 sets state to COMPLETED

### Resource Management (5 tests)
- ✅ Displays initial soil capacity of 10
- ✅ Displays initial water capacity of 3
- ✅ Displays initial sun capacity of 1
- ✅ Soil decreases when planting sprout
- ✅ Cannot plant when insufficient soil

### Data Portability (7 tests)
- ✅ Export creates downloadable JSON
- ✅ Export contains all expected data
- ✅ Import accepts valid JSON
- ✅ Import rejects invalid JSON
- ✅ Data persists across page refresh
- ✅ localStorage contains expected keys

### Accessibility (11 tests)
- ✅ No critical accessibility violations
- ✅ Main action buttons have accessible names
- ✅ Dialogs have proper roles
- ✅ Images have alt text
- ✅ Focus is visible on interactive elements
- ✅ Status messages have proper ARIA roles
- ✅ Dialogs trap focus

### Editor (6 tests)
- ✅ Editor opens on node interaction
- ✅ Editor saves changes
- ✅ Editor cancels without saving
- ✅ Editor clears content

## Bug Fixed

During this E2E run, discovered and fixed a bug in `harvest-dialog.ts`:

**Issue:** Reference to undefined `RESULT_MULTIPLIERS` constant
**Location:** `web/src/features/harvest-dialog.ts:140`
**Fix:** Changed to use `sharedConstants.soil.resultMultipliers`

This was causing harvest operations to fail silently, preventing sprout results from being saved.

## Artifacts

Playwright is configured to capture on failure:
- Screenshots: `test-results/*/test-failed-*.png`
- Videos: `test-results/*/video.webm`
- Traces: Available via `npx playwright show-trace`

## Running Tests

```bash
cd web

# Run all E2E tests
npm run test:e2e

# Run specific test file
npm run test:e2e -- e2e/navigation.spec.ts

# Run in headed mode (see browser)
npm run test:e2e -- --headed

# Debug a test
npm run test:e2e -- --debug

# View HTML report
npx playwright show-report
```
