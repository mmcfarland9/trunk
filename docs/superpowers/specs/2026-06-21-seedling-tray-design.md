# Seedling Tray — Design

- **Date:** 2026-06-21
- **Status:** Approved (design)
- **Platforms:** Web + iOS (parity)
- **Type:** UI/UX only — no data, event, schema, or derivation changes

## Problem

Seedlings (pre-sprout idea stubs) are easy to *capture* on a twig but hard to
*work with afterward*. The global seedlings view is a flat, **read-only** list:

- **iOS** (`SproutsView` → "Seedlings" mode → `SeedlingsListView`): shows title,
  notes, and a twig label per row, but has **no actions**. To plant, edit, or
  delete a seedling you must navigate back into its individual twig detail view.
- **Web** (sidebar Seedlings section): a flat list.

There is no way to see all ideas grouped, scan them, and decide to plant — which
is the whole point of keeping a backlog of ideas.

## Goals

1. **See & group** all seedlings in one place, grouped by branch.
2. **Act inline** — plant, edit, delete a seedling without leaving the aggregator.
3. **Simply decide to plant** — one tap from the aggregator into the existing
   plant flow.
4. Identical behavior on web and iOS.

## Non-Goals (explicitly out of scope)

- **No data-model changes.** A seedling stays `{ id, twigId, title, notes?, createdAt }`.
  No new fields, no new event payload fields, no schema/`validateEvent`/derivation
  changes, no parity-fixture changes, no back-compat surface.
- **No seedling-as-sprout-draft.** Seedlings do not carry season/environment/bloom/leaf.
- **No capture from the tray.** Adding a seedling stays on the twig detail view,
  where the target twig is implicit. (Can revisit later.)
- **No readiness/progress indicators.**

## Current State (reference)

- Derivation already provides everything needed: `DerivedState.seedlings` and
  `DerivedState.seedlingsByTwig` (`web/src/events/derive.ts`,
  `ios/Trunk/Services/EventDerivation.swift`). **Unchanged.**
- Twig id → branch is parsed today via `parseTwigId()` (both platforms); branch
  metadata (name, count) comes from generated constants.
- Plant flow exists: selecting a seedling pre-fills the plant form with the title,
  commits soil in the form, and deletes the seedling **only on successful plant**
  (no data loss on cancel). **Reused as-is.**
- Web seedling rendering + actions live in `web/src/ui/twig-view/seedlings.ts`
  (Set / Edit / Delete). iOS card lives in
  `ios/Trunk/Views/Seedlings/SeedlingCardView.swift` (already exposes
  `onPlant` / `onEdit` / `onDelete`, swipe + context menu).

## Design

### The tray (shared behavior, both platforms)

- **Grouped by branch.** Seedlings are bucketed by the branch of their `twigId`.
  Only branches that have at least one seedling are shown. Within a branch,
  seedlings keep their existing order (creation order from derivation).
- **Collapsible sections.** Each branch is a section with a header showing the
  **branch name + seedling count**; tapping the header expands/collapses it.
  Default: expanded. Collapse state is **in-memory view state**, not persisted
  (keeps it lean; matches the app's "view state is in-memory only" convention).
- **Cards.** Each card shows title, notes (if any), and the twig label (so you
  know where a seedling lives without leaving the tray).
- **Inline actions per card:**
  - **Plant ("Set")** → opens the existing plant form pre-filled with the title,
    targeting the seedling's own twig → user commits soil there → seedling is
    deleted on successful plant. Unchanged plant semantics; only the entry point
    is new.
  - **Edit** → edit **title and notes** (notes already exist as a field; we are
    only exposing it for editing — not new data). Emits `seedling_edited` with the
    changed fields (existing sparse-merge event).
  - **Delete** → emits `seedling_deleted` (existing).
- **Empty state.** Keep existing copy ("No seedlings yet. Add ideas from a twig
  detail view.").

### iOS

- Replace the body of `SeedlingsListView` (in `SproutsView.swift`) with
  branch-grouped, collapsible sections built from `DerivedState.seedlingsByTwig`
  (grouped up to branch).
- Reuse `SeedlingCardView` for the rows so the tray and the twig view's
  `SeedlingsSection` share one card. Wire its existing `onPlant` / `onEdit` /
  `onDelete` closures:
  - `onPlant` → present `CreateSproutView` pre-filled with the seedling title and
    its `twigId` (same path the twig view uses).
  - `onEdit` → small edit affordance covering title **and** notes (extend the
    current title-only inline editor to include notes, or a compact edit sheet).
  - `onDelete` → push `seedling_deleted`.
- Section collapse state: `@State` set of expanded branch ids in the list view.

### Web

- In the sidebar Seedlings section, render branch-grouped collapsible sections
  instead of a flat list, reusing a shared render function.
- Extract/extend `web/src/ui/twig-view/seedlings.ts` so card markup + the Set /
  Edit / Delete affordances are produced by one shared function, consumed by both
  the twig view and the sidebar tray.
- Wire the tray's actions via event delegation (the sidebar is persistent and
  lives outside the twig view): Set → open the plant form pre-filled with title +
  the seedling's twig; Edit → title + notes; Delete → `deleteSeedling()`.
- Collapse state: in-memory (module/view state), default expanded.

### Shared helper (per platform)

A single "group seedlings by branch" helper that turns the derived seedlings into
ordered branch buckets with counts, used by the tray. (No cross-language sharing;
each platform implements it natively, consistent with the existing two-engine
derivation approach.)

## Edge Cases

- Seedling whose `twigId` can't be parsed to a branch → skip/guard (mirror the
  guard-let derivation posture); should not happen given creation always sets a
  valid twig.
- Planting the last seedling in a branch → that branch section disappears after
  the seedling is deleted on successful plant.
- Cancelling the plant form → seedling remains (existing behavior).
- Branch with all sections collapsed still shows headers + counts.

## Testing

- **No derivation/logic change**, so parity fixtures are untouched — call this out
  in the PR.
- **Web (Vitest):** unit-test the group-by-branch helper (correct buckets, counts,
  order; empty input; single branch). Lightweight render assertion for the tray.
- **Web (Playwright):** extend an e2e to plant a sprout *from the tray* and assert
  the seedling disappears.
- **iOS (Maestro):** a flow that opens the Seedlings tray, expands a branch, and
  plants a seedling; assert it leaves the tray.

## Rollout

Pure front-end on both platforms; ships through the normal `dev` → `main` flow.
No migration, no version-gated behavior.
