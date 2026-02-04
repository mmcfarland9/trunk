# Incremental Sync with Cache Versioning

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement efficient incremental sync with cache versioning and a visual sync status indicator.

**Architecture:** Cache events locally with a version number. On login, compare versions: if match, pull only new events (incremental); if mismatch, pull all (full sync). Show sync status via a cloud icon with colored dot next to the profile badge. If network fails, use cached data as fallback.

**Tech Stack:** TypeScript, Supabase, localStorage, CSS

---

### Task 1: Add cache version constant and storage helpers

**Files:**
- Modify: `web/src/services/sync-service.ts`

**Step 1: Add cache version constant and helpers**

Add at the top of the file, after the imports:

```typescript
const CACHE_VERSION = 1
const CACHE_VERSION_KEY = 'trunk-cache-version'

/**
 * Check if cache version matches current version
 */
function isCacheValid(): boolean {
  const stored = localStorage.getItem(CACHE_VERSION_KEY)
  return stored === String(CACHE_VERSION)
}

/**
 * Update stored cache version to current
 */
function setCacheVersion(): void {
  localStorage.setItem(CACHE_VERSION_KEY, String(CACHE_VERSION))
}

/**
 * Clear cache version (forces full sync on next load)
 */
function clearCacheVersion(): void {
  localStorage.removeItem(CACHE_VERSION_KEY)
}
```

**Step 2: Update clearLocalCache to also clear version**

Find `clearLocalCache` and update it:

```typescript
export function clearLocalCache(): void {
  localStorage.removeItem(LAST_SYNC_KEY)
  clearCacheVersion()
  replaceEvents([])
}
```

**Step 3: Run tests**

Run: `cd web && npm test -- --run`
Expected: All 296 tests pass

**Step 4: Commit**

```bash
git add web/src/services/sync-service.ts
git commit -m "feat(sync): add cache version constant and helpers"
```

---

### Task 2: Create smartSync function with incremental/full logic

**Files:**
- Modify: `web/src/services/sync-service.ts`

**Step 1: Add smartSync function**

Add after the `clearLocalCache` function:

```typescript
export type SyncStatus = 'idle' | 'syncing' | 'success' | 'error'

export type SyncResult = {
  status: SyncStatus
  pulled: number
  error: string | null
  mode: 'incremental' | 'full'
}

/**
 * Smart sync: incremental if cache valid, full otherwise.
 * Uses cached data as fallback if network fails.
 */
export async function smartSync(): Promise<SyncResult> {
  if (!supabase) {
    return { status: 'error', pulled: 0, error: 'Supabase not configured', mode: 'full' }
  }

  const { user } = getAuthState()
  if (!user) {
    return { status: 'error', pulled: 0, error: 'Not authenticated', mode: 'full' }
  }

  const cacheValid = isCacheValid()
  const mode = cacheValid ? 'incremental' : 'full'

  try {
    let result: { pulled: number; error: string | null }

    if (cacheValid) {
      // Incremental: pull only new events since last sync
      result = await pullEvents()
    } else {
      // Full: clear and pull everything
      // But don't clear cache until we have new data (fallback protection)
      const { data: syncEvents, error } = await supabase
        .from('events')
        .select('*')
        .order('created_at', { ascending: true })

      if (error) {
        // Network failed - use existing cache as fallback
        console.warn('Sync failed, using cached data:', error.message)
        return { status: 'error', pulled: 0, error: error.message, mode }
      }

      // Success - now safe to replace cache
      const allEvents = (syncEvents as SyncEvent[]).map(syncToLocalEvent)
      replaceEvents(allEvents)
      setCacheVersion()

      if (syncEvents.length > 0) {
        const latest = syncEvents[syncEvents.length - 1].created_at
        localStorage.setItem(LAST_SYNC_KEY, latest)
      }

      result = { pulled: allEvents.length, error: null }
    }

    if (result.error) {
      return { status: 'error', pulled: 0, error: result.error, mode }
    }

    // Update cache version on successful incremental sync too
    if (cacheValid && result.pulled > 0) {
      setCacheVersion()
    }

    return { status: 'success', pulled: result.pulled, error: null, mode }
  } catch (err) {
    // Network error - use cached data as fallback
    console.warn('Sync exception, using cached data:', err)
    return { status: 'error', pulled: 0, error: String(err), mode }
  }
}
```

