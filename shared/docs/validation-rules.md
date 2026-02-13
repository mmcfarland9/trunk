# Import Validation Rules

This document specifies all validation and sanitization rules applied when importing data into Trunk. Both platforms must implement these rules to ensure data integrity.

Reference implementation: `web/src/utils/validate-import.ts`

---

## Overview

Import validation has two phases:

1. **Validation** — checks data for errors and warnings, rejects invalid data
2. **Sanitization** — coerces valid-but-imperfect data into the correct shape with defaults

Each phase applies to sprouts and leaves independently.

---

## Validation Result Shape

```
ValidationResult {
  valid:    Boolean      // true if no errors (warnings are OK)
  errors:   List<String> // fatal: data is rejected
  warnings: List<String> // non-fatal: data is accepted with caveats
}
```

Errors prevent import. Warnings are surfaced to the user but do not block import.

---

## Valid Enum Values

### Seasons
```
VALID_SEASONS = ["2w", "1m", "3m", "6m", "1y"]
```

### Environments
```
VALID_ENVIRONMENTS = ["fertile", "firm", "barren"]
```

### States (for validation, accepts legacy values)
```
LEGACY_STATES = ["draft", "active", "completed", "failed"]
```

Note: `draft` and `failed` are legacy states. During sanitization they are mapped to the current state model (see below).

---

## Sprout Validation

```
FUNCTION validateSprout(sprout, index) -> ValidationResult:
    errors   = []
    warnings = []

    // Must be an object
    IF sprout is NOT an object:
        RETURN { valid: false, errors: ["Sprout {index}: not an object"] }

    // --- Required Fields (errors) ---

    IF sprout.id is NOT a non-empty string:
        ADD ERROR "Sprout {index}: missing or invalid id"

    IF sprout.title is NOT a string:
        ADD ERROR "Sprout {index}: missing title"

    IF sprout.season is NOT in VALID_SEASONS:
        ADD ERROR "Sprout {index}: invalid season '{sprout.season}'"

    IF sprout.environment is NOT in VALID_ENVIRONMENTS:
        ADD ERROR "Sprout {index}: invalid environment '{sprout.environment}'"

    IF sprout.state is NOT in LEGACY_STATES:
        ADD ERROR "Sprout {index}: invalid state '{sprout.state}'"

    // --- Optional Fields (warnings) ---

    IF sprout.soilCost is present AND is NOT a number:
        ADD WARNING "Sprout {index}: soilCost should be a number"

    IF sprout.result is present AND (is NOT a number OR < 1 OR > 5):
        ADD WARNING "Sprout {index}: result should be 1-5"

    IF sprout.leafId is present AND is NOT a string:
        ADD WARNING "Sprout {index}: leafId should be a string"

    IF sprout.createdAt is present AND is NOT a string:
        ADD WARNING "Sprout {index}: createdAt should be a date string"

    IF sprout.endDate is present AND is NOT a string:
        ADD WARNING "Sprout {index}: endDate should be a date string"

    IF sprout.waterEntries is present AND is NOT an array:
        ADD WARNING "Sprout {index}: waterEntries should be an array"

    RETURN { valid: errors is empty, errors, warnings }
```

---

## Leaf Validation

```
FUNCTION validateLeaf(leaf, index) -> ValidationResult:
    errors   = []
    warnings = []

    // Must be an object
    IF leaf is NOT an object:
        RETURN { valid: false, errors: ["Leaf {index}: not an object"] }

    // --- Required Fields (errors) ---

    IF leaf.id is NOT a non-empty string:
        ADD ERROR "Leaf {index}: missing or invalid id"

    // --- Soft Required Fields (warnings) ---
    // Name is required in v2 but warned (not errored) for backwards compat

    IF leaf.name is NOT a non-empty string:
        ADD WARNING "Leaf {index}: missing name"

    // --- Optional Fields (warnings) ---

    IF leaf.createdAt is present AND is NOT a string:
        ADD WARNING "Leaf {index}: createdAt should be a date string"

    RETURN { valid: errors is empty, errors, warnings }
```

---

## Sprout Sanitization

Sanitization coerces imported sprout data into a valid shape. Returns null if the data is irrecoverable.

