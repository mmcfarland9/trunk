# Comprehensive Testing Design for Trunk

**Date:** 2026-01-30
**Status:** Draft - Pending Approval

## Overview

This document defines every unit test, integration test, and E2E test needed for robust test coverage across the Trunk monorepo. The goal is to catch regressions before they ship and build confidence in cross-platform data integrity.

**Current State:**
- Web: 11 unit test files, 1 E2E test
- iOS: 0 unit tests, 1 Maestro smoke test

**Target State:**
- Web: ~120 unit tests, 5 E2E workflows
- iOS: ~80 unit tests (Swift Testing), 4 Maestro flows
- Shared: Cross-platform round-trip verification

---

## Part 1: Web App Unit Tests

### 1.1 Soil System (15 tests)

```
src/tests/soil.test.ts
```

| # | Test Name | Function | Assertion |
|---|-----------|----------|-----------|
| 1 | calculates soil cost for 2w/fertile | `calculateSoilCost()` | Returns 2 |
| 2 | calculates soil cost for 2w/firm | `calculateSoilCost()` | Returns 3 |
| 3 | calculates soil cost for 2w/barren | `calculateSoilCost()` | Returns 4 |
| 4 | calculates soil cost for 1m/fertile | `calculateSoilCost()` | Returns 3 |
| 5 | calculates soil cost for 1m/firm | `calculateSoilCost()` | Returns 5 |
| 6 | calculates soil cost for 1m/barren | `calculateSoilCost()` | Returns 6 |
| 7 | calculates soil cost for 3m/fertile | `calculateSoilCost()` | Returns 5 |
| 8 | calculates soil cost for 3m/firm | `calculateSoilCost()` | Returns 8 |
| 9 | calculates soil cost for 3m/barren | `calculateSoilCost()` | Returns 10 |
| 10 | calculates soil cost for 6m/fertile | `calculateSoilCost()` | Returns 8 |
| 11 | calculates soil cost for 6m/firm | `calculateSoilCost()` | Returns 12 |
| 12 | calculates soil cost for 6m/barren | `calculateSoilCost()` | Returns 16 |
| 13 | calculates soil cost for 1y/fertile | `calculateSoilCost()` | Returns 12 |
| 14 | calculates soil cost for 1y/firm | `calculateSoilCost()` | Returns 18 |
| 15 | calculates soil cost for 1y/barren | `calculateSoilCost()` | Returns 24 |

### 1.2 Capacity Reward System (12 tests)

```
src/tests/capacity-reward.test.ts
```

| # | Test Name | Function | Assertion |
|---|-----------|----------|-----------|
| 16 | calculates base reward for 2w season | `calculateCapacityReward()` | Base = 2 before multipliers |
| 17 | calculates base reward for 1y season | `calculateCapacityReward()` | Base = 12 before multipliers |
| 18 | applies fertile environment multiplier (1.1x) | `calculateCapacityReward()` | base × 1.1 |
| 19 | applies firm environment multiplier (1.75x) | `calculateCapacityReward()` | base × 1.75 |
| 20 | applies barren environment multiplier (2.4x) | `calculateCapacityReward()` | base × 2.4 |
| 21 | applies result=1 multiplier (0.4x) | `calculateCapacityReward()` | × 0.4 |
| 22 | applies result=3 multiplier (0.7x) | `calculateCapacityReward()` | × 0.7 |
| 23 | applies result=5 multiplier (1.0x) | `calculateCapacityReward()` | × 1.0 |
| 24 | diminishing returns at capacity=0 | `calculateCapacityReward()` | Full reward (factor=1.0) |
| 25 | diminishing returns at capacity=50 | `calculateCapacityReward()` | ~35% reward |
| 26 | diminishing returns at capacity=99 | `calculateCapacityReward()` | Near-zero reward |
| 27 | full formula: 1y/barren/result5/cap0 | `calculateCapacityReward()` | 12 × 2.4 × 1.0 × 1.0 = 28.8 |

### 1.3 Soil State Management (8 tests)

```
src/tests/soil-state.test.ts
```

| # | Test Name | Function | Assertion |
|---|-----------|----------|-----------|
| 28 | spendSoil decrements available | `spendSoil()` | available -= cost |
| 29 | spendSoil logs reason | `spendSoil()` | soilLog contains entry |
| 30 | spendSoil persists to storage | `spendSoil()` | localStorage updated |
| 31 | spendSoil cannot go negative | `spendSoil()` | Throws or clamps at 0 |
| 32 | recoverSoil increments available | `recoverSoil()` | available += amount |
| 33 | recoverSoil clamps to capacity | `recoverSoil()` | Never exceeds capacity |
| 34 | recoverSoil logs reason | `recoverSoil()` | soilLog contains entry |
| 35 | canAffordSoil returns true when exact | `canAffordSoil()` | available === cost → true |

### 1.4 Water System (14 tests)

```
src/tests/water.test.ts
```

