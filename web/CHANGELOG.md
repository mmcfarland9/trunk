# Changelog

All notable changes to the Trunk web app will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed
- Soil chart: smooth monotone cubic bezier interpolation (Fritsch-Carlson) replaces jagged step paths for all ranges except 1d — curves pass through every data point without overshooting
- Soil chart: gradient area fill under capacity line (15% opacity at top fading to transparent) replaces flat 0.08 opacity fill
- Soil chart: grid lines now use CSS custom properties (`--border-subtle`, `--ink-faint`) instead of hardcoded rgba — adapts to dark mode; lines are dashed and thinner (0.3px)
- Soil chart: capacity line thicker (2px) with rounded linecap/linejoin and subtle shadow line (4px, 8% opacity) for depth
- Soil chart: data dots larger (r=2) with paper-colored stroke for contrast against gradient fill
- Soil chart: range transition fades SVG out/in over 150ms instead of instant swap
- Soil chart: denser data points for wider ranges — 3m interval halved (7d→3.5d), 6m/ytd switched from semimonthly to weekly, all range target doubled (24→48 nodes)
- Soil chart: hover scrubbing with per-dot interaction — hovered dot scales to r=3.5 with glow filter and color shift to --wood, vertical dashed rule line at hovered position, enhanced tooltip with labeled values
- Trunk guide lines: straight dotted lines replaced with quadratic bezier curves — 10% perpendicular offset for trunk→branch, 5% for branch→twig, alternating direction by index
- Trunk guide lines: continuous stroked curves with thickness tapering (1.3× base at source → 0.7× at target) replace individual dot circles — gives organic root-like feel
- Trunk guide lines: per-segment opacity variation (brighter at endpoints, dimmer at midpoint) via 12-segment sampling along bezier
- Trunk guide lines: shadow pass on trunk→branch lines (wider stroke at 12% opacity) for depth
- Trunk guide lines: hover highlighting — hovered branch's line renders at full alpha while others dim to 30%; hovering trunk brightens all branch lines to 1.4× alpha
- Node hover: branch nodes scale to 1.08× and twig nodes to 1.12× on hover with 120ms ease transition, preserving base translate(-50%, -50%)
- Node hover: glow effect via text-shadow using color-mix with --wood — adapts to dark mode automatically

### Added
- Node tooltips: compact detail overlay appears on 150ms hover delay — branches show "{name} — N active", twigs show "{name} — N active, N total", trunk shows total active sprout count
- Node tooltip: single shared DOM element repositioned per hover, immediate hide on mouseleave, viewport-clamped positioning, downward-pointing arrow caret

