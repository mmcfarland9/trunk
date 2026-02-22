# Changelog

All notable changes to the Trunk iOS app will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Upcoming Harvests sheet: tapping the Next Harvest panel shows all active sprouts sorted by harvest date
- VoiceOver accessibility labels and hints on the Next Harvest panel and harvest list rows
- Post-action celebration feedback: bounce animation on resource meters after watering, harvesting, or shining
- Watering streak counter: displays current and longest-ever consecutive watering days near the water meter

### Changed
- Replaced ASCII text progress bar in Next Harvest panel with a native SwiftUI rounded bar
- Improved dark mode track visibility using the borderSubtle semantic color token
- Next Harvest tap now opens a glanceable overview of all upcoming harvests instead of a single sprout detail

## [0.1.0] - 2026-01-29

### Added
- Initial version tracking
- SwiftUI-based tree visualization
- Sprout management (create, water, harvest)
- Sun reflection prompts
- Design system with wood-based colors and typography
