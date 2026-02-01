# Dead Code Analysis Report

**Generated:** 2026-02-01
**Baseline Tests:** 329 passing (24 test files)

## Summary

| Category | Count | Status |
|----------|-------|--------|
| Unused Files | 0 | ✅ Clean (false positives resolved) |
| Unused Exports | 1 | ⚠️ Removed |
| Unused Dependencies | 0 | ✅ Clean (false positives) |
| Unlisted Dependencies | 2 | ℹ️ Optional |

## Tools Used

- **knip** v4.x - Detects unused files, exports, and dependencies
- **depcheck** - Detects unused npm dependencies
- **ts-prune** - Detects unused TypeScript exports

## Detailed Analysis

### False Positives (No Action Needed)

These were flagged by tools but are actually in use:

| Item | Why Flagged | Reality |
|------|-------------|---------|
| `src/events/index.ts` | Not imported from main.ts | Used by import-export.ts and 10 test files |
| `src/events/store.ts` | Indirect export pattern | Re-exported via index.ts, auto-initializes |
| `@stryker-mutator/vitest-runner` | No direct import | Loaded dynamically by Stryker at runtime |

### Dead Code Removed

| Export | Location | Status |
|--------|----------|--------|
| `EventType` | `src/events/types.ts:99` | ✅ Removed |
| `EventType` | `src/events/index.ts:17` | ✅ Removed |

**`EventType`** was a type alias `TrunkEvent['type']` that extracted the discriminator union. It was exported but never imported or used anywhere in production or test code.

### Unlisted Dependencies (Optional)

These are peer/optional dependencies that work correctly but aren't in package.json:

| Dependency | Used By | Notes |
|------------|---------|-------|
| `@stryker-mutator/api` | stryker.config.mjs | JSDoc type hints only |
| `@vitest/coverage-v8` | vitest.config.ts | Auto-installed on coverage runs |

These can optionally be added to devDependencies for explicit tracking.

## Verification

```bash
# Tests before removal: 329 passing
npm test

# Tests after removal: 329 passing
npm test

# Build verification
npm run build
```

All tests pass after dead code removal.
