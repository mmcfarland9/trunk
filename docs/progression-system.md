# Trunk Progression System: The Bonsai Model

## Philosophy

Growth is slow, deliberate, and intrinsically rewarding. Like cultivating a bonsai tree, progress comes from years of patient, consistent effort - not sprints. The system rewards:

- **Commitment**: Longer goals yield slightly better per-week returns
- **Challenge**: Harder environments accelerate growth
- **Quality**: Better execution means better rewards
- **Patience**: Capacity grows with diminishing returns, approaching but never reaching max

## Core Mechanics

### Soil Capacity

**Soil** represents your focus/energy budget for active goals.

- **Starting capacity**: 4 (room for ~3-4 simple weekly goals)
- **Maximum capacity**: 100 (lifetime ceiling, essentially mythical)

### Soil Cost (Planting Budget)

Each sprout costs soil to plant, based on season and environment:

| Season | Fertile | Firm | Barren |
|--------|---------|------|--------|
| 1 week | 1 | 2 | 2 |
| 2 weeks | 2 | 3 | 4 |
| 1 month | 3 | 5 | 6 |
| 3 months | 5 | 8 | 10 |
| 6 months | 8 | 12 | 16 |
| 1 year | 12 | 18 | 24 |

**Formula**: `cost = ceil(season_base × environment_multiplier)`

### Environment Definitions

| Environment | Multiplier | Plain Description |
|-------------|------------|-------------------|
| **Fertile** | 1.0x | "I know how to do this" - comfort zone, support, experience |
| **Firm** | 1.5x | "This will take effort" - stretching, obstacles, learning required |
| **Barren** | 2.0x | "This is genuinely hard" - new skill, no safety net, real risk |

**The question to ask**: "How much is working against me here?"
- Fertile = wind at your back
- Firm = walking into the wind
- Barren = climbing uphill in a storm

---

## Capacity Reward System

When you complete a sprout, you gain capacity based on four factors:

```
capacity_gain = base × environment × result × diminishing
```

### 1. Season Base Reward

Scaled so per-week rate is roughly equal, with ~40% bonus for longer commitments:

| Season | Base | Per-Week Rate |
|--------|------|---------------|
| 1 week | 0.12 | 0.120 |
| 2 weeks | 0.26 | 0.130 |
| 1 month | 0.56 | 0.140 |
| 3 months | 1.95 | 0.150 |
| 6 months | 4.16 | 0.160 |
| 1 year | 8.84 | 0.170 |

### 2. Environment Multiplier

| Environment | Multiplier |
|-------------|------------|
| Fertile | 1.0x |
| Firm | 1.4x |
| Barren | 2.0x |

### 3. Result Multiplier (1-5 scale)

Every honest effort grows you. No punishment, just slower growth for lesser results:

| Result | Multiplier | Meaning |
|--------|------------|---------|
| 1 | 0.2 | You showed up - tiny growth |
| 2 | 0.4 | Partial effort |
| 3 | 0.6 | Solid, honest work |
| 4 | 0.8 | Strong execution |
| 5 | 1.0 | Excellence - full reward |

### 4. Diminishing Returns Factor

As you approach max capacity, growth slows toward zero:

```
diminishing = 1 - (current_capacity / 100)
```

| Current Capacity | Diminishing Factor | Effective Growth |
|------------------|-------------------|------------------|
| 4 (start) | 0.96 | 96% of base |
| 25 | 0.75 | 75% of base |
| 50 | 0.50 | 50% of base |
| 75 | 0.25 | 25% of base |
| 90 | 0.10 | 10% of base |
| 99 | 0.01 | 1% of base |

---

## Full Rewards Matrix

### Fertile Environment (1.0x)

| Season | R=1 | R=2 | R=3 | R=4 | R=5 |
|--------|-----|-----|-----|-----|-----|
| 1w | 0.02 | 0.05 | 0.07 | 0.10 | 0.12 |
| 2w | 0.05 | 0.10 | 0.16 | 0.21 | 0.26 |
| 1m | 0.11 | 0.22 | 0.34 | 0.45 | 0.56 |
| 3m | 0.39 | 0.78 | 1.17 | 1.56 | 1.95 |
| 6m | 0.83 | 1.66 | 2.50 | 3.33 | 4.16 |
| 1y | 1.77 | 3.54 | 5.30 | 7.07 | 8.84 |

*Note: These are base values before diminishing returns.*

### Firm Environment (1.4x)

| Season | R=1 | R=2 | R=3 | R=4 | R=5 |
|--------|-----|-----|-----|-----|-----|
| 1w | 0.03 | 0.07 | 0.10 | 0.13 | 0.17 |
| 2w | 0.07 | 0.15 | 0.22 | 0.29 | 0.36 |
| 1m | 0.16 | 0.31 | 0.47 | 0.63 | 0.78 |
| 3m | 0.55 | 1.09 | 1.64 | 2.18 | 2.73 |
| 6m | 1.16 | 2.33 | 3.49 | 4.66 | 5.82 |
| 1y | 2.48 | 4.95 | 7.43 | 9.90 | 12.38 |

### Barren Environment (2.0x)

