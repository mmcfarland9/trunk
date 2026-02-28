# Cross-Platform Event Field Audit

> Generated 2026-02-27. Covers all 6 event types across: JSON Schema, Web types.ts,
> Web sync-types.ts round-trip, iOS SyncEvent, iOS DataExportService, iOS EventDerivation,
> and iOS push call-sites.

## Legend

| Symbol | Meaning |
|--------|---------|
| **R** | Required |
| **O** | Optional |
| **—** | Not present / not applicable |
| **!** | Gap or mismatch found |

---

## 1. `sprout_planted`

| Field | Schema | Web types.ts | Web sync round-trip | iOS EventDerivation | iOS DataExport | iOS Push (CreateSproutView) |
|-------|--------|-------------|---------------------|---------------------|----------------|-----------------------------|
| type | R | R | ✓ merged | ✓ switch key | R | ✓ (arg to pushEvent) |
| timestamp | R | R (BaseEvent) | ✓ merged | ✓ clientTimestamp | R | ✓ (set by pushEvent wrapper) |
| sproutId | R | R | ✓ in payload | R (guard) | O (String?) | R |
| twigId | R | R | ✓ in payload | R (guard) | O (String?) | R |
| title | R | R | ✓ in payload | R (guard) | O (String?) | R |
| season | R | R | ✓ in payload | R (guard+enum) | O (String?) | R |
| environment | R | R | ✓ in payload | R (guard+enum) | O (String?) | R |
| soilCost | R | R (number) | ✓ in payload | O (getDouble, default 0) | O (**Int?** !) | R (.int) ! |
| leafId | R | R | ✓ in payload | R (guard) | O (String?) | **O — only if selected** ! |
| bloomWither | O | O | ✓ in payload | O (getString) | O (String?) | R (always sent, may be "") |
| bloomBudding | O | O | ✓ in payload | O (getString) | O (String?) | R (always sent, may be "") |
| bloomFlourish | O | O | ✓ in payload | O (getString) | O (String?) | R (always sent, may be "") |
| client_id | — (not in schema) | O (BaseEvent) | ✓ merged from sync.client_id | — (in SyncEvent wrapper) | — | — (in SyncEvent wrapper) |

### Gaps

1. **iOS DataExport `soilCost: Int?`** — should be `Double?` to match schema/web `number`. Fractional soil costs are possible. EventDerivation correctly uses `getDouble`, so derivation is fine, but export/import loses precision.
2. **iOS push `leafId` conditional** — Schema says required, but `CreateSproutView` only includes `leafId` when a leaf is selected. If no leaf selected, the payload omits it entirely.
3. **iOS push bloom fields always sent** — Web sends `undefined` (omitted) for empty bloom; iOS sends empty string `""`. Not a data loss issue but a minor format difference.
4. **Web `validateEvent()` doesn't check `leafId`** — sprout_planted validation skips leafId check despite schema requiring it.

---

## 2. `sprout_watered`

| Field | Schema | Web types.ts | Web sync round-trip | iOS EventDerivation | iOS DataExport | iOS Push (WaterSproutView) |
|-------|--------|-------------|---------------------|---------------------|----------------|----------------------------|
| type | R | R | ✓ merged | ✓ switch key | R | ✓ (arg to pushEvent) |
| timestamp | R | R (BaseEvent) | ✓ merged | ✓ clientTimestamp | R | ✓ (in payload + pushEvent wrapper) |
| sproutId | R | R | ✓ in payload | R (guard) | O (String?) | R |
| content | R | R | ✓ in payload | O (getString, default "") | O (String?) | R |
| prompt | R | R | ✓ in payload | O (getString) | O (String?) | R |
| client_id | — | O (BaseEvent) | ✓ merged | — (wrapper) | — | — (wrapper) |

### Gaps

1. **iOS EventDerivation `content` default ""** — Schema says required, iOS falls back to empty string. Derivation won't fail but produces empty content for malformed events.
2. **Web `validateEvent()` only checks `sproutId`** — Doesn't validate `content` or `prompt` despite schema requiring them.
3. **Existing test fixtures omit `prompt`** — Several `sprout_watered` events in `event-derivation.json` lack `prompt` field (e.g., "Ran 2K today" events), violating the schema.
4. **iOS EventDerivation `prompt` optional** — Reads as `getString(payload, "prompt")` which returns nil if missing. Web types.ts has it required.

---

## 3. `sprout_harvested`

