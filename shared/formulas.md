# Trunk Progression System Formulas

This document defines the mathematical formulas that govern the Trunk progression system. Both web and iOS apps must implement these formulas identically to ensure consistent behavior.

## Constants

See `constants.json` for all numeric constants referenced below.

---

## Soil Cost Calculation

Determines how much soil capacity is required to plant a sprout.

**Formula:**
```
soilCost = baseCost × environmentMultiplier
```

**Where:**
- `baseCost` = `constants.seasons[season].baseCost`
- `environmentMultiplier` = `constants.environments[environment].costMultiplier`

**Example:**
- 3-month sprout in firm environment: `5 × 1.5 = 7.5` → rounds to 8

**Implementation note:** Always round up (ceiling) the final result.

---

## Capacity Reward Calculation

Determines how much permanent soil capacity is gained when harvesting a sprout.

**Formula:**
```
reward = baseReward × envMultiplier × resultMultiplier × diminishingFactor
```

**Where:**
- `baseReward` = `constants.seasons[season].baseReward`
- `envMultiplier` = `constants.environments[environment].rewardMultiplier`
- `resultMultiplier` = `constants.results[result].multiplier`
- `diminishingFactor` = `max(0, (1 - currentCapacity / maxCapacity)^1.5)`

**Diminishing Returns:**
The `^1.5` exponent provides more generous early growth while still slowing significantly as you approach max capacity (100).

**Example:**
- 6-month sprout, barren environment, result=5, current capacity=50:
  - `baseReward = 5.0`
  - `envMultiplier = 2.4`
  - `resultMultiplier = 1.0`
  - `diminishingFactor = (1 - 50/100)^1.5 = 0.5^1.5 ≈ 0.3536`
  - `reward = 5.0 × 2.4 × 1.0 × 0.3536 ≈ 4.24`

**Implementation note:** Do NOT round - keep decimal precision for soil capacity.

---

## Soil Recovery

Soil capacity slowly recovers through regular activities.

**Water Recovery:**
- Gain: `+0.05` soil capacity per sprout watered
- Max per day: `3 waters × 0.05 = 0.15` capacity
- Max per week: `≈1.05` capacity

**Sun Recovery:**
- Gain: `+0.35` soil capacity per twig shone
- Frequency: Once per week per twig

**Total weekly recovery** (if watering daily and shining once):
- Water: `≈1.05`
- Sun: `0.35`
- **Total: ≈1.4 soil capacity per week**

---

## Water & Sun Reset Times

Both water and sun reset at **6:00 AM local time**.

**Water:** Resets daily at 6:00 AM
- Capacity goes back to 3
- Previous day's water entries remain in history

**Sun:** Resets weekly on Monday at 6:00 AM
- Capacity goes back to 1
- Previous week's sun entries remain in history

**Implementation note:** Use ISO week calculation (Monday = week start). Compare week numbers, not day counts.

---

## Progression Curve

Starting capacity: 10
Maximum capacity: 100

**Early game (0-30 capacity):**
- Diminishing factor ≈ 0.7-1.0
- Near-full rewards
- Rapid growth

**Mid game (30-70 capacity):**
- Diminishing factor ≈ 0.3-0.7
- Moderate growth slowdown

**Late game (70-100 capacity):**
- Diminishing factor ≈ 0.0-0.3
- Significant slowdown
- Approaching max capacity asymptotically

**Time to max capacity:** ~20 years of consistent effort (by design).

See `docs/progression-system.md` for detailed projection tables.

---

## Implementation Checklist

For each platform, verify:
- [ ] Soil cost calculation matches formula exactly
- [ ] Capacity reward calculation matches formula exactly
- [ ] Diminishing returns uses exponent 1.5 (not 2.0)
- [ ] Soil recovery rates match constants
- [ ] Water/sun reset at 6:00 AM local time
- [ ] Week calculation uses ISO weeks (Monday start)
- [ ] All numeric constants imported from `constants.json`

---

## Testing

Both platforms should pass identical test cases:

```
Input: 3m season, firm environment, result=4, currentCapacity=50
Expected: soilCost=8, reward≈3.18

Input: 1y season, barren environment, result=5, currentCapacity=90
Expected: soilCost=24, reward≈2.15
```
