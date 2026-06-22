# Seedling Tray Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the read-only global seedlings list into a branch-grouped, actionable "tray" on web and iOS, so users can see all their seedlings grouped by branch and plant/edit/delete them in place.

**Architecture:** Pure UI/UX change. No event, schema, derivation, or constants changes — a seedling stays `{ id, twigId, title, notes?, createdAt }`. Both platforms reuse their existing seedling card + plant flow; the only new logic is a pure "group seedlings by branch" helper (unit-tested) plus rendering/wiring (verified via e2e + manual).

**Tech Stack:** Web — Vite + TypeScript (vanilla DOM), Vitest, Playwright. iOS — Swift/SwiftUI, XCTest (TrunkTests), Maestro.

## Global Constraints

- **No data-model changes.** No new event types or payload fields; no edits to `shared/schemas/`, `shared/constants.json`, `validateEvent`, `derive.ts`, `EventDerivation.swift`, or `shared/test-fixtures/`. Parity fixtures stay untouched.
- **Branch on `dev`.** All work on `dev`; never commit to `main`.
- **Web formatting:** run `npx biome format --write src/` from `web/` before each web commit (CI enforces Biome + `tsc --noEmit` + tests).
- **Web style:** 2-space indent, `kebab-case.ts` files, `camelCase` exports, CSS `kebab-case` with `.is-*` state modifiers.
- **Commits:** Conventional commits (`feat:`, `refactor:`, `test:`, `docs:`). No attribution footer (disabled globally).
- **Seedling title max:** 60 chars (`MAX_SEEDLING_TITLE_LENGTH`); notes max 200 (`MAX_SEEDLING_NOTES_LENGTH`) — reuse existing constants, do not change them.
- **Edit covers title + notes** (notes is an existing field).
- **Collapse state is in-memory** (default expanded); not persisted.

---

## File Structure

**Web**
- `web/src/ui/twig-view/seedlings.ts` (modify) — extract `renderSeedlingCard()`, `startInlineSeedlingEdit()`, `handleSeedlingDeleteClick()` as shared helpers; keep `renderSeedlings()` using them.
- `web/src/features/seedling-grouping.ts` (create) — pure `groupSeedlingsByBranch()` helper.
- `web/src/ui/twig-view/index.ts` (modify) — expose `prefillPlantFromSeedling()` on the twig view API; refactor existing `plant`/`edit`/`delete` cases to call shared helpers.
- `web/src/features/progress.ts` (modify) — render the sidebar seedlings section as branch folders of cards; add delegated action handler; new `onPlantSeedling` plumbing.
- `web/src/bootstrap/dialogs.ts` (modify) — pass `onPlantSeedling` that navigates to the twig and pre-fills.
- `web/src/tests/seedling-grouping.test.ts` (create), `web/src/tests/seedlings-card.test.ts` (create).
- `web/e2e/seedling-tray.spec.ts` (create).

**iOS**
- `ios/Trunk/ViewModels/SproutsViewModel.swift` (modify) — add `seedlingsGroupedByBranch`.
- `ios/Trunk/Views/Seedlings/SeedlingCardView.swift` (modify) — edit covers title + notes; `onEdit: (String, String?) -> Void`.
- `ios/Trunk/Views/Seedlings/SeedlingsSection.swift` (modify) — pass notes through `editSeedling`.
- `ios/Trunk/Views/SproutsView.swift` (modify) — rewrite `SeedlingsListView` as branch-grouped collapsible sections with plant sheet + actions; pass `progression`.
- `ios/TrunkTests/SeedlingGroupingTests.swift` (create).
- `ios/.maestro/flows/seedling-tray.yaml` (create).

---

## WEB

### Task W1: Extract shared `renderSeedlingCard()` markup

**Files:**
- Modify: `web/src/ui/twig-view/seedlings.ts`
- Test: `web/src/tests/seedlings-card.test.ts`

**Interfaces:**
- Produces: `renderSeedlingCard(s: DerivedSeedling, opts?: { locationLabel?: string }): string` — one `.seedling-card` with `data-seedling-id`, title, optional notes, optional `.seedling-location`, and the three `data-seedling-action` buttons (`plant`/`edit`/`delete`).

- [ ] **Step 1: Write the failing test**

```ts
// web/src/tests/seedlings-card.test.ts
import { describe, expect, it } from 'vitest'
import { renderSeedlingCard } from '../ui/twig-view/seedlings'
import type { DerivedSeedling } from '../events'

const seedling: DerivedSeedling = {
  id: 'seedling-abc',
  twigId: 'branch-2-twig-3',
  title: 'Learn kerning',
  notes: 'start with type crimes',
  createdAt: '2026-06-01T12:00:00.000Z',
}

describe('renderSeedlingCard', () => {
  it('renders title, notes, id and the three actions', () => {
    const html = renderSeedlingCard(seedling)
    expect(html).toContain('data-seedling-id="seedling-abc"')
    expect(html).toContain('Learn kerning')
    expect(html).toContain('start with type crimes')
    expect(html).toContain('data-seedling-action="plant"')
    expect(html).toContain('data-seedling-action="edit"')
    expect(html).toContain('data-seedling-action="delete"')
  })

  it('omits the location span unless a label is given', () => {
    expect(renderSeedlingCard(seedling)).not.toContain('seedling-location')
    expect(renderSeedlingCard(seedling, { locationLabel: 'BRAIN / Reading' })).toContain(
      '<span class="seedling-location">BRAIN / Reading</span>',
    )
  })

  it('escapes HTML in title', () => {
    const html = renderSeedlingCard({ ...seedling, title: '<img>' })
    expect(html).not.toContain('<img>')
    expect(html).toContain('&lt;img&gt;')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd web && npx vitest run src/tests/seedlings-card.test.ts`