| Field | Schema | Web types.ts | Web sync round-trip | iOS EventDerivation | iOS DataExport | iOS Push (HarvestSproutView) |
|-------|--------|-------------|---------------------|---------------------|----------------|------------------------------|
| type | R | R | ✓ merged | ✓ switch key | R | ✓ (arg to pushEvent) |
| timestamp | R | R (BaseEvent) | ✓ merged | ✓ clientTimestamp | R | ✓ (in payload + wrapper) |
| sproutId | R | R | ✓ in payload | R (guard) | O (String?) | R |
| result | R (int 1-5) | R (number) | ✓ in payload | O (getInt) | O (Int?) | R (.int) |
| reflection | O | O | ✓ in payload | O (getString) | O (String?) | **— MISSING** ! |
| capacityGained | R (number ≥ 0) | R (number) | ✓ in payload | O (getDouble, default 0) | O (Double?) | R (.double) |
| client_id | — | O (BaseEvent) | ✓ merged | — (wrapper) | — | — (wrapper) |

### Gaps

1. **iOS push MISSING `reflection`** — `HarvestSproutView` does not include `reflection` in the payload. The harvest UI has no reflection input field. Events pushed from iOS will always lack reflection. Web includes it (as `undefined` if empty).
2. **iOS EventDerivation `result` uses `getInt`** — Returns nil if missing; no guard. Won't crash but sprout.result stays nil for malformed events.

---

## 4. `sprout_uprooted`

| Field | Schema | Web types.ts | Web sync round-trip | iOS EventDerivation | iOS DataExport | iOS Push (SproutActionsView) |
|-------|--------|-------------|---------------------|---------------------|----------------|------------------------------|
| type | R | R | ✓ merged | ✓ switch key | R | ✓ (arg to pushEvent) |
| timestamp | R | R (BaseEvent) | ✓ merged | ✓ clientTimestamp | R | ✓ (pushEvent wrapper only) |
| sproutId | R | R | ✓ in payload | R (guard) | O (String?) | R |
| soilReturned | R (number ≥ 0) | R (number) | ✓ in payload | O (getDouble, default 0) | O (**Int?** !) | R (.double) |
| client_id | — | O (BaseEvent) | ✓ merged | — (wrapper) | — | — (wrapper) |

### Gaps

1. **iOS DataExport `soilReturned: Int?`** — Should be `Double?`. Fractional soil returns are common (e.g., `2.5` in test fixtures). Export/import truncates to Int, losing precision.
2. **iOS push omits `timestamp` from payload** — Only `sproutId` and `soilReturned` in payload dict. The `pushEvent` wrapper adds `clientTimestamp` separately. This works because EventDerivation reads from `event.clientTimestamp`, not `payload.timestamp`. But export (DataExport) would use its own timestamp logic.

---

## 5. `sun_shone`

| Field | Schema | Web types.ts | Web sync round-trip | iOS EventDerivation | iOS DataExport | iOS Push (ShineView) |
|-------|--------|-------------|---------------------|---------------------|----------------|----------------------|
| type | R | R | ✓ merged | ✓ switch key | R | ✓ (arg to pushEvent) |
| timestamp | R | R (BaseEvent) | ✓ merged | ✓ clientTimestamp | R | ✓ (in payload + wrapper) |
| twigId | R | R | ✓ in payload | O (getString, default "") | O (String?) | R |
| twigLabel | R | R | ✓ in payload | O (getString, default "") | O (String?) | R |
| content | R | R | ✓ in payload | O (getString, default "") | O (String?) | R |
| prompt | O | O | ✓ in payload | O (getString) | O (String?) | R (selectedPrompt) |
| client_id | — | O (BaseEvent) | ✓ merged | — (wrapper) | — | — (wrapper) |

### Gaps

1. **Existing test fixtures omit `prompt`** — Several `sun_shone` events in `event-derivation.json` lack `prompt`. This is valid (schema says optional).
2. **iOS EventDerivation defaults to ""** — `twigId`, `twigLabel`, `content` default to empty string if missing, unlike guards that skip the event. Could produce sun entries with empty content.
3. **Web `validateEvent()` only checks `twigId`** — Doesn't validate `twigLabel` or `content` despite schema requiring them.

---

## 6. `leaf_created`

| Field | Schema | Web types.ts | Web sync round-trip | iOS EventDerivation | iOS DataExport | iOS Push (CreateSproutView) |
|-------|--------|-------------|---------------------|---------------------|----------------|-----------------------------|
| type | R | R | ✓ merged | ✓ switch key | R | ✓ (arg to pushEvent) |
| timestamp | R | R (BaseEvent) | ✓ merged | ✓ clientTimestamp | R | ✓ (pushEvent wrapper) |
| leafId | R | R | ✓ in payload | R (guard) | O (String?) | R |
| twigId | R | R | ✓ in payload | R (guard) | O (String?) | R |
| name | R | R | ✓ in payload | R (guard) | O (String?) | R |
| client_id | — | O (BaseEvent) | ✓ merged | — (wrapper) | — | — (wrapper) |

