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

- **Starting capacity**: 10 (room for ~3-5 concurrent goals)
- **Maximum capacity**: 100 (lifetime ceiling, essentially mythical)

### Soil Cost (Planting Budget)

Each sprout costs soil to plant, based on season and environment:

| Season | Fertile | Firm | Barren |
|--------|---------|------|--------|
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
| 2 weeks | 0.26 | 0.130 |
| 1 month | 0.56 | 0.140 |
| 3 months | 1.95 | 0.150 |
| 6 months | 4.16 | 0.160 |
| 1 year | 8.84 | 0.170 |

### 2. Environment Multiplier

Challenge is rewarded - harder environments give better return on risk:

| Environment | Cost Mult | Reward Mult | Return on Risk |
|-------------|-----------|-------------|----------------|
| Fertile | 1.0x | 1.1x | 10% bonus |
| Firm | 1.5x | 1.75x | 17% bonus |
| Barren | 2.0x | 2.4x | 20% bonus |

### 3. Result & Harvest Outcomes (1-5 scale)

Results 1-2 are failures, 3-5 are successes. Soil returns upon completion (tied up, not spent).

| Result | Soil Return | Capacity Mult | Meaning |
|--------|-------------|---------------|---------|
| 1 🥀 | 60% | 0 | Withered - you abandoned it |
| 2 🌱 | 80% | 0 | Sprout - you barely tried |
| 3 🌿 | 100% | 0.25× | Sapling - solid effort |
| 4 🌳 | 100% | 0.50× | Tree - strong execution |
| 5 🌲 | 100% | 1.0× | Oak - excellence |

### 4. Diminishing Returns Factor (Quadratic)

As you approach max capacity, growth slows dramatically toward zero:

```
diminishing = (1 - current_capacity / 100)²
```

| Current Capacity | Diminishing Factor | Effective Growth |
|------------------|-------------------|------------------|
| 10 (start) | 0.81 | 81% of base |
| 25 | 0.56 | 56% of base |
| 50 | 0.25 | 25% of base |
| 75 | 0.0625 | 6.25% of base |
| 90 | 0.01 | 1% of base |
| 95 | 0.0025 | 0.25% of base |

---

## Full Capacity Rewards Matrix

Results 1-2 (failure) give **0 capacity**. Only successful completions (3-5) grow capacity.

Formula: `base_reward × environment_mult × result_mult × diminishing_factor`

### Fertile Environment (1.1x)

| Season | R=3 (0.25×) | R=4 (0.50×) | R=5 (1.0×) |
|--------|-------------|-------------|------------|
| 2w | 0.07 | 0.14 | 0.29 |
| 1m | 0.15 | 0.31 | 0.62 |
| 3m | 0.54 | 1.07 | 2.15 |
| 6m | 1.14 | 2.29 | 4.58 |
| 1y | 2.43 | 4.86 | 9.72 |

*Note: These are base values before quadratic diminishing returns.*

### Firm Environment (1.75x)

| Season | R=3 (0.25×) | R=4 (0.50×) | R=5 (1.0×) |
|--------|-------------|-------------|------------|
| 2w | 0.11 | 0.23 | 0.46 |
| 1m | 0.25 | 0.49 | 0.98 |
| 3m | 0.85 | 1.71 | 3.41 |
| 6m | 1.82 | 3.64 | 7.28 |
| 1y | 3.87 | 7.74 | 15.47 |

### Barren Environment (2.4x)

| Season | R=3 (0.25×) | R=4 (0.50×) | R=5 (1.0×) |
|--------|-------------|-------------|------------|
| 2w | 0.16 | 0.31 | 0.62 |
| 1m | 0.34 | 0.67 | 1.34 |
| 3m | 1.17 | 2.34 | 4.68 |
| 6m | 2.50 | 4.99 | 9.98 |
| 1y | 5.30 | 10.61 | 21.22 |

---

## Example User Journeys

> **Note:** These projections use the old linear diminishing model. With quadratic diminishing,
> progression is faster early but dramatically slower at high capacity. A committed user now
> targets ~90 capacity at 10 years, approaching 100 after 20 years.

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

1. **Showing up counts** - Every honest effort grows you (40% reward even at result=1)
2. **Challenge rewarded** - Harder environments give better return on risk (10-20% bonus)
3. **Slow and steady** - Bonsai philosophy, not sprint mentality
4. **Commitment rewarded** - Longer seasons give slightly better per-week rates
5. **Quadratic diminishing** - Growth slows dramatically as you approach max
6. **Journaling supplements** - Water/sun meaningful but goal completion is the engine
7. **Lifetime ceiling** - 100 capacity approached after ~20 years of commitment

---

## Water & Sun: Soil Restoration

Soil is restored through daily engagement and weekly reflection. The process is slow and deliberate.

### Water (Sprout-Level, Daily)

**Purpose**: Quick daily engagement with active sprouts
**Question**: "What did I do for this goal today?"

| Property | Value |
|----------|-------|
| Capacity | 3 per day |
| Restoration | +0.05 soil per water |
| Target | Active sprouts |
| Max weekly | ~1.05 soil |

Water requires active sprouts - you're journaling about specific goals.

### Sun (Twig-Level, Weekly)

**Purpose**: Thoughtful philosophical reflection on life facets
**Question**: "What is my relationship with [this aspect of life] right now?"

| Property | Value |
|----------|-------|
| Capacity | 1 per week |
| Restoration | +0.35 soil per shine |
| Target | Any twig (always available) |
| Max weekly | 0.35 soil |

Sun is twig-level, not sprout-level. You reflect on "movement" or "intimacy" as concepts in your life, not on specific goals. This makes reflection always available, even without active sprouts.

### Recovery Rates

| Scenario | Weekly Recovery | Notes |
|----------|-----------------|-------|
| Full engagement (3 water/day + sun) | ~1.4 soil | Active user with sprouts |
| Sun only (no active sprouts) | 0.35 soil | Recovery from empty state |

Journaling is meaningful but supplementary. Goal completion remains the engine.

### Safety Net: Minimum Floor

Soil can never stay below **1**. This ensures you can always plant a humble 2-week fertile goal and start fresh.

**Recovery from empty state**:
- Floor: 1 soil
- Sun only: +0.35/week
- Time to reach starting capacity (10): ~26 weeks

### Recovery Time Examples

| Goal Cost | Example | Recovery Time (full engagement) |
|-----------|---------|-------------------------------|
| 2 | 2w fertile | ~1.4 weeks |
| 3 | 1m fertile | ~2 weeks |
| 5 | 3m fertile | ~3.5 weeks |
| 8 | 6m fertile | ~6 weeks |
| 12 | 1y fertile | ~9 weeks |
| 24 | 1y barren | ~17 weeks |

This pacing forces **selectivity** - you can't have everything, you must choose.
