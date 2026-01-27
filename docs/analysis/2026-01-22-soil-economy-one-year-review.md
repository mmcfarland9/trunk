# Soil Economy Analysis: One Year of Active Use

> A comprehensive mathematical review of Trunk's soil economy, modeling realistic user scenarios to understand growth trajectories, bottlenecks, and strategic implications.

---

## Executive Summary

After analyzing the soil economy code and formulas, here are the key findings for year-one usage:

| User Type | Year-End Capacity | Growth Rate | Concurrent Goals |
|-----------|------------------|-------------|------------------|
| Casual (sun only) | 10.5 | +0.5 | 3-4 small |
| Steady (1 goal/month) | 14-16 | +4-6 | 5-6 mixed |
| Aggressive (2 goals/month) | 18-22 | +8-12 | 7-8 mixed |
| Challenger (barren focus) | 20-25 | +10-15 | 4-5 larger |

**Critical insight**: The first year is the most generous for growth. Quadratic diminishing returns at capacity 10 is only 0.81 (81% efficiency). By year 5 at capacity 27, you're down to 53%. This front-loads progress intentionally.

---

## Part 1: The Mechanics

### 1.1 Starting Position

Every user begins with:
- **Soil Capacity**: 10 (maximum concurrent goal budget)
- **Soil Available**: 10 (current spendable soil)
- **Water**: 3/day (resets at 6am)
- **Sun**: 1/week (resets Sunday 6am)

### 1.2 The Cost Table

Planting a sprout costs soil based on duration and difficulty:

| Season | Fertile | Firm | Barren |
|--------|---------|------|--------|
| 2 weeks | 2 | 3 | 4 |
| 1 month | 3 | 5 | 6 |
| 3 months | 5 | 8 | 10 |
| 6 months | 8 | 12 | 16 |
| 1 year | 12 | 18 | 24 |

**With 10 starting capacity, a new user can run:**
- 5 concurrent 2-week fertile goals, OR
- 3 concurrent 1-month fertile goals, OR
- 2 concurrent 3-month fertile goals, OR
- 1 concurrent 6-month fertile goal + 1 two-week fertile

### 1.3 Recovery Mechanics

Soil recovers through two channels:

| Channel | Rate | Frequency | Weekly Max |
|---------|------|-----------|------------|
| Water | +0.05 per use | 3/day | ~1.05 |
| Sun | +0.35 per use | 1/week | 0.35 |
| **Combined** | - | Full engagement | **~1.4/week** |

**Recovery time to replenish costs:**

| Cost | Example | Full Engagement | Sun Only |
|------|---------|-----------------|----------|
| 2 | 2w fertile | ~1.4 weeks | ~6 weeks |
| 3 | 1m fertile | ~2.1 weeks | ~9 weeks |
| 5 | 3m fertile | ~3.6 weeks | ~14 weeks |
| 8 | 6m fertile | ~5.7 weeks | ~23 weeks |
| 12 | 1y fertile | ~8.6 weeks | ~34 weeks |

### 1.4 The Reward Formula

When a sprout is harvested:

```
capacity_gain = base_reward × environment_mult × result_mult × diminishing_factor
```

**Base rewards by season:**

| Season | Base | Per-Week Equivalent |
|--------|------|---------------------|
| 2 weeks | 0.26 | 0.13 |
| 1 month | 0.56 | 0.14 |
| 3 months | 1.95 | 0.15 |
| 6 months | 4.16 | 0.16 |
| 1 year | 8.84 | 0.17 |

**Environment multipliers (reward):**

| Environment | Cost Mult | Reward Mult | Net Bonus |
|-------------|-----------|-------------|-----------|
| Fertile | 1.0x | 1.1x | +10% |
| Firm | 1.5x | 1.75x | +17% |
| Barren | 2.0x | 2.4x | +20% |

**Result multipliers:**

| Result | Emoji | Multiplier | Philosophy |
|--------|-------|------------|------------|
| 1 | 🥀 | 0.4 | "You showed up" |
| 2 | 🌱 | 0.55 | "Partial effort" |
| 3 | 🌿 | 0.7 | "Solid work" |
| 4 | 🌳 | 0.85 | "Strong execution" |
| 5 | 🌲 | 1.0 | "Excellence" |

**Diminishing returns (quadratic):**

```
diminishing = (1 - capacity/100)²
```

