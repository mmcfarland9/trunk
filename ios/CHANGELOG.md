# Changelog

All notable changes to the Trunk iOS app will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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

## [0.1.0] - 2026-01-29

### Added
- Initial version tracking
- SwiftUI-based tree visualization
- Sprout management (create, water, harvest)
- Sun reflection prompts
- Design system with wood-based colors and typography
