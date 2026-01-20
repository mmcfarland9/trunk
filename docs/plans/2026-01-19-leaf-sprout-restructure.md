# Leaf & Sprout Restructure Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Restructure leaf/sprout system to support concurrent sprouts, named leaves, remove grafting, and eliminate 1w sprouts.

**Architecture:** Update types first, then state/constants, then migration, then UI. Each phase builds on the previous. Test after each change.

**Tech Stack:** TypeScript, Vite, localStorage persistence

---

## Phase 1: Type System Updates

### Task 1.1: Remove 1w from SproutSeason type

**Files:**
- Modify: `src/types.ts:8`

**Step 1: Update SproutSeason type**

In `src/types.ts`, change line 8 from:
```typescript
export type SproutSeason = '1w' | '2w' | '1m' | '3m' | '6m' | '1y'
```
to:
```typescript
export type SproutSeason = '2w' | '1m' | '3m' | '6m' | '1y'
```

**Step 2: Run build to check for type errors**

Run: `npm run build 2>&1 | head -50`
Expected: May show errors in files using '1w' - note them for next tasks

**Step 3: Commit**

```bash
git add src/types.ts
git commit -m "refactor: remove 1w from SproutSeason type"
```

---

### Task 1.2: Add name field to Leaf type

**Files:**
- Modify: `src/types.ts:46-50`

**Step 1: Update Leaf type**

In `src/types.ts`, change the Leaf type from:
```typescript
export type Leaf = {
  id: string
  status: LeafStatus
  createdAt: string
}
```
to:
```typescript
export type Leaf = {
  id: string
  name: string
  createdAt: string
}
```

**Step 2: Run build to check for type errors**

Run: `npm run build 2>&1 | head -50`
Expected: Errors where `status` is referenced - note them

**Step 3: Commit**

```bash
git add src/types.ts
git commit -m "refactor: add name field to Leaf, remove status field"
```

---

### Task 1.3: Remove LeafStatus type

**Files:**
- Modify: `src/types.ts:44`

**Step 1: Remove LeafStatus type definition**

In `src/types.ts`, remove:
```typescript
export type LeafStatus = 'active' | 'dormant' | 'archived'
```

**Step 2: Run build to find remaining references**

Run: `npm run build 2>&1 | head -50`
Expected: Any remaining LeafStatus references will error

**Step 3: Commit**

```bash
git add src/types.ts
git commit -m "refactor: remove LeafStatus type"
```

---

## Phase 2: Constants & State Updates

### Task 2.1: Update season costs (remove 1w)

**Files:**
- Modify: `src/state.ts` (SEASON_BASE_COST)

**Step 1: Find and update SEASON_BASE_COST**

Run: `grep -n "SEASON_BASE_COST\|'1w'" src/state.ts`

Remove the '1w' entry from SEASON_BASE_COST object.

**Step 2: Run build**

Run: `npm run build 2>&1 | head -30`
Expected: PASS or errors to fix

**Step 3: Commit**

```bash
git add src/state.ts
git commit -m "refactor: remove 1w from season costs"
```

---

### Task 2.2: Update season rewards (remove 1w)

**Files:**
- Modify: `src/state.ts` (SEASON_BASE_REWARD)

**Step 1: Find and update SEASON_BASE_REWARD**

Run: `grep -n "SEASON_BASE_REWARD" src/state.ts`

Remove the '1w' entry from SEASON_BASE_REWARD object.

**Step 2: Run build**

Run: `npm run build 2>&1 | head -30`
Expected: PASS

**Step 3: Commit**

```bash
git add src/state.ts
git commit -m "refactor: remove 1w from season rewards"
```

---

### Task 2.3: Update starting capacity to 10

**Files:**
- Modify: `src/state.ts` (STARTING_SOIL_CAPACITY or similar)

**Step 1: Find starting capacity constant**

Run: `grep -n "STARTING\|starting.*capacity\|capacity.*4" src/state.ts`

**Step 2: Update value from 4 to 10**

Change the starting capacity constant from 4 to 10.

**Step 3: Run build**

Run: `npm run build 2>&1 | head -30`
Expected: PASS

**Step 4: Commit**

```bash
git add src/state.ts
git commit -m "feat: increase starting soil capacity from 4 to 10"
```

---

## Phase 3: Migration

### Task 3.1: Add migration for 1w sprouts

**Files:**
- Modify: `src/state.ts` (MIGRATIONS object and version)

**Step 1: Increment schema version**

Find `CURRENT_SCHEMA_VERSION` and increment it (likely 1 → 2).

**Step 2: Add migration function**

Add to MIGRATIONS object:
```typescript
2: (data) => {
  const nodes = data.nodes as Record<string, unknown>

  // Convert 1w sprouts to 2w
  Object.values(nodes).forEach((node: unknown) => {
    const n = node as { sprouts?: Array<{ season: string }> }
    if (n.sprouts) {
      n.sprouts.forEach(sprout => {
        if (sprout.season === '1w') {
          sprout.season = '2w'
        }
      })
    }
  })

  return data
}
```

