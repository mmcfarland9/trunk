# Shared Specifications

This folder contains platform-agnostic specifications shared between the web app (`../web`) and iOS app (`../ios`).

## Contents

### `constants.json`
Numeric constants, enums, and configuration values used by both platforms.

**Usage (Web):**
```typescript
import constants from '../shared/constants.json'
const maxSoil = constants.soil.maxCapacity
```

**Usage (iOS):**
```swift
// Parse JSON or generate Swift constants from this file
struct Constants {
    static let maxSoilCapacity = 120
}
```

### `schemas/`
JSON Schema definitions for data structures (Sprout, Leaf, NodeData).

**Purpose:**
- Validation of imported/exported data
- Type generation for TypeScript (web)
- Type generation for Swift (iOS)
- Contract between platforms

**Usage (Web):**
```typescript
// Types already exist in src/types.ts
// Use schemas for validation during import
```

**Usage (iOS):**
```swift
// Generate Swift types from schemas using tools like:
// - quicktype
// - JSONSchema2Swift
```

### `assets/trunk-map-preset.json`
Default labels for branches and twigs.

**Structure:**
```json
{
  "trunk": { "label": "My Life", "branches": [...] },
  "branches": [
    {
      "defaultLabel": "Health",
      "twigs": [
        { "defaultLabel": "Movement" },
        { "defaultLabel": "Nutrition" },
        ...
      ]
    },
    ...
  ]
}
```

### `formulas.md`
Mathematical specifications for the progression system.

**Critical for consistency:**
Both platforms MUST implement these formulas identically to ensure users have the same experience regardless of platform.

## Guidelines

### Adding New Constants

1. Add to `constants.json`
2. Update this README with usage examples
3. Update both web and iOS implementations
4. Add test cases to verify consistency

### Modifying Schemas

1. Update the schema file
2. Bump schema version if breaking change
3. Update data migrations in both platforms
4. Test import/export compatibility

### Changing Formulas

1. Update `formulas.md`
2. Add rationale and migration notes
3. Update both platforms
4. Run cross-platform validation tests

## Validation

To ensure cross-platform consistency:

1. Both platforms should import the same `constants.json`
2. Both platforms should validate data against the same schemas
3. Both platforms should produce identical outputs for the same inputs

Example test case:
```
Input: 3m season, firm environment, result=4, currentCapacity=50
Expected: soilCost=8, capacityReward=2.975
```

Both web and iOS should pass this test.