| Season | R=1 | R=2 | R=3 | R=4 | R=5 |
|--------|-----|-----|-----|-----|-----|
| 1w | 0.05 | 0.10 | 0.14 | 0.19 | 0.24 |
| 2w | 0.10 | 0.21 | 0.31 | 0.42 | 0.52 |
| 1m | 0.22 | 0.45 | 0.67 | 0.90 | 1.12 |
| 3m | 0.78 | 1.56 | 2.34 | 3.12 | 3.90 |
| 6m | 1.66 | 3.33 | 4.99 | 6.66 | 8.32 |
| 1y | 3.54 | 7.07 | 10.61 | 14.14 | 17.68 |

---

## Example User Journeys

### The Steady Practitioner

**Profile**: One 1-month fertile goal per month, averaging result 4

| Year | Start Cap | Diminishing | Monthly Gain | End Cap | Sprouts Possible |
|------|-----------|-------------|--------------|---------|------------------|
| 1 | 4.0 | 0.96 | 0.43 | 9.2 | 3-4 |
| 2 | 9.2 | 0.91 | 0.41 | 14.1 | 5-6 |
| 3 | 14.1 | 0.86 | 0.39 | 18.7 | 6-7 |
| 5 | 23.2 | 0.77 | 0.35 | 27.3 | 9-10 |
| 10 | 41.7 | 0.58 | 0.26 | 44.9 | 15-16 |

### The Challenger

**Profile**: One 1-month barren goal per month, averaging result 4

| Year | Start Cap | Diminishing | Monthly Gain | End Cap |
|------|-----------|-------------|--------------|---------|
| 1 | 4.0 | 0.96 | 0.86 | 14.4 |
| 3 | 24.0 | 0.76 | 0.68 | 32.2 |
| 5 | 38.0 | 0.62 | 0.56 | 44.7 |
| 10 | 56.0 | 0.44 | 0.40 | 60.8 |

### The Safe Grinder

**Profile**: Four 1-week fertile goals per month, averaging result 3

| Year | Start Cap | Monthly Gain | End Cap |
|------|-----------|--------------|---------|
| 1 | 4.0 | 0.27 | 7.3 |
| 5 | 14.8 | 0.23 | 17.5 |
| 10 | 23.8 | 0.20 | 26.2 |

---

## Lifetime Progression Arc

| Years | Capacity | % of Max | Sprouts | Milestone |
|-------|----------|----------|---------|-----------|
| 1 | 9 | 9% | ~4 | Beginner |
| 5 | 27 | 27% | ~10 | Practitioner |
| 10 | 45 | 45% | ~16 | Veteran |
| 20 | 66 | 66% | ~22 | Master |
| 30 | 79 | 79% | ~26 | Elder |
| 40 | 87 | 87% | ~28 | Sage |
| 50 | 92 | 92% | ~30 | Near-cap |

**Hitting 100 is essentially mythical.** After 50+ years of consistent monthly goals, you're still at 92%. The last 8% would take another lifetime.

---

## Design Principles

1. **No punishment** - Every honest effort grows you, even result=1
2. **Slow and steady** - Bonsai philosophy, not sprint mentality
3. **Commitment rewarded** - Longer seasons give slightly better per-week rates
4. **Risk rewarded** - Barren environment doubles growth rate
5. **Diminishing returns** - Prevents "god mode", keeps growth meaningful
6. **Lifetime ceiling** - 100 capacity is aspirational, not achievable

---

## Water & Sun: Soil Restoration

Soil is restored through daily engagement and weekly reflection. The process is slow and deliberate.

### Water (Sprout-Level, Daily)

**Purpose**: Quick daily engagement with active sprouts
**Question**: "What did I do for this goal today?"

| Property | Value |
|----------|-------|
| Capacity | 3 per day |
| Restoration | +0.1 soil per water |
| Target | Active sprouts |
| Max weekly | ~2.1 soil |

Water requires active sprouts - you're journaling about specific goals.

### Sun (Twig-Level, Weekly)

**Purpose**: Thoughtful philosophical reflection on life facets
**Question**: "What is my relationship with [this aspect of life] right now?"

| Property | Value |
|----------|-------|
| Capacity | 1 per week |
| Restoration | +0.5 soil per shine |
| Target | Any twig (always available) |
| Max weekly | 0.5 soil |

Sun is twig-level, not sprout-level. You reflect on "movement" or "intimacy" as concepts in your life, not on specific goals. This makes reflection always available, even without active sprouts.

### Recovery Rates

| Scenario | Weekly Recovery | Notes |
|----------|-----------------|-------|
| Full engagement (3 water/day + sun) | ~2.6 soil | Active user with sprouts |
| Sun only (no active sprouts) | 0.5 soil | Recovery from empty state |

### Safety Net: Minimum Floor

Soil can never stay below **1**. This ensures you can always plant a humble 1-week fertile goal and start fresh.

**Recovery from empty state**:
- Floor: 1 soil
- Sun only: +0.5/week
- Time to reach starting capacity (4): ~6 weeks

### Recovery Time Examples

| Goal Cost | Example | Recovery Time (full engagement) |
|-----------|---------|-------------------------------|
| 1 | 1w fertile | ~3 days |
| 3 | 1m fertile | ~8 days |
| 5 | 3m fertile | ~14 days |
| 8 | 6m fertile | ~22 days |
| 12 | 1y fertile | ~33 days |

This pacing forces **selectivity** - you can't have everything, you must choose.