| Capacity | Factor | Effective Reward |
|----------|--------|------------------|
| 10 (start) | 0.81 | 81% of base |
| 15 | 0.72 | 72% of base |
| 20 | 0.64 | 64% of base |
| 25 | 0.56 | 56% of base |
| 30 | 0.49 | 49% of base |

---

## Part 2: Year-One Scenarios

### Scenario A: The Casual User (Sun-Only)

**Profile**: Life is busy. No active sprouts, but weekly sun reflection.

**Weekly activity:**
- Water: 0 (no active sprouts)
- Sun: 1 reflection

**Monthly soil recovery**: 0.35 × 4 = **1.4 soil**

**Year-end projection:**
- Goals completed: 0
- Capacity growth: 0 (no harvests)
- Available soil: 10 + (1.4 × 12) = ~26.8, capped at capacity
- **Final state**: Capacity 10, Available 10 (capped)

**Verdict**: Sun-only users cannot grow capacity. They maintain full availability but never expand. The system encourages planting.

---

### Scenario B: The Cautious Beginner

**Profile**: One 2-week fertile goal every 2 weeks, result 3 average.

**Per-cycle economics:**
- Cost: 2 soil
- Duration: 2 weeks
- Recovery during goal: 1.4 × 2 = 2.8 soil
- Net available change: +0.8 soil per cycle

**Harvest reward (at capacity 10):**
```
0.26 × 1.1 × 0.7 × 0.81 = 0.162 capacity
```

**Annual projection (26 cycles):**

| Month | Start Cap | Cycles | Cap Gain | End Cap |
|-------|-----------|--------|----------|---------|
| 1-3 | 10.0 | 6 | 0.97 | 10.97 |
| 4-6 | 10.97 | 6 | 0.92 | 11.89 |
| 7-9 | 11.89 | 6 | 0.87 | 12.76 |
| 10-12 | 12.76 | 6 | 0.82 | 13.58 |

**Year-end**: Capacity ~13.6, Available ~13.6

**Key insight**: Small, frequent goals grow capacity slowly but sustainably. No resource crunches.

---

### Scenario C: The Steady Practitioner

**Profile**: One 1-month fertile goal per month, result 4 average.

**Per-goal economics:**
- Cost: 3 soil
- Duration: 4 weeks
- Recovery during goal: 1.4 × 4 = 5.6 soil
- Net available change: +2.6 soil (if not capped)

**Harvest reward (starting at capacity 10):**
```
0.56 × 1.1 × 0.85 × 0.81 = 0.424 capacity
```

**Annual projection (12 goals):**

| Month | Start Cap | Diminishing | Reward | End Cap |
|-------|-----------|-------------|--------|---------|
| 1 | 10.00 | 0.81 | 0.424 | 10.42 |
| 2 | 10.42 | 0.80 | 0.419 | 10.84 |
| 3 | 10.84 | 0.79 | 0.414 | 11.26 |
| 4 | 11.26 | 0.79 | 0.410 | 11.67 |
| 5 | 11.67 | 0.78 | 0.406 | 12.07 |
| 6 | 12.07 | 0.77 | 0.402 | 12.48 |
| 7 | 12.48 | 0.77 | 0.398 | 12.87 |
| 8 | 12.87 | 0.76 | 0.394 | 13.27 |
| 9 | 13.27 | 0.75 | 0.390 | 13.66 |
| 10 | 13.66 | 0.75 | 0.386 | 14.04 |
| 11 | 14.04 | 0.74 | 0.383 | 14.43 |
| 12 | 14.43 | 0.73 | 0.379 | 14.81 |

**Year-end**: Capacity ~14.8, Available ~14.8

**What this unlocks:**
- Can now run 2 concurrent 3-month fertile goals (cost: 10)
- Can run 1 6-month fertile + 2 2-week fertile (cost: 12)
- Comfortable buffer for experimentation

---

### Scenario D: The Aggressive Builder

**Profile**: Two 1-month fertile goals per month, result 4 average.

**Per-month economics:**
- Cost: 6 soil (3 × 2)
- Recovery: 5.6 soil
- Net deficit: -0.4 soil/month
- Needs 2 harvests worth of refund to break even

**Harvest refund mechanics:**
On successful completion (result 3+), you get full soil cost back plus capacity growth.

**Monthly flow:**
1. Start month: Plant 2 goals (spend 6)
2. During month: Recover ~5.6
3. End month: Harvest 2 goals (recover 6 soil + capacity bonus)
4. Net: +5.6 available, +0.85 capacity

