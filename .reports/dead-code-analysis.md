# Dead Code Analysis Report

Generated: 2026-01-25

## Executive Summary

Analysis completed using:
- **knip**: Unused exports and dependencies
- **depcheck**: Unused npm dependencies
- **ts-prune**: Unused TypeScript exports
- **Test coverage**: 64 tests passing

## Analysis Results

### 1. Unused npm Dependencies

#### SAFE TO REMOVE

| Package | Reason | Risk Level |
|---------|--------|------------|
| `@testing-library/dom` | Installed but never imported | **LOW** |
| `depcheck` | Analysis tool, not production code | **LOW** |
| `knip` | Analysis tool, not production code | **LOW** |
| `ts-prune` | Analysis tool, not production code | **LOW** |

**Recommendation**: Remove all 4 packages. They are analysis tools that can be run via `npx` when needed.

---

### 2. Unused Exports (Functions & Utilities)

#### SAFE TO REMOVE (High Confidence)

| Export | File | Reason | Risk Level |
|--------|------|--------|------------|
| `debounce` | `src/utils/debounce.ts` | Only `preventDoubleClick` is used | **LOW** |
| `getStorageUsage` | `src/utils/safe-storage.ts` | Never imported anywhere | **LOW** |
| `formatBytes` | `src/utils/safe-storage.ts` | Never imported anywhere | **LOW** |
| `getBranchLabel` | `src/features/progress.ts` | Only used internally, not imported elsewhere | **LOW** |

#### CAUTION - Verify Before Removal

| Export | File | Reason | Risk Level |
|--------|------|--------|------------|
| `calculateCapacityReward` | `src/state.ts` | Only used internally in state.ts | **MEDIUM** |
| `getMaxSoilCapacity` | `src/state.ts` | Never imported, but conceptually useful | **MEDIUM** |
| `invalidateWaterCountCache` | `src/state.ts` | Only called internally within state.ts | **MEDIUM** |
| `getWaterUsedToday` | `src/state.ts` | Only called internally within state.ts | **MEDIUM** |
| `getSunUsedThisWeek` | `src/state.ts` | Only called internally within state.ts | **MEDIUM** |
| `getSunCapacity` | `src/state.ts` | Only called internally within state.ts | **MEDIUM** |
| `getSproutsByState` | `src/state.ts` | Only called internally within state.ts | **MEDIUM** |
| `isLeafActive` | `src/state.ts` | Never imported elsewhere | **MEDIUM** |
| `getSunLog` | `src/state.ts` | Never imported elsewhere | **MEDIUM** |
| `clearState` | `src/state.ts` | Debug function, might be useful | **MEDIUM** |
| `getIsSidebarHover` | `src/state.ts` | Never imported elsewhere | **MEDIUM** |

**Note**: Many state.ts exports appear unused because they're only called internally. These could be made non-exported (private) if they're truly internal-only.

---

### 3. Type Exports (All Safe - Used in Module)

All type exports are marked as "used in module" by ts-prune:
- `HarvestDialogCallbacks`, `HarvestDialogApi`
- `ImportExportCallbacks`
- `SidebarBranchCallbacks`, `SidebarTwigCallback`, etc.
- `DomBuilderResult`, `NodeClickHandler`
- `EditorCallbacks`, `LeafViewCallbacks`, `TwigViewCallbacks`
- `ValidationResult`

**Recommendation**: Keep all type exports. They provide type safety across modules.

---

## Proposed Cleanup Plan

### Phase 1: Remove Unused Dev Dependencies (SAFE)

```bash
npm uninstall @testing-library/dom depcheck knip ts-prune
```

**Impact**: None. These can be re-installed or run via `npx` when needed.

**Verification**: Run tests after removal.

---

### Phase 2: Remove Unused Utility Functions (SAFE)

#### 2a. Remove unused storage utilities

File: `src/utils/safe-storage.ts`

**Action**: Remove exports for `getStorageUsage` and `formatBytes`

```typescript
// Remove these exports (lines 29-64):
export function getStorageUsage(): { used: number; total: number } { ... }
export function formatBytes(bytes: number): string { ... }
```

