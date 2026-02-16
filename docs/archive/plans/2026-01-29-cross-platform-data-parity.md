# Cross-Platform Data Parity Design

**Date**: 2026-01-29
**Status**: Approved
**Scope**: iOS model alignment with web, shared schema updates

## Summary

Ensure iOS and web apps can seamlessly share data via export/import with zero data loss. Web is the source of truth for naming conventions.

## Changes Required

### iOS Model Updates

| File | Change |
|------|--------|
| `Sprout.swift` | Rename `bloomLow/Mid/High` → `bloomWither/Budding/Flourish` |
| `Sprout.swift` | Remove `draft` and `failed` from `SproutState` (keep `active`, `completed`) |
| `WaterEntry.swift` | Rename `note` → `content` |
| `WaterEntry.swift` | Add `prompt: String?` field |
| `SunEntry.swift` | Remove `contextType`, `contextLeafId` (sun only shines on twigs) |
| `SettingsView.swift` | Implement export/import using v4 event-sourced format |

### Shared Schema Updates

| File | Change |
|------|--------|
| `sprout.schema.json` | Rename `bloom1/bloom3/bloom5` → `bloomWither/bloomBudding/bloomFlourish` |

### Web Changes

None - web is source of truth.

## Unified Data Models

### Sprout
- `state`: `"active"` | `"completed"` only
- `bloomWither`: 1/5 outcome description
- `bloomBudding`: 3/5 outcome description
- `bloomFlourish`: 5/5 outcome description

### WaterEntry
- `content`: string (not "note")
- `prompt`: optional string

### SunEntry
- `context.twigId`: required
- `context.twigLabel`: required
- No leaf context support

## Export Format (v4)

```json
{
  "version": 4,
  "exportedAt": "ISO-8601",
  "events": [],
  "circles": {},
  "settings": { "name": "" }
}
```

Both platforms use identical v4 format for full interoperability.
