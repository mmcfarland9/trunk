# Derived Resource State & UI Transparency

## Overview

Refactor water and sun resource systems to derive availability from action logs rather than storing counters. This eliminates cheating via import/export and adds transparency about reset timing.

## Goals

1. **Anti-cheat**: Resource state derived from logs, not stored counters
2. **Transparency**: Show users when resources reset with specific date/time
3. **UI consistency**: Watering Can mirrors Sun Ledge styling
4. **Per-sprout cooldown**: Sprouts only need watering once per week

---

## Design

### 1. Derived Resource State

**Current problem**: Resource availability stored as counters (`water.available`, `sun.available`) separate from action logs. Import/export doesn't include counters, allowing users to cheat by clearing localStorage.

**Solution**: Derive availability from the action logs that are already exported.

#### Water Availability

```typescript
function getWaterUsedToday(): number {
  const resetTime = getTodayResetTime() // Today at 6:00 AM (or yesterday if before 6am)
  let count = 0

  // Count all waterEntries across all sprouts since reset time
  for (const nodeData of Object.values(nodeState)) {
    for (const sprout of nodeData.sprouts ?? []) {
      for (const entry of sprout.waterEntries ?? []) {
        if (new Date(entry.timestamp) >= resetTime) {
          count++
        }
      }
    }
  }
  return count
}

function getWaterAvailable(): number {
  return waterCapacity - getWaterUsedToday()
}
```

#### Sun Availability

```typescript
function getSunUsedThisWeek(): number {
  const resetTime = getWeekResetTime() // Most recent Sunday at 6:00 AM

  return sunLog.filter(entry =>
    new Date(entry.timestamp) >= resetTime
  ).length
}

function getSunAvailable(): number {
  return sunCapacity - getSunUsedThisWeek()
}
```

#### Reset Time Logic

Both water and sun use **6:00 AM** as the reset hour.

```typescript
const RESET_HOUR = 6 // 6:00 AM

function getTodayResetTime(): Date {
  const now = getDebugDate()
  const reset = new Date(now)
  reset.setHours(RESET_HOUR, 0, 0, 0)

  // If we haven't hit 6am yet, reset time is yesterday at 6am
  if (now < reset) {
    reset.setDate(reset.getDate() - 1)
  }
  return reset
}

function getWeekResetTime(): Date {
  const now = getDebugDate()
  const reset = new Date(now)
  reset.setHours(RESET_HOUR, 0, 0, 0)

  // Find most recent Sunday
  const daysSinceSunday = reset.getDay() // 0 = Sunday
  reset.setDate(reset.getDate() - daysSinceSunday)

  // If today is Sunday but before 6am, go back a week
  if (daysSinceSunday === 0 && now < reset) {
    reset.setDate(reset.getDate() - 7)
  }

  return reset
}

function getNextWaterReset(): Date {
  const reset = getTodayResetTime()
  reset.setDate(reset.getDate() + 1)
  return reset
}

function getNextSunReset(): Date {
  const reset = getWeekResetTime()
  reset.setDate(reset.getDate() + 7)
  return reset
}
```

#### What Gets Removed

From `resourceState`:
- `water.available` - derived from logs
- `water.lastResetDate` - no longer needed
- `sun.available` - derived from logs
- `sun.lastResetDate` - no longer needed

From functions:
- `checkWaterDailyReset()` - no stored counter to reset
- `checkSunWeeklyReset()` - no stored counter to reset

#### What Stays

- `water.capacity` - can still grow via upgrades
- `sun.capacity` - can still grow via upgrades
- `soilState` - soil is different, uses running balance

---

### 2. Per-Sprout Weekly Watering

**Current behavior**: Each sprout can be watered once per day.

**New behavior**: Each sprout can only be watered once per week (resets Sunday 6am).

This reflects that plants don't need daily watering - it's too much. Reduces user fatigue.

#### Implementation

```typescript
function wasWateredThisWeek(sprout: Sprout): boolean {
  if (!sprout.waterEntries?.length) return false
  const resetTime = getWeekResetTime()
  return sprout.waterEntries.some(entry =>
    new Date(entry.timestamp) >= resetTime
  )
}
```

#### UI Changes

- Water button shows "Watered" (disabled) if `wasWateredThisWeek()` is true
- Message changes: "Already watered today" → "Already watered this week"
- Sidebar sprout items use same logic

---

### 3. UI Changes - Status Boxes

#### Watering Can Dialog