**Impact**: None. These functions are never called.

**Verification**: Run tests, check no import errors.

---

#### 2b. Remove unused debounce export

File: `src/utils/debounce.ts`

**Action**: The `debounce` function is exported but never used. Only `preventDoubleClick` is used.

**Option A (Aggressive)**: Remove the unused `debounce` export entirely.
**Option B (Conservative)**: Keep it for potential future use.

**Recommendation**: Keep `debounce` - it's a small utility that might be useful later.

---

### Phase 3: Cleanup state.ts Internal Exports (MEDIUM RISK)

File: `src/state.ts`

Many exports are only used internally within `state.ts`. Consider making them non-exported:

| Export | Usage | Recommendation |
|--------|-------|----------------|
| `calculateCapacityReward` | Internal only | Make private |
| `invalidateWaterCountCache` | Internal only | Make private |
| `getWaterUsedToday` | Internal only | Make private |
| `getSunUsedThisWeek` | Internal only | Make private |
| `getSunCapacity` | Internal only | Make private |
| `getSproutsByState` | Internal only | Make private |
| `isLeafActive` | Never used | **Remove entirely** |
| `getSunLog` | Never used | **Remove entirely** |
| `clearState` | Debug function | Keep for debug purposes |
| `getIsSidebarHover` | Never used | **Remove entirely** |
| `getMaxSoilCapacity` | Never used but conceptual | Keep as public API |

**Note**: Before removing exports, verify they're not used in browser console for debugging.

---

### Phase 4: Remove Truly Dead Functions (LOW RISK)

These functions are confirmed dead:

1. **`isLeafActive`** (src/state.ts:650)
   - Never called anywhere
   - Safe to remove

2. **`getSunLog`** (src/state.ts:718)
   - Never called anywhere
   - Safe to remove

3. **`getIsSidebarHover`** (src/state.ts:1071)
   - Never called anywhere
   - Safe to remove

4. **`getStorageUsage`** (src/utils/safe-storage.ts:29)
   - Never called anywhere
   - Safe to remove

5. **`formatBytes`** (src/utils/safe-storage.ts:50)
   - Never called anywhere
   - Safe to remove

6. **`getBranchLabel`** - Export is flagged but function IS used internally
   - Just remove the `export` keyword to make it private

---

## Verification Strategy

For each cleanup phase:

1. **Before changes**: Run `npm test` - ensure all 64 tests pass
2. **After changes**: Run `npm test` - verify all 64 tests still pass
3. **Build check**: Run `npm run build` - verify no TypeScript errors
4. **Runtime check**: Run `npm run dev` - spot check key functionality

---

## Timeline

- **Phase 1** (Dev Dependencies): 1 minute, 0 risk
- **Phase 2** (Utility Functions): 5 minutes, very low risk
- **Phase 3** (State.ts Internal): 10 minutes, medium risk - requires careful review
- **Phase 4** (Dead Functions): 10 minutes, low risk

**Total estimated effort**: ~30 minutes

---

## Metrics

### Before Cleanup
- Dependencies: 10 (4 unused dev dependencies)
- Exported functions: ~90 (11 unused exports)
- Code size: TBD

### After Cleanup (Projected)
- Dependencies: 6 (0 unused)
- Exported functions: ~79 (0 unused exports)
- Removed LOC: ~150-200 lines

---

## Recommendations

1. **Start with Phase 1** (remove unused npm packages) - zero risk, immediate cleanup
2. **Proceed to Phase 2** (utility functions) - very safe removals
3. **Consider Phase 3 carefully** - some exports might be used in browser console for debugging
4. **Phase 4 requires testing** - but these are confirmed dead

**Do NOT remove** without running tests:
- Any function that might be used in browser console for debugging (`clearState`, etc.)
- Type exports (all are marked as used)
- Functions with clear conceptual API value (`getMaxSoilCapacity`)

---

## Notes

- tsconfig.json has a JSON syntax error that prevents depcheck from parsing it (trailing commas in comments)
- All 64 tests currently pass
- No test files are flagged as unused - good test coverage
- The codebase is generally very clean with minimal dead code