**Annual projection:**

| Quarter | Start Cap | Goals | Cap Gain | End Cap |
|---------|-----------|-------|----------|---------|
| Q1 | 10.0 | 6 | 2.5 | 12.5 |
| Q2 | 12.5 | 6 | 2.3 | 14.8 |
| Q3 | 14.8 | 6 | 2.1 | 16.9 |
| Q4 | 16.9 | 6 | 1.9 | 18.8 |

**Year-end**: Capacity ~18.8, Available ~18.8

**Sustainability check**: This works only if goals are completed successfully. Two failed goals in a month creates a soil crisis (50% refund on failure).

---

### Scenario E: The Risk-Taker (Barren Focus)

**Profile**: One 1-month barren goal per month, result 4 average.

**Per-goal economics:**
- Cost: 6 soil (3 × 2.0 barren mult)
- Recovery: 5.6 soil
- Net during goal: -0.4 soil

**Harvest reward (at capacity 10):**
```
0.56 × 2.4 × 0.85 × 0.81 = 0.925 capacity
```

**Annual projection:**

| Quarter | Start Cap | Diminishing | Q Gain | End Cap |
|---------|-----------|-------------|--------|---------|
| Q1 | 10.0 | 0.81 | 2.77 | 12.77 |
| Q2 | 12.77 | 0.76 | 2.61 | 15.38 |
| Q3 | 15.38 | 0.72 | 2.45 | 17.83 |
| Q4 | 17.83 | 0.67 | 2.29 | 20.12 |

**Year-end**: Capacity ~20.1, Available ~20.1

**Risk analysis**: Barren goals are 2x cost but 2.18x reward (2.4/1.1). The math favors challenge IF you can deliver result 3+. A failed barren goal returns only 3 soil (50% of 6) and no capacity—a significant setback.

---

### Scenario F: The Ambitious Overreacher

**Profile**: Attempts 3-month and 6-month goals early.

**Initial attempt: Two 3-month fertile goals**
- Cost: 10 soil (entire starting capacity)
- Available after planting: 0

**Month 1-3 recovery:**
- Weekly: 1.4 soil
- 12 weeks total: 16.8 soil recovered
- Available at harvest: 16.8 (capped at 10 capacity) → 10

**Harvest rewards (2 goals, result 4 average):**
```
Per goal: 1.95 × 1.1 × 0.85 × 0.81 = 1.48 capacity
Total: 2.96 capacity
```

**Quarter 1 end**: Capacity 12.96, Available 12.96 + 10 refund = 22.96, capped at 12.96

**Problem**: Despite good rewards, you're locked out of new goals for 3 months. The cautious beginner completed 6 goals in that time, gaining ~1 capacity but building habit and momentum.

---

## Part 3: Critical Bottlenecks

### 3.1 The Early-Game Soil Crunch

**Starting capacity 10 creates real constraints:**

| Strategy | Cost | Remaining | Risk Level |
|----------|------|-----------|------------|
| 3 × 1m fertile | 9 | 1 | Medium - one failure hurts |
| 2 × 3m fertile | 10 | 0 | High - fully committed |
| 1 × 6m fertile | 8 | 2 | Low - but slow growth |
| 5 × 2w fertile | 10 | 0 | Low - quick feedback loops |

**Recommendation**: New users should start with 2-week and 1-month goals to learn the system before committing to longer seasons.

### 3.2 The Recovery Math

**Time to recover from full depletion (capacity 10):**

| Engagement | Weekly Rate | Time to Full |
|------------|-------------|--------------|
| Full (3w + 1s) | 1.4 | 7.1 weeks |
| Moderate (1w + 1s) | 0.7 | 14.3 weeks |
| Sun only | 0.35 | 28.6 weeks |

**After a catastrophic failure** (all goals fail, lose half soil):
- Start: 5 available, 10 capacity
- Recovery to plant 1m fertile (cost 3): ~2.1 weeks full engagement

### 3.3 The Failure Penalty

Failed goals (result 1-2) return only 50% of soil and grant no capacity.

**Example failure cascade:**
1. Plant 3 × 1m fertile (cost 9)
2. Life happens, all fail at result 2
3. Refund: 4.5 soil (50%)
4. Available: 1 + 4.5 = 5.5
5. **Can't even plant 2 × 1m fertile anymore**

**Recovery time to reach 9 soil again**: ~2.5 weeks at full engagement

---

## Part 4: Strategic Insights

