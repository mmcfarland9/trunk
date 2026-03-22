# Seedlings Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add event-sourced seedlings (lightweight twig-scoped idea stubs) to both web and iOS platforms.

**Architecture:** Three new event types (`seedling_created`, `seedling_edited`, `seedling_deleted`) flow through the existing events table and sync pipeline. Derivation adds `seedlings` + `seedlingsByTwig` indexes to `DerivedState`. UI adds a seedlings section to the twig view and garden/sprout browser on both platforms.

**Tech Stack:** TypeScript (web, Vite/Vitest), Swift 5.9/SwiftUI (iOS), Supabase (events table), shared constants JSON.

---

## Chunk 1: Shared Constants & Event Types

### Task 1: Add seedling constants to shared config

**Files:**
- Modify: `shared/constants.json:122-135`

- [ ] **Step 1: Add seedling event types and validation constants**

In `shared/constants.json`, add the three seedling event types to the `eventTypes` array and add seedling validation limits:

```json
// In "eventTypes" array (line 122), append:
"seedling_created",
"seedling_edited",
"seedling_deleted"

// In "validation" object (line 131), add:
"maxSeedlingTitleLength": 60,
"maxSeedlingNotesLength": 200
```

- [ ] **Step 2: Regenerate platform constants**

Run: `node shared/generate-constants.js`

- [ ] **Step 3: Verify generated files include seedling constants**

Check that `web/src/generated/constants.ts` now has the three seedling event types in `EVENT_TYPES` array and `VALID_EVENT_TYPES` set, plus the new validation constants. Check that `ios/Trunk/Generated/SharedConstants.swift` has the event types in `EventTypes.all` and the validation constants.

- [ ] **Step 4: Commit**

```bash
git add shared/constants.json shared/generate-constants.js web/src/generated/constants.ts ios/Trunk/Generated/SharedConstants.swift
git commit -m "feat: add seedling event types and validation constants to shared config"
```

### Task 2: Add seedling event type definitions (web)

**Files:**
- Modify: `web/src/events/types.ts`

- [ ] **Step 1: Write failing test for seedling event validation**

Create `web/src/tests/seedling-derive.test.ts`:

```typescript
import { describe, expect, it } from 'vitest'
import { validateEvent } from '../events/types'

describe('Seedling event validation', () => {
  it('validates seedling_created with required fields', () => {
    expect(
      validateEvent({
        type: 'seedling_created',
        timestamp: '2026-03-22T10:00:00Z',
        seedlingId: 'seedling-abc',
        twigId: 'branch-0-twig-branch-0-twig-0',
        title: 'Learn piano',
      }),
    ).toBe(true)
  })

  it('validates seedling_created with optional notes', () => {
    expect(
      validateEvent({
        type: 'seedling_created',
        timestamp: '2026-03-22T10:00:00Z',
        seedlingId: 'seedling-abc',
        twigId: 'branch-0-twig-branch-0-twig-0',
        title: 'Learn piano',
        notes: 'Start with scales',
      }),
    ).toBe(true)
  })

  it('rejects seedling_created without title', () => {
    expect(
      validateEvent({
        type: 'seedling_created',
        timestamp: '2026-03-22T10:00:00Z',
        seedlingId: 'seedling-abc',
        twigId: 'branch-0-twig-branch-0-twig-0',
      }),
    ).toBe(false)
  })

  it('validates seedling_edited with seedlingId only', () => {
    expect(
      validateEvent({
        type: 'seedling_edited',
        timestamp: '2026-03-22T10:00:00Z',
        seedlingId: 'seedling-abc',
      }),
    ).toBe(true)
  })

  it('validates seedling_deleted with seedlingId', () => {
    expect(
      validateEvent({
        type: 'seedling_deleted',
        timestamp: '2026-03-22T10:00:00Z',
        seedlingId: 'seedling-abc',
      }),
    ).toBe(true)
  })

  it('rejects seedling_deleted without seedlingId', () => {
    expect(
      validateEvent({
        type: 'seedling_deleted',
        timestamp: '2026-03-22T10:00:00Z',
      }),
    ).toBe(false)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd web && npx vitest run src/tests/seedling-derive.test.ts`
Expected: FAIL — `seedling_created` is not in `VALID_EVENT_TYPES`

- [ ] **Step 3: Add seedling event interfaces and validation to types.ts**

In `web/src/events/types.ts`, add after the `SproutEditedEvent` interface (after line 120):

```typescript
/**
 * Seedling created - lightweight idea stub on a twig (no soil cost)
 */
export interface SeedlingCreatedEvent extends BaseEvent {
  type: 'seedling_created'
  seedlingId: string
  twigId: string
  title: string
  notes?: string
}

/**
 * Seedling edited - update title or notes (sparse merge)
 */
export interface SeedlingEditedEvent extends BaseEvent {
  type: 'seedling_edited'
  seedlingId: string
  title?: string
  notes?: string
}

/**
 * Seedling deleted - remove from garden
 */
export interface SeedlingDeletedEvent extends BaseEvent {
  type: 'seedling_deleted'
  seedlingId: string
}
```

Add to `EVENT_TYPES` constant (after line 34):
```typescript
SEEDLING_CREATED: 'seedling_created',
SEEDLING_EDITED: 'seedling_edited',
SEEDLING_DELETED: 'seedling_deleted',
```

Add to `TrunkEvent` union (after line 132):
```typescript
| SeedlingCreatedEvent
| SeedlingEditedEvent
| SeedlingDeletedEvent
```

Add validation cases in `validateEvent` switch (after the `sprout_edited` case, before `default`):
```typescript
case 'seedling_created':
  return (
    typeof e.seedlingId === 'string' &&
    typeof e.twigId === 'string' &&
    typeof e.title === 'string'
  )
case 'seedling_edited':
  return typeof e.seedlingId === 'string'
case 'seedling_deleted':
  return typeof e.seedlingId === 'string'
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd web && npx vitest run src/tests/seedling-derive.test.ts`
Expected: PASS

- [ ] **Step 5: Add seedling types to barrel export**

