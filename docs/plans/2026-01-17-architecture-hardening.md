# Architecture Hardening Plan

**Date:** 2026-01-17
**Goal:** Make Trunk user-ready for 20+ years of personal goal tracking

## Summary

Trunk's data model has been stabilized to support long-term use without data loss during future redesigns.

## Changes Made

### 1. Data Safety

**Import Fix**
- Import now preserves sprouts, leaves, water entries, and sun entries
- Previously only preserved `label` and `note`, silently dropping all goal data

**Schema Versioning**
- Added `_version` field to stored data
- Created migration runner that transforms data through versions
- Legacy data (no version) automatically upgraded to v1
- Future schema changes add a migration function and increment version

**Journal Entry Caps**
- Water entries capped at 365 per sprout (1 year of daily entries)
- Sun entries capped at 52 per sprout (1 year of weekly entries)
- Prevents localStorage overflow over decades
- Oldest entries removed when cap exceeded (FIFO)

### 2. Storage Consolidation

**Before:** 4 separate localStorage keys
- `trunk-notes-v1` - node data
- `trunk-soil-v1` - soil state
- `trunk-water-v1` - water state
- `trunk-sun-v1` - sun state

**After:** 2 keys
- `trunk-notes-v1` - node data with `_version` for migrations
- `trunk-resources-v1` - unified soil/water/sun state

Migration automatically consolidates legacy keys on first load.

### 3. Sun/Shine Redesign

**Before:**
- 3 sun per day
- Daily reset
- Reflection prompts (past-focused)

**After:**
- 1 sun per week
- Weekly reset (ISO week number)
- Planning prompts (future-focused)

Philosophy: Water is for daily engagement (present). Sun is for weekly planning (future).

## Data Model

### Core Entities

```
Leaf (saga) = A multi-year journey of growth
├── Sprout 1: Small goal (1 week, fertile)
├── Sprout 2: Medium goal (1 month, firm)
└── Sprout 3: Large goal (1 year, barren)
    ├── Water entries: Daily journal (present)
    └── Sun entries: Weekly planning (future)
```

### Storage Schema (v1)

```typescript
// trunk-notes-v1
{
  _version: 1,
  nodes: {
    "trunk": { label, note },
    "branch-0": { label, note, sprouts?, leaves? },
    "branch-0-twig-0": { label, note, sprouts?, leaves? },
    ...
  }
}

// trunk-resources-v1
{
  soil: { available, capacity },
  water: { available, capacity, lastResetDate },
  sun: { available, capacity, lastResetDate }
}
```

## Adding Future Migrations

When schema changes are needed:

1. Increment `CURRENT_SCHEMA_VERSION` in state.ts
2. Add migration function to `MIGRATIONS` object:

```typescript
const MIGRATIONS: Record<number, MigrationFn> = {
  2: (data) => {
    // Transform v1 → v2
    return { ...data, newField: 'default' }
  },
}
```

3. Migrations run automatically on load
4. Data saved back with new version

## What's Protected

| Data | Protection |
|------|------------|
| Sprouts (goals) | Import preserves, versioned schema |
| Leaves (sagas) | Import preserves, versioned schema |
| Water entries | Import preserves, capped at 365/sprout |
| Sun entries | Import preserves, capped at 52/sprout |
| Labels/notes | Always preserved (backward compatible) |
| Resources | Unified storage, auto-migrated |

## Remaining Considerations

- **Backup reminders**: Already implemented (7-day reminder)
- **Round-trip tests**: Recommended before heavy use
- **IndexedDB backup**: Not implemented (localStorage sufficient for personal use)