Add a blue status box at top (mirroring Sun Ledge's yellow styling).

**When water available**:
```
┌─────────────────────────────────────┐
│  2/3 remaining                      │
└─────────────────────────────────────┘
[Water Log section below]
```

**When depleted**:
```
┌─────────────────────────────────────┐
│  Empty                              │
│  Resets Tue 01/21 at 6:00 AM        │
└─────────────────────────────────────┘
[Water Log section below]
```

**CSS** (mirrors Sun Ledge):
```css
.water-can-status-box {
  background: rgba(70, 130, 180, 0.06);  /* water blue tint */
  border: 1px solid rgba(70, 130, 180, 0.2);
  padding: var(--space-4);
  margin-bottom: var(--space-5);
}
```

**Remove**: The "Ready to Water" sprouts list section. Users water from twig view or sidebar.

#### Sun Ledge Dialog

Update the "Shone this week" box to include reset time.

**When depleted**:
```
┌─────────────────────────────────────┐
│  ✓ Shone this week                  │
│  Resets Sun 01/26 at 6:00 AM        │
└─────────────────────────────────────┘
```

#### Reset Time Format

Format: `Resets Wed 01/22 at 6:00 AM`

```typescript
function formatResetTime(date: Date): string {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const day = days[date.getDay()]
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const dayNum = String(date.getDate()).padStart(2, '0')

  let hours = date.getHours()
  const ampm = hours >= 12 ? 'PM' : 'AM'
  hours = hours % 12 || 12
  const minutes = String(date.getMinutes()).padStart(2, '0')

  return `Resets ${day} ${month}/${dayNum} at ${hours}:${minutes} ${ampm}`
}
```

---

### 4. Import/Export

**No changes needed**.

Since availability is now derived from logs, and logs are already exported:
- `waterEntries` - stored per sprout, exported with nodeState
- `sunLog` - stored globally, exported with nodeState

Import automatically works correctly:
- Import old backup → old timestamps don't count toward current period → full resources
- Import recent backup → recent timestamps count → reduced resources

Anti-cheat is automatic via timestamps.

---

## Implementation Checklist

### Phase 1: Core Logic (state.ts)

- [ ] Add `RESET_HOUR = 6` constant
- [ ] Add `getTodayResetTime()` function
- [ ] Add `getWeekResetTime()` function
- [ ] Add `getNextWaterReset()` function
- [ ] Add `getNextSunReset()` function
- [ ] Add `formatResetTime()` function
- [ ] Refactor `getWaterAvailable()` to derive from logs
- [ ] Refactor `getSunAvailable()` to derive from logs
- [ ] Add `wasWateredThisWeek(sprout)` function
- [ ] Remove `checkWaterDailyReset()` function
- [ ] Remove `checkSunWeeklyReset()` function
- [ ] Remove `water.available`, `water.lastResetDate` from resourceState
- [ ] Remove `sun.available`, `sun.lastResetDate` from resourceState

### Phase 2: Per-Sprout Weekly Watering

- [ ] Update `wasWateredToday()` → keep for daily water usage counting
- [ ] Add `wasWateredThisWeek()` for per-sprout cooldown
- [ ] Update water button logic in twig-view.ts
- [ ] Update sidebar sprout items in progress.ts
- [ ] Update water-dialog.ts checks
- [ ] Update main.ts water can logic
- [ ] Change "Already watered today" messages to "Already watered this week"

### Phase 3: UI - Watering Can Status Box

- [ ] Add `.water-can-status-box` to dom-builder.ts
- [ ] Add CSS for blue-tinted status box (dialogs.css)
- [ ] Show "X/Y remaining" when water available
- [ ] Show "Empty" + reset time when depleted
- [ ] Remove "Ready to Water" sprouts list section
- [ ] Remove related sprout list elements and logic

### Phase 4: UI - Sun Ledge Reset Time

- [ ] Update "Shone this week" box to include reset time
- [ ] Add reset time text element to dom-builder.ts
- [ ] Update main.ts to populate reset time when sun depleted

### Phase 5: Cleanup

- [ ] Remove unused imports
- [ ] Remove unused type fields from ResourceState
- [ ] Test import/export preserves correct state
- [ ] Test reset times work correctly around 6am boundary
- [ ] Test Sunday boundary for weekly resets

---

## Files to Modify

1. **src/state.ts** - Core refactor, remove counters, add derived functions
2. **src/types.ts** - Update ResourceState type (remove available/lastResetDate)
3. **src/ui/dom-builder.ts** - Add water status box, remove sprout list
4. **src/ui/twig-view.ts** - Update watered checks to weekly
5. **src/features/progress.ts** - Update sidebar watered checks
6. **src/features/water-dialog.ts** - Update watered checks
7. **src/main.ts** - Update water can and sun ledge UI logic
8. **src/styles/dialogs.css** - Add water status box styles

---

## Testing Scenarios

1. **Daily water reset**: Use water at 5am, check it resets at 6am same day
2. **Daily water reset**: Use water at 7am, check it resets at 6am next day
3. **Weekly sun reset**: Shine on Monday, check resets Sunday 6am
4. **Weekly sprout cooldown**: Water sprout Monday, can't water until Sunday 6am
5. **Import old backup**: Water entries from last week shouldn't count
6. **Import today's backup**: Water entries from after 6am today should count
7. **Boundary test**: Actions at exactly 6:00 AM should count toward new period