In `web/src/events/index.ts`, add to the type exports:
```typescript
export type {
  // ... existing types ...
  SeedlingCreatedEvent,
  SeedlingEditedEvent,
  SeedlingDeletedEvent,
} from './types'
```

- [ ] **Step 6: Run full test suite to check for regressions**

Run: `cd web && npx vitest run`
Expected: All existing tests pass + new seedling tests pass

- [ ] **Step 7: Commit**

```bash
git add web/src/events/types.ts web/src/events/index.ts web/src/tests/seedling-derive.test.ts
git commit -m "feat: add seedling event type definitions and validation"
```

### Task 2b: Fix dedup key for seedling events (web)

**Files:**
- Modify: `web/src/events/derive.ts:34-41`

- [ ] **Step 1: Add seedlingId to getEventDedupeKey fallback chain**

In `web/src/events/derive.ts`, update `getEventDedupeKey` to check for `seedlingId`:

```typescript
function getEventDedupeKey(event: TrunkEvent): string {
  if (event.client_id) return event.client_id
  let entityId = ''
  if ('sproutId' in event) entityId = event.sproutId
  else if ('seedlingId' in event) entityId = event.seedlingId
  else if ('leafId' in event) entityId = event.leafId
  else if ('twigId' in event) entityId = event.twigId
  return `${event.type}|${entityId}|${event.timestamp}`
}
```

- [ ] **Step 2: Commit**

```bash
git add web/src/events/derive.ts
git commit -m "fix: add seedlingId to dedup key fallback chain"
```

---

## Chunk 2: Web Derivation

### Task 3: Add seedling derivation to DerivedState (web)

**Files:**
- Modify: `web/src/events/derive.ts:46-94` (add DerivedSeedling interface and DerivedState fields)
- Modify: `web/src/events/derive.ts:100-275` (add seedling cases to deriveState + index building)
- Test: `web/src/tests/seedling-derive.test.ts`

- [ ] **Step 1: Write failing tests for seedling derivation**

Append to `web/src/tests/seedling-derive.test.ts`:

```typescript
import { deriveState, generateSeedlingId, getSeedlingsForTwig } from '../events/derive'
import type { TrunkEvent } from '../events/types'

describe('Seedling derivation', () => {
  const baseSeedlingCreated: TrunkEvent = {
    type: 'seedling_created',
    timestamp: '2026-03-22T10:00:00Z',
    seedlingId: 'seedling-1',
    twigId: 'branch-0-twig-branch-0-twig-0',
    title: 'Learn piano',
  }

  it('creates seedling from seedling_created event', () => {
    const state = deriveState([baseSeedlingCreated])
    expect(state.seedlings.size).toBe(1)
    const seedling = state.seedlings.get('seedling-1')
    expect(seedling).toBeDefined()
    expect(seedling!.title).toBe('Learn piano')
    expect(seedling!.twigId).toBe('branch-0-twig-branch-0-twig-0')
    expect(seedling!.notes).toBeUndefined()
  })

  it('creates seedling with notes', () => {
    const event: TrunkEvent = {
      ...baseSeedlingCreated,
      notes: 'Start with scales',
    }
    const state = deriveState([event])
    const seedling = state.seedlings.get('seedling-1')
    expect(seedling!.notes).toBe('Start with scales')
  })

  it('indexes seedlings by twig', () => {
    const state = deriveState([baseSeedlingCreated])
    const twigSeedlings = state.seedlingsByTwig.get('branch-0-twig-branch-0-twig-0')
    expect(twigSeedlings).toHaveLength(1)
    expect(twigSeedlings![0].id).toBe('seedling-1')
  })

  it('edits seedling title via seedling_edited', () => {
    const events: TrunkEvent[] = [
      baseSeedlingCreated,
      {
        type: 'seedling_edited',
        timestamp: '2026-03-22T11:00:00Z',
        seedlingId: 'seedling-1',
        title: 'Learn guitar',
      },
    ]
    const state = deriveState(events)
    expect(state.seedlings.get('seedling-1')!.title).toBe('Learn guitar')
  })

  it('edits seedling notes via seedling_edited (sparse merge)', () => {
    const events: TrunkEvent[] = [
      baseSeedlingCreated,
      {
        type: 'seedling_edited',
        timestamp: '2026-03-22T11:00:00Z',
        seedlingId: 'seedling-1',
        notes: 'Added notes',
      },
    ]
    const state = deriveState(events)
    expect(state.seedlings.get('seedling-1')!.title).toBe('Learn piano')
    expect(state.seedlings.get('seedling-1')!.notes).toBe('Added notes')
  })

  it('removes seedling via seedling_deleted', () => {
    const events: TrunkEvent[] = [
      baseSeedlingCreated,
      {
        type: 'seedling_deleted',
        timestamp: '2026-03-22T12:00:00Z',
        seedlingId: 'seedling-1',
      },
    ]
    const state = deriveState(events)
    expect(state.seedlings.size).toBe(0)
    expect(state.seedlingsByTwig.get('branch-0-twig-branch-0-twig-0')).toBeUndefined()
  })

  it('skips seedling_edited for nonexistent seedling', () => {
    const events: TrunkEvent[] = [
      {
        type: 'seedling_edited',
        timestamp: '2026-03-22T11:00:00Z',
        seedlingId: 'seedling-missing',
        title: 'Nope',
      },
    ]
    const state = deriveState(events)
    expect(state.seedlings.size).toBe(0)
  })

  it('skips seedling_deleted for nonexistent seedling', () => {
    const events: TrunkEvent[] = [
      {
        type: 'seedling_deleted',
        timestamp: '2026-03-22T12:00:00Z',
        seedlingId: 'seedling-missing',
      },
    ]
    const state = deriveState(events)
    expect(state.seedlings.size).toBe(0)
  })

  it('does not affect soil when creating seedlings', () => {
    const state = deriveState([baseSeedlingCreated])
    expect(state.soilAvailable).toBe(10) // Starting capacity unchanged
    expect(state.soilCapacity).toBe(10)
  })

  it('getSeedlingsForTwig returns correct seedlings', () => {
    const events: TrunkEvent[] = [
      baseSeedlingCreated,
      {
        type: 'seedling_created',
        timestamp: '2026-03-22T10:01:00Z',
        seedlingId: 'seedling-2',
        twigId: 'branch-1-twig-branch-1-twig-0',
        title: 'Read more',
      },
    ]
    const state = deriveState(events)
    expect(getSeedlingsForTwig(state, 'branch-0-twig-branch-0-twig-0')).toHaveLength(1)
    expect(getSeedlingsForTwig(state, 'branch-1-twig-branch-1-twig-0')).toHaveLength(1)
    expect(getSeedlingsForTwig(state, 'branch-2-twig-branch-2-twig-0')).toHaveLength(0)
  })

  it('generateSeedlingId produces correct format', () => {
    const id = generateSeedlingId()
    expect(id).toMatch(/^seedling-[0-9a-f-]{36}$/)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd web && npx vitest run src/tests/seedling-derive.test.ts`