Expected: FAIL — `renderSeedlingCard` is not exported.

- [ ] **Step 3: Implement `renderSeedlingCard` and refactor `renderSeedlings` to use it**

In `web/src/ui/twig-view/seedlings.ts`, add the function and rewrite `renderSeedlings`:

```ts
/**
 * Render a single seedling card. `locationLabel` (used by the sidebar tray) adds
 * a twig-location line; the twig view omits it.
 */
export function renderSeedlingCard(
  s: DerivedSeedling,
  opts?: { locationLabel?: string },
): string {
  return `
    <div class="seedling-card" data-seedling-id="${escapeHtml(s.id)}">
      <span class="seedling-title">${escapeHtml(s.title)}</span>
      ${s.notes ? `<span class="seedling-notes">${escapeHtml(s.notes)}</span>` : ''}
      ${opts?.locationLabel ? `<span class="seedling-location">${escapeHtml(opts.locationLabel)}</span>` : ''}
      <div class="seedling-actions">
        <button type="button" class="seedling-action" data-seedling-action="plant" title="Plant as sprout">Set</button>
        <button type="button" class="seedling-action" data-seedling-action="edit" title="Edit">Edit</button>
        <button type="button" class="seedling-action seedling-action-delete" data-seedling-action="delete" title="Delete">&times;</button>
      </div>
    </div>`
}

export function renderSeedlings(twigId: string): string {
  const state = getState()
  const seedlings = getSeedlingsForTwig(state, twigId)
  if (seedlings.length === 0) {
    return '<p class="seedling-empty">Jot down ideas for this twig</p>'
  }
  return seedlings.map((s) => renderSeedlingCard(s)).join('')
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd web && npx vitest run src/tests/seedlings-card.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Format, typecheck, commit**

```bash
cd web && npx biome format --write src/ && npx tsc --noEmit
git add web/src/ui/twig-view/seedlings.ts web/src/tests/seedlings-card.test.ts
git commit -m "refactor(web): extract shared renderSeedlingCard"
```

---

### Task W2: Pure `groupSeedlingsByBranch()` helper

**Files:**
- Create: `web/src/features/seedling-grouping.ts`
- Test: `web/src/tests/seedling-grouping.test.ts`

**Interfaces:**
- Consumes: items shaped `{ branchIndex: number }` (the sidebar's `SeedlingWithLocation`).
- Produces: `groupSeedlingsByBranch<T extends { branchIndex: number }>(items: T[]): Map<number, T[]>` — keyed by branch index, insertion order preserved within a branch, branches with `branchIndex < 0` skipped.

- [ ] **Step 1: Write the failing test**

```ts
// web/src/tests/seedling-grouping.test.ts
import { describe, expect, it } from 'vitest'
import { groupSeedlingsByBranch } from '../features/seedling-grouping'

