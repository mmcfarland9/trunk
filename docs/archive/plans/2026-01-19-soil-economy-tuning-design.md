# Soil Economy Tuning Design

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Tune the soil economy so a committed user reaches ~90 capacity at 10 years and approaches 100 at 20 years, with meaningful tradeoffs between risk/reward and journaling as a supplement (not engine) of progression.

**Architecture:** Adjust constants in `src/state.ts` — diminishing returns curve, environment multipliers, result multipliers, and restock rates. No structural changes.

**Tech Stack:** TypeScript, Vite

---

## Philosophy

The soil economy should reward:
- **Challenge** — harder environments give better return on investment
- **Showing up** — even failure grows you (compressed result spread)
- **Quality over quantity** — journaling supplements but doesn't replace goal completion
- **Patience** — 100 capacity is a 20-year asymptote, not a sprint target

---

## Changes Summary

| Lever | Old Value | New Value |
|-------|-----------|-----------|
| Diminishing curve | `(1 - C/100)` | `(1 - C/100)²` |
| Environment reward: fertile | 1.0× | 1.1× |
| Environment reward: firm | 1.4× | 1.75× |
| Environment reward: barren | 2.0× | 2.4× |
| Result mult: 1 (showed up) | 0.2 | 0.4 |
| Result mult: 2 (partial) | 0.4 | 0.55 |
| Result mult: 3 (solid) | 0.6 | 0.7 |
| Result mult: 4 (strong) | 0.8 | 0.85 |
| Result mult: 5 (excellence) | 1.0 | 1.0 |
| Water restock | 0.1 | 0.05 |
| Sun restock | 0.5 | 0.35 |

**Not implemented yet:** Capacity decay (flat ~0.1/week when inactive). Deferred to future iteration.

---

## Detailed Rationale

### 1. Quadratic Diminishing Returns

**Formula change:** `(1 - C/100)` → `(1 - C/100)²`

| Capacity | Linear (old) | Quadratic (new) |
|----------|--------------|-----------------|
| 10 | 90% | 81% |
| 25 | 75% | 56% |
| 50 | 50% | 25% |
| 75 | 25% | 6.25% |
| 90 | 10% | 1% |
| 95 | 5% | 0.25% |

**Why:** Linear was too generous at high capacity. Quadratic makes:
- First 50 achievable (25%+ rewards)
- 75+ a real grind (6% rewards)
- 90+ legendary status (1% rewards)
- 100 mathematically approachable but practically mythical

### 2. Environment Reward Multipliers

**Old risk/reward:**
- Fertile: pay 1×, get 1× (neutral)
- Firm: pay 1.5×, get 1.4× (bad deal!)
- Barren: pay 2×, get 2× (break-even)

**New risk/reward:**
- Fertile: pay 1×, get 1.1× (10% bonus)
- Firm: pay 1.5×, get 1.75× (17% bonus)
- Barren: pay 2×, get 2.4× (20% bonus)

**Why:** Challenge should be rewarded, not just break-even. The harder you push, the better the return on investment.

### 3. Result Multipliers (Compressed Spread)

**Old:** 5× spread (0.2 → 1.0)
**New:** 2.5× spread (0.4 → 1.0)

| Result | Old | New | Meaning |
|--------|-----|-----|---------|
| 1 | 0.2 | 0.4 | You showed up |
| 2 | 0.4 | 0.55 | Partial effort |
| 3 | 0.6 | 0.7 | Solid, honest work |
| 4 | 0.8 | 0.85 | Strong execution |
| 5 | 1.0 | 1.0 | Excellence |

**Why:** Failure is still an attempt. Even a 1/5 result gives 40% of full reward. Every honest effort grows you.

### 4. Restock Rates (Journaling Value)

**Old weekly max:** 2.6 (water 2.1 + sun 0.5)
**New weekly max:** 1.4 (water 1.05 + sun 0.35)

| Action | Old | New |
|--------|-----|-----|
| Water (per use) | 0.1 | 0.05 |
| Sun (per use) | 0.5 | 0.35 |
| Weekly max | 2.6 | 1.4 |
| Yearly max | 135 | 73 |

**Recovery time comparison:**

| Goal | Cost | Old Recovery | New Recovery |
|------|------|--------------|--------------|
| 1w fertile | 1 | 3 days | 5 days |
| 1m fertile | 3 | 8 days | 2 weeks |
| 1y fertile | 12 | 5 weeks | 9 weeks |
| 1y barren | 24 | 9 weeks | 17 weeks |

**Why:** Old rates made journaling too powerful — you could almost ignore goal quality and grind check-ins. New rates make journaling meaningful but supplementary. Goal completion remains the engine.

---

## Expected Progression (Post-Tuning)

With quadratic diminishing + new multipliers, projected progression for committed user (4× 3m barren/year, result 5):

| Year | Capacity | Notes |
|------|----------|-------|
| 1 | ~15 | Early growth still fast |
| 5 | ~55 | Solid progress |
| 10 | ~85-90 | Target achieved |
| 20 | ~95-98 | Approaching asymptote |
| 50 | ~99 | Still not quite 100 |

**Note:** These projections need validation after implementation. The quadratic curve significantly changes the math.

---

## Future: Capacity Decay (Not Yet Implemented)

**Design decision:** Flat decay of ~0.1/week when inactive (no sprouts completed that week).

**Why flat instead of proportional:** Quadratic diminishing + proportional decay creates a hard ceiling well below 100. Flat decay allows true asymptotic approach while still enforcing "use it or lose it."