### Fixed
- Double uproot soil refund: `deriveState` now only returns soil when uprooting an active, existing sprout — fixes duplicate uproot inflation (bug #1) and phantom sprout soil injection (bug #7)
- Soil chart capacity cap: `computeRawSoilHistory` now caps capacity at `MAX_SOIL_CAPACITY` (120) on harvest events, matching `deriveState` behavior (bug #6)
- `validateEvent()` now enforces required schema fields: `leafId` on sprout_planted, `content` on sprout_watered, `soilReturned` on sprout_uprooted, `twigLabel`+`content` on sun_shone, `twigId` on leaf_created — `prompt` intentionally excluded for backward compatibility (bug #4)
- Test fixtures: added missing `prompt` field to water events and `leafId` to plant events in `event-derivation.json` and test files (bug #13)

### Refactored
- Decomposed `bootstrap/ui.ts` (383 → ~105 lines) into three focused modules: `bootstrap/meters.ts` (meter update + celebration animation), `bootstrap/charts.ts` (soil chart + radar chart init), `bootstrap/dialogs.ts` (dialog init, view wiring, sidebar sprouts) — zero behavior change
- Decomposed `twig-view/index.ts` (417 → 350 lines) into three focused modules: `twig-view/confirm.ts` (confirm dialog Promise pattern), `twig-view/keyboard.ts` (document keydown handler), `twig-view/leaf-select.ts` (leaf dropdown management) — zero behavior change

### Added
- Edit sprout: active sprout cards now show an "edit" button that opens an inline form to update title, bloom descriptions (wither/budding/flourish), and leaf assignment — season, environment, and soil cost remain read-only (economic commitments)
- New `sprout_edited` event type: sparse merge of mutable fields, added to shared schema, constants, derivation, validation, and sync
- Dark mode: OS-level auto-detection via `prefers-color-scheme`, manual Light/Dark/Auto toggle in Account > Preferences tab, saved to localStorage
- Cross-platform field coverage test fixture (`shared/test-fixtures/field-coverage.json`) with maximal events (all optional and required fields populated) for verifying no fields are lost during sync round-trip or state derivation
- Field coverage tests (`field-coverage.test.ts`, 32 tests) verifying sync round-trip (`localToSyncPayload` → `syncToLocalEvent`) and `deriveState()` field preservation for all 6 event types including bloom fields, reflection, prompt, and fractional soil values

### Performance
- Event sort pre-check: O(n) linear scan detects already-sorted events (common case), skipping O(n log n) sort on every derivation
- Selective cache invalidation: watering only clears water/streak caches, shining only clears sun cache — previously all 6 caches cleared on every event
- `getEvents()` returns internal array directly (TypeScript `readonly` enforces immutability) — eliminates O(n) copy + freeze on every call
- Wind animation loop pauses in twig/leaf view — stops 60fps computation for 72 nodes when tree canvas isn't visible
- Twig label formatting cached via Map — eliminates repeated Canvas 2D measureText calls for identical labels
- Sidebar sprout list dirty check — skips full DOM rebuild when derived state and view context haven't changed
- Canvas `getBoundingClientRect()` cached with 100ms TTL in mousemove handler — avoids forced layout on every mouse event

### Changed
- Radar chart vertices now derive from animated branch positions instead of independent polar math, ensuring the polygon tracks the tree's elliptical geometry and wind sway exactly
- Layout caches (`positionCache`, `twigRadiusCache`) switched from Map to WeakMap for automatic GC of removed DOM elements
- `getActiveSprouts()` replaced `Array.flat()` with direct push loop to avoid intermediate array allocations
- Event filter functions (`deriveWaterAvailable`, `deriveSunAvailable`, `wasSproutWateredThisWeek`, `wasSproutWateredToday`, `wasShoneThisWeek`) pre-compute reset time as numeric ms instead of creating Date objects per comparison
- `drawGuideLines()` now caches `getBoundingClientRect()` calls per frame to avoid layout thrashing at 60Hz
- Extracted shared `sortEventsByTimestamp()` utility — `deriveState()` and `computeRawSoilHistory()` no longer duplicate sorting logic
- Extracted sync modules: `sync/pull.ts`, `sync/push.ts`, `sync/retry.ts`, `sync/timeout.ts` from monolithic `operations.ts` (473 → ~170 lines)

### Fixed
- Harvest date preview now uses local time (`setHours(9)`) instead of hardcoded UTC offset (`setUTCHours(15)`), fixing incorrect "Ends on..." dates for users outside Central Time
- Profile save errors now show "Error — try again" feedback instead of being silently swallowed
- Keyboard shortcut Cmd+Arrow no longer triggers twig navigation when editing text in input/textarea fields
- Navigation timeout for deferred `positionNodes()` now properly cleaned up when navigating away mid-transition

### Removed
- Dead code: `startVisibilityCacheInvalidation()` from store.ts and its re-export from events/index.ts
- Dead code: `EventType` type, `ChartBucketConfig` type, and `CHART_BUCKETS` constant from generated constants (removed from generator)
- Unnecessary `export` on `getDaysRemaining()`, `getNodePlaceholder()`, and `createStackedLeafCard()` — only used within their own files
- Relocated `validate-import.ts` from `utils/` to `tests/` (test-only, never imported by production code)
- Stale config: unused `@shared` path alias from tsconfig.json and vitest.config.ts, `useDefineForClassFields` (no classes), `useNodejsImportProtocol` rule (browser app), stale `vite-env.d.ts` exclusion from stryker.config.mjs
- Security: removed `SUPABASE_SERVICE_ROLE_KEY` from `.env.local` (admin key should not exist in web client env)
- 40 stale markdown files (~26,654 lines): completed plans, superseded audits, executed roadmaps
- 34 orphaned CSS selectors (~260 lines) from settings dialog, legacy sprout items, and unbuilt water-can suggestions
- `console.warn` for standalone sprouts in progress-panel (structurally impossible per data model)
- Duplicate `validateSyncPayload()` in sync-types.ts — now imports shared `validateEvent()` from events/types.ts
- `web/src/utils/error-codes.ts` — unused error code registry (never wired into call sites)
- `shared/assets/trunk-map-preset.json` — orphaned preset file (labels moved to `constants.json`)
- `shared/docs/validation-rules.md` — stale spec diverged from actual implementation
- `shared/docs/event-derivation-algorithm.md` — out-of-sync pseudocode spec (platform implementations are source of truth)
- `WATER_RESET_INTERVAL_MS` and `SUN_RESET_INTERVAL_MS` constants — unused in both `constants.json` and generated code

### Added
- Quota warning banner: persistent "Storage full" banner with Export Data button when localStorage is full — dismissible but reappears on next failed save
- Week reset verification test: confirms `getWeekResetTime`, `getNextSunReset`, and `deriveSunAvailable` all agree on Monday 6am boundary (closes A3 investigation)
- Post-action celebration feedback: brief pulse animation on resource meters after watering, harvesting, or shining
- Watering streak counter: displays current and longest-ever consecutive watering days near the water meter
- Keyboard shortcuts for daily actions: W opens water dialog, S opens sun/shine dialog, H opens harvest for the first ready sprout
- Soil capacity chart: SVG chart in sidebar showing capacity and available soil over time with range picker and hover scrub
- Life balance radar chart: 8-axis spider chart overlaid on the tree map showing engagement per branch (planted, watered, sun, harvest)
- CSS custom properties for dialog tokens (`--dialog-bg`, `--dialog-overlay`, `--dialog-shadow`, `--dialog-blur`, `--dialog-z`) — replaces 42 hardcoded values across 7 dialog styles

## [0.1.0] - 2026-01-29

### Added
- Initial version tracking
- Tree visualization with trunk, branches, and twigs
- Sprout lifecycle (draft, plant, water, harvest)
- Leaf sagas for grouping related sprouts
- Resource system (soil, water, sun)
- Import/export functionality
- Keyboard navigation