**Step 2: Run tests**

Run: `cd web && npm test -- --run`
Expected: All tests pass

**Step 3: Commit**

```bash
git add web/src/services/sync-service.ts
git commit -m "feat(sync): add smartSync with incremental/full modes and fallback"
```

---

### Task 3: Add sync status state management

**Files:**
- Modify: `web/src/services/sync-service.ts`

**Step 1: Add sync status state and subscribers**

Add after the `SyncResult` type definition:

```typescript
let currentSyncStatus: SyncStatus = 'idle'
type SyncStatusListener = (status: SyncStatus) => void
const syncStatusListeners: SyncStatusListener[] = []

/**
 * Get current sync status
 */
export function getSyncStatus(): SyncStatus {
  return currentSyncStatus
}

/**
 * Subscribe to sync status changes
 */
export function subscribeSyncStatus(listener: SyncStatusListener): () => void {
  syncStatusListeners.push(listener)
  listener(currentSyncStatus) // Immediate callback with current status
  return () => {
    const index = syncStatusListeners.indexOf(listener)
    if (index > -1) syncStatusListeners.splice(index, 1)
  }
}

function setSyncStatus(status: SyncStatus): void {
  currentSyncStatus = status
  syncStatusListeners.forEach(l => l(status))
}
```

**Step 2: Update smartSync to set status**

Update the `smartSync` function to set status at start and end:

At the beginning of smartSync, after the auth check:
```typescript
  setSyncStatus('syncing')
```

Before each return statement, set appropriate status:
- Before `return { status: 'error'...` add `setSyncStatus('error')`
- Before `return { status: 'success'...` add `setSyncStatus('success')`

**Step 3: Run tests**

Run: `cd web && npm test -- --run`
Expected: All tests pass

**Step 4: Commit**

```bash
git add web/src/services/sync-service.ts
git commit -m "feat(sync): add sync status state management with subscribers"
```

---

### Task 4: Create sync status indicator UI component

**Files:**
- Modify: `web/src/ui/dom-builder.ts`
- Modify: `web/src/types.ts`

**Step 1: Add syncIndicator to AppElements type**

In `web/src/types.ts`, find the `AppElements` type and add after `profileEmail`:

```typescript
  syncIndicator: HTMLSpanElement
```

**Step 2: Create sync indicator element in dom-builder**

In `web/src/ui/dom-builder.ts`, after the `profileEmail` element creation (around line 54), add:

```typescript
  // Sync status indicator (cloud icon with status dot)
  const syncIndicator = document.createElement('span')
  syncIndicator.className = 'sync-indicator'
  syncIndicator.innerHTML = `
    <svg class="sync-cloud" width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
      <path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96z"/>
    </svg>
    <span class="sync-dot"></span>
  `
  syncIndicator.title = 'Sync status'
```

**Step 3: Append sync indicator to profile badge**

Update the line that appends to profileBadge:

```typescript
  profileBadge.append(profileIcon, profileEmail, syncIndicator)
```

**Step 4: Add syncIndicator to returned elements**

In the return statement, after `profileEmail,` add:

```typescript
    syncIndicator,
```

**Step 5: Run tests**

Run: `cd web && npm test -- --run`
Expected: All tests pass

**Step 6: Commit**

```bash
git add web/src/ui/dom-builder.ts web/src/types.ts
git commit -m "feat(ui): add sync status indicator element"
```

---

### Task 5: Add sync indicator CSS styles

**Files:**
- Modify: `web/src/styles/layout.css`

**Step 1: Add sync indicator styles**

After the `.profile-email` styles (around line 122), add:

```css
/* Sync status indicator */
.sync-indicator {
  display: flex;
  align-items: center;
  position: relative;
  margin-left: var(--space-1);
}

.sync-cloud {
  color: var(--ink-faint);
  opacity: 0.7;
}

.sync-dot {
  position: absolute;
  bottom: -2px;
  right: -2px;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--ink-faint);
  border: 1px solid var(--paper);
}

/* Sync status states */
.sync-indicator[data-status="idle"] .sync-dot {
  background: var(--ink-faint);
}

.sync-indicator[data-status="syncing"] .sync-dot {
  background: var(--sun);
  animation: sync-pulse 1s ease-in-out infinite;
}

.sync-indicator[data-status="success"] .sync-dot {
  background: var(--twig);
}

.sync-indicator[data-status="error"] .sync-dot {
  background: var(--error-tone);
}

@keyframes sync-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}
```

