# Data Model

## Entity Relationship Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                         NodeData                            │
│  (trunk, branch-*, branch-*-twig-*)                        │
├─────────────────────────────────────────────────────────────┤
│  label: string                                              │
│  note: string                                               │
│  sprouts?: Sprout[]    ←─── only on twigs                  │
│  leaves?: Leaf[]       ←─── only on twigs                  │
└─────────────────────────────────────────────────────────────┘
            │
            │ contains
            ▼
┌─────────────────────┐         ┌─────────────────────┐
│       Sprout        │         │        Leaf         │
├─────────────────────┤         ├─────────────────────┤
│  id: string         │         │  id: string         │
│  title: string      │         │  name: string       │
│  season: Season     │    ┌───►│  createdAt: string  │
│  environment: Env   │    │    └─────────────────────┘
│  state: State       │    │
│  soilCost: number   │    │    Leaf = named saga
│  result?: 1-5       │    │    (chain of related sprouts)
│  leafId?: string ───┼────┘
│  waterEntries?: []  │
│  bloom1/3/5: string │
│  plantedAt?: string │
│  harvestedAt?: str  │
└─────────────────────┘
```

---

## Sprout Lifecycle

```
draft ──► active ──► completed
  │          │
  │          └──► failed
  │
  └── (never planted, can be deleted)
```

| State | Soil Spent | Can Water | Can Harvest |
|-------|------------|-----------|-------------|
| draft | No | No | No |
| active | Yes (at plant) | Yes | Yes (when ready) |
| completed | — | No | — |
| failed | — | No | — |

---

## localStorage Keys (Web)

| Key | Contents | Schema |
|-----|----------|--------|
| `trunk-events-v1` | Event log (event-sourced actions) | TrunkEvent[] |
| `trunk-notes-v1` | Legacy node data, sun log, soil log | See below |
| `trunk-resources-v1` | Legacy resource state (deprecated) | — |
| `trunk-notifications-v1` | Email preferences | — |
| `trunk-last-export` | Timestamp (ms) | number |

**Note**: The system is transitioning to event sourcing. `trunk-events-v1` is the new source of truth for sprout actions.

### trunk-notes-v1 Structure

```typescript
{
  nodes: Record<string, NodeData>,
  sunLog: SunEntry[],
  soilLog: SoilEntry[],
  version: number
}
```

---

## Event Log Entries

### WaterEntry (per sprout)
```typescript
{
  date: string,      // ISO date
  note: string       // Journal entry
}
```

### SunEntry (global log)
```typescript
{
  date: string,      // ISO date
  twigId: string,    // Which twig was shined on
  note: string       // Reflection text
}
```

### SoilEntry (global log)
```typescript
{
  date: string,
  delta: number,     // + or - amount
  reason: string,    // 'harvest', 'plant', 'water', 'sun'
  details?: string   // Sprout title, etc.
}
```

---

## Enums

### Season
`'2w' | '1m' | '3m' | '6m' | '1y'`

### Environment
`'fertile' | 'firm' | 'barren'`

### Sprout State
`'draft' | 'active' | 'completed' | 'failed'`

---

## Constants Reference (from shared/constants.json)

### Tree Structure
- Branches: 8
- Twigs per branch: 8
- Total twigs: 64

### Soil
| Property | Value |
|----------|-------|
| Starting capacity | 10 |
| Max capacity | 120 |
| Recovery per water | 0.05 |
| Recovery per sun | 0.35 |

### Planting Costs (soil)

| Season | Fertile | Firm | Barren |
|--------|---------|------|--------|
| 2w | 2 | 3 | 4 |
| 1m | 3 | 5 | 6 |
| 3m | 5 | 8 | 10 |
| 6m | 8 | 12 | 16 |
| 1y | 12 | 18 | 24 |

### Environment Multipliers (reward)
- Fertile: 1.1×
- Firm: 1.75×
- Barren: 2.4×

### Result Multipliers (reward)
- 1 → 0.4×
- 2 → 0.55×
- 3 → 0.7×
- 4 → 0.85×
- 5 → 1.0×

### Resource Resets
- Water: 3/day, resets 6:00 AM local
- Sun: 1/week, resets 6:00 AM Monday

---

## Related Documentation

- [CLAUDE.md](../CLAUDE.md) — Detailed codebase guide
- [ARCHITECTURE.md](./ARCHITECTURE.md) — System overview and diagrams
- [ONBOARDING.md](./ONBOARDING.md) — Quick start and common tasks
- [INTERFACES.md](./INTERFACES.md) — Module APIs and extension points