```
FUNCTION sanitizeSprout(raw) -> Sprout or NULL:

    // Gate: must be an object
    IF raw is NOT an object: RETURN NULL

    // Gate: must have a valid id
    IF raw.id is NOT a non-empty string: RETURN NULL

    // --- Enum defaults ---

    season = raw.season IF in VALID_SEASONS
             ELSE "2w"  (default to shortest)

    environment = raw.environment IF in VALID_ENVIRONMENTS
                  ELSE "fertile"  (default to easiest)

    // --- Legacy state migration ---
    //
    // The current model only has "active" and "completed".
    // Legacy imports may contain "draft" or "failed".
    //
    //   "draft"     -> "active"     (was planted, treat as active)
    //   "failed"    -> "completed"  (showing up counts!)
    //   "active"    -> "active"
    //   "completed" -> "completed"

    state = "active"
    IF raw.state == "completed" OR raw.state == "failed":
        state = "completed"
    ELSE IF raw.state == "active" OR raw.state == "draft":
        state = "active"

    // --- Build sanitized sprout ---

    sprout = Sprout {
        id:          raw.id
        title:       raw.title IF string ELSE "Untitled"
        season:      season
        environment: environment
        state:       state
        soilCost:    raw.soilCost IF number ELSE 0
        createdAt:   raw.createdAt IF string ELSE NOW as ISO string
    }

    // --- Optional date fields (copy if valid string) ---

    IF raw.activatedAt is a string:  sprout.activatedAt  = raw.activatedAt
    IF raw.completedAt is a string:  sprout.completedAt  = raw.completedAt
    IF raw.plantedAt   is a string:  sprout.plantedAt    = raw.plantedAt
    IF raw.harvestedAt is a string:  sprout.harvestedAt  = raw.harvestedAt
    IF raw.endDate     is a string:  sprout.endDate      = raw.endDate

    // --- Optional value fields ---

    IF raw.result is a number AND 1 <= raw.result <= 5:
        sprout.result = raw.result

    IF raw.reflection is a string:
        sprout.reflection = raw.reflection

    IF raw.leafId is a string:
        sprout.leafId = raw.leafId

    // --- Bloom descriptions ---

    IF raw.bloomWither   is a string:  sprout.bloomWither   = raw.bloomWither
    IF raw.bloomBudding  is a string:  sprout.bloomBudding  = raw.bloomBudding
    IF raw.bloomFlourish is a string:  sprout.bloomFlourish = raw.bloomFlourish

    // --- Water entries (filter to valid shape) ---

    IF raw.waterEntries is an array:
        sprout.waterEntries = FILTER raw.waterEntries WHERE
            entry is an object
            AND entry.timestamp is a string
            AND entry.content is a string
        // prompt field is optional, carried through if present

    RETURN sprout
```

---

## Leaf Sanitization

```
FUNCTION sanitizeLeaf(raw) -> Leaf or NULL:

    // Gate: must be an object
    IF raw is NOT an object: RETURN NULL

    // Gate: must have a valid id
    IF raw.id is NOT a non-empty string: RETURN NULL

    RETURN Leaf {
        id:        raw.id
        name:      raw.name IF string ELSE "Unnamed Saga"
        createdAt: raw.createdAt IF string ELSE NOW as ISO string
    }
```

---

## Legacy State Migration Summary

| Legacy State | Current State | Rationale |
|-------------|---------------|-----------|
| `draft` | `active` | Was planted; no "draft" concept in event-sourced model |
| `active` | `active` | No change |
| `completed` | `completed` | No change |
| `failed` | `completed` | "Showing up counts!" — all finishes are completions |

---

## Default Values Summary

When imported data has missing or invalid fields, these defaults are applied:

| Field | Default | Notes |
|-------|---------|-------|
| `title` | `"Untitled"` | Only if not a string |
| `season` | `"2w"` | Shortest season (safest default) |
| `environment` | `"fertile"` | Easiest environment (safest default) |
| `state` | `"active"` | See legacy migration table above |
| `soilCost` | `0` | Only if not a number |
| `createdAt` | Current timestamp | Only if not a string |
| Leaf `name` | `"Unnamed Saga"` | Only if not a string |
| Leaf `createdAt` | Current timestamp | Only if not a string |

---

## Water Entry Validation

Water entries are validated during sprout sanitization. Each entry must have:

| Field | Type | Required |
|-------|------|----------|
| `timestamp` | string | yes |
| `content` | string | yes |
| `prompt` | string | no |

Entries that fail these type checks are silently dropped.

---

## Implementation Checklist

For each platform, verify:

- [ ] Sprout validation checks all 5 required fields (id, title, season, environment, state)
- [ ] Sprout validation warns on 6 optional fields (soilCost, result, leafId, createdAt, endDate, waterEntries)
- [ ] Leaf validation errors on missing id, warns on missing name
- [ ] Sanitization returns null for non-objects and missing ids
- [ ] Legacy states (`draft`, `failed`) are correctly mapped
- [ ] Default values match the table above
- [ ] Water entries are filtered (not errored) during sanitization
- [ ] Result range is validated as 1-5 inclusive
