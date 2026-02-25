# Changelog

All notable changes to the Trunk web app will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed
- Radar chart vertices now derive from animated branch positions instead of independent polar math, ensuring the polygon tracks the tree's elliptical geometry and wind sway exactly
- Layout caches (`positionCache`, `twigRadiusCache`) switched from Map to WeakMap for automatic GC of removed DOM elements
- `getActiveSprouts()` replaced `Array.flat()` with direct push loop to avoid intermediate array allocations
- Event filter functions (`deriveWaterAvailable`, `deriveSunAvailable`, `wasSproutWateredThisWeek`, `wasSproutWateredToday`, `wasShoneThisWeek`) pre-compute reset time as numeric ms instead of creating Date objects per comparison
- `drawGuideLines()` now caches `getBoundingClientRect()` calls per frame to avoid layout thrashing at 60Hz
- Extracted shared `sortEventsByTimestamp()` utility — `deriveState()` and `computeRawSoilHistory()` no longer duplicate sorting logic
- Extracted sync modules: `sync/pull.ts`, `sync/push.ts`, `sync/retry.ts`, `sync/timeout.ts` from monolithic `operations.ts` (473 → ~170 lines)

### Removed
- `web/src/utils/error-codes.ts` — unused error code registry (never wired into call sites)
- `shared/assets/trunk-map-preset.json` — orphaned preset file (labels moved to `constants.json`)
- `shared/docs/validation-rules.md` — stale spec diverged from actual implementation
- `shared/docs/event-derivation-algorithm.md` — out-of-sync pseudocode spec (platform implementations are source of truth)
- `WATER_RESET_INTERVAL_MS` and `SUN_RESET_INTERVAL_MS` constants — unused in both `constants.json` and generated code

### Added
- Post-action celebration feedback: brief pulse animation on resource meters after watering, harvesting, or shining
- Watering streak counter: displays current and longest-ever consecutive watering days near the water meter
- Keyboard shortcuts for daily actions: W opens water dialog, S opens sun/shine dialog, H opens harvest for the first ready sprout
- Soil capacity chart: SVG chart in sidebar showing capacity and available soil over time with range picker and hover scrub
- Life balance radar chart: 8-axis spider chart overlaid on the tree map showing engagement per branch (planted, watered, sun, harvest)

## [0.1.0] - 2026-01-29

### Added
- Initial version tracking
- Tree visualization with trunk, branches, and twigs
- Sprout lifecycle (draft, plant, water, harvest)
- Leaf sagas for grouping related sprouts
- Resource system (soil, water, sun)
- Import/export functionality
- Keyboard navigation