| # | Test Name | Function | Assertion |
|---|-----------|----------|-----------|
| 36 | getTodayResetTime returns 6am today after 6am | `getTodayResetTime()` | Today at 06:00 |
| 37 | getTodayResetTime returns 6am yesterday before 6am | `getTodayResetTime()` | Yesterday at 06:00 |
| 38 | getTodayResetTime handles exactly 6am | `getTodayResetTime()` | Today at 06:00 |
| 39 | getWaterUsedToday counts 0 when no entries | `getWaterUsedToday()` | Returns 0 |
| 40 | getWaterUsedToday counts entries since reset | `getWaterUsedToday()` | Counts correctly |
| 41 | getWaterUsedToday ignores entries before reset | `getWaterUsedToday()` | Old entries excluded |
| 42 | getWaterAvailable computes capacity - used | `getWaterAvailable()` | 3 - used |
| 43 | getWaterAvailable returns 0 when all used | `getWaterAvailable()` | Returns 0 |
| 44 | wasWateredThisWeek true for recent entry | `wasWateredThisWeek()` | Returns true |
| 45 | wasWateredThisWeek false for old entry | `wasWateredThisWeek()` | Returns false |
| 46 | wasWateredThisWeek false for no entries | `wasWateredThisWeek()` | Returns false |
| 47 | getAllWaterEntries flattens from all sprouts | `getAllWaterEntries()` | All entries combined |
| 48 | getAllWaterEntries sorts reverse-chrono | `getAllWaterEntries()` | Newest first |
| 49 | addWaterEntry appends and invalidates cache | `addWaterEntry()` | Entry added, cache cleared |

### 1.5 Sun System (12 tests)

```
src/tests/sun.test.ts
```

| # | Test Name | Function | Assertion |
|---|-----------|----------|-----------|
| 50 | getWeekResetTime returns Sunday 6am | `getWeekResetTime()` | Sunday at 06:00 |
| 51 | getWeekResetTime handles mid-week | `getWeekResetTime()` | Previous Sunday |
| 52 | getWeekResetTime handles Sunday before 6am | `getWeekResetTime()` | Previous Sunday |
| 53 | getSunUsedThisWeek counts 0 when no entries | `getSunUsedThisWeek()` | Returns 0 |
| 54 | getSunUsedThisWeek counts entries since reset | `getSunUsedThisWeek()` | Counts correctly |
| 55 | getSunUsedThisWeek ignores old entries | `getSunUsedThisWeek()` | Old entries excluded |
| 56 | getSunAvailable computes capacity - used | `getSunAvailable()` | 1 - used |
| 57 | wasShoneThisWeek true for recent entry | `wasShoneThisWeek()` | Returns true |
| 58 | wasShoneThisWeek false for old entry | `wasShoneThisWeek()` | Returns false |
| 59 | addSunEntry appends to sunLog | `addSunEntry()` | Entry added |
| 60 | addSunEntry includes context fields | `addSunEntry()` | twigId, twigLabel present |
| 61 | formatResetTime formats correctly | `formatResetTime()` | "Resets Wed 01/22 at 6:00 AM" |

### 1.6 Sprout Helpers (10 tests)

```
src/tests/sprout-helpers.test.ts
```

| # | Test Name | Function | Assertion |
|---|-----------|----------|-----------|
| 62 | generateSproutId creates unique IDs | `generateSproutId()` | No collisions in 1000 calls |
| 63 | generateSproutId includes timestamp | `generateSproutId()` | Contains date component |
| 64 | getSproutsByState filters by state | `getSproutsByState()` | Only matching state returned |
| 65 | getActiveSprouts returns only active | `getActiveSprouts()` | state === 'active' |
| 66 | getHistorySprouts returns only completed | `getHistorySprouts()` | state === 'completed' |
| 67 | generateLeafId creates unique IDs | `generateLeafId()` | No collisions |
| 68 | getTwigLeaves returns leaves for twig | `getTwigLeaves()` | Filtered by twigId |
| 69 | getLeafById finds correct leaf | `getLeafById()` | Returns matching leaf |
| 70 | getSproutsByLeaf filters by leafId | `getSproutsByLeaf()` | Only matching leafId |
| 71 | createLeaf assigns ID and persists | `createLeaf()` | Leaf in state, saved |

### 1.7 Node State & Persistence (12 tests)

```
src/tests/persistence.test.ts
```

| # | Test Name | Function | Assertion |
|---|-----------|----------|-----------|
| 72 | loadState reads from localStorage | `loadState()` | Data loaded correctly |
| 73 | loadState runs migrations | `loadState()` | Old versions upgraded |
| 74 | loadState falls back to preset | `loadState()` | Empty storage → preset |
| 75 | saveState writes to localStorage | `saveState()` | Data persisted |
| 76 | saveState includes version number | `saveState()` | Version field present |
| 77 | saveState handles quota errors | `saveState()` | Graceful degradation |
| 78 | clearState removes all data | `clearState()` | nodeState empty |
| 79 | normalizeNodeData handles legacy goals | `normalizeNodeData()` | Converted to sprouts |
| 80 | normalizeNodeData preserves valid data | `normalizeNodeData()` | No data loss |
| 81 | getPresetLabel returns preset value | `getPresetLabel()` | Correct label |
| 82 | safeSetItem detects quota errors | `safeSetItem()` | Returns false on quota |
| 83 | safeSetItem succeeds normally | `safeSetItem()` | Returns true |