Expected: FAIL — `DerivedSeedling` not exported, `seedlings` not in `DerivedState`

- [ ] **Step 3: Add DerivedSeedling interface to derive.ts**

In `web/src/events/derive.ts`, after `DerivedLeaf` interface (after line 75), add:

```typescript
/**
 * Derived seedling state — a lightweight idea stub on a twig
 */
export interface DerivedSeedling {
  id: string
  twigId: string
  title: string
  notes?: string
  createdAt: string
}
```

- [ ] **Step 4: Add seedling fields to DerivedState**

In the `DerivedState` interface (around line 80), add after `leavesByTwig`:

```typescript
// Seedlings (pre-sprout idea stubs)
seedlings: Map<string, DerivedSeedling>
seedlingsByTwig: Map<string, DerivedSeedling[]>
```

- [ ] **Step 5: Add seedling processing to the deriveState event loop**

In the `deriveState` function, add a `seedlings` map after `leaves` (around line 105):

```typescript
const seedlings = new Map<string, DerivedSeedling>()
```

Add three cases in the switch statement (after `case EVENT_TYPES.SPROUT_EDITED`, before `default`):

```typescript
case EVENT_TYPES.SEEDLING_CREATED: {
  seedlings.set(event.seedlingId, {
    id: event.seedlingId,
    twigId: event.twigId,
    title: event.title,
    notes: event.notes,
    createdAt: event.timestamp,
  })
  break
}

case EVENT_TYPES.SEEDLING_EDITED: {
  const seedling = seedlings.get(event.seedlingId)
  if (seedling) {
    if (event.title !== undefined) seedling.title = event.title
    if (event.notes !== undefined) seedling.notes = event.notes
  }
  break
}

case EVENT_TYPES.SEEDLING_DELETED: {
  seedlings.delete(event.seedlingId)
  break
}
```

- [ ] **Step 6: Build seedlingsByTwig index**

After the existing index-building loop (after `leavesByTwig` loop, around line 262), add:

```typescript
const seedlingsByTwig = new Map<string, DerivedSeedling[]>()
for (const seedling of seedlings.values()) {
  const twigList = seedlingsByTwig.get(seedling.twigId) || []
  twigList.push(seedling)
  seedlingsByTwig.set(seedling.twigId, twigList)
}
```

Add to the return object:
```typescript
seedlings,
seedlingsByTwig,
```

- [ ] **Step 7: Add helper functions**

After `getSproutsByLeaf` (around line 466), add:

```typescript
/**
 * Get all seedlings for a specific twig
 */
export function getSeedlingsForTwig(state: DerivedState, twigId: string): DerivedSeedling[] {
  return state.seedlingsByTwig.get(twigId) || []
}

/**
 * Generate a unique seedling ID
 */
export function generateSeedlingId(): string {
  return `seedling-${crypto.randomUUID()}`
}
```

- [ ] **Step 8: Update barrel export**

In `web/src/events/index.ts`, add:
```typescript
export type { DerivedSeedling } from './derive'
export { generateSeedlingId, getSeedlingsForTwig } from './derive'
```

- [ ] **Step 9: Run tests to verify**

Run: `cd web && npx vitest run src/tests/seedling-derive.test.ts`
Expected: ALL PASS

- [ ] **Step 10: Run full suite for regressions**

Run: `cd web && npx vitest run`
Expected: All pass. Note: existing tests that check `DerivedState` shape may need `seedlings` and `seedlingsByTwig` fields — check if any fail and fix.

- [ ] **Step 11: Commit**

```bash
git add web/src/events/derive.ts web/src/events/index.ts web/src/tests/seedling-derive.test.ts
git commit -m "feat: add seedling derivation to web DerivedState"
```

---

## Chunk 3: iOS Derivation

### Task 3b: Fix dedup key for seedling events (iOS)

**Files:**
- Modify: `ios/Trunk/Services/EventDerivation.swift:149-156`

- [ ] **Step 1: Add seedlingId to iOS getEventDedupeKey fallback chain**

In `ios/Trunk/Services/EventDerivation.swift`, update `getEventDedupeKey`:

```swift
private func getEventDedupeKey(_ event: SyncEvent) -> String {
    if !event.clientId.isEmpty { return event.clientId }
    let entityId = getString(event.payload, "sproutId")
        ?? getString(event.payload, "seedlingId")
        ?? getString(event.payload, "leafId")
        ?? getString(event.payload, "twigId")
        ?? ""
    return "\(event.type)|\(entityId)|\(event.clientTimestamp)"
}
```

- [ ] **Step 2: Commit with dedup fix**

```bash
git add ios/Trunk/Services/EventDerivation.swift
git commit -m "fix: add seedlingId to iOS dedup key fallback chain"
```

### Task 4: Add seedling event type to iOS model

**Files:**
- Modify: `ios/Trunk/Services/SyncEvent.swift:12-20`

- [ ] **Step 1: Add seedling cases to TrunkEventType enum**

In `ios/Trunk/Services/SyncEvent.swift`, add three cases to the `TrunkEventType` enum (before the closing brace on line 20):