**Step 2: Run tests**

Run: `cd web && npm test -- --run`
Expected: All tests pass

**Step 3: Commit**

```bash
git add web/src/styles/layout.css
git commit -m "feat(ui): add sync indicator CSS styles"
```

---

### Task 6: Wire up sync indicator to status changes

**Files:**
- Modify: `web/src/main.ts`

**Step 1: Import subscribeSyncStatus**

Update the sync-service import:

```typescript
import { pullAllEvents, pushEvent, subscribeToRealtime, unsubscribeFromRealtime, smartSync, subscribeSyncStatus } from './services/sync-service'
```

**Step 2: Remove pullAllEvents import (no longer needed)**

Remove `pullAllEvents` from the import since we'll use `smartSync` instead:

```typescript
import { pushEvent, subscribeToRealtime, unsubscribeFromRealtime, smartSync, subscribeSyncStatus } from './services/sync-service'
```

**Step 3: Subscribe to sync status after DOM is built**

After the `buildApp` call and before `startWithAuth()`, add:

```typescript
// Subscribe to sync status changes
subscribeSyncStatus((status) => {
  domResult.elements.syncIndicator.dataset.status = status
  domResult.elements.syncIndicator.title = `Sync: ${status}`
})
```

**Step 4: Replace pullAllEvents with smartSync**

In the auth subscription callback, replace:

```typescript
        // Pull all events from cloud (clears local cache first, then replaces)
        const { pulled, error } = await pullAllEvents()
        if (error) {
          console.warn('Sync pull failed:', error)
        } else {
          console.log(`Synced ${pulled} events from cloud`)
          // Always reload to ensure UI reflects cloud state
          window.location.reload()
        }
```

With:

```typescript
        // Smart sync: incremental if cache valid, full if not
        const result = await smartSync()
        if (result.error) {
          console.warn(`Sync failed (${result.mode}):`, result.error)
          // Don't reload - use cached data as fallback
        } else if (result.pulled > 0) {
          console.log(`Synced ${result.pulled} events (${result.mode})`)
          // Reload to reflect new data
          window.location.reload()
        } else {
          console.log(`Sync complete, no new events (${result.mode})`)
        }
```

**Step 5: Run tests**

Run: `cd web && npm test -- --run`
Expected: All tests pass

**Step 6: Commit**

```bash
git add web/src/main.ts
git commit -m "feat(sync): wire up smartSync and status indicator"
```

---

### Task 7: Clean up unused pullAllEvents function

**Files:**
- Modify: `web/src/services/sync-service.ts`

**Step 1: Remove pullAllEvents function**

Delete the entire `pullAllEvents` function (the old one that clears cache first). It's been replaced by `smartSync`.

**Step 2: Run tests**

Run: `cd web && npm test -- --run`
Expected: All tests pass

**Step 3: Commit**

```bash
git add web/src/services/sync-service.ts
git commit -m "refactor(sync): remove unused pullAllEvents function"
```

---

### Task 8: Manual testing

**Step 1: Start dev server**

Run: `cd web && npm run dev`

**Step 2: Test incremental sync**

1. Open http://localhost:5173
2. Log in with your account
3. Verify cloud indicator shows yellow (syncing) then green (success)
4. Refresh the page - should be fast (incremental sync)
5. Check console: should say "Synced X events (incremental)" or "no new events (incremental)"

**Step 3: Test full sync (cache invalidation)**

1. Open DevTools → Application → Local Storage
2. Delete `trunk-cache-version` key
3. Refresh the page
4. Check console: should say "Synced X events (full)"

**Step 4: Test network failure fallback**

1. Open DevTools → Network → Offline
2. Refresh the page
3. Verify app still works with cached data
4. Cloud indicator should show red (error)
5. Go back online, refresh - should sync and turn green

**Step 5: Commit any fixes if needed**

---

### Task 9: Final verification

**Step 1: Run all tests**

Run: `cd web && npm test -- --run`
Expected: All 296+ tests pass

**Step 2: Build for production**

Run: `cd web && npm run build`
Expected: Build succeeds with no errors

**Step 3: Final commit if needed**

```bash
git status
# If any uncommitted changes:
git add -A
git commit -m "chore: final cleanup for incremental sync"
```