### 1.8 Event System - Migration (10 tests)

```
src/tests/events/migrate.test.ts (expand existing)
```

| # | Test Name | Function | Assertion |
|---|-----------|----------|-----------|
| 84 | migrateToEvents creates leaf events | `migrateToEvents()` | LeafCreated for each leaf |
| 85 | migrateToEvents creates sprout events | `migrateToEvents()` | SproutPlanted for each |
| 86 | migrateToEvents creates water events | `migrateToEvents()` | SproutWatered for entries |
| 87 | migrateToEvents creates harvest events | `migrateToEvents()` | SproutHarvested for completed |
| 88 | migrateToEvents creates sun events | `migrateToEvents()` | SunShone for sunLog |
| 89 | migrateToEvents preserves timestamps | `migrateToEvents()` | Original dates kept |
| 90 | migrateToEvents handles empty state | `migrateToEvents()` | Empty array returned |
| 91 | migrateToEvents calculates capacity gains | `migrateToEvents()` | capacityGained present |
| 92 | validateMigration counts correctly | `validateMigration()` | Counts match |
| 93 | validateMigration detects loss | `validateMigration()` | Returns false on mismatch |

### 1.9 Event System - Rebuild (10 tests)

```
src/tests/events/rebuild.test.ts (expand existing)
```

| # | Test Name | Function | Assertion |
|---|-----------|----------|-----------|
| 94 | rebuildFromEvents reconstructs leaves | `rebuildFromEvents()` | All leaves present |
| 95 | rebuildFromEvents reconstructs sprouts | `rebuildFromEvents()` | All sprouts present |
| 96 | rebuildFromEvents links water entries | `rebuildFromEvents()` | Entries on correct sprout |
| 97 | rebuildFromEvents sets harvest state | `rebuildFromEvents()` | Completed sprouts correct |
| 98 | rebuildFromEvents handles uprooted | `rebuildFromEvents()` | Uprooted sprouts excluded |
| 99 | rebuildFromEvents groups by twig | `rebuildFromEvents()` | Correct nodeId grouping |
| 100 | rebuildFromEvents handles out-of-order | `rebuildFromEvents()` | Water before plant OK |
| 101 | rebuildFromEvents handles missing refs | `rebuildFromEvents()` | Skips orphaned events |
| 102 | validateRebuild counts correctly | `validateRebuild()` | Entity counts match |
| 103 | full round-trip preserves all data | migrate→rebuild | Byte-identical output |

### 1.10 Event System - Derive (12 tests)

```
src/tests/events/derive.test.ts
```

| # | Test Name | Function | Assertion |
|---|-----------|----------|-----------|
| 104 | deriveState calculates soil capacity | `deriveState()` | Correct from harvest events |
| 105 | deriveState calculates soil available | `deriveState()` | Correct after spend/earn |
| 106 | deriveState counts water available | `deriveState()` | 3 - today's waters |
| 107 | deriveState counts sun available | `deriveState()` | 1 - week's suns |
| 108 | deriveWaterAvailable handles reset | `deriveWaterAvailable()` | Resets at 6am |
| 109 | deriveSunAvailable handles reset | `deriveSunAvailable()` | Resets Sunday 6am |
| 110 | getSproutsForTwig filters correctly | `getSproutsForTwig()` | By twigId |
| 111 | getLeavesForTwig filters correctly | `getLeavesForTwig()` | By twigId |
| 112 | getActiveSprouts filters state | `getActiveSprouts()` | Only active |
| 113 | getCompletedSprouts filters state | `getCompletedSprouts()` | Only completed |
| 114 | toSprout converts with endDate | `toSprout()` | Calculated correctly |
| 115 | calculateEndDate adds duration | `calculateEndDate()` | plantedAt + season |

### 1.11 Import/Export (10 tests)

```
src/tests/import-export.test.ts (expand existing)
```

| # | Test Name | Function | Assertion |
|---|-----------|----------|-----------|
| 116 | handleExport generates valid JSON | `handleExport()` | Parseable JSON |
| 117 | handleExport includes version | `handleExport()` | version: 4 |
| 118 | handleExport includes all events | `handleExport()` | All data present |
| 119 | handleImport parses v4 format | `handleImport()` | Rebuilds correctly |
| 120 | handleImport parses legacy format | `handleImport()` | Migrates and rebuilds |
| 121 | handleImport validates structure | `handleImport()` | Rejects invalid JSON |
| 122 | handleImport sanitizes sprouts | `handleImport()` | Invalid fields fixed |
| 123 | checkExportReminder triggers after 7d | `checkExportReminder()` | Shows reminder |
| 124 | recordExportDate persists | `recordExportDate()` | Timestamp saved |
| 125 | getLastExportDate reads correctly | `getLastExportDate()` | Timestamp returned |

### 1.12 Validation & Sanitization (8 tests)