**Step 3: Run build**

Run: `npm run build 2>&1 | head -30`
Expected: PASS

**Step 4: Commit**

```bash
git add src/state.ts
git commit -m "feat: add migration to convert 1w sprouts to 2w"
```

---

### Task 3.2: Add migration for leaf names

**Files:**
- Modify: `src/state.ts` (extend migration 2)

**Step 1: Extend migration to add leaf names**

Update migration 2 to also handle leaves:
```typescript
2: (data) => {
  const nodes = data.nodes as Record<string, unknown>

  Object.values(nodes).forEach((node: unknown) => {
    const n = node as {
      sprouts?: Array<{ season: string; title: string; leafId?: string }>,
      leaves?: Array<{ id: string; name?: string; status?: string }>
    }

    // Convert 1w sprouts to 2w
    if (n.sprouts) {
      n.sprouts.forEach(sprout => {
        if (sprout.season === '1w') {
          sprout.season = '2w'
        }
      })
    }

    // Add name to leaves, remove status
    if (n.leaves) {
      n.leaves.forEach(leaf => {
        if (!leaf.name) {
          // Derive name from most recent sprout on this leaf
          const leafSprouts = n.sprouts?.filter(s => s.leafId === leaf.id) || []
          const mostRecent = leafSprouts[leafSprouts.length - 1]
          leaf.name = mostRecent?.title || 'Unnamed Saga'
        }
        delete leaf.status
      })
    }
  })

  return data
}
```

**Step 2: Run build**

Run: `npm run build 2>&1 | head -30`
Expected: PASS

**Step 3: Commit**

```bash
git add src/state.ts
git commit -m "feat: add migration for leaf names"
```

---

## Phase 4: UI Updates - Season Dropdowns

### Task 4.1: Remove 1w from twig-view season dropdown

**Files:**
- Modify: `src/ui/twig-view.ts`

**Step 1: Find season dropdown/options**

Run: `grep -n "'1w'\|1w\|season.*option\|option.*season" src/ui/twig-view.ts | head -20`

**Step 2: Remove 1w option from season selector**

Find the season options array/HTML and remove the 1w entry.

**Step 3: Run build**

Run: `npm run build 2>&1 | head -30`
Expected: PASS

**Step 4: Test manually**

Run: `npm run dev`
Verify: Season dropdown shows only 2w, 1m, 3m, 6m, 1y

**Step 5: Commit**

```bash
git add src/ui/twig-view.ts
git commit -m "feat: remove 1w from season dropdown in twig view"
```

---

## Phase 5: UI Updates - Leaf Name Field

### Task 5.1: Add leaf name input to sprout creation

**Files:**
- Modify: `src/ui/twig-view.ts`

**Step 1: Find sprout creation form**

Run: `grep -n "createSprout\|sprout.*form\|draft" src/ui/twig-view.ts | head -20`

**Step 2: Add leaf picker dropdown**

Add a dropdown with options:
- "No leaf (standalone)"
- "Create new leaf..."
- [Existing leaves on this twig]

When "Create new leaf..." selected, show name input field.

**Step 3: Update sprout creation to set leafId**

When creating sprout, if leaf selected:
- If new leaf: create leaf first, then set leafId
- If existing leaf: set leafId
- If standalone: leave leafId undefined

**Step 4: Run build**

Run: `npm run build 2>&1 | head -30`
Expected: PASS

**Step 5: Test manually**

Run: `npm run dev`
Verify: Can create standalone sprout and sprout with new/existing leaf

**Step 6: Commit**

```bash
git add src/ui/twig-view.ts
git commit -m "feat: add leaf picker to sprout creation form"
```

---

## Phase 6: UI Updates - Remove Grafting

### Task 6.1: Remove graft button from sidebar

**Files:**
- Modify: `src/ui/dom-builder.ts` or `src/features/progress.ts`

**Step 1: Find graft button**

Run: `grep -rn "graft" src/`

**Step 2: Remove graft button HTML and event handlers**

Remove the graft button from sidebar sprout cards.

**Step 3: Run build**

Run: `npm run build 2>&1 | head -30`
Expected: PASS

**Step 4: Commit**

```bash
git add -A
git commit -m "feat: remove graft button from sidebar"
```

---

### Task 6.2: Remove graft action from leaf view

**Files:**
- Modify: `src/ui/leaf-view.ts`

**Step 1: Find graft functionality**

Run: `grep -n "graft" src/ui/leaf-view.ts`

**Step 2: Remove graft button and handler**

Remove any "Graft new sprout" button and associated logic.

**Step 3: Add "Add Sprout" button instead**