```swift
case seedlingCreated = "seedling_created"
case seedlingEdited = "seedling_edited"
case seedlingDeleted = "seedling_deleted"
```

- [ ] **Step 2: Commit**

```bash
git add ios/Trunk/Services/SyncEvent.swift
git commit -m "feat: add seedling event types to iOS model"
```

### Task 5: Add DerivedSeedling model and derivation (iOS)

**Files:**
- Create: `ios/Trunk/Models/DerivedSeedling.swift`
- Modify: `ios/Trunk/Services/EventDerivation.swift`

- [ ] **Step 1: Create DerivedSeedling model**

Create `ios/Trunk/Models/DerivedSeedling.swift`:

```swift
//
//  DerivedSeedling.swift
//  Trunk
//
//  A lightweight idea stub on a twig — pre-sprout backlog item.
//

import Foundation

struct DerivedSeedling: Identifiable {
    let id: String
    let twigId: String
    var title: String
    var notes: String?
    let createdAt: Date
}
```

- [ ] **Step 2: Add seedlings to DerivedState**

In `ios/Trunk/Services/EventDerivation.swift`, add to the `DerivedState` struct (around line 123):

```swift
var seedlings: [String: DerivedSeedling]
var seedlingsByTwig: [String: [DerivedSeedling]]
```

- [ ] **Step 3: Add seedling processing to deriveState**

In the `deriveState` function, add a `seedlings` dict after `leaves` (around line 168):

```swift
var seedlings: [String: DerivedSeedling] = [:]
```

Add three cases in the switch statement (after `"leaf_created"`, before `default`):

```swift
case "seedling_created":
    processSeedlingCreated(event: event, timestamp: eventTimestamp, seedlings: &seedlings)

case "seedling_edited":
    processSeedlingEdited(event: event, seedlings: &seedlings)

case "seedling_deleted":
    if let seedlingId = getString(event.payload, "seedlingId") {
        seedlings.removeValue(forKey: seedlingId)
    }
```

- [ ] **Step 4: Build seedlingsByTwig index in return value**

Before the return statement, build the index:

```swift
// Build seedlingsByTwig index
var seedlingsByTwig: [String: [DerivedSeedling]] = [:]
for seedling in seedlings.values {
    seedlingsByTwig[seedling.twigId, default: []].append(seedling)
}
```

Add to the return:
```swift
seedlings: seedlings,
seedlingsByTwig: seedlingsByTwig,
```

- [ ] **Step 5: Add processing functions**

Add at the end of the file (before the `// MARK: - Payload Parsing Helpers` section):

```swift
private func processSeedlingCreated(event: SyncEvent, timestamp: Date?, seedlings: inout [String: DerivedSeedling]) {
    let payload = event.payload

    guard let seedlingId = getString(payload, "seedlingId"),
          let twigId = getString(payload, "twigId"),
          let title = getString(payload, "title"),
          let ts = timestamp else {
        return
    }

    let seedling = DerivedSeedling(
        id: seedlingId,
        twigId: twigId,
        title: title,
        notes: getString(payload, "notes"),
        createdAt: ts
    )

    seedlings[seedlingId] = seedling
}

private func processSeedlingEdited(event: SyncEvent, seedlings: inout [String: DerivedSeedling]) {
    let payload = event.payload

    guard let seedlingId = getString(payload, "seedlingId"),
          var seedling = seedlings[seedlingId] else {
        return
    }

    if let title = getString(payload, "title") {
        seedling.title = title
    }
    if let notes = getString(payload, "notes") {
        seedling.notes = notes
    }

    seedlings[seedlingId] = seedling
}
```

- [ ] **Step 6: Add helper function**

After `getLeavesForTwig` (around line 708), add:

```swift
/// Get all seedlings for a specific twig
func getSeedlingsForTwig(from state: DerivedState, twigId: String) -> [DerivedSeedling] {
    return state.seedlingsByTwig[twigId] ?? []
}
```

- [ ] **Step 7: Build in Xcode to verify compilation**

Run: `xcodebuild -project ios/Trunk.xcodeproj -scheme Trunk -sdk iphonesimulator -destination 'platform=iOS Simulator,name=iPhone 16' build 2>&1 | tail -5`

Fix any compilation errors (likely DerivedState initializer calls that need seedlings/seedlingsByTwig parameters).

- [ ] **Step 8: Commit**

```bash
git add ios/Trunk/Models/DerivedSeedling.swift ios/Trunk/Services/EventDerivation.swift
git commit -m "feat: add seedling derivation to iOS EventDerivation"
```

---

## Chunk 4: Web UI — Twig View Seedlings

### Task 6: Add seedlings section to twig view

**Files:**
- Create: `web/src/ui/twig-view/seedlings.ts`
- Modify: `web/src/ui/twig-view/build-panel.ts`
- Modify: `web/src/ui/twig-view/index.ts`
- Create: `web/src/styles/seedlings.css`
- Modify: `web/src/styles/index.css`

- [ ] **Step 1: Create seedlings rendering module**

Create `web/src/ui/twig-view/seedlings.ts`:

```typescript
import { appendEvent, generateSeedlingId, getState, getSeedlingsForTwig } from '../../events'
import type { DerivedSeedling } from '../../events'
import { escapeHtml } from '../../utils/escape-html'

/**
 * Render seedling cards for a twig.
 */
export function renderSeedlings(twigId: string): string {
  const state = getState()
  const seedlings = getSeedlingsForTwig(state, twigId)

  if (seedlings.length === 0) {
    return '<p class="seedling-empty">Jot down ideas for this twig</p>'
  }

  return seedlings
    .map(
      (s) => `
    <div class="seedling-card" data-seedling-id="${escapeHtml(s.id)}">
      <span class="seedling-title">${escapeHtml(s.title)}</span>
      ${s.notes ? `<span class="seedling-notes">${escapeHtml(s.notes)}</span>` : ''}
      <div class="seedling-actions">
        <button type="button" class="seedling-action" data-seedling-action="plant" title="Plant as sprout">Set</button>
        <button type="button" class="seedling-action" data-seedling-action="edit" title="Edit">Edit</button>
        <button type="button" class="seedling-action seedling-action-delete" data-seedling-action="delete" title="Delete">&times;</button>
      </div>
    </div>`,
    )
    .join('')
}

/**
 * Create a new seedling for a twig.
 */
export function createSeedling(twigId: string, title: string, notes?: string): void {
  const seedlingId = generateSeedlingId()
  appendEvent({
    type: 'seedling_created',
    timestamp: new Date().toISOString(),
    seedlingId,
    twigId,
    title,
    notes,
  })
}

/**
 * Delete a seedling.
 */
export function deleteSeedling(seedlingId: string): void {
  appendEvent({
    type: 'seedling_deleted',
    timestamp: new Date().toISOString(),
    seedlingId,
  })
}

/**
 * Edit a seedling's title and/or notes.
 */
export function editSeedling(seedlingId: string, title?: string, notes?: string): void {
  appendEvent({
    type: 'seedling_edited',
    timestamp: new Date().toISOString(),
    seedlingId,
    ...(title !== undefined && { title }),
    ...(notes !== undefined && { notes }),
  })
}

/**
 * Get a seedling by ID from current state.
 */
export function getSeedlingById(seedlingId: string): DerivedSeedling | undefined {
  return getState().seedlings.get(seedlingId)
}
```

- [ ] **Step 2: Add seedlings section to twig view panel HTML**

In `web/src/ui/twig-view/build-panel.ts`, add a seedlings section inside the `.sprout-drafts` column, after the closing `</div>` of `.sprout-draft-form` and before the closing `</div>` of `.sprout-drafts` (around line 55):

```html
<div class="seedlings-section">
  <h4 class="seedlings-title">Seedlings <span class="seedlings-count">(0)</span></h4>
  <div class="seedlings-list"></div>
  <div class="seedlings-add">
    <input type="text" class="seedlings-add-input" placeholder="Add a seedling idea..." maxlength="60" />
    <button type="button" class="seedlings-add-btn" disabled>+</button>
  </div>
</div>
```

Add seedling elements to `getElements` return object:

```typescript
seedlingsCount: container.querySelector<HTMLSpanElement>('.seedlings-count')!,
seedlingsList: container.querySelector<HTMLDivElement>('.seedlings-list')!,
seedlingsAddInput: container.querySelector<HTMLInputElement>('.seedlings-add-input')!,
seedlingsAddBtn: container.querySelector<HTMLButtonElement>('.seedlings-add-btn')!,
```

- [ ] **Step 3: Wire seedlings into twig view index.ts**

In `web/src/ui/twig-view/index.ts`:

Import at top:
```typescript
import { createSeedling, deleteSeedling, editSeedling, getSeedlingById, renderSeedlings } from './seedlings'
```

Add a `renderSeedlingsList` function inside `buildTwigView`:
```typescript
function renderSeedlingsList(): void {
  const nodeId = getCurrentNodeId(state)
  if (!nodeId) return
  const stateObj = getState()
  const seedlings = getSeedlingsForTwig(stateObj, nodeId)
  elements.seedlingsCount.textContent = `(${seedlings.length})`
  elements.seedlingsList.innerHTML = renderSeedlings(nodeId)
}
```

Call `renderSeedlingsList()` in `renderSprouts()` at the end, in `open()`, and in `refresh()`.

Add seedling add-input handler:
```typescript
elements.seedlingsAddInput.addEventListener('input', () => {
  elements.seedlingsAddBtn.disabled = !elements.seedlingsAddInput.value.trim()
})

elements.seedlingsAddBtn.addEventListener('click', () => {
  const title = elements.seedlingsAddInput.value.trim()
  if (!title) return
  const nodeId = getCurrentNodeId(state)
  if (!nodeId) return
  createSeedling(nodeId, title)
  elements.seedlingsAddInput.value = ''
  elements.seedlingsAddBtn.disabled = true
  renderSeedlingsList()
})

// Enter key in seedling input
elements.seedlingsAddInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault()
    elements.seedlingsAddBtn.click()
  }
})
```

Add seedling action delegation in the existing `container.addEventListener('click', ...)` handler:
```typescript
const seedlingActionEl = target.closest<HTMLElement>('[data-seedling-action]')
if (seedlingActionEl) {
  const seedlingCard = seedlingActionEl.closest<HTMLElement>('.seedling-card')
  const seedlingId = seedlingCard?.dataset.seedlingId
  if (!seedlingId) return
  const seedlingAction = seedlingActionEl.dataset.seedlingAction

  switch (seedlingAction) {
    case 'delete': {
      deleteSeedling(seedlingId)
      renderSeedlingsList()
      break
    }
    case 'plant': {
      const seedling = getSeedlingById(seedlingId)
      if (seedling) {
        deleteSeedling(seedlingId)
        elements.sproutTitleInput.value = seedling.title
        elements.sproutTitleInput.focus()
        updateForm()
        renderSeedlingsList()
      }
      break
    }
    case 'edit': {
      const seedling = getSeedlingById(seedlingId)
      if (!seedling || !seedlingCard) break
      const titleEl = seedlingCard.querySelector('.seedling-title')
      if (!titleEl) break
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
        if (newTitle && newTitle !== seedling.title) {
          editSeedling(seedlingId, newTitle)
        }
        renderSeedlingsList()
      }
      input.addEventListener('blur', commit)
      input.addEventListener('keydown', (ke) => {
        if (ke.key === 'Enter') { ke.preventDefault(); commit() }
        if (ke.key === 'Escape') renderSeedlingsList()
      })
      break
    }
  }
  return
}
```

- [ ] **Step 4: Add import for getSeedlingsForTwig**

Add to the import from `../../events`:
```typescript
import { getSeedlingsForTwig } from '../../events'
```

- [ ] **Step 5: Create seedlings CSS**

Create `web/src/styles/seedlings.css`:

```css
/* Seedlings — pre-sprout idea stubs */

.seedlings-section {
  margin-top: var(--space-4);
  border-top: 1px solid var(--border-subtle);
  padding-top: var(--space-3);
}

.seedlings-title {
  font-size: var(--text-sm);
  color: var(--ink-faint);
  margin: 0 0 var(--space-2) 0;
  font-weight: 500;
}

.seedlings-count {
  font-weight: 400;
}

.seedling-empty {
  font-size: var(--text-xs);
  color: var(--ink-faint);
  font-style: italic;
  margin: var(--space-1) 0;
}

.seedling-card {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-1) var(--space-2);
  border-radius: 4px;
  margin-bottom: var(--space-1);
  background: var(--surface-subtle, transparent);
}

.seedling-card:hover {
  background: var(--surface-hover, rgba(0, 0, 0, 0.03));
}

.seedling-title {
  flex: 1;
  font-size: var(--text-sm);
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.seedling-notes {
  font-size: var(--text-xs);
  color: var(--ink-faint);
  flex-shrink: 0;
  max-width: 120px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.seedling-actions {
  display: flex;
  gap: var(--space-1);
  flex-shrink: 0;
  opacity: 0;
  transition: opacity 0.15s;
}

.seedling-card:hover .seedling-actions {
  opacity: 1;
}

.seedling-action {
  font-size: var(--text-xs);
  padding: 1px 6px;
  border: 1px solid var(--border);
  border-radius: 3px;
  background: transparent;
  cursor: pointer;
  color: var(--ink-faint);
}

.seedling-action:hover {
  background: var(--surface-hover, rgba(0, 0, 0, 0.05));
  color: var(--ink);
}

.seedling-action-delete:hover {
  color: var(--error, #c0392b);
  border-color: var(--error, #c0392b);
}

.seedling-edit-input {
  flex: 1;
  font-size: var(--text-sm);
  padding: 1px 4px;
  border: 1px solid var(--twig);
  border-radius: 3px;
  outline: none;
}

.seedlings-add {
  display: flex;
  gap: var(--space-1);
  margin-top: var(--space-2);
}

.seedlings-add-input {
  flex: 1;
  font-size: var(--text-sm);
  padding: var(--space-1) var(--space-2);
  border: 1px solid var(--border);
  border-radius: 4px;
  background: transparent;
  color: var(--ink);
}

.seedlings-add-input::placeholder {
  color: var(--ink-faint);
}

.seedlings-add-btn {
  font-size: var(--text-base);
  padding: var(--space-1) var(--space-2);
  border: 1px solid var(--border);
  border-radius: 4px;
  background: transparent;
  cursor: pointer;
  color: var(--ink-faint);
  line-height: 1;
}

.seedlings-add-btn:hover:not(:disabled) {
  background: var(--twig);
  color: white;
  border-color: var(--twig);
}

.seedlings-add-btn:disabled {
  opacity: 0.3;
  cursor: default;
}
```

- [ ] **Step 6: Import seedlings CSS**

In `web/src/styles/index.css`, add:
```css
@import './seedlings.css';
```

- [ ] **Step 7: Run dev server and verify visually**

Run: `cd web && npm run dev`
Navigate to a twig — verify seedlings section appears below the planting form. Test: add a seedling, edit it, delete it, plant it (should pre-fill title).

- [ ] **Step 8: Run tests**

Run: `cd web && npx vitest run`
Expected: All pass

- [ ] **Step 9: Format and commit**

```bash
cd web && npx biome format --write src/
git add web/src/ui/twig-view/seedlings.ts web/src/ui/twig-view/build-panel.ts web/src/ui/twig-view/index.ts web/src/styles/seedlings.css web/src/styles/index.css
git commit -m "feat: add seedlings UI to web twig view"
```

---

## Chunk 5: iOS UI — Seedlings in Twig Detail & Garden

### Task 7: Add SeedlingsViewModel and seedling views (iOS)

**Files:**
- Create: `ios/Trunk/Views/Seedlings/SeedlingCardView.swift`
- Create: `ios/Trunk/Views/Seedlings/SeedlingsSection.swift`
- Modify: `ios/Trunk/Views/TwigDetailView.swift`
- Modify: `ios/Trunk/ViewModels/SproutsViewModel.swift`

- [ ] **Step 1: Create SeedlingCardView**

Create `ios/Trunk/Views/Seedlings/SeedlingCardView.swift`:

```swift
//
//  SeedlingCardView.swift
//  Trunk
//
//  A compact card for a seedling idea.
//

import SwiftUI

struct SeedlingCardView: View {
    let seedling: DerivedSeedling
    let onPlant: () -> Void
    let onEdit: (String) -> Void
    let onDelete: () -> Void

    @State private var isEditing = false
    @State private var editTitle: String = ""

    var body: some View {
        HStack(spacing: 8) {
            if isEditing {
                TextField("Title", text: $editTitle)
                    .textFieldStyle(.roundedBorder)
                    .font(.subheadline)
                    .onSubmit {
                        let trimmed = editTitle.trimmingCharacters(in: .whitespacesAndNewlines)
                        if !trimmed.isEmpty, trimmed != seedling.title {
                            onEdit(trimmed)
                        }
                        isEditing = false
                    }
                Button("Done") {
                    let trimmed = editTitle.trimmingCharacters(in: .whitespacesAndNewlines)
                    if !trimmed.isEmpty, trimmed != seedling.title {
                        onEdit(trimmed)
                    }
                    isEditing = false
                }
                .font(.caption)
            } else {
                VStack(alignment: .leading, spacing: 2) {
                    Text(seedling.title)
                        .font(.subheadline)
                        .lineLimit(1)
                    if let notes = seedling.notes {
                        Text(notes)
                            .font(.caption)
                            .foregroundStyle(.secondary)
                            .lineLimit(1)
                    }
                }

                Spacer()

                Button("Set") {
                    onPlant()
                }
                .font(.caption)
                .buttonStyle(.bordered)
                .tint(.green)
            }
        }
        .padding(.vertical, 4)
        .contextMenu {
            Button {
                editTitle = seedling.title
                isEditing = true
            } label: {
                Label("Edit", systemImage: "pencil")
            }
            Button("Set as Sprout") {
                onPlant()
            }
            Button(role: .destructive) {
                onDelete()
            } label: {
                Label("Delete", systemImage: "trash")
            }
        }
        .swipeActions(edge: .trailing) {
            Button(role: .destructive) {
                onDelete()
            } label: {
                Label("Delete", systemImage: "trash")
            }
        }
    }
}
```