```
src/tests/validate-import.test.ts (expand existing)
```

| # | Test Name | Function | Assertion |
|---|-----------|----------|-----------|
| 126 | validateSprout accepts valid sprout | `validateSprout()` | Returns true |
| 127 | validateSprout rejects missing id | `validateSprout()` | Returns false |
| 128 | validateSprout warns on missing optional | `validateSprout()` | Warning logged |
| 129 | validateLeaf accepts valid leaf | `validateLeaf()` | Returns true |
| 130 | validateLeaf rejects missing name | `validateLeaf()` | Returns false |
| 131 | sanitizeSprout fixes invalid state | `sanitizeSprout()` | State normalized |
| 132 | sanitizeSprout handles legacy fields | `sanitizeSprout()` | Converted correctly |
| 133 | sanitizeLeaf fixes invalid data | `sanitizeLeaf()` | Data normalized |

### 1.13 Utility Functions (6 tests)

```
src/tests/utils.test.ts
```

| # | Test Name | Function | Assertion |
|---|-----------|----------|-----------|
| 134 | escapeHtml escapes < | `escapeHtml()` | `<` → `&lt;` |
| 135 | escapeHtml escapes > | `escapeHtml()` | `>` → `&gt;` |
| 136 | escapeHtml escapes & | `escapeHtml()` | `&` → `&amp;` |
| 137 | debounce delays execution | `debounce()` | Waits specified time |
| 138 | debounce cancels on re-trigger | `debounce()` | Only last call runs |
| 139 | preventDoubleClick blocks rapid calls | `preventDoubleClick()` | Second call ignored |

### 1.14 Navigation Logic (8 tests)

```
src/tests/navigation.test.ts
```

| # | Test Name | Function | Assertion |
|---|-----------|----------|-----------|
| 140 | setViewMode updates state | `setViewMode()` | viewMode changed |
| 141 | enterBranchView sets branch index | `enterBranchView()` | activeBranchIndex set |
| 142 | enterTwigView sets twig id | `enterTwigView()` | activeTwigId set |
| 143 | returnToOverview clears indices | `returnToOverview()` | All cleared |
| 144 | returnToBranchView keeps branch | `returnToBranchView()` | Branch preserved |
| 145 | setTwigZoomOrigin calculates transform | `setTwigZoomOrigin()` | CSS vars set |
| 146 | updateVisibility toggles classes | `updateVisibility()` | Correct classes |
| 147 | clearAllFadeTimeouts cancels pending | `clearAllFadeTimeouts()` | Timeouts cleared |

### 1.15 Progress & Sidebar (6 tests)

```
src/tests/progress.test.ts
```

| # | Test Name | Function | Assertion |
|---|-----------|----------|-----------|
| 148 | getAllSproutsFromState collects all | `getAllSproutsFromState()` | All sprouts found |
| 149 | groupByBranch groups correctly | `groupByBranch()` | Map keyed by branch |
| 150 | groupByTwig groups correctly | `groupByTwig()` | Map keyed by twigId |
| 151 | groupByLeaf separates standalone | `groupByLeaf()` | Two groups returned |
| 152 | formatEndDate shows READY when due | `formatEndDate()` | "READY" for past |
| 153 | parseBranchIndex extracts index | `parseBranchIndex()` | Correct number |

### 1.16 Dialog Logic (10 tests)

```
src/tests/dialogs.test.ts
```

| # | Test Name | Function | Assertion |
|---|-----------|----------|-----------|
| 154 | saveWaterEntry spends water | `saveWaterEntry()` | Water decremented |
| 155 | saveWaterEntry recovers soil | `saveWaterEntry()` | Soil increased |
| 156 | saveWaterEntry adds entry to sprout | `saveWaterEntry()` | Entry appended |
| 157 | saveSunEntry spends sun | `saveSunEntry()` | Sun decremented |
| 158 | saveSunEntry recovers soil | `saveSunEntry()` | Soil increased |
| 159 | saveSunEntry adds to log | `saveSunEntry()` | Entry in sunLog |
| 160 | saveHarvest marks completed | `saveHarvest()` | state = completed |
| 161 | saveHarvest returns soil cost | `saveHarvest()` | Soil restored |
| 162 | saveHarvest earns capacity | `saveHarvest()` | Capacity increased |
| 163 | getRandomPrompt avoids repeats | `getRandomPrompt()` | Excludes recent |

### 1.17 Hover Detection (6 tests)

```
src/tests/hover.test.ts
```

| # | Test Name | Function | Assertion |
|---|-----------|----------|-----------|
| 164 | getBranchIndexFromPosition detects branch 0 | `getBranchIndexFromPosition()` | Angle → index 0 |
| 165 | getBranchIndexFromPosition detects branch 4 | `getBranchIndexFromPosition()` | Angle → index 4 |
| 166 | getEllipseRadii calculates radii | `getEllipseRadii()` | Correct inner/outer |
| 167 | handleWheel accumulates scroll | `handleWheel()` | Threshold triggers zoom |
| 168 | handleMove detects ring hover | `handleMove()` | Inside ring → branch set |
| 169 | handleMove clears outside ring | `handleMove()` | Outside ring → null |

