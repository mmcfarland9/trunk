# Event Derivation Algorithm

This document describes the event derivation state machine in language-agnostic pseudocode. Both web (TypeScript) and iOS (Swift) platforms **must** implement this algorithm identically. The event log is immutable — state is always recomputed by replaying events from the beginning.

Reference implementations:
- Web: `web/src/events/derive.ts`
- iOS: `ios/Trunk/Services/EventDerivation.swift`

---

## Overview

The derivation algorithm replays an ordered sequence of events to produce the current application state. There is no mutable stored state — everything is derived on demand from the event log.

```
Events (immutable log) → deriveState() → DerivedState (ephemeral)
```

---

## Derived State Shape

```
DerivedState {
  soilCapacity:  Decimal       // Total soil capacity (grows over lifetime)
  soilAvailable: Decimal       // Currently available soil (spent/recovered)
  sprouts:       Map<ID, DerivedSprout>
  leaves:        Map<ID, DerivedLeaf>
  sunEntries:    List<SunEntry>
}
```

### DerivedSprout

```
DerivedSprout {
  id:             String
  twigId:         String
  title:          String
  season:         Enum("2w", "1m", "3m", "6m", "1y")
  environment:    Enum("fertile", "firm", "barren")
  soilCost:       Integer
  leafId:         String?        // Optional link to a leaf saga
  bloomWither:    String?        // 1/5 outcome description
  bloomBudding:   String?        // 3/5 outcome description
  bloomFlourish:  String?        // 5/5 outcome description
  state:          Enum("active", "completed", "uprooted")   // No "draft" or "failed"
  plantedAt:      Timestamp
  harvestedAt:    Timestamp?
  result:         Integer?       // 1-5 when harvested
  reflection:     String?
  uprootedAt:     Timestamp?
  waterEntries:   List<WaterEntry>
}
```

### DerivedLeaf

```
DerivedLeaf {
  id:         String
  twigId:     String
  name:       String
  createdAt:  Timestamp
}
```

### SunEntry

```
SunEntry {
  timestamp:  Timestamp
  content:    String
  prompt:     String?
  twigId:     String
  twigLabel:  String
}
```

### WaterEntry

```
WaterEntry {
  timestamp:  Timestamp
  content:    String
  prompt:     String?
}
```

---

## Event Types

All events carry a `timestamp` (ISO 8601 string) and a `type` discriminator.

| Type | Key Fields | Description |
|------|-----------|-------------|
| `sprout_planted` | sproutId, twigId, title, season, environment, soilCost, leafId?, bloom* | A new sprout is planted |
| `sprout_watered` | sproutId, content, prompt? | Daily engagement with an active sprout |
| `sprout_harvested` | sproutId, result (1-5), reflection?, capacityGained | Sprout completed, soil capacity gained |
| `sprout_uprooted` | sproutId, soilReturned | Sprout abandoned, partial soil returned |
| `sun_shone` | twigId, twigLabel, content, prompt? | Weekly reflection on a twig |
| `leaf_created` | leafId, twigId, name | New saga started |

---

## Core Algorithm: `deriveState(events)`

### Step 1: Initialize

```
soilCapacity  = STARTING_CAPACITY          // from constants.json: soil.startingCapacity (10)
soilAvailable = STARTING_CAPACITY
sprouts       = empty Map
leaves        = empty Map
sunEntries    = empty List
```

### Step 2: Sort Events

```
sortedEvents = COPY(events)
SORT sortedEvents BY timestamp ASCENDING (chronological order)
```

**Platform note:** The web implementation always sorts because events may arrive out of order (e.g., from import). The iOS implementation assumes events are appended chronologically and skips the sort. Both approaches produce the same result when the event log is well-formed.

### Step 3: Replay Each Event

