# Changelog

All notable changes to the Trunk iOS app will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Fixed
- `DataExportService`: changed `soilCost` and `soilReturned` from `Int?` to `Double?` — prevents truncation of fractional soil values during export/import round-trips (bug #2)
- Harvest events now include optional `reflection` field with TextField in harvest UI, conditionally included in push payload when non-empty (bug #3)
- `CreateSproutView`: `leafId` now always included in sprout_planted payload via `guard let` enforcement (bug #5)
- `EventDerivation.processSunShone`: required fields (`twigId`, `twigLabel`, `content`) now use `guard let` instead of defaulting to empty string — malformed events are skipped (bug #8)
- `CreateSproutView`: bloom fields conditionally omitted when empty instead of sending `""`, matching web behavior (bug #14)
- `EventDerivation`: `soilCost` in `processSproutPlanted` and `soilReturned` in `processSproutUprooted` now use `guard let` instead of defaulting to 0 — malformed events are skipped (bug #18)

### Performance
- `InteractiveBranchNode` and `BranchCenterNode` made Equatable with `.equatable()` — prevents body re-evaluation 8+ times per frame when only wind positions change
- `TwigNode` made Equatable — compares label + sprout count only, skips body eval on wind sway
- `CanvasDotGuideLines` made Equatable with time quantization (~20fps) — reduces Canvas redraws from ~60/sec to ~20/sec
- `branchSproutData` converted from computed property to `@State` — avoids O(8×N) sprout filtering per frame
- `SproutsViewModel.activeCount` and `completedCount` pre-computed in `refreshCachedState()` — avoids repeated array filtering

### Fixed
- `ISO8601.parse()` now returns `Date?` instead of silently falling back to `.distantPast` (year 1) on corrupt timestamps — callers explicitly handle nil, preventing sprouts with bad data from appearing harvestable

### Changed
- Radar chart: polygon vertices now derived from animated branch positions instead of independent geometry, ensuring radar polygon tracks branch node wind sway exactly

### Added
- Upcoming Harvests sheet: tapping the Next Harvest panel shows all active sprouts sorted by harvest date
- VoiceOver accessibility labels and hints on the Next Harvest panel and harvest list rows
- Post-action celebration feedback: bounce animation on resource meters after watering, harvesting, or shining
- Watering streak counter: displays current and longest-ever consecutive watering days near the water meter
- Sign-out button in account data sheet
- E2E test login via edge function for test@trunk email

### Changed
- Replaced ASCII text progress bar in Next Harvest panel with a native SwiftUI rounded bar
- Improved dark mode track visibility using the borderSubtle semantic color token
- Next Harvest tap now opens a glanceable overview of all upcoming harvests instead of a single sprout detail
- Radar chart: removed grid rings, axis spoke lines, and tick marks for cleaner look
- Radar chart: reduced polygon fill opacity (0.07) and stroke opacity (0.20) for subtle overlay feel
- Radar chart: aligned polygon reach with branch node positions (maxRadius 0.38 -> 0.52)
- Radar chart: added minimum score floor (0.08) so sparse data still shows visible polygon shape
- Extracted shared `TreeGeometry` utility (angle + point-on-circle), eliminating duplicate geometry in RadarChartView, TreeCanvasView, and BranchView
- Radar chart: merged dual draw loops (polygon + dots) into a single pass
- TreeCanvasView: cached `radarScores` as @State (refreshed on appear/version change, not per frame)
- TreeCanvasView: simplified CanvasDotGuideLines by removing closure parameters in favour of direct TreeGeometry/Wind calls
- TreeCanvasView: removed dead `isSelected` and `onDoubleTap` from InteractiveBranchNode

### Removed
- `ErrorCodes.swift` — entire file dead (84 lines), referenced non-existent bundle resource
- `ActiveSproutsSection` and `ActiveSproutRow` in OverviewView.swift — unreachable views (~116 lines)
- `TrunkEventType.isValid(_:)` — never called
- `JSONValue.boolValue` — never accessed
- 4 `JSONValue` convenience initializers — code uses `ExpressibleBy*Literal` conformances instead
- `wateringStreak` and `longestWateringStreak` from ProgressionViewModel — written to but never read by any view
- Added `// TEST-ONLY` annotation to `DataExportService.swift` (not yet wired to UI)

## [0.1.0] - 2026-01-29

### Added
- Initial version tracking
- SwiftUI-based tree visualization
- Sprout management (create, water, harvest)
- Sun reflection prompts
- Design system with wood-based colors and typography