---

## Part 2: iOS App Unit Tests (Swift Testing)

### 2.1 ProgressionService - Soil Costs (15 tests)

```
TrunkTests/ProgressionServiceTests.swift
```

| # | Test Name | Method | Assertion |
|---|-----------|--------|-----------|
| 1 | soilCost_twoWeeks_fertile | `soilCost()` | Returns 2 |
| 2 | soilCost_twoWeeks_firm | `soilCost()` | Returns 3 |
| 3 | soilCost_twoWeeks_barren | `soilCost()` | Returns 4 |
| 4 | soilCost_oneMonth_fertile | `soilCost()` | Returns 3 |
| 5 | soilCost_oneMonth_firm | `soilCost()` | Returns 5 |
| 6 | soilCost_oneMonth_barren | `soilCost()` | Returns 6 |
| 7 | soilCost_threeMonths_fertile | `soilCost()` | Returns 5 |
| 8 | soilCost_threeMonths_firm | `soilCost()` | Returns 8 |
| 9 | soilCost_threeMonths_barren | `soilCost()` | Returns 10 |
| 10 | soilCost_sixMonths_fertile | `soilCost()` | Returns 8 |
| 11 | soilCost_sixMonths_firm | `soilCost()` | Returns 12 |
| 12 | soilCost_sixMonths_barren | `soilCost()` | Returns 16 |
| 13 | soilCost_oneYear_fertile | `soilCost()` | Returns 12 |
| 14 | soilCost_oneYear_firm | `soilCost()` | Returns 18 |
| 15 | soilCost_oneYear_barren | `soilCost()` | Returns 24 |

### 2.2 ProgressionService - Capacity Rewards (12 tests)

```
TrunkTests/CapacityRewardTests.swift
```

| # | Test Name | Method | Assertion |
|---|-----------|--------|-----------|
| 16 | capacityReward_baseReward_twoWeeks | `capacityReward()` | Base = 2 |
| 17 | capacityReward_baseReward_oneYear | `capacityReward()` | Base = 12 |
| 18 | capacityReward_fertileMultiplier | `capacityReward()` | × 1.1 |
| 19 | capacityReward_firmMultiplier | `capacityReward()` | × 1.75 |
| 20 | capacityReward_barrenMultiplier | `capacityReward()` | × 2.4 |
| 21 | capacityReward_result1Multiplier | `capacityReward()` | × 0.4 |
| 22 | capacityReward_result3Multiplier | `capacityReward()` | × 0.7 |
| 23 | capacityReward_result5Multiplier | `capacityReward()` | × 1.0 |
| 24 | diminishingReturns_atZero | `diminishingReturns()` | Returns 1.0 |
| 25 | diminishingReturns_atFifty | `diminishingReturns()` | ~0.354 |
| 26 | diminishingReturns_atNinetyNine | `diminishingReturns()` | Near 0 |
| 27 | capacityReward_fullFormula | `capacityReward()` | 12 × 2.4 × 1.0 × 1.0 |

### 2.3 ProgressionService - Reset Logic (10 tests)

```
TrunkTests/ResetLogicTests.swift
```

| # | Test Name | Method | Assertion |
|---|-----------|--------|-----------|
| 28 | shouldResetWater_afterSixAM | `shouldResetWater()` | Returns true |
| 29 | shouldResetWater_beforeSixAM | `shouldResetWater()` | Returns false |
| 30 | shouldResetWater_exactlySixAM | `shouldResetWater()` | Returns true |
| 31 | shouldResetWater_sameDay | `shouldResetWater()` | Returns false |
| 32 | shouldResetSun_newWeekAfterSixAM | `shouldResetSun()` | Returns true |
| 33 | shouldResetSun_sameWeek | `shouldResetSun()` | Returns false |
| 34 | shouldResetSun_mondayBeforeSixAM | `shouldResetSun()` | Returns false |
| 35 | shouldResetSun_mondayAfterSixAM | `shouldResetSun()` | Returns true |
| 36 | harvestDate_addsDuration | `harvestDate()` | Correct end date |
| 37 | progress_midway | `progress()` | Returns 0.5 |

### 2.4 ProgressionViewModel (12 tests)

```
TrunkTests/ProgressionViewModelTests.swift
```

| # | Test Name | Method | Assertion |
|---|-----------|--------|-----------|
| 38 | canAfford_whenEnough | `canAfford()` | Returns true |
| 39 | canAfford_whenNotEnough | `canAfford()` | Returns false |
| 40 | canAfford_exactAmount | `canAfford()` | Returns true |
| 41 | spendSoil_decrements | `spendSoil()` | Available decreased |
| 42 | spendSoil_persists | `spendSoil()` | UserDefaults updated |
| 43 | returnSoil_increments | `returnSoil()` | Available increased |
| 44 | returnSoil_capsAtCapacity | `returnSoil()` | Never exceeds cap |
| 45 | useWater_whenAvailable | `useWater()` | Returns true, decrements |
| 46 | useWater_whenEmpty | `useWater()` | Returns false |
| 47 | useSun_whenAvailable | `useSun()` | Returns true, decrements |
| 48 | useSun_whenEmpty | `useSun()` | Returns false |
| 49 | earnCapacity_capsAtMax | `earnCapacity()` | Never exceeds 100 |

