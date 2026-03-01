# Cleanup Metrics

## BEFORE

*Measured February 28, 2026.*

### Line Counts by File Type

| Type | Files | Lines |
|------|-------|-------|
| TypeScript (.ts) | 137 | 30,526 |
| JavaScript (.js/.mjs) | 7 | 1,900 |
| CSS (.css) | 12 | 4,108 |
| HTML (.html) | 52 | 24,525 |
| Swift (.swift) | 63 | 10,317 |
| Markdown (.md) | 70 | 32,817 |
| JSON (.json) | 34 | 8,185 |
| Config (tsconfig, vite, biome, etc.) | 7 | 284 |
| **Total** | **443** | **112,662** |

### Repo Size on Disk

| Component | Size |
|-----------|------|
| Total (excluding .git) | 800 MB |
| `ios/` (includes SPM build cache) | 490 MB |
| `web/` (includes node_modules) | 233 MB |
| `shared/` | 224 KB |
| `docs/` | 912 KB |
| Root markdown files | ~100 KB |

### Web Bundle (Production Build)

| Asset | Raw | Gzip |
|-------|-----|------|
| `index.js` | 326.66 KB | 89.64 KB |
| `index.css` | 70.55 KB | 11.36 KB |
| `index.html` | 1.37 KB | 0.70 KB |
| `tree_icon_transp.png` | 28.16 KB | — |
| **Total dist/** | **484 KB** | **~102 KB** |

### iOS

| Metric | Value |
|--------|-------|
| Swift source files | 63 |
| Swift source lines | 10,317 |
| SPM dependencies | 1 (supabase-swift) |

### Markdown

| Metric | Value |
|--------|-------|
| Total .md files | 70 |
| Total .md lines | 32,817 |
| Files marked DELETE | 40 |
| Files marked UPDATE | 5 |
| Files marked KEEP | 20 |

---

## AFTER

*Measured February 28, 2026 — post-cleanup.*

### Line Counts by File Type

| Type | Files | Lines |
|------|-------|-------|
| TypeScript (.ts) | 137 | 30,486 |
| JavaScript (.js/.mjs) | 7 | 1,910 |
| CSS (.css) | 12 | 4,108 |
| HTML (.html) | 52 | 24,532 |
| Swift (.swift) | 62 | 10,097 |
| Markdown (.md) | 24 | 6,163 |
| JSON (.json) | 34 | 8,179 |
| Config (tsconfig, vite, biome, etc.) | 7 | 271 |
| **Total** | **397** | **85,746** |

### Web Bundle (Production Build)

| Asset | Raw | Gzip |
|-------|-----|------|
| `index.js` | 326.66 KB | 89.64 KB |
| `index.css` | 70.55 KB | 11.36 KB |
| `index.html` | 1.37 KB | 0.70 KB |
| `tree_icon_transp.png` | 28.16 KB | — |
| **Total dist/** | **484 KB** | **~102 KB** |

### iOS

| Metric | Value |
|--------|-------|
| Swift source files | 62 |
| Swift source lines | 10,097 |
| SPM dependencies | 1 (supabase-swift) |

### Markdown

| Metric | Value |
|--------|-------|
| Total .md files | 24 |
| Total .md lines | 6,163 |

---

## DELTA

| Category | Before | After | Removed | % Change |
|----------|--------|-------|---------|----------|
| **Total files** | 443 | 397 | **-46** | -10.4% |
| **Total lines** | 112,662 | 85,746 | **-26,916** | -23.9% |
| TypeScript lines | 30,526 | 30,486 | -40 | -0.1% |
| Swift files | 63 | 62 | -1 | -1.6% |
| Swift lines | 10,317 | 10,097 | -220 | -2.1% |
| Markdown files | 70 | 24 | **-46** | -65.7% |
| Markdown lines | 32,817 | 6,163 | **-26,654** | -81.2% |
| Config lines | 284 | 271 | -13 | -4.6% |
| JSON lines | 8,185 | 8,179 | -6 | -0.1% |
| Web bundle (gzip) | ~102 KB | ~102 KB | 0 | 0% |

### Breakdown by Category

| What | Files Removed | Lines Removed |
|------|---------------|---------------|
| Stale markdown (40 DELETE) | 46 | 26,654 |
| iOS dead code (ErrorCodes.swift + dead functions/properties) | 1 | 220 |
| Web dead code (store.ts, constants.ts, export cleanup) | 0 | 40 |
| Config cleanup (tsconfig, biome, stryker, vitest) | 0 | 13 |
| Web file relocation (validate-import.ts utils→tests) | 0 | 0 |
| **Total** | **47** | **~26,927** |

### Notes

- Bundle size unchanged — dead code was tree-shaken by Vite (never reached the bundle)
- Markdown was the dominant cleanup: 81% of all lines removed were stale docs
- iOS lost 1 file (ErrorCodes.swift) and ~220 lines of dead code from 5 other files
- Web source lost ~40 lines of dead exports/constants
- Zero functionality lost, zero new errors, all 1,256 tests pass