### Gaps

1. **Web `validateEvent()` doesn't check `twigId`** — Only checks `leafId` and `name`.

---

## Summary of All Gaps

### Critical (data loss / incorrect behavior)

| # | Gap | Affected | Impact |
|---|-----|----------|--------|
| C1 | iOS DataExport `soilCost: Int?` should be `Double?` | Export/import | Truncates fractional soil costs |
| C2 | iOS DataExport `soilReturned: Int?` should be `Double?` | Export/import | Truncates fractional soil returns (e.g., 2.5 → 2) |
| C3 | iOS harvest push missing `reflection` | iOS → cloud → web | Web users never see iOS harvest reflections |

### Medium (schema non-compliance)

| # | Gap | Affected | Impact |
|---|-----|----------|--------|
| M1 | iOS push `leafId` conditional for sprout_planted | iOS → cloud | Schema requires leafId; missing leafId breaks web derivation (no guard) |
| M2 | Web `validateEvent()` incomplete | Web import/sync | Accepts events missing required fields per schema |
| M3 | Existing test fixtures missing `prompt` on sprout_watered | Tests | Fixtures violate schema; tests pass anyway due to lenient validation |
| M4 | iOS bloom fields sent as empty string "" vs web `undefined` | Sync | Minor format difference; both platforms handle it |

### Low (defensive defaults mask the issue)

| # | Gap | Affected | Impact |
|---|-----|----------|--------|
| L1 | iOS EventDerivation defaults missing fields to "" | Derivation | Produces entries with empty strings instead of failing |
| L2 | iOS EventDerivation `soilCost`/`soilReturned` default to 0 | Derivation | Malformed events processed without error |

---

## Maximal Test Events (all fields populated)

These represent the "fully loaded" version of each event type for cross-platform test fixtures:

```json
{
  "sprout_planted": {
    "type": "sprout_planted",
    "timestamp": "2026-01-15T10:30:00.000Z",
    "sproutId": "sprout-abc123",
    "twigId": "branch-2-twig-5",
    "title": "Learn guitar chords",
    "season": "3m",
    "environment": "firm",
    "soilCost": 7.5,
    "leafId": "leaf-xyz789",
    "bloomWither": "Give up after first week",
    "bloomBudding": "Know 5 basic chords",
    "bloomFlourish": "Play 3 full songs"
  },

  "sprout_watered": {
    "type": "sprout_watered",
    "timestamp": "2026-01-16T08:15:00.000Z",
    "sproutId": "sprout-abc123",
    "content": "Practiced Am and C chords for 20 minutes",
    "prompt": "What did you work on today?"
  },

  "sprout_harvested": {
    "type": "sprout_harvested",
    "timestamp": "2026-04-15T18:00:00.000Z",
    "sproutId": "sprout-abc123",
    "result": 4,
    "reflection": "Learned 6 chords and can play 2 songs. Close to goal.",
    "capacityGained": 1.205
  },

  "sprout_uprooted": {
    "type": "sprout_uprooted",
    "timestamp": "2026-02-01T14:00:00.000Z",
    "sproutId": "sprout-def456",
    "soilReturned": 3.75
  },

  "sun_shone": {
    "type": "sun_shone",
    "timestamp": "2026-01-20T09:00:00.000Z",
    "twigId": "branch-2-twig-5",
    "twigLabel": "music",
    "content": "Really enjoying the creative outlet. Want to explore more.",
    "prompt": "How did this area of your life feel this week?"
  },

  "leaf_created": {
    "type": "leaf_created",
    "timestamp": "2026-01-14T10:00:00.000Z",
    "leafId": "leaf-xyz789",
    "twigId": "branch-2-twig-5",
    "name": "Guitar Journey"
  }
}
```

### Notes for fixture design (Task B4)

- `soilCost` MUST be fractional (e.g., 7.5) to catch the iOS Int truncation bug
- `soilReturned` MUST be fractional (e.g., 3.75) to catch the iOS Int truncation bug
- `reflection` MUST be present on harvested events to catch the iOS push omission
- `prompt` MUST be present on ALL sprout_watered events to match schema
- `leafId` MUST be present on ALL sprout_planted events to match schema
- All bloom fields should be populated to test full round-trip
- Timestamps MUST use millisecond precision `.000Z` format per schema pattern