### 2.5 ResourceState (8 tests)

```
TrunkTests/ResourceStateTests.swift
```

| # | Test Name | Method | Assertion |
|---|-----------|--------|-----------|
| 50 | defaultState_hasCorrectValues | `defaultState` | 10 soil, 3 water, 1 sun |
| 51 | load_fromEmpty | `load()` | Returns default |
| 52 | load_fromExisting | `load()` | Deserializes correctly |
| 53 | save_persists | `save()` | UserDefaults has data |
| 54 | checkAndReset_newDay | `checkAndResetIfNeeded()` | Water reset |
| 55 | checkAndReset_newWeek | `checkAndResetIfNeeded()` | Sun reset |
| 56 | checkAndReset_sameDay | `checkAndResetIfNeeded()` | No change |
| 57 | checkAndReset_updatesTimestamps | `checkAndResetIfNeeded()` | Timestamps updated |

### 2.6 Sprout Model (10 tests)

```
TrunkTests/SproutModelTests.swift
```

| # | Test Name | Property/Method | Assertion |
|---|-----------|-----------------|-----------|
| 58 | init_setsAllProperties | `init()` | All fields populated |
| 59 | init_setsCreatedAt | `init()` | Timestamp set |
| 60 | init_setsPlantedAt | `init()` | Timestamp set |
| 61 | season_convertsRaw | `season` | Enum matches raw |
| 62 | environment_convertsRaw | `environment` | Enum matches raw |
| 63 | state_convertsRaw | `state` | Enum matches raw |
| 64 | isReady_whenActive_beforeDue | `isReady` | Returns false |
| 65 | isReady_whenActive_afterDue | `isReady` | Returns true |
| 66 | isReady_whenCompleted | `isReady` | Returns false |
| 67 | harvest_setsResult | `harvest()` | Result stored |

### 2.7 Season Enum (5 tests)

```
TrunkTests/SeasonEnumTests.swift
```

| # | Test Name | Property | Assertion |
|---|-----------|----------|-----------|
| 68 | label_twoWeeks | `label` | "2 weeks" |
| 69 | label_oneYear | `label` | "1 year" |
| 70 | durationMs_twoWeeks | `durationMs` | 1209600000 |
| 71 | durationMs_oneMonth | `durationMs` | 2592000000 |
| 72 | durationMs_oneYear | `durationMs` | 31536000000 |

### 2.8 Environment Enum (6 tests)

```
TrunkTests/EnvironmentEnumTests.swift
```

| # | Test Name | Property | Assertion |
|---|-----------|----------|-----------|
| 73 | label_fertile | `label` | "Fertile" |
| 74 | label_barren | `label` | "Barren" |
| 75 | description_fertile | `sproutDescription` | Correct text |
| 76 | description_barren | `sproutDescription` | Correct text |
| 77 | formHint_fertile | `formHint` | Correct hint |
| 78 | formHint_barren | `formHint` | Correct hint |

### 2.9 DataExportService - Event Generation (10 tests)

```
TrunkTests/DataExportServiceTests.swift
```

| # | Test Name | Method | Assertion |
|---|-----------|--------|-----------|
| 79 | generateExport_createsLeafEvents | `generateExport()` | LeafCreated present |
| 80 | generateExport_createsSproutEvents | `generateExport()` | SproutPlanted present |
| 81 | generateExport_createsWaterEvents | `generateExport()` | SproutWatered present |
| 82 | generateExport_createsHarvestEvents | `generateExport()` | SproutHarvested present |
| 83 | generateExport_createsSunEvents | `generateExport()` | SunShone present |
| 84 | generateExport_sortsByTimestamp | `generateExport()` | Chronological order |
| 85 | generateExport_excludesEmptyStrings | `generateExport()` | No "" values |
| 86 | exportToJSON_validJSON | `exportToJSON()` | Parseable |
| 87 | parseImport_validJSON | `parseImport()` | Deserializes |
| 88 | parseImport_invalidJSON | `parseImport()` | Throws error |

### 2.10 DataExportService - Rebuild (8 tests)

```
TrunkTests/RebuildFromEventsTests.swift
```

| # | Test Name | Method | Assertion |
|---|-----------|--------|-----------|
| 89 | rebuild_createsLeaves | `rebuildFromEvents()` | Leaves present |
| 90 | rebuild_createsSprouts | `rebuildFromEvents()` | Sprouts present |
| 91 | rebuild_linksWaterEntries | `rebuildFromEvents()` | On correct sprout |
| 92 | rebuild_setsHarvestState | `rebuildFromEvents()` | State = completed |
| 93 | rebuild_handlesUprooted | `rebuildFromEvents()` | Excluded from results |
| 94 | rebuild_handlesOutOfOrder | `rebuildFromEvents()` | Works correctly |
| 95 | rebuild_handlesMissingRefs | `rebuildFromEvents()` | Skips orphans |
| 96 | roundTrip_preservesData | export→rebuild | Identical output |

