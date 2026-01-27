# Trunk iOS App

Native iOS application for Trunk personal growth tracking.

**Status:** Initial setup - development not started

## Planned Structure

```
app/
├── Trunk.xcodeproj/         # Xcode project
├── Trunk/                   # App source code
│   ├── TrunkApp.swift       # App entry point
│   ├── Models/              # Data models
│   ├── Views/               # SwiftUI views
│   ├── ViewModels/          # MVVM view models
│   ├── Services/            # Business logic
│   └── Resources/           # Assets, constants
├── TrunkTests/              # Unit tests
└── TrunkUITests/            # UI tests
```

## Shared Dependencies

The iOS app will use shared specifications from `../shared/`:

- `constants.json` - Numeric constants and configuration
- `schemas/*.schema.json` - Data structure contracts
- `formulas.md` - Progression system formulas
- `assets/trunk-map-preset.json` - Default tree labels

Constants will be parsed from JSON or generated as Swift code.

## Tech Stack (Planned)

- **Language:** Swift
- **UI Framework:** SwiftUI
- **Architecture:** MVVM
- **Storage:** SwiftData or CoreData
- **Minimum iOS:** 17.0

## Design Principles

**Touch-first:** No hover effects, large tap targets, swipe gestures

**Feature parity:** Match web app features but optimize for mobile UX:
- Tree navigation optimized for smaller screens
- Simplified menus for tap interaction
- Native iOS patterns (sheets, navigation, etc.)

**Offline-first:** All data stored locally, no cloud sync initially

## Development

Not yet started. When ready:

1. Create Xcode project
2. Set up folder structure
3. Generate Swift types from JSON schemas
4. Implement progression system (verify against formulas.md)
5. Build UI layer

## Testing

Cross-platform validation tests will ensure iOS matches web behavior:

```
Input: 3m season, firm environment, result=4, currentCapacity=50
Expected: soilCost=8, capacityReward≈3.18
```

Both platforms must produce identical results.