describe('groupSeedlingsByBranch', () => {
  it('buckets items by branchIndex, preserving order', () => {
    const items = [
      { branchIndex: 2, id: 'a' },
      { branchIndex: 0, id: 'b' },
      { branchIndex: 2, id: 'c' },
    ]
    const grouped = groupSeedlingsByBranch(items)
    expect(grouped.get(2)?.map((i) => i.id)).toEqual(['a', 'c'])
    expect(grouped.get(0)?.map((i) => i.id)).toEqual(['b'])
  })

  it('skips invalid (negative) branch indices', () => {
    const grouped = groupSeedlingsByBranch([{ branchIndex: -1, id: 'x' }])
    expect(grouped.size).toBe(0)
  })

  it('returns an empty map for empty input', () => {
    expect(groupSeedlingsByBranch([]).size).toBe(0)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd web && npx vitest run src/tests/seedling-grouping.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the helper**

```ts
// web/src/features/seedling-grouping.ts
/**
 * Group sidebar seedlings (anything carrying a branchIndex) into per-branch
 * buckets. Invalid branch indices (< 0) are skipped. Insertion order within a
 * branch is preserved.
 */
export function groupSeedlingsByBranch<T extends { branchIndex: number }>(
  items: T[],
): Map<number, T[]> {
  const grouped = new Map<number, T[]>()
  for (const item of items) {
    if (item.branchIndex < 0) continue
    const list = grouped.get(item.branchIndex) || []
    list.push(item)
    grouped.set(item.branchIndex, list)
  }
  return grouped
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd web && npx vitest run src/tests/seedling-grouping.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Format, commit**

```bash
cd web && npx biome format --write src/ && npx tsc --noEmit
git add web/src/features/seedling-grouping.ts web/src/tests/seedling-grouping.test.ts
git commit -m "feat(web): add groupSeedlingsByBranch helper"
```

---

### Task W3: Extract shared edit/delete helpers + expose `prefillPlantFromSeedling`

**Files:**
- Modify: `web/src/ui/twig-view/seedlings.ts` (add `startInlineSeedlingEdit`, `handleSeedlingDeleteClick`)
- Modify: `web/src/ui/twig-view/index.ts` (use helpers; add `prefillPlantFromSeedling` to the returned API)

**Interfaces:**
- Produces (seedlings.ts):
  - `startInlineSeedlingEdit(card: HTMLElement, seedlingId: string, onDone: () => void): void` — swaps the title span for a text input (maxLength 60), commits title on Enter/blur, calls `onDone` after commit/cancel.
  - `handleSeedlingDeleteClick(actionEl: HTMLElement, seedlingId: string, onConfirm: () => void): void` — two-step "Sure?" confirm; calls `onConfirm` on the confirming click.
- Produces (twig view API): `prefillPlantFromSeedling(seedlingId: string): void` — sets `state.plantingSeedlingId`, fills `sproutTitleInput`, focuses, runs `updateForm()`.

> Note: this task moves the *existing* twig-view `edit`/`delete`/`plant` case logic into reusable helpers. Behavior is unchanged in the twig view; the sidebar tray (Task W4) and bootstrap (Task W5) will reuse them. Verified by the existing twig-view tests plus manual check (DOM-mutation logic is covered by the Task W6 e2e, not a new unit test).

- [ ] **Step 1: Add the shared helpers to `seedlings.ts`**

```ts
/**
 * Inline-edit a seedling's title within its card. Mirrors the twig-view editor.
 */
export function startInlineSeedlingEdit(
  card: HTMLElement,
  seedlingId: string,
  onDone: () => void,
): void {
  const seedling = getSeedlingById(seedlingId)
  const titleEl = card.querySelector('.seedling-title')
  if (!seedling || !titleEl) return
  const input = document.createElement('input')
  input.type = 'text'
  input.className = 'seedling-edit-input'
  input.value = seedling.title
  input.maxLength = 60
  titleEl.replaceWith(input)
  input.focus()
  input.select()
  const commit = () => {
    const newTitle = input.value.trim()
    if (newTitle && newTitle !== seedling.title) editSeedling(seedlingId, newTitle)
    onDone()
  }
  input.addEventListener('blur', commit)
  input.addEventListener('keydown', (ke) => {
    if (ke.key === 'Enter') {
      ke.preventDefault()
      commit()
    }
    if (ke.key === 'Escape') onDone()
  })
}

/**
 * Two-step delete: first click arms ("Sure?"), second click within 2s confirms.
 */
export function handleSeedlingDeleteClick(
  actionEl: HTMLElement,
  seedlingId: string,
  onConfirm: () => void,
): void {
  if (actionEl.dataset.confirmDelete === 'true') {
    deleteSeedling(seedlingId)
    onConfirm()
    return
  }
  actionEl.dataset.confirmDelete = 'true'
  actionEl.textContent = 'Sure?'
  actionEl.classList.add('is-confirming')
  setTimeout(() => {
    if (actionEl.dataset.confirmDelete === 'true') {
      actionEl.dataset.confirmDelete = ''
      actionEl.textContent = '×'
      actionEl.classList.remove('is-confirming')
    }
  }, 2000)
}
```

- [ ] **Step 2: Refactor the twig-view handler to use the helpers + expose `prefillPlantFromSeedling`**

In `web/src/ui/twig-view/index.ts`, replace the body of the `delete`/`plant`/`edit` cases (currently lines ~176–235) with calls to the helpers, and define a `prefillPlantFromSeedling` function that the existing `plant` case and the returned API both use:

```ts
function prefillPlantFromSeedling(seedlingId: string): void {
  const seedling = getSeedlingById(seedlingId)
  if (!seedling) return
  state.plantingSeedlingId = seedlingId
  elements.sproutTitleInput.value = seedling.title
  elements.sproutTitleInput.focus()
  updateForm()
}
```

```ts
// inside the delegated click handler's switch:
case 'delete':
  handleSeedlingDeleteClick(seedlingActionEl, seedlingId, renderSeedlingsList)
  break
case 'plant':
  prefillPlantFromSeedling(seedlingId)
  break
case 'edit':
  if (seedlingCard) startInlineSeedlingEdit(seedlingCard, seedlingId, renderSeedlingsList)
  break
```

Add the imports `handleSeedlingDeleteClick`, `startInlineSeedlingEdit` to the existing import from `./seedlings`. Add `prefillPlantFromSeedling` to the object this module returns as the twig view API (find the `return { open, close, ... }` near the end of the file and add `prefillPlantFromSeedling`).

- [ ] **Step 3: Add `prefillPlantFromSeedling` to the twig view API type**

Find the twig view API type (the type of `ctx.twigView`; search `twigView?:` in `web/src/types.ts`). Add:

```ts
prefillPlantFromSeedling: (seedlingId: string) => void
```

- [ ] **Step 4: Typecheck + run existing twig tests**

Run: `cd web && npx tsc --noEmit && npx vitest run src/tests`
Expected: PASS (no regressions).

- [ ] **Step 5: Format, commit**

```bash
cd web && npx biome format --write src/
git add web/src/ui/twig-view/seedlings.ts web/src/ui/twig-view/index.ts web/src/types.ts
git commit -m "refactor(web): share seedling edit/delete helpers; expose prefillPlantFromSeedling"
```

---

### Task W4: Branch-grouped, actionable sidebar tray

**Files:**
- Modify: `web/src/features/progress.ts`

**Interfaces:**
- Consumes: `groupSeedlingsByBranch` (W2), `renderSeedlingCard` (W1), `startInlineSeedlingEdit`/`handleSeedlingDeleteClick`/`getSeedlingById`/`deleteSeedling` (W3/seedlings.ts), existing `createBranchFolder`, `getBranchLabel`, `parseBranchIndex`, `getAllSeedlingsFromState`.
- Produces: `initSidebarSprouts` gains a 4th param `onPlantSeedling?: (seedling: SeedlingWithLocation) => void`, stored like `storedWaterClick`.

- [ ] **Step 1: Add imports + stored callback**

At the top of `progress.ts`, extend the import from `../ui/twig-view/seedlings` (create it if absent) to include `renderSeedlingCard, startInlineSeedlingEdit, handleSeedlingDeleteClick, getSeedlingById, deleteSeedling`, and import `groupSeedlingsByBranch` from `./seedling-grouping`. Near the other `stored*` module variables add:

```ts
let storedPlantSeedling: ((seedling: SeedlingWithLocation) => void) | undefined
```

- [ ] **Step 2: Render branch folders of cards (replace the flat-row block)**

Replace the seedlings render block (currently `progress.ts:368–379`, the `seedlingsList.replaceChildren()` … `renderSeedlingRow` loop) with:

```ts
seedlingsList.replaceChildren()
if (filteredSeedlings.length === 0) {
  const hint = document.createElement('p')
  hint.className = 'sprouts-empty-hint'
  hint.textContent = 'No seedlings yet.'
  seedlingsList.append(hint)
} else {
  const byBranch = groupSeedlingsByBranch(filteredSeedlings)
  const branchIndices = [...byBranch.keys()].sort((a, b) => a - b)
  for (const branchIndex of branchIndices) {
    const branchSeedlings = byBranch.get(branchIndex) ?? []
    const folder = createBranchFolder(branchIndex, getBranchLabel(branchIndex), branchSeedlings.length)
    const wrap = document.createElement('div')
    wrap.className = 'seedling-cards'
    wrap.innerHTML = branchSeedlings
      .map((s) => renderSeedlingCard(s, { locationLabel: s.twigLabel }))
      .join('')
    folder.append(wrap)
    seedlingsList.append(folder)
  }
}
```

(The old `renderSeedlingRow` import/usage is now dead; remove the import from `progress.ts`. Leave `renderSeedlingRow` defined in `progress-panel.ts` only if still referenced elsewhere — search first; if unused, delete it in this commit.)

- [ ] **Step 3: Add the delegated action handler (in `initSidebarSprouts`)**

Add the 4th param and store it:

```ts
export function initSidebarSprouts(
  ctx: AppContext,
  onWaterClick?: (sprout: SproutWithLocation) => void,
  onHarvestClick?: SidebarHarvestCallback,
  onPlantSeedling?: (seedling: SeedlingWithLocation) => void,
): void {
  // ...existing destructure...
  storedWaterClick = onWaterClick
  storedHarvestClick = onHarvestClick
  storedPlantSeedling = onPlantSeedling
```

Inside `initSidebarSprouts` (alongside the toggle listeners) add one delegated listener:

```ts
seedlingsList.addEventListener('click', (e) => {
  const actionEl = (e.target as HTMLElement).closest<HTMLElement>('[data-seedling-action]')
  if (!actionEl) return
  const card = actionEl.closest<HTMLElement>('.seedling-card')
  const seedlingId = card?.dataset.seedlingId
  if (!seedlingId || !card) return
  switch (actionEl.dataset.seedlingAction) {
    case 'delete':
      handleSeedlingDeleteClick(actionEl, seedlingId, () => updateSidebarSprouts(ctx))
      break
    case 'edit':
      startInlineSeedlingEdit(card, seedlingId, () => updateSidebarSprouts(ctx))
      break
    case 'plant': {
      const seedling = getSeedlingById(seedlingId)
      if (seedling && storedPlantSeedling) {
        storedPlantSeedling({
          ...seedling,
          twigLabel: getPresetLabel(seedling.twigId) || seedling.twigId,
          branchIndex: parseBranchIndex(seedling.twigId),
        })
      }
      break
    }
  }
})
```

- [ ] **Step 4: Typecheck**

Run: `cd web && npx tsc --noEmit`
Expected: PASS (note: `bootstrap/dialogs.ts` already compiles; the new param is optional).

- [ ] **Step 5: Format, commit**

```bash
cd web && npx biome format --write src/
git add web/src/features/progress.ts web/src/ui/progress-panel.ts
git commit -m "feat(web): branch-grouped actionable seedling tray in sidebar"
```

---

### Task W5: Wire plant-from-tray navigation

**Files:**
- Modify: `web/src/bootstrap/dialogs.ts`

**Interfaces:**
- Consumes: `enterTwigView` (from `../features/navigation`), `ctx.nodeLookup`, `ctx.twigView.prefillPlantFromSeedling` (W3), `navCallbacks`.

- [ ] **Step 1: Pass `onPlantSeedling` into `initSidebarSprouts`**

Ensure `enterTwigView` is imported in `dialogs.ts` (`import { enterTwigView } from '../features/navigation'`). Update the `initSidebarSprouts(...)` call (currently `dialogs.ts:167`) to add the 4th argument:

```ts
initSidebarSprouts(
  ctx,
  (sprout) => waterDialogApi.openWaterDialog(sprout),
  (sprout) => { /* existing harvest mapping unchanged */ },
  (seedling) => {
    const twig = ctx.nodeLookup.get(seedling.twigId)
    if (!twig || seedling.branchIndex < 0) return
    enterTwigView(twig, seedling.branchIndex, ctx, navCallbacks)
    ctx.twigView?.prefillPlantFromSeedling(seedling.id)
  },
)
```

- [ ] **Step 2: Typecheck**

Run: `cd web && npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 3: Manual smoke test**

Run: `cd web && npm run dev`, open the app with seed data, expand the **Seedlings** sidebar section, confirm branch folders appear, click **Set** on a seedling in another branch → app navigates into that twig with the plant form pre-filled. Click **Edit** → inline title edit. Click **Delete** → "Sure?" then removal.

- [ ] **Step 4: Format, commit**

```bash
cd web && npx biome format --write src/
git add web/src/bootstrap/dialogs.ts
git commit -m "feat(web): plant seedling from sidebar tray (navigate + prefill)"
```

---

### Task W6: Playwright e2e — plant from the tray

**Files:**
- Create: `web/e2e/seedling-tray.spec.ts`

> Uses the e2e test user (`?e2e`) and seeded data. Selectors below assume the existing class names; adjust to match `auth.setup.ts`/`playwright.config.ts` base URL conventions used by other specs in `web/e2e/`.

- [ ] **Step 1: Write the spec**

```ts
// web/e2e/seedling-tray.spec.ts
import { expect, test } from '@playwright/test'

test('plant a seedling from the sidebar tray', async ({ page }) => {
  await page.goto('/?e2e')
  // Expand the Seedlings section
  await page.locator('.sprouts-toggle[data-section="seedlings"]').click()
  const tray = page.locator('.sprouts-list[data-section="seedlings"]')
  const firstCard = tray.locator('.seedling-card').first()
  await expect(firstCard).toBeVisible()
  const title = await firstCard.locator('.seedling-title').innerText()

  // Plant it
  await firstCard.locator('[data-seedling-action="plant"]').click()

  // Plant form is pre-filled with the seedling's title
  await expect(page.locator('.sprout-title-input')).toHaveValue(title)
})
```

- [ ] **Step 2: Run it**

Run: `cd web && npx playwright test e2e/seedling-tray.spec.ts`
Expected: PASS. (If the seed user has no seedlings, add one to `scripts/seed-test-user.mjs` first, or create one via the twig view at the top of the test.)

- [ ] **Step 3: Commit**

```bash
git add web/e2e/seedling-tray.spec.ts
git commit -m "test(web): e2e plant seedling from tray"
```

---

## iOS

### Task I1: `seedlingsGroupedByBranch` on the view model

**Files:**
- Modify: `ios/Trunk/ViewModels/SproutsViewModel.swift`
- Test: `ios/TrunkTests/SeedlingGroupingTests.swift`

**Interfaces:**
- Produces: `struct SeedlingBranchGroup: Identifiable { let branchIndex: Int; let branchName: String; let seedlings: [DerivedSeedling]; var id: Int { branchIndex } }` and `func seedlingsGroupedByBranch(_ seedlings: [DerivedSeedling]) -> [SeedlingBranchGroup]` (sorted by branchIndex; entries whose twigId fails to parse are skipped).

- [ ] **Step 1: Write the failing test**

```swift
// ios/TrunkTests/SeedlingGroupingTests.swift
import XCTest
@testable import Trunk

final class SeedlingGroupingTests: XCTestCase {
    // NOTE: match DerivedSeedling's real initializer; adjust arg labels if needed.
    private func seed(_ id: String, _ twigId: String) -> DerivedSeedling {
        DerivedSeedling(id: id, twigId: twigId, title: id, notes: nil, createdAt: "2026-06-01T00:00:00.000Z")
    }

    func testGroupsByBranchSortedAscending() {
        let vm = SproutsViewModel()
        let groups = vm.seedlingsGroupedByBranch([
            seed("a", "branch-2-twig-1"),
            seed("b", "branch-0-twig-3"),
            seed("c", "branch-2-twig-4"),
        ])
        XCTAssertEqual(groups.map { $0.branchIndex }, [0, 2])
        XCTAssertEqual(groups.first { $0.branchIndex == 2 }?.seedlings.map { $0.id }, ["a", "c"])
    }

    func testSkipsUnparseableTwigIds() {
        let vm = SproutsViewModel()
        let groups = vm.seedlingsGroupedByBranch([seed("x", "garbage")])
        XCTAssertTrue(groups.isEmpty)
    }
}
```

- [ ] **Step 2: Run test to verify it fails**

Run (from `ios/`): `xcodebuild test -scheme Trunk -destination 'platform=iOS Simulator,name=iPhone 15' -only-testing:TrunkTests/SeedlingGroupingTests`
Expected: FAIL — `seedlingsGroupedByBranch` not found.

- [ ] **Step 3: Implement on `SproutsViewModel`**

```swift
struct SeedlingBranchGroup: Identifiable {
    let branchIndex: Int
    let branchName: String
    let seedlings: [DerivedSeedling]
    var id: Int { branchIndex }
}

extension SproutsViewModel {
    func seedlingsGroupedByBranch(_ seedlings: [DerivedSeedling]) -> [SeedlingBranchGroup] {
        var buckets: [Int: [DerivedSeedling]] = [:]
        for seedling in seedlings {
            guard let parsed = parseTwigId(seedling.twigId) else { continue }
            buckets[parsed.branchIndex, default: []].append(seedling)
        }
        return buckets.keys.sorted().map { index in
            SeedlingBranchGroup(
                branchIndex: index,
                branchName: SharedConstants.Tree.branchName(index),
                seedlings: buckets[index] ?? []
            )
        }
    }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: same command as Step 2.
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add ios/Trunk/ViewModels/SproutsViewModel.swift ios/TrunkTests/SeedlingGroupingTests.swift
git commit -m "feat(ios): seedlingsGroupedByBranch on SproutsViewModel"
```

---

### Task I2: Edit covers title + notes

**Files:**
- Modify: `ios/Trunk/Views/Seedlings/SeedlingCardView.swift`
- Modify: `ios/Trunk/Views/Seedlings/SeedlingsSection.swift`

**Interfaces:**
- Produces: `SeedlingCardView.onEdit: (_ title: String, _ notes: String?) -> Void` (was `(String) -> Void`).

- [ ] **Step 1: Add a notes field to the inline editor in `SeedlingCardView`**

Change the closure type and the editing UI. Replace the `onEdit: (String) -> Void` declaration with `let onEdit: (String, String?) -> Void`, add `@State private var editNotes: String = ""`, and in the `if isEditing` block add a second `TextField("Notes (optional)", text: $editNotes)` under the title field (clamp to `SharedConstants.Validation.maxSeedlingNotesLength`). Update `commitEdit()`:

```swift
private func commitEdit() {
    let trimmedTitle = String(editTitle.trimmingCharacters(in: .whitespacesAndNewlines)
        .prefix(SharedConstants.Validation.maxSeedlingTitleLength))
    let trimmedNotes = String(editNotes.trimmingCharacters(in: .whitespacesAndNewlines)
        .prefix(SharedConstants.Validation.maxSeedlingNotesLength))
    if !trimmedTitle.isEmpty {
        onEdit(trimmedTitle, trimmedNotes.isEmpty ? "" : trimmedNotes)
    }
    isEditing = false
}
```

In the context-menu "Edit" button, seed both fields: `editTitle = seedling.title; editNotes = seedling.notes ?? ""; isEditing = true`.

- [ ] **Step 2: Thread notes through `SeedlingsSection`**

In `SeedlingsSection.swift`, change the `onEdit` it passes to `SeedlingCardView` to accept notes and forward them, and update `editSeedling` to include notes in the payload:

```swift
onEdit: { newTitle, newNotes in
    editSeedling(seedling.id, title: newTitle, notes: newNotes)
},
```

```swift
private func editSeedling(_ seedlingId: String, title: String, notes: String?) {
    let clampedTitle = String(title.prefix(SharedConstants.Validation.maxSeedlingTitleLength))
    Task {
        do {
            var payload: [String: AnyCodableValue] = [
                "seedlingId": .string(seedlingId),
                "title": .string(clampedTitle),
            ]
            if let notes { payload["notes"] = .string(notes) }
            try await SyncService.shared.pushEvent(type: "seedling_edited", payload: payload)
        } catch {
            print("[SeedlingsSection] Failed to edit seedling: \(error)")
        }
        onRefresh()
    }
}
```

(Confirm the payload value enum name — the file already uses `.string(...)`; reuse that exact type. `notes` empty string clears the note, matching web sparse-merge semantics.)

- [ ] **Step 3: Build to verify it compiles**

Run (from `ios/`): `xcodebuild build -scheme Trunk -destination 'platform=iOS Simulator,name=iPhone 15'`
Expected: BUILD SUCCEEDED.

- [ ] **Step 4: Commit**

```bash
git add ios/Trunk/Views/Seedlings/SeedlingCardView.swift ios/Trunk/Views/Seedlings/SeedlingsSection.swift
git commit -m "feat(ios): edit seedling title and notes"
```

---

### Task I3: Branch-grouped tray in `SeedlingsListView`

**Files:**
- Modify: `ios/Trunk/Views/SproutsView.swift`

**Interfaces:**
- Consumes: `seedlingsGroupedByBranch` (I1), `SeedlingCardView` (I2), `CreateSproutView(nodeId:progression:initialTitle:plantingSeedlingId:)`, `SyncService.shared.pushEvent`.

- [ ] **Step 1: Pass `progression` + a refresh closure into `SeedlingsListView`**

In `SproutsView.body`, update the `.seedlings` case:

```swift
case .seedlings:
    SeedlingsListView(
        seedlings: viewModel.cachedSeedlings,
        groups: viewModel.seedlingsGroupedByBranch(viewModel.cachedSeedlings),
        progression: progression,
        onChanged: { viewModel.refreshCachedState() }
    )
```

- [ ] **Step 2: Rewrite `SeedlingsListView`**

```swift
struct SeedlingsListView: View {
    let seedlings: [DerivedSeedling]
    let groups: [SeedlingBranchGroup]
    @Bindable var progression: ProgressionViewModel
    let onChanged: () -> Void

    @State private var expanded: Set<Int> = []
    @State private var didInitExpansion = false
    @State private var plantFrom: (title: String, twigId: String, seedlingId: String)?
    @State private var showingPlant = false

    var body: some View {
        VStack(alignment: .leading, spacing: TrunkTheme.space2) {
            Text("\(seedlings.count) seedling\(seedlings.count == 1 ? "" : "s")")
                .monoLabel(size: TrunkTheme.textXs)

            if seedlings.isEmpty {
                Text("No seedlings yet. Add ideas from a twig detail view.")
                    .font(.system(size: TrunkTheme.textSm, design: .monospaced))
                    .foregroundStyle(Color.inkFaint)
                    .padding(.vertical, TrunkTheme.space4)
            } else {
                ForEach(groups) { group in
                    branchSection(group)
                }
            }
        }
        .onAppear {
            if !didInitExpansion {
                expanded = Set(groups.map { $0.branchIndex }) // default expanded
                didInitExpansion = true
            }
        }
        .sheet(isPresented: $showingPlant, onDismiss: { plantFrom = nil; onChanged() }) {
            if let plantFrom {
                NavigationStack {
                    CreateSproutView(
                        nodeId: plantFrom.twigId,
                        progression: progression,
                        initialTitle: plantFrom.title,
                        plantingSeedlingId: plantFrom.seedlingId
                    )
                }
            }
        }
    }

    @ViewBuilder
    private func branchSection(_ group: SeedlingBranchGroup) -> some View {
        let isOpen = expanded.contains(group.branchIndex)
        VStack(alignment: .leading, spacing: 1) {
            Button {
                if isOpen { expanded.remove(group.branchIndex) } else { expanded.insert(group.branchIndex) }
            } label: {
                HStack {
                    Text(group.branchName)
                        .font(.system(size: TrunkTheme.textXs, design: .monospaced))
                        .foregroundStyle(Color.wood)
                    Text("(\(group.seedlings.count))")
                        .font(.system(size: TrunkTheme.textXs, design: .monospaced))
                        .foregroundStyle(Color.inkFaint)
                    Spacer()
                    Text(isOpen ? "▼" : "▶")
                        .font(.system(size: TrunkTheme.textXs, design: .monospaced))
                        .foregroundStyle(Color.inkFaint)
                }
                .padding(.vertical, TrunkTheme.space2)
            }
            .buttonStyle(.plain)

            if isOpen {
                VStack(spacing: 1) {
                    ForEach(group.seedlings) { seedling in
                        SeedlingCardView(
                            seedling: seedling,
                            onPlant: {
                                plantFrom = (seedling.title, seedling.twigId, seedling.id)
                                showingPlant = true
                            },
                            onEdit: { title, notes in editSeedling(seedling.id, title: title, notes: notes) },
                            onDelete: { deleteSeedling(seedling.id) }
                        )
                        .padding(.horizontal, TrunkTheme.space3)
                    }
                }
                .background(Color.paper)
                .overlay(Rectangle().stroke(Color.border, lineWidth: 1))
            }
        }
    }

    private func editSeedling(_ id: String, title: String, notes: String?) {
        Task {
            do {
                var payload: [String: AnyCodableValue] = [
                    "seedlingId": .string(id),
                    "title": .string(String(title.prefix(SharedConstants.Validation.maxSeedlingTitleLength))),
                ]
                if let notes { payload["notes"] = .string(notes) }
                try await SyncService.shared.pushEvent(type: "seedling_edited", payload: payload)
            } catch { print("[SeedlingsListView] edit failed: \(error)") }
            onChanged()
        }
    }

    private func deleteSeedling(_ id: String) {
        Task {
            do {
                try await SyncService.shared.pushEvent(type: "seedling_deleted", payload: ["seedlingId": .string(id)])
            } catch { print("[SeedlingsListView] delete failed: \(error)") }
            onChanged()
        }
    }
}
```

(Use the exact payload value type the codebase uses — verify against `SeedlingsSection.swift`; replace `AnyCodableValue` if the real name differs. `monoLabel`, `TrunkTheme`, `Color.*` already exist.)

- [ ] **Step 3: Build**

Run (from `ios/`): `xcodebuild build -scheme Trunk -destination 'platform=iOS Simulator,name=iPhone 15'`
Expected: BUILD SUCCEEDED.

- [ ] **Step 4: Manual check in simulator**

Run the app, go to **Garden → Seedlings**: confirm branch sections with counts, collapse/expand works, **Set** opens the plant form pre-filled (and the seedling disappears after a successful plant), **Edit** updates title + notes, swipe/long-press **Delete** removes it.

- [ ] **Step 5: Commit**

```bash
git add ios/Trunk/Views/SproutsView.swift
git commit -m "feat(ios): branch-grouped actionable seedling tray"
```

---

### Task I4: Maestro flow

**Files:**
- Create: `ios/.maestro/flows/seedling-tray.yaml`

> Requires `JAVA_HOME=/opt/homebrew/opt/openjdk/libexec/openjdk.jdk/Contents/Home`. Bundle id `mpmcf.Trunk`. Uses `helpers/ensure-logged-in.yaml`.

- [ ] **Step 1: Write the flow**

```yaml
# ios/.maestro/flows/seedling-tray.yaml
appId: mpmcf.Trunk
---
- runFlow: helpers/ensure-logged-in.yaml
- tapOn: "GARDEN"
- tapOn: "Seedlings"
# A branch section header is visible (count in parens)
- assertVisible:
    text: ".*\\(\\d+\\).*"
# Open the plant flow from a seedling's Set button
- tapOn: "Set"
- assertVisible: "Plant"   # CreateSproutView CTA/title
```

- [ ] **Step 2: Run it**

Run: `JAVA_HOME=/opt/homebrew/opt/openjdk/libexec/openjdk.jdk/Contents/Home maestro test ios/.maestro/flows/seedling-tray.yaml`
Expected: Flow passes. (Adjust `assertVisible` strings to the actual rendered labels if Maestro reports a miss.)

- [ ] **Step 3: Commit**

```bash
git add ios/.maestro/flows/seedling-tray.yaml
git commit -m "test(ios): maestro seedling tray flow"
```

---

## Docs

### Task D1: Reflect the tray in docs

**Files:**
- Modify: `ios/README.md` (parity table already lists "Seedlings"; no change needed unless wording), `CLAUDE.md`/`ARCHITECTURE.md` (only if they describe the seedling UX — they currently describe the data model, which is unchanged, so likely no edit).

- [ ] **Step 1:** Re-read `CLAUDE.md` "Seedlings" line and `ARCHITECTURE.md` `DerivedSeedling` block; since data is unchanged, confirm no edits are required. If any doc describes seedlings as "twig-only" UX, update to mention the branch-grouped tray.

- [ ] **Step 2: Commit (only if changes were made)**

```bash
git add CLAUDE.md ARCHITECTURE.md ios/README.md
git commit -m "docs: note branch-grouped seedling tray"
```

---

## Self-Review (completed by plan author)

- **Spec coverage:** grouped-by-branch (W4/I3), collapsible default-expanded in-memory (W4 via `createBranchFolder`/`is-collapsed`; I3 via `expanded` set), cards show title+notes+twig label (W1/I3), inline actions Plant/Edit/Delete (W3–W5/I2–I3), plant reuses existing flow + deletes on success (W5 via `prefillPlantFromSeedling`; I3 via `CreateSproutView(plantingSeedlingId:)`), edit covers title+notes (W3 note + I2), both platforms (W*/I*), no data changes (Global Constraints + D1), tests leave parity fixtures untouched (no fixture tasks). ✔ All spec sections map to a task.
- **Placeholder scan:** no TBD/TODO; every code step has concrete code; the two "verify exact type name" notes (web twig view API type location; iOS payload value enum) are explicit verification instructions, not deferred work.
- **Type consistency:** `renderSeedlingCard`, `groupSeedlingsByBranch`, `prefillPlantFromSeedling`, `onPlantSeedling`, `SeedlingBranchGroup`, `seedlingsGroupedByBranch`, and `onEdit: (String, String?)` are used consistently across the tasks that define and consume them.