### 2.11 SunPrompts (4 tests)

```
TrunkTests/SunPromptsTests.swift
```

| # | Test Name | Method | Assertion |
|---|-----------|--------|-----------|
| 97 | randomPrompt_replacesTwig | `randomPrompt()` | {twig} replaced |
| 98 | randomPrompt_excludesPrevious | `randomPrompt()` | Not in excluded |
| 99 | randomPrompt_fallsBackToGeneric | `randomPrompt()` | Returns something |
| 100 | randomPrompt_allExcluded | `randomPrompt()` | Still returns |

### 2.12 View Helper Functions (15 tests)

```
TrunkTests/ViewHelpersTests.swift
```

| # | Test Name | Function | Assertion |
|---|-----------|----------|-----------|
| 101 | wasWateredThisWeek_recentEntry | TodayView | Returns true |
| 102 | wasWateredThisWeek_oldEntry | TodayView | Returns false |
| 103 | relativeTime_justNow | TodayView | "just now" |
| 104 | relativeTime_minutesAgo | TodayView | "5m ago" |
| 105 | relativeTime_hoursAgo | TodayView | "2h ago" |
| 106 | relativeTime_daysAgo | TodayView | "3d ago" |
| 107 | resultToEmoji_one | TodayView | "🥀" |
| 108 | resultToEmoji_five | TodayView | "🌲" |
| 109 | contextLabel_parsesTwigId | TodayView | "Health > Movement" |
| 110 | contextLabel_fallback | TodayView | Returns nodeId |
| 111 | angleForBranch_zero | OverviewView | -π/2 |
| 112 | angleForBranch_four | OverviewView | π/2 |
| 113 | pointOnCircle_basic | OverviewView | Correct CGPoint |
| 114 | dateGroupKey_today | LogViews | "Today" |
| 115 | dateGroupKey_yesterday | LogViews | "Yesterday" |

### 2.13 Form Validation (5 tests)

```
TrunkTests/FormValidationTests.swift
```

| # | Test Name | Property | Assertion |
|---|-----------|----------|-----------|
| 116 | isValid_emptyTitle | CreateSproutView | Returns false |
| 117 | isValid_noLeaf | CreateSproutView | Returns false |
| 118 | isValid_complete | CreateSproutView | Returns true |
| 119 | createNewLeaf_trims | CreateSproutView | Whitespace removed |
| 120 | createNewLeaf_rejectsEmpty | CreateSproutView | No leaf created |

---

## Part 3: Web App E2E Tests (Playwright)

```
web/e2e/
```

### 3.1 Sprout Lifecycle (exists, expand)

```
sprout-lifecycle.spec.ts
```

| # | Test Name | Flow |
|---|-----------|------|
| 1 | creates sprout from twig view | Navigate → Create → Verify active |
| 2 | waters sprout with reflection | Find sprout → Water → Verify entry |
| 3 | harvests ready sprout | Wait/advance → Harvest → Verify completed |
| 4 | earns capacity on harvest | Harvest → Check soil capacity increased |
| 5 | soil cost deducted on plant | Check before → Plant → Check after |
| 6 | water restores partial soil | Water → Verify +0.05 capacity |

### 3.2 Resource Management (new)

```
resources.spec.ts
```

| # | Test Name | Flow |
|---|-----------|------|
| 7 | water resets at 6am | Advance clock → Verify 3 available |
| 8 | sun resets on Sunday | Advance clock → Verify 1 available |
| 9 | cannot water without water available | Use 3 → Try 4th → Verify blocked |
| 10 | cannot plant without soil | Spend all → Try plant → Verify blocked |
| 11 | soil capacity grows over time | Multiple harvests → Verify growth |
| 12 | water cooldown per sprout | Water → Try again → Verify cooldown |

### 3.3 Navigation (new)

```
navigation.spec.ts
```

| # | Test Name | Flow |
|---|-----------|------|
| 13 | navigates overview to branch via click | Click branch → Verify branch view |
| 14 | navigates branch to twig via click | Click twig → Verify twig panel |
| 15 | returns to overview via escape | Escape → Verify overview |
| 16 | navigates via number keys | Press 1 → Verify branch 1 |
| 17 | cycles branches with arrows | ← → → Verify branch changes |
| 18 | hover shows branch sprouts in sidebar | Hover → Verify sidebar updates |

### 3.4 Import/Export (new)

```
data-portability.spec.ts
```

| # | Test Name | Flow |
|---|-----------|------|
| 19 | exports JSON file | Click export → Verify download |
| 20 | imports JSON file | Upload → Verify data loaded |
| 21 | round-trip preserves all data | Export → Clear → Import → Verify identical |
| 22 | shows 7-day backup reminder | Advance 8 days → Verify reminder shown |
| 23 | rejects invalid JSON | Upload garbage → Verify error |
| 24 | handles legacy format import | Upload v1 → Verify migrated |