```
FOR event IN sortedEvents:
    SWITCH event.type:

        CASE "sprout_planted":
            // Deduct soil cost (clamped to zero minimum)
            soilAvailable = MAX(0, soilAvailable - event.soilCost)

            // Create new sprout record
            sprouts[event.sproutId] = DerivedSprout {
                id            = event.sproutId
                twigId        = event.twigId
                title         = event.title
                season        = event.season
                environment   = event.environment
                soilCost      = event.soilCost
                leafId        = event.leafId       // may be null
                bloomWither   = event.bloomWither   // may be null
                bloomBudding  = event.bloomBudding  // may be null
                bloomFlourish = event.bloomFlourish  // may be null
                state         = "active"
                plantedAt     = event.timestamp
                waterEntries  = empty List
            }

        CASE "sprout_watered":
            sprout = sprouts[event.sproutId]
            IF sprout EXISTS:
                APPEND WaterEntry {
                    timestamp = event.timestamp
                    content   = event.content
                    prompt    = event.prompt
                } TO sprout.waterEntries

            // Soil recovery from watering (regardless of sprout existence)
            soilAvailable = MIN(soilAvailable + SOIL_RECOVERY_PER_WATER, soilCapacity)

        CASE "sprout_harvested":
            sprout = sprouts[event.sproutId]
            IF sprout EXISTS:
                sprout.state       = "completed"
                sprout.result      = event.result
                sprout.reflection  = event.reflection
                sprout.harvestedAt = event.timestamp

            // Capacity grows permanently
            soilCapacity += event.capacityGained

            // Return the original planting cost to available soil
            returnedSoil = (sprout EXISTS) ? sprout.soilCost : 0
            soilAvailable = MIN(soilAvailable + returnedSoil, soilCapacity)

        CASE "sprout_uprooted":
            // Return partial soil (amount specified in event)
            soilAvailable = MIN(soilAvailable + event.soilReturned, soilCapacity)

            // Transition sprout to uprooted state (preserve all data)
            sprout = sprouts[event.sproutId]
            IF sprout EXISTS AND sprout.state == "active":
                sprout.state = "uprooted"
                sprout.uprootedAt = event.timestamp

        CASE "sun_shone":
            APPEND SunEntry {
                timestamp = event.timestamp
                content   = event.content
                prompt    = event.prompt
                twigId    = event.twigId
                twigLabel = event.twigLabel
            } TO sunEntries

            // Soil recovery from sun
            soilAvailable = MIN(soilAvailable + SOIL_RECOVERY_PER_SUN, soilCapacity)

        CASE "leaf_created":
            leaves[event.leafId] = DerivedLeaf {
                id        = event.leafId
                twigId    = event.twigId
                name      = event.name
                createdAt = event.timestamp
            }
```

### Step 4: Build Indexes

After replaying all events, build O(1) lookup indexes:

```
activeSproutsByTwig = empty Map
sproutsByTwig       = empty Map
sproutsByLeaf       = empty Map
leavesByTwig        = empty Map

FOR sprout IN sprouts.values():
    // Index all sprouts by twig
    IF NOT sproutsByTwig[sprout.twigId]:
        sproutsByTwig[sprout.twigId] = []
    APPEND sprout TO sproutsByTwig[sprout.twigId]

    // Index active sprouts by twig
    IF sprout.state == "active":
        IF NOT activeSproutsByTwig[sprout.twigId]:
            activeSproutsByTwig[sprout.twigId] = []
        APPEND sprout TO activeSproutsByTwig[sprout.twigId]

    // Index sprouts by leaf
    IF sprout.leafId:
        IF NOT sproutsByLeaf[sprout.leafId]:
            sproutsByLeaf[sprout.leafId] = []
        APPEND sprout TO sproutsByLeaf[sprout.leafId]

FOR leaf IN leaves.values():
    // Index leaves by twig
    IF NOT leavesByTwig[leaf.twigId]:
        leavesByTwig[leaf.twigId] = []
    APPEND leaf TO leavesByTwig[leaf.twigId]
```

### Step 5: Return State

```
RETURN DerivedState {
    soilCapacity,
    soilAvailable,
    sprouts,
    leaves,
    sunEntries,
    activeSproutsByTwig,
    sproutsByTwig,
    sproutsByLeaf,
    leavesByTwig
}
```

**Note**: The indexes enable fast queries like "get all active sprouts for this twig" without scanning all sprouts.

---

## Soil Tracking Invariants

These invariants must hold after processing every event:

1. `soilAvailable >= 0` (clamped on plant)
2. `soilAvailable <= soilCapacity` (clamped on recovery/return)
3. `soilCapacity` only increases (via `sprout_harvested.capacityGained`)
4. `soilCapacity` starts at `STARTING_CAPACITY` (10)

### Soil Flow Summary

| Event | soilCapacity Change | soilAvailable Change |
|-------|--------------------|--------------------|
| `sprout_planted` | none | `-event.soilCost` (clamped to 0) |
| `sprout_watered` | none | `+SOIL_RECOVERY_PER_WATER` (clamped to capacity) |
| `sprout_harvested` | `+event.capacityGained` | `+sprout.soilCost` (clamped to new capacity) |
| `sprout_uprooted` | none | `+event.soilReturned` (clamped to capacity) |
| `sun_shone` | none | `+SOIL_RECOVERY_PER_SUN` (clamped to capacity) |
| `leaf_created` | none | none |

### Constants (from `shared/constants.json`)

