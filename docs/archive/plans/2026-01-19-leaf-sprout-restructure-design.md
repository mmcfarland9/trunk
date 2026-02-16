# Leaf & Sprout Restructure - Design Document

> **Status:** Approved via brainstorming session
> **Date:** 2026-01-19

## Summary

Restructure the leaf/sprout system to support concurrent sprouts within leaves, remove the grafting concept, and make leaves first-class named entities.

## Key Changes

### 1. Remove 1-Week Sprouts
- Shortest season becomes 2 weeks
- 1w feels like tasks, not identity-shaping commitments
- Updated seasons: 2w, 1m, 3m, 6m, 1y

### 2. Starting Capacity Increase
- Starting capacity: 4 → 10
- With 2w minimum (cost 2), users can have 5 concurrent fertile sprouts
- Room for mix of long anchor + short milestones

### 3. Leaves Become Named Entities
```typescript
type Leaf = {
  id: string
  name: string      // NEW: explicit saga name
  createdAt: string
  // status removed - derived from sprouts
}
```

### 4. Concurrent Sprouts in Leaves
- Multiple sprouts can be active simultaneously in one leaf
- No sequential chain - sprouts are siblings, not parent-child
- Each sprout harvests independently

### 5. Grafting Removed
- No "graft" action - just create sprout and optionally assign to leaf
- Leaf picker in sprout creation: "None" / "New leaf..." / [existing leaves]
- Sidebar graft button removed

### 6. Sprout Creation Flow
1. "New" button on twig → opens sprout form
2. Fill: title, season, environment, blooms
3. Leaf picker dropdown
4. Create in draft → plant when ready

### 7. Stacked Card Visualization
- Leaves with multiple active sprouts show as stacked card
- Both twig view and sidebar
- Each row: duration badge, title, progress

## Data Model Changes

### Leaf (updated)
```typescript
type Leaf = {
  id: string
  name: string
  createdAt: string
}
```

### Sprout (updated)
```typescript
type Sprout = {
  id: string
  leafId?: string  // optional - undefined = standalone
  title: string
  season: '2w' | '1m' | '3m' | '6m' | '1y'  // 1w removed
  // ... rest unchanged
}
```

### LeafStatus Type
- Remove entirely - status derived from sprouts

## Economy Changes

### Costs (1w row removed)
| Season | Fertile | Firm | Barren |
|--------|---------|------|--------|
| 2w | 2 | 3 | 4 |
| 1m | 3 | 5 | 6 |
| 3m | 5 | 8 | 10 |
| 6m | 8 | 12 | 16 |
| 1y | 12 | 18 | 24 |

### Rewards (1w row removed)
| Season | Base | Per-Week |
|--------|------|----------|
| 2w | 0.26 | 0.130 |
| 1m | 0.56 | 0.140 |
| 3m | 1.95 | 0.150 |
| 6m | 4.16 | 0.160 |
| 1y | 8.84 | 0.170 |

### Starting Capacity
- 4 → 10

## Migration

1. **1w sprouts:** Convert to 2w
2. **Orphan sprouts without leafId:** Keep as standalone (already valid)
3. **Existing leaves:** Add `name` field derived from most recent sprout title
4. **LeafStatus references:** Remove, derive from sprout states

## Removed UI Elements

- Sidebar graft button
- "Graft new sprout" action in leaf view
- Leaf status dropdown/display
- 1w season option in dropdowns

## Deferred

- Progressive unlocking (gate seasons/environments)
- Leaf graduation to identity