### 3.5 Editor Flows (new)

```
editor.spec.ts
```

| # | Test Name | Flow |
|---|-----------|------|
| 25 | renames branch | Double-click → Type → Save → Verify |
| 26 | renames twig | Double-click → Type → Save → Verify |
| 27 | adds note to node | Open editor → Type note → Save → Verify |
| 28 | persists across refresh | Edit → Refresh → Verify persisted |

---

## Part 4: iOS E2E Tests (Maestro)

```
app/.maestro/flows/
```

### 4.1 Smoke Test (exists)

```
smoke-test.yaml
```

| # | Test Name | Flow |
|---|-----------|------|
| 1 | app launches | Launch → Verify tabs visible |
| 2 | navigates to branch | Tap Trunk → Tap CORE → Verify twigs |

### 4.2 Sprout Lifecycle (new)

```
sprout-lifecycle.yaml
```

| # | Test Name | Flow |
|---|-----------|------|
| 3 | creates sprout | Navigate to twig → Tap create → Fill form → Plant |
| 4 | waters sprout | Find active → Tap water → Write reflection → Save |
| 5 | harvests sprout | Find ready → Tap harvest → Set result → Confirm |
| 6 | sprout appears in Today tab | Create → Switch to Today → Verify visible |

### 4.3 Resource Management (new)

```
resource-management.yaml
```

| # | Test Name | Flow |
|---|-----------|------|
| 7 | water count decrements | Check count → Water → Verify decremented |
| 8 | sun count decrements | Check count → Shine → Verify decremented |
| 9 | soil decrements on plant | Check → Plant → Verify decreased |
| 10 | cannot water when empty | Use all → Try → Verify disabled |

### 4.4 Navigation (new)

```
navigation.yaml
```

| # | Test Name | Flow |
|---|-----------|------|
| 11 | tab bar navigation | Tap each tab → Verify screen |
| 12 | drill down to twig detail | Overview → Branch → Twig → Verify |
| 13 | back navigation | Drill down → Back → Verify previous |
| 14 | saga navigation | Sagas tab → Tap saga → Verify detail |

---

## Part 5: Cross-Platform Tests

### 5.1 Data Format Compatibility (exists, expand)

```
web/src/tests/cross-platform.test.ts
```

| # | Test Name | Assertion |
|---|-----------|-----------|
| 1 | iOS export v4 parses in web | All fields recognized |
| 2 | Web export v4 parses in iOS | All fields recognized |
| 3 | Round-trip iOS→Web→iOS | Byte-identical |
| 4 | Round-trip Web→iOS→Web | Byte-identical |
| 5 | Optional fields handled both ways | leafId, blooms OK |
| 6 | Timestamps preserve timezone | ISO format consistent |

---

## Part 6: Test Quality Measures

### 6.1 Code Coverage

**Target:** 80% line coverage for business logic

**Setup (Web):**
```bash
npm install -D @vitest/coverage-v8
# vitest.config.ts: coverage: { reporter: ['text', 'html'] }
```

**Setup (iOS):**
- Enable code coverage in Xcode scheme
- View in Xcode → Product → Scheme → Edit Scheme → Test → Options

### 6.2 Mutation Testing (Web)

**Tool:** Stryker Mutator

**Purpose:** Verify tests actually catch bugs, not just run code

**Setup:**
```bash
npm install -D @stryker-mutator/core @stryker-mutator/vitest-runner
```

**Target:** 70%+ mutation score for critical modules (state.ts, events/)

### 6.3 Test Fixtures

**Location:** `shared/test-fixtures/`

**Files:**
- `minimal-state.json` - Smallest valid state
- `full-state.json` - All features exercised
- `edge-cases.json` - Boundary conditions
- `legacy-v1.json` - Migration test data
- `cross-platform-ios.json` - iOS export sample
- `cross-platform-web.json` - Web export sample

---

## Summary

### Test Counts

| Category | Current | Target |
|----------|---------|--------|
| **Web Unit Tests** | 11 files | 17 files, 169 tests |
| **Web E2E Tests** | 1 file, 1 test | 5 files, 28 tests |
| **iOS Unit Tests** | 0 | 13 files, 120 tests |
| **iOS E2E Tests** | 1 flow | 4 flows, 14 tests |
| **Cross-Platform** | 1 file | 1 file, 6 tests |
| **Total** | ~15 tests | **~337 tests** |

### Priority Order

1. **Week 1:** iOS Swift Testing setup + ProgressionService tests (critical formulas)
2. **Week 2:** iOS ViewModel + Model tests
3. **Week 3:** Web soil/water/sun state tests
4. **Week 4:** Web event system expansion
5. **Week 5:** Playwright E2E flows
6. **Week 6:** Maestro E2E flows
7. **Week 7:** Code coverage + mutation testing setup
8. **Week 8:** CI/CD integration

### Success Criteria

- [ ] All tests pass on every PR
- [ ] 80%+ code coverage on business logic
- [ ] 70%+ mutation score on critical paths
- [ ] Cross-platform round-trip proven lossless
- [ ] No regressions in 30 days post-implementation