| Constant | Path | Value |
|----------|------|-------|
| STARTING_CAPACITY | `soil.startingCapacity` | 10 |
| MAX_CAPACITY | `soil.maxCapacity` | 120 |
| SOIL_RECOVERY_PER_WATER | `soil.recoveryRates.waterUse` | 0.05 |
| SOIL_RECOVERY_PER_SUN | `soil.recoveryRates.sunUse` | 0.35 |
| WATER_DAILY_CAPACITY | `water.dailyCapacity` | 3 |
| SUN_WEEKLY_CAPACITY | `sun.weeklyCapacity` | 1 |

---

## Resource Availability Derivation

Water and sun availability are **not** stored — they are derived from events relative to reset times.

### Water Available

```
FUNCTION deriveWaterAvailable(events, now):
    resetTime = getTodayResetTime(now)

    waterCount = COUNT events WHERE
        event.type == "sprout_watered"
        AND event.timestamp >= resetTime

    RETURN MAX(0, WATER_DAILY_CAPACITY - waterCount)
```

### Sun Available

```
FUNCTION deriveSunAvailable(events, now):
    resetTime = getWeekResetTime(now)

    sunCount = COUNT events WHERE
        event.type == "sun_shone"
        AND event.timestamp >= resetTime

    RETURN MAX(0, SUN_WEEKLY_CAPACITY - sunCount)
```

### Reset Time Calculations

Both resources reset at the **reset hour** (6 AM local time, from `water.resetHour` / `sun.resetHour`).

**Daily reset (water):**
```
FUNCTION getTodayResetTime(now):
    reset = today at RESET_HOUR:00:00 local time
    IF now < reset:
        reset = yesterday at RESET_HOUR:00:00 local time
    RETURN reset
```

**Weekly reset (sun):**
```
FUNCTION getWeekResetTime(now):
    // Find the most recent Monday at RESET_HOUR:00
    daysSinceMonday = (dayOfWeek(now) + 6) MOD 7
        // Monday=0, Tuesday=1, ..., Sunday=6
    mondayReset = (today - daysSinceMonday days) at RESET_HOUR:00:00 local time

    IF daysSinceMonday == 0 AND now < mondayReset:
        mondayReset = mondayReset - 7 days
    RETURN mondayReset
```

---

## Query Functions

These helper functions filter the derived state. Both platforms must implement them.

### Sprout Queries

```
getSproutsForTwig(state, twigId):
    RETURN all sprouts WHERE sprout.twigId == twigId

getActiveSprouts(state):
    RETURN all sprouts WHERE sprout.state == "active"

getCompletedSprouts(state):
    RETURN all sprouts WHERE sprout.state == "completed"

getSproutsByLeaf(state, leafId):
    RETURN all sprouts WHERE sprout.leafId == leafId
```

### Leaf Queries

```
getLeavesForTwig(state, twigId):
    RETURN all leaves WHERE leaf.twigId == twigId

getLeafById(state, leafId):
    RETURN leaves[leafId]
```

### Time-Based Queries

```
wasSproutWateredThisWeek(events, sproutId, now):
    resetTime = getWeekResetTime(now)
    RETURN EXISTS event WHERE
        event.type == "sprout_watered"
        AND event.sproutId == sproutId
        AND event.timestamp >= resetTime

wasShoneThisWeek(events, now):
    resetTime = getWeekResetTime(now)
    RETURN EXISTS event WHERE
        event.type == "sun_shone"
        AND event.timestamp >= resetTime
```

---

## End Date Calculation

When converting a derived sprout to the legacy display format, the end date is computed:

```
FUNCTION calculateEndDate(plantedAt, season):
    durationMs = constants.seasons[season].durationMs
    end = plantedAt + durationMs
    SET end time to 9:00 AM CST (15:00 UTC)
    RETURN end as ISO string
```

---

## ID Generation

Both platforms use UUID-based generation with prefixes:

```
FUNCTION generateSproutId():
    RETURN "sprout-" + crypto.randomUUID()
    // Example: "sprout-a1b2c3d4-e5f6-7890-abcd-ef1234567890"

FUNCTION generateLeafId():
    RETURN "leaf-" + crypto.randomUUID()
    // Example: "leaf-a1b2c3d4-e5f6-7890-abcd-ef1234567890"
```

**Web**: Uses `crypto.randomUUID()` (browser API)
**iOS**: Uses `UUID().uuidString.lowercased()` (Swift Foundation)

---

## Anti-Cheat Properties

Because all state is derived from the event log:

1. **Resources cannot be fabricated** — soil, water, and sun are computed from events
2. **History is preserved** — the event log is append-only
3. **Replay is deterministic** — same events always produce same state
4. **Export captures full history** — any state can be reconstructed from events alone