- [ ] **Step 2: Create SeedlingsSection**

Create `ios/Trunk/Views/Seedlings/SeedlingsSection.swift`:

```swift
//
//  SeedlingsSection.swift
//  Trunk
//
//  A section displaying seedlings for a twig, with add capability.
//

import SwiftUI

struct SeedlingsSection: View {
    let twigId: String
    let seedlings: [DerivedSeedling]
    let onPlant: (DerivedSeedling) -> Void
    let onRefresh: () -> Void

    @State private var newSeedlingTitle = ""

    var body: some View {
        Section {
            ForEach(seedlings) { seedling in
                SeedlingCardView(
                    seedling: seedling,
                    onPlant: { onPlant(seedling) },
                    onEdit: { newTitle in
                        editSeedling(seedling.id, title: newTitle)
                    },
                    onDelete: {
                        deleteSeedling(seedling.id)
                    }
                )
            }
            HStack {
                TextField("Add a seedling idea...", text: $newSeedlingTitle)
                    .textFieldStyle(.roundedBorder)
                    .font(.subheadline)
                    .onSubmit { addSeedling() }
                Button {
                    addSeedling()
                } label: {
                    Image(systemName: "plus.circle.fill")
                }
                .disabled(newSeedlingTitle.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
            }
        } header: {
            Text("Seedlings (\(seedlings.count))")
        }
    }

    private func addSeedling() {
        let title = newSeedlingTitle.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !title.isEmpty else { return }
        let seedlingId = "seedling-\(UUID().uuidString.lowercased())"
        Task {
            do {
                try await SyncService.shared.pushEvent(
                    type: "seedling_created",
                    payload: [
                        "seedlingId": .string(seedlingId),
                        "twigId": .string(twigId),
                        "title": .string(title),
                    ]
                )
            } catch {
                print("[SeedlingsSection] Failed to create seedling: \(error)")
            }
            newSeedlingTitle = ""
            onRefresh()
        }
    }

    private func editSeedling(_ seedlingId: String, title: String) {
        Task {
            do {
                try await SyncService.shared.pushEvent(
                    type: "seedling_edited",
                    payload: [
                        "seedlingId": .string(seedlingId),
                        "title": .string(title),
                    ]
                )
            } catch {
                print("[SeedlingsSection] Failed to edit seedling: \(error)")
            }
            onRefresh()
        }
    }

    private func deleteSeedling(_ seedlingId: String) {
        Task {
            do {
                try await SyncService.shared.pushEvent(
                    type: "seedling_deleted",
                    payload: [
                        "seedlingId": .string(seedlingId),
                    ]
                )
            } catch {
                print("[SeedlingsSection] Failed to delete seedling: \(error)")
            }
            onRefresh()
        }
    }
}
```

- [ ] **Step 3: Integrate SeedlingsSection into TwigDetailView**

In `ios/Trunk/Views/TwigDetailView.swift`, add the SeedlingsSection after existing sprout sections in the List/Form. This requires reading the current file first to find the exact insertion point. The section should appear below active sprouts and above history:

```swift
// After active sprouts section, before history section:
let twigSeedlings = getSeedlingsForTwig(from: state, twigId: nodeId)
SeedlingsSection(
    twigId: nodeId,
    seedlings: twigSeedlings,
    onPlant: { seedling in
        // Delete seedling and open create sprout with pre-filled title
        Task {
            await SyncService.shared.pushEvent(
                type: "seedling_deleted",
                payload: ["seedlingId": .string(seedling.id)]
            )
        }
        plantFromSeedling = seedling.title
        showCreateSprout = true
    },
    onRefresh: {
        progression.refresh()
    }
)
```

Add state variables:
```swift
@State private var plantFromSeedling: String? = nil
```

Pass `plantFromSeedling` to `CreateSproutView` as an initial title when opening the sheet.

- [ ] **Step 4: Add seedlings to SproutsViewModel**

In `ios/Trunk/ViewModels/SproutsViewModel.swift`, add:

```swift
var cachedSeedlings: [DerivedSeedling] = []

// In refreshCachedState():
cachedSeedlings = Array(state.seedlings.values)
    .sorted { $0.createdAt < $1.createdAt }
```

- [ ] **Step 5: Add seedlings section to SproutsView (Garden tab)**

Add a section showing all seedlings grouped by twig in the existing SproutsView. Read the file first to find the exact insertion point.

- [ ] **Step 6: Add seedlingId and notes to DataExportService TrunkEvent**

In `ios/Trunk/Services/DataExportService.swift`, add to the `TrunkEvent` struct (after `var name: String?`, around line 35):

```swift
var seedlingId: String?
var notes: String?
```

This ensures seedling events survive export/import round-trips across platforms.

- [ ] **Step 7: Build and verify**

Run: `xcodebuild -project ios/Trunk.xcodeproj -scheme Trunk -sdk iphonesimulator -destination 'platform=iOS Simulator,name=iPhone 16' build 2>&1 | tail -5`

Fix any compilation errors — specifically `DerivedState` initializers that need the new `seedlings` and `seedlingsByTwig` parameters.

- [ ] **Step 8: Commit**

```bash
git add ios/Trunk/Views/Seedlings/ ios/Trunk/Views/TwigDetailView.swift ios/Trunk/Views/SproutsView.swift ios/Trunk/ViewModels/SproutsViewModel.swift ios/Trunk/Services/DataExportService.swift
git commit -m "feat: add seedlings UI to iOS twig detail and garden views"
```

---

## Chunk 6: Tests & Polish

### Task 7b: Add seedlings section to web sidebar/progress

**Files:**
- Modify: `web/src/features/progress.ts`
- Modify: `web/src/ui/progress-panel.ts`

- [ ] **Step 1: Add seedlings aggregate to sidebar**

