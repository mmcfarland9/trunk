# Seedlings: Pre-Sprout Backlog System

**Date:** 2026-03-22
**Status:** Approved

## Summary

Seedlings are lightweight idea stubs that live on twigs before a user commits to planting a full sprout. They capture a sentence or idea — no soil cost, no season, no environment. When the user is ready, they delete the seedling and plant a sprout the normal way, optionally pre-filling the title.

## Metaphor

Seedlings sit in the "garden" — the existing sprout-browsing areas on both platforms. They are visible per-twig in the planting view and aggregated across all twigs in the garden/browser view.

## Data Model

### Event Types

Three new event types in the existing `events` table (no new tables):

| Event | Payload Fields |
|-------|---------------|
| `seedling_created` | `seedlingId`, `twigId`, `title`, `notes?` |
| `seedling_edited` | `seedlingId`, `title?`, `notes?` (sparse merge) |
| `seedling_deleted` | `seedlingId` |

### Derived State

```
DerivedSeedling {
  id: string          // seedling-{uuid}
  twigId: string      // branch-{N}-twig-{twigId}
  title: string       // The idea (required)
  notes: string?      // Optional longer description
  createdAt: string   // ISO 8601 from event timestamp
}
```

Added to `DerivedState`:
- `seedlings: Map<string, DerivedSeedling>` — all seedlings by ID
- `seedlingsByTwig: Map<string, DerivedSeedling[]>` — indexed by twig ID

### Entity IDs

Format: `seedling-{uuid}` (matches existing `sprout-{uuid}`, `leaf-{uuid}` convention).

### Economy

Seedlings have zero soil cost. No seasons, environments, or bloom descriptions. They are free to create and delete.

## Derivation

Both `web/src/events/derive.ts` and `ios/Trunk/Services/EventDerivation.swift` add three cases to the event replay loop:

- **`seedling_created`** — extract `seedlingId`, `twigId`, `title`, `notes` from payload. Create `DerivedSeedling` and add to `seedlings` map + `seedlingsByTwig` index.
- **`seedling_edited`** — look up existing seedling by `seedlingId`. Sparse merge: overwrite `title` and/or `notes` only if present in payload.
- **`seedling_deleted`** — remove from `seedlings` map and `seedlingsByTwig` index.

Guard-let (iOS) / early-return (web) on malformed events — skip, don't default.

## Sync

Zero new infrastructure. Seedling events use the same push/pull/realtime pipeline as all other events. `client_id` dedup, RLS, incremental pull, and offline support all work identically.

## Web UI

### Twig View (Planting Tab)

Below the existing planting form, a "Seedlings" section:

- Shows seedlings for the current twig only (`seedlingsByTwig[twigId]`)
- Each seedling is a compact card: title, optional notes preview
- Actions per seedling:
  - **Edit** — inline edit of title/notes, emits `seedling_edited`
  - **Delete** — emits `seedling_deleted`
  - **Plant this** — deletes the seedling (`seedling_deleted`) and pre-fills the planting form title field
- "Add seedling" input at the bottom — quick-add with just a title, emits `seedling_created`
- Empty state: subtle prompt like "Jot down ideas for this twig"

### Sprout Browser (Sidebar / Progress)

A "Seedlings" section showing all seedlings grouped by twig. Each is clickable to navigate to that twig's view.

### Routing

No new hash routes needed. Seedlings are embedded in existing views, not standalone pages.

## iOS UI

### Twig Detail View

Below existing sprout cards, a "Seedlings" section:

- List of seedlings for the current twig
- Swipe-to-delete (emits `seedling_deleted`)
- Tap to edit title/notes (sheet or inline, emits `seedling_edited`)
- "Plant" action on each seedling — deletes it and opens `CreateSproutView` with pre-filled title and current twig
- "+" button to add a new seedling (alert or sheet with title input)

### Garden Tab (Tab 2)

New section in `SproutsView` showing all seedlings, alongside the existing sprout and leaf lists. Seedlings section with count badge. Tappable to navigate to the twig.

### ViewModel

`SproutsViewModel` gains:
- `cachedSeedlings: [DerivedSeedling]`
- Filtering/sorting for seedlings (by twig, alphabetical, date created)

`ProgressionViewModel` — no changes (seedlings have no economy impact).

## Promotion Flow

There is no special promotion event. The user flow is:

1. View seedling on a twig
2. Tap "Plant this"
3. App emits `seedling_deleted` event
4. App opens the normal planting form with title pre-filled
5. User fills in season, environment, leaf, etc.
6. User plants — emits `sprout_planted` as usual

The two events are independent. If the user cancels planting after deleting the seedling, that's fine — the seedling is gone and the sprout was never created. No referential integrity needed between them.

## Shared Constants

Add to `shared/constants.json`:
- `SEEDLING_TITLE_MAX_LENGTH: 60` (same as sprout title)
- `SEEDLING_NOTES_MAX_LENGTH: 200`

Regenerate platform constants after updating.

## Testing

### Unit Tests
- Derivation: `seedling_created` adds to state, `seedling_edited` merges fields, `seedling_deleted` removes
- Derivation: malformed seedling events are skipped
- Derivation: seedlingsByTwig index is correct after mixed event sequences
- ID generation: `seedling-{uuid}` format

### Integration Tests
- Sync round-trip: create seedling locally, push, pull on another client, verify
- Dedup: duplicate `client_id` on seedling events handled correctly

### E2E Tests
- Web: create seedling on twig, verify it appears, edit it, delete it
- Web: create seedling then "Plant this" — verify form pre-fills and seedling disappears
- iOS (Maestro): same flows on iOS

## Files to Create/Modify

### Web (TypeScript)
- **Modify** `web/src/events/types.ts` — add `SeedlingCreatedEvent`, `SeedlingEditedEvent`, `SeedlingDeletedEvent`
- **Modify** `web/src/events/derive.ts` — add seedling derivation + indexes to `DerivedState`
- **Modify** `web/src/ui/twig-view/` — add seedlings section below planting form
- **Modify** `web/src/features/progress.ts` — add seedlings to sidebar browser
- **Modify** `web/src/styles/` — seedling card styles
- **Add** `web/src/ui/twig-view/seedlings.ts` — seedling card rendering + interaction
- **Modify** tests in `web/src/events/__tests__/`

### iOS (Swift)
- **Modify** `ios/Trunk/Services/EventDerivation.swift` — add seedling derivation
- **Modify** `ios/Trunk/Services/SyncEvent.swift` — add event type cases
- **Add** `ios/Trunk/Models/DerivedSeedling.swift` — seedling model
- **Modify** `ios/Trunk/ViewModels/SproutsViewModel.swift` — seedling caching/filtering
- **Modify** `ios/Trunk/Views/TwigDetailView.swift` — seedlings section
- **Modify** `ios/Trunk/Views/Sprouts/SproutsView.swift` — garden seedlings section
- **Add** `ios/Trunk/Views/Seedlings/` — seedling card, edit sheet, etc.

### Shared
- **Modify** `shared/constants.json` — add seedling constants
- **Run** `node shared/generate-constants.js` to regenerate platform files