Replace graft with simpler "Add Sprout" that opens sprout creation with leaf pre-selected.

**Step 4: Run build**

Run: `npm run build 2>&1 | head -30`
Expected: PASS

**Step 5: Commit**

```bash
git add src/ui/leaf-view.ts
git commit -m "feat: replace graft with add sprout in leaf view"
```

---

## Phase 7: UI Updates - Stacked Cards

### Task 7.1: Update twig view to show stacked leaf cards

**Files:**
- Modify: `src/ui/twig-view.ts`
- Modify: `src/styles/twig-view.css`

**Step 1: Group active sprouts by leaf**

When rendering active sprouts, group by leafId. Standalone sprouts render individually.

**Step 2: Create stacked card component**

For leaves with multiple active sprouts, render as:
```html
<div class="sprout-card sprout-card-stacked">
  <div class="leaf-header">🌿 {leafName}</div>
  <div class="stacked-sprouts">
    <div class="stacked-sprout-row">[2w] Title 1</div>
    <div class="stacked-sprout-row">[6m] Title 2</div>
  </div>
</div>
```

**Step 3: Add CSS for stacked cards**

```css
.sprout-card-stacked {
  /* styling for stacked variant */
}
.leaf-header {
  font-weight: 500;
  margin-bottom: 0.5rem;
}
.stacked-sprout-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.25rem 0;
}
```

**Step 4: Run build**

Run: `npm run build 2>&1 | head -30`
Expected: PASS

**Step 5: Test manually**

Run: `npm run dev`
Verify: Leaves with multiple active sprouts show as stacked card

**Step 6: Commit**

```bash
git add src/ui/twig-view.ts src/styles/twig-view.css
git commit -m "feat: add stacked card visualization for concurrent leaf sprouts"
```

---

### Task 7.2: Update sidebar to show stacked leaf cards

**Files:**
- Modify: `src/features/progress.ts`
- Modify: `src/styles/sidebar.css`

**Step 1: Group sidebar sprouts by leaf**

In the active sprouts list, group by leafId.

**Step 2: Render grouped sprouts**

Leaves with multiple sprouts show as grouped under leaf name.
Standalone sprouts show individually.

**Step 3: Add CSS**

**Step 4: Run build and test**

**Step 5: Commit**

```bash
git add src/features/progress.ts src/styles/sidebar.css
git commit -m "feat: add stacked cards to sidebar active sprouts list"
```

---

## Phase 8: Cleanup & Documentation

### Task 8.1: Remove any remaining leaf status references

**Files:**
- Search all files

**Step 1: Find remaining references**

Run: `grep -rn "LeafStatus\|leaf\.status\|status.*leaf" src/`

**Step 2: Remove or update each reference**

Replace status checks with derived logic:
- "active" = leaf has sprouts with state 'active'
- "dormant" = leaf has only 'completed'/'failed' sprouts

**Step 3: Run build**

Run: `npm run build 2>&1 | head -30`
Expected: PASS

**Step 4: Commit**

```bash
git add -A
git commit -m "refactor: remove all leaf status references"
```

---

### Task 8.2: Update documentation

**Files:**
- Modify: `CLAUDE.md`
- Modify: `docs/progression-system.md`

**Step 1: Update CLAUDE.md**

- Update Sprout section (remove 1w mention)
- Update Leaf section (add name field, remove status)
- Update soil economy tables (remove 1w row)
- Update starting capacity (4 → 10)
- Remove grafting references

**Step 2: Update progression-system.md**

- Remove 1w from all tables
- Update starting capacity
- Remove any grafting mentions

**Step 3: Commit**

```bash
git add CLAUDE.md docs/progression-system.md
git commit -m "docs: update documentation for leaf/sprout restructure"
```

---

### Task 8.3: Final build and test

**Step 1: Full build**

Run: `npm run build`
Expected: PASS with no errors

**Step 2: Manual testing checklist**

- [ ] Create standalone sprout (no leaf)
- [ ] Create new leaf with sprout
- [ ] Add second sprout to existing leaf (concurrent)
- [ ] Verify stacked card in twig view
- [ ] Verify stacked card in sidebar
- [ ] Water individual sprout in leaf
- [ ] Harvest one sprout while another stays active
- [ ] Verify 1w option is gone from dropdown
- [ ] Verify starting capacity is 10

**Step 3: Final commit**

```bash
git add -A
git commit -m "feat: complete leaf/sprout restructure"
```

---

## Summary of Changes

| Area | Change |
|------|--------|
| Types | Remove LeafStatus, add Leaf.name, remove 1w from SproutSeason |
| Constants | Remove 1w costs/rewards, capacity 4→10 |
| Migration | Convert 1w→2w, add leaf names, remove leaf status |
| UI | Remove graft buttons, add leaf picker, stacked cards |
| Docs | Update CLAUDE.md, progression-system.md |