In `web/src/features/progress.ts`, import `getSeedlingsForTwig` from events. In the `updateSidebarSprouts` function (or equivalent), add a seedlings section below the existing sprout lists. Show all seedlings grouped by twig, clickable to navigate.

Read `web/src/features/progress.ts` and `web/src/ui/progress-panel.ts` first to find the exact integration point. Follow the existing pattern for rendering sprout lists in the sidebar.

- [ ] **Step 2: Commit**

```bash
git add web/src/features/progress.ts web/src/ui/progress-panel.ts
git commit -m "feat: add seedlings section to web sidebar"
```

### Task 8: Web integration tests for seedlings

**Files:**
- Modify: `web/src/tests/seedling-derive.test.ts`

- [ ] **Step 1: Add store-level integration tests**

Append to `web/src/tests/seedling-derive.test.ts`:

```typescript
import { appendEvent, clearEvents, getState, initEventStore } from '../events/store'

describe('Seedling store integration', () => {
  beforeEach(() => {
    clearEvents()
    initEventStore()
  })

  afterEach(() => {
    clearEvents()
  })

  it('round-trips seedling through store', () => {
    appendEvent({
      type: 'seedling_created',
      timestamp: new Date().toISOString(),
      seedlingId: 'seedling-store-1',
      twigId: 'branch-0-twig-branch-0-twig-0',
      title: 'Test idea',
    })

    const state = getState()
    expect(state.seedlings.size).toBe(1)
    expect(state.seedlings.get('seedling-store-1')!.title).toBe('Test idea')
  })

  it('seedling creation does not affect soil', () => {
    const beforeSoil = getState().soilAvailable

    appendEvent({
      type: 'seedling_created',
      timestamp: new Date().toISOString(),
      seedlingId: 'seedling-store-2',
      twigId: 'branch-0-twig-branch-0-twig-0',
      title: 'Free idea',
    })

    expect(getState().soilAvailable).toBe(beforeSoil)
  })

  it('seedling lifecycle: create → edit → delete', () => {
    appendEvent({
      type: 'seedling_created',
      timestamp: '2026-03-22T10:00:00Z',
      seedlingId: 'seedling-lifecycle',
      twigId: 'branch-0-twig-branch-0-twig-0',
      title: 'Original',
    })
    expect(getState().seedlings.get('seedling-lifecycle')!.title).toBe('Original')

    appendEvent({
      type: 'seedling_edited',
      timestamp: '2026-03-22T11:00:00Z',
      seedlingId: 'seedling-lifecycle',
      title: 'Edited',
    })
    expect(getState().seedlings.get('seedling-lifecycle')!.title).toBe('Edited')

    appendEvent({
      type: 'seedling_deleted',
      timestamp: '2026-03-22T12:00:00Z',
      seedlingId: 'seedling-lifecycle',
    })
    expect(getState().seedlings.size).toBe(0)
  })

  it('coexists with sprouts without interference', () => {
    appendEvent({
      type: 'seedling_created',
      timestamp: '2026-03-22T10:00:00Z',
      seedlingId: 'seedling-coexist',
      twigId: 'branch-0-twig-branch-0-twig-0',
      title: 'Idea',
    })
    appendEvent({
      type: 'sprout_planted',
      timestamp: '2026-03-22T10:01:00Z',
      sproutId: 'sprout-coexist',
      twigId: 'branch-0-twig-branch-0-twig-0',
      title: 'Real sprout',
      season: '2w',
      environment: 'fertile',
      soilCost: 2,
      leafId: 'leaf-1',
    })

    const state = getState()
    expect(state.seedlings.size).toBe(1)
    expect(state.sprouts.size).toBe(1)
    expect(state.soilAvailable).toBe(8) // Only sprout costs soil
  })
})
```

- [ ] **Step 2: Run all tests**

Run: `cd web && npx vitest run`
Expected: All pass

- [ ] **Step 3: Commit**

```bash
git add web/src/tests/seedling-derive.test.ts
git commit -m "test: add seedling store integration tests"
```

### Task 9: Update shared constants generator for seedling validation

**Files:**
- Modify: `shared/generate-constants.js`

- [ ] **Step 1: Add seedling validation constants to TypeScript generator**

In the `generateTypeScript` function, after `MAX_BLOOM_LENGTH` output, add:

```javascript
export const MAX_SEEDLING_TITLE_LENGTH = ${constants.validation.maxSeedlingTitleLength}
export const MAX_SEEDLING_NOTES_LENGTH = ${constants.validation.maxSeedlingNotesLength}
```

- [ ] **Step 2: Add seedling validation constants to Swift generator**

In the `generateSwift` function, inside the `Validation` enum, add:

```javascript
        static let maxSeedlingTitleLength: Int = ${constants.validation.maxSeedlingTitleLength}
        static let maxSeedlingNotesLength: Int = ${constants.validation.maxSeedlingNotesLength}
```

- [ ] **Step 3: Regenerate and verify**

Run: `node shared/generate-constants.js`

Verify both generated files contain the new constants.

- [ ] **Step 4: Commit**

```bash
git add shared/generate-constants.js web/src/generated/constants.ts ios/Trunk/Generated/SharedConstants.swift
git commit -m "chore: add seedling validation constants to generator"
```

### Task 10: Final verification and typecheck

- [ ] **Step 1: Run Biome format**

Run: `cd web && npx biome format --write src/`

- [ ] **Step 2: Run TypeScript typecheck**

Run: `cd web && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Run full test suite**

Run: `cd web && npx vitest run`
Expected: All pass

- [ ] **Step 4: Build production bundle**

Run: `cd web && npm run build`
Expected: Successful build

- [ ] **Step 5: iOS build verification**

Run: `xcodebuild -project ios/Trunk.xcodeproj -scheme Trunk -sdk iphonesimulator -destination 'platform=iOS Simulator,name=iPhone 16' build 2>&1 | tail -5`
Expected: BUILD SUCCEEDED

- [ ] **Step 6: Commit any formatting fixes**

```bash
cd web && npx biome format --write src/
git add -A
git commit -m "chore: format and final verification"
```