### 4.1 Optimal Year-One Strategy

Based on the math, the optimal first-year approach:

**Phase 1 (Months 1-2): Learn the system**
- 2-week fertile goals only
- Complete 4-6 small goals
- Build watering habit
- Capacity grows ~0.6-0.8

**Phase 2 (Months 3-6): Build rhythm**
- Mix of 2-week and 1-month fertile
- 1-2 active goals at a time
- Capacity grows ~2.0-2.5

**Phase 3 (Months 7-12): Stretch carefully**
- Introduce firm environment on familiar goals
- Try one 3-month goal
- Capacity grows ~2.5-3.0

**Total year-one capacity**: ~15-16 (starting from 10)

### 4.2 Environment Selection Matrix

| Choose This | When You Have |
|-------------|---------------|
| Fertile | New goal type, learning, limited time |
| Firm | Familiar territory, some friction expected |
| Barren | High conviction, strong support systems |

**The environment question**: "How much is working against me?"
- Fertile = wind at your back
- Firm = walking into the wind
- Barren = climbing uphill in a storm

### 4.3 Season Selection Matrix

| Season | Best For |
|--------|----------|
| 2 weeks | Testing ideas, building habits, quick wins |
| 1 month | Standard personal projects, skill building |
| 3 months | Larger initiatives, requires planning |
| 6 months | Life changes, significant undertakings |
| 1 year | Transformational goals, high commitment |

**Per-week reward bonus for commitment:**
- 2w → 1y: +31% better per-week rate
- But 1-year goals lock soil for 52 weeks

### 4.4 The Journaling Multiplier

Full engagement (3 water + 1 sun per week) provides ~1.4 soil/week.

**This means:**
- A 1-month fertile goal (cost 3) recovers 40% of its cost during execution
- A 3-month fertile goal (cost 5) recovers 110% of its cost during execution
- Longer goals become self-sustaining from a recovery perspective

---

## Part 5: Year-One Projections Summary

### Conservative Path (Low Risk)
- **Pattern**: 2-week fertile goals, 2 per month
- **Year-end capacity**: ~13
- **Goals completed**: ~24
- **Character**: Patient, habit-focused

### Balanced Path (Medium Risk)
- **Pattern**: 1-month fertile goals, 1 per month
- **Year-end capacity**: ~15
- **Goals completed**: ~12
- **Character**: Steady, sustainable

### Aggressive Path (Higher Risk)
- **Pattern**: Mix of 1-month firm and barren
- **Year-end capacity**: ~18-20
- **Goals completed**: ~12-15
- **Character**: Growth-focused, resilient to setbacks

### Commitment Path (Long-term)
- **Pattern**: 3-month and 6-month goals
- **Year-end capacity**: ~16-18
- **Goals completed**: ~4-6
- **Character**: Strategic, patient, high-conviction

---

## Part 6: Key Takeaways

1. **Year one is generous**: Diminishing returns at capacity 10-20 still gives 64-81% efficiency. This is the fastest growth period.

2. **Recovery is slow by design**: ~7 weeks to fully recover forces selectivity. You can't have everything.

3. **Challenge pays off**: Barren environment gives 20% bonus return on risk, but only if you deliver.

4. **Showing up matters**: Even result 1 (40% reward) grows you. The system rewards honest effort.

5. **Failure hurts but isn't fatal**: 50% refund on failure plus floor of 1 soil means you can always restart.

6. **Journaling is supplementary**: Water + sun = ~1.4 soil/week. Nice, but goal completion is the engine.

7. **Commitment compounds**: Longer seasons have better per-week rates and self-sustain through recovery.

---

## Appendix: Calculation Functions

From `src/state.ts`:

```typescript
// Cost calculation
function calculateSoilCost(season, environment) {
  const base = SEASON_BASE_COST[season]
  const multiplier = ENVIRONMENT_COST_MULT[environment]
  return Math.ceil(base * multiplier)
}

// Reward calculation
function calculateCapacityReward(season, environment, result, currentCapacity) {
  const base = SEASON_BASE_REWARD[season]
  const envMult = ENVIRONMENT_REWARD_MULT[environment]
  const resultMult = RESULT_REWARD_MULT[result] ?? 0.7
  const diminishingFactor = Math.pow(1 - (currentCapacity / 100), 2)
  return base * envMult * resultMult * diminishingFactor
}
```

---

*Generated 2026-01-22 for Trunk soil economy analysis*