**Implementation deferred:** Focus on core economy tuning first. Decay adds complexity and should be tested separately.

---

## Implementation Tasks

### Task 1: Update Diminishing Returns Formula

**Files:**
- Modify: `src/state.ts:166`

**Step 1: Locate the diminishing factor calculation**

Find in `calculateCapacityReward()`:
```typescript
const diminishingFactor = Math.max(0, 1 - (currentCapacity / MAX_SOIL_CAPACITY))
```

**Step 2: Change to quadratic**

```typescript
const diminishingFactor = Math.max(0, Math.pow(1 - (currentCapacity / MAX_SOIL_CAPACITY), 2))
```

**Step 3: Commit**

```bash
git add src/state.ts
git commit -m "feat(soil): use quadratic diminishing returns curve"
```

---

### Task 2: Update Environment Reward Multipliers

**Files:**
- Modify: `src/state.ts:131-135`

**Step 1: Update ENVIRONMENT_REWARD_MULT**

From:
```typescript
const ENVIRONMENT_REWARD_MULT: Record<SproutEnvironment, number> = {
  fertile: 1.0,
  firm: 1.4,
  barren: 2.0,
}
```

To:
```typescript
const ENVIRONMENT_REWARD_MULT: Record<SproutEnvironment, number> = {
  fertile: 1.1,
  firm: 1.75,
  barren: 2.4,
}
```

**Step 2: Update comments**

```typescript
// Environment reward multiplier (harder = better return on risk)
const ENVIRONMENT_REWARD_MULT: Record<SproutEnvironment, number> = {
  fertile: 1.1,   // Safe path - 10% bonus
  firm: 1.75,     // Some friction - 17% bonus
  barren: 2.4,    // Real challenge - 20% bonus
}
```

**Step 3: Commit**

```bash
git add src/state.ts
git commit -m "feat(soil): increase environment reward multipliers to incentivize challenge"
```

---

### Task 3: Update Result Multipliers

**Files:**
- Modify: `src/state.ts:139-145`

**Step 1: Update RESULT_REWARD_MULT**

From:
```typescript
const RESULT_REWARD_MULT: Record<number, number> = {
  1: 0.2,
  2: 0.4,
  3: 0.6,
  4: 0.8,
  5: 1.0,
}
```

To:
```typescript
const RESULT_REWARD_MULT: Record<number, number> = {
  1: 0.4,
  2: 0.55,
  3: 0.7,
  4: 0.85,
  5: 1.0,
}
```

**Step 2: Update comments**

```typescript
// Result multiplier (1-5 scale from sprout completion)
// Compressed spread: showing up matters, every attempt grows you
const RESULT_REWARD_MULT: Record<number, number> = {
  1: 0.4,   // You showed up - 40% reward
  2: 0.55,  // Partial effort
  3: 0.7,   // Solid, honest work
  4: 0.85,  // Strong execution
  5: 1.0,   // Excellence - full reward
}
```

**Step 3: Commit**

```bash
git add src/state.ts
git commit -m "feat(soil): compress result multiplier spread (showing up counts)"
```

---

### Task 4: Update Water Restock Rate

**Files:**
- Modify: `src/state.ts:92`

**Step 1: Update SOIL_RECOVERY_PER_WATER**

From:
```typescript
const SOIL_RECOVERY_PER_WATER = 0.1   // 3x/day = 0.3/day = ~2.1/week
```

To:
```typescript
const SOIL_RECOVERY_PER_WATER = 0.05  // 3x/day = 0.15/day = ~1.05/week
```

**Step 2: Commit**

```bash
git add src/state.ts
git commit -m "feat(soil): reduce water restock rate to 0.05"
```

---

### Task 5: Update Sun Restock Rate

**Files:**
- Modify: `src/state.ts:93`

**Step 1: Update SOIL_RECOVERY_PER_SUN**

From:
```typescript
const SOIL_RECOVERY_PER_SUN = 0.5     // 1x/week - reflection is valuable
```

To:
```typescript
const SOIL_RECOVERY_PER_SUN = 0.35    // 1x/week - meaningful but supplementary
```

**Step 2: Commit**

```bash
git add src/state.ts
git commit -m "feat(soil): reduce sun restock rate to 0.35"
```

---

### Task 6: Update Documentation

**Files:**
- Modify: `docs/progression-system.md`

**Step 1: Update all affected tables and formulas**

- Diminishing returns table (add quadratic column)
- Environment reward multipliers
- Result multipliers
- Water/sun recovery rates
- Example user journeys (recalculate with new values)

**Step 2: Commit**

```bash
git add docs/progression-system.md
git commit -m "docs: update progression-system.md with new soil economy values"
```

---

### Task 7: Build and Verify

**Step 1: Run build**

```bash
npm run build
```

Expected: Clean build, no TypeScript errors

**Step 2: Manual testing**

- Start dev server: `npm run dev`
- Plant a sprout, complete it, verify capacity reward reflects new multipliers
- Water a sprout, verify soil recovery is 0.05
- Shine, verify soil recovery is 0.35

**Step 3: Final commit**

```bash
git add -A
git commit -m "chore: soil economy tuning complete"
```

---

## Validation Checklist

- [ ] Quadratic diminishing: at capacity 50, rewards are 25% (not 50%)
- [ ] Barren environment gives 2.4× reward (not 2×)
- [ ] Result 1 gives 0.4× reward (not 0.2×)
- [ ] Water restocks 0.05 soil (not 0.1)
- [ ] Sun restocks 0.35 soil (not 0.5)
- [ ] Build passes
- [ ] Documentation updated
