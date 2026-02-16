# Web Events-Only Architecture

> **For Claude:** Execute this plan directly - it's a surgical fix.

**Goal:** Make web UI read ALL state from EventStore.deriveState(), eliminating legacy localStorage state.

**Architecture:**
```
Supabase → pullEvents() → EventStore → deriveState() → UI
```

---

## Task 1: Update events/store.ts exports

Export soil/water/sun getters that read from derived state.

**Files:** `web/src/events/store.ts`

## Task 2: Update UI imports

Change dom-builder, main, twig-view to import from events/store.

**Files:**
- `web/src/ui/dom-builder.ts`
- `web/src/main.ts`
- `web/src/ui/twig-view.ts`

## Task 3: Update state/index.ts

Re-export resource functions from events/store instead of resources.ts.

**Files:** `web/src/state/index.ts`

## Task 4: Delete legacy resources.ts

Remove the file entirely.

**Files:** `web/src/state/resources.ts` (DELETE)

## Task 5: Test and verify

Run tests, check production shows correct soil values.
