# Trunk Sync Protocol Specification

This document specifies the complete sync protocol for Trunk's cloud synchronization via Supabase. Both web and iOS platforms MUST implement this protocol identically to ensure data consistency across devices.

---

## Architecture Overview

**Philosophy**: Local-first with optimistic sync

- **Local-first**: All user actions are immediately reflected in local state, no waiting for server
- **Optimistic**: Events are applied locally before server confirmation
- **Eventually consistent**: Multiple devices converge to the same state via event log
- **Idempotent**: Duplicate events are safely ignored via unique constraints
- **Resilient**: Cached data serves as fallback during network failures

```
┌──────────────┐                           ┌──────────────┐
│   Device A   │                           │   Device B   │
│  (Web/iOS)   │                           │  (Web/iOS)   │
└──────┬───────┘                           └──────┬───────┘
       │                                          │
       │  push event (optimistic)                 │
       │  ────────────────┐                       │
       │                  ▼                       │
       │         ┌─────────────────┐              │
       │         │    Supabase     │              │
       │         │  events table   │              │
       │         │  (Postgres)     │              │
       │         └─────────────────┘              │
       │                  │                       │
       │                  │ realtime broadcast    │
       │                  └──────────────────────►│
       │                                          │
       │◄─────────── pull incremental ────────────┤
       │                                          │
```

---

## Data Model

### Server Schema (Supabase)

**Table**: `events`

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | uuid | PRIMARY KEY, default gen_random_uuid() | Server-generated unique ID |
| `user_id` | uuid | NOT NULL, FOREIGN KEY → auth.users(id) | User who owns this event |
| `type` | text | NOT NULL | Event type (sprout_planted, sprout_watered, etc.) |
| `payload` | jsonb | NOT NULL | Full event data (varies by type) |
| `client_id` | text | NOT NULL, UNIQUE | Client-generated deduplication key |
| `client_timestamp` | text | NOT NULL | ISO8601 timestamp from client device |
| `created_at` | timestamptz | NOT NULL, default now() | Server timestamp when row was inserted |

**Indexes**:
- Primary key on `id`
- Unique index on `client_id` (prevents duplicates)
- Index on `user_id` (for filtering)
- Index on `created_at` (for incremental pulls)

**Row-Level Security (RLS)**:
- Users can only read/write their own events (`user_id = auth.uid()`)

### Local Event Format

**Web** (`TrunkEvent`):
```typescript
{
  type: string,         // Event type
  timestamp: string,    // ISO8601 client timestamp
  ...                   // Type-specific fields (sproutId, twigId, etc.)
}
```

**iOS** (`SyncEvent`):
```swift
struct SyncEvent {
  let id: UUID
  let userId: UUID
  let type: String
  let payload: [String: AnyCodable]
  let clientId: String
  let clientTimestamp: String
  let createdAt: String
}
```

---

## Client ID Generation

Each event must have a unique `client_id` for deduplication.

**Algorithm**: Both platforms use UUID-based generation. Client IDs are non-deterministic — each call produces a new unique ID. The ID is stored on the event at creation time and reused for retry matching.

**Format**: `{ISO8601-timestamp}-{uuid-prefix}`

**Web Implementation**:
```typescript
function generateClientId(): string {
  return `${new Date().toISOString()}-${crypto.randomUUID().slice(0, 8)}`
}
```

**iOS Implementation**:
```swift
let clientId = "\(ISO8601DateFormatter().string(from: Date()))-\(UUID().uuidString.prefix(8).lowercased())"
```

**Important**: Client IDs are assigned once at event creation and persisted with the event. Retry logic matches pending uploads by stored `client_id`, not by regenerating it.

---

## Cache Management

### Cache Version

**Purpose**: Invalidate cache when schema or logic changes

**Storage**:
- Web: `localStorage['trunk-cache-version']` → `"1"`
- iOS: `UserDefaults["trunk-cache-version"]` → `1`

**Current Version**: `1`

**Check**:
```typescript
function isCacheValid(): boolean {
  const stored = localStorage.getItem('trunk-cache-version')
  return stored === '1'
}
```

**When to Increment**:
- Breaking changes to event schema
- Changes to derivation logic that affect state
- Changes to deduplication strategy

### Last Sync Timestamp

**Purpose**: Track the `created_at` of the most recent server event

**Storage**:
- Web: `localStorage['trunk-last-sync']` → ISO8601 string
- iOS: `UserDefaults["trunk-last-sync"]` → ISO8601 string

**Usage**: Query events `WHERE created_at > last_sync` for incremental pulls

**Update**: Set to `created_at` of the last event in each pull response

---

## Operations

### 1. Pull Events (Incremental)

**When**: On app launch, after push, on tab visibility change, on manual refresh

**Algorithm**:
1. Read `lastSync = localStorage['trunk-last-sync']`
2. Query Supabase:
   ```sql
   SELECT * FROM events
   WHERE user_id = $userId
   AND created_at > $lastSync  -- omit if lastSync is null
   ORDER BY created_at ASC
   ```
3. Filter out duplicates by `client_timestamp` (check against existing local events)
4. Append unique new events to local store
5. Update `localStorage['trunk-last-sync']` to `created_at` of last pulled event
6. Return count of new events appended

**Web Implementation**:
```typescript
async function pullEvents(): Promise<{ pulled: number; error: string | null }> {
  const lastSync = localStorage.getItem('trunk-last-sync')
  let query = supabase.from('events').select('*').order('created_at', { ascending: true })
  if (lastSync) query = query.gt('created_at', lastSync)

  const { data: syncEvents, error } = await query
  if (error) return { pulled: 0, error: error.message }

  const existingTimestamps = new Set(getEvents().map(e => e.timestamp))
  const uniqueNewEvents = syncEvents
    .map(syncToLocalEvent)
    .filter(e => !existingTimestamps.has(e.timestamp))

  if (uniqueNewEvents.length > 0) appendEvents(uniqueNewEvents)
  if (syncEvents.length > 0) {
    localStorage.setItem('trunk-last-sync', syncEvents[syncEvents.length - 1].created_at)
  }
  return { pulled: uniqueNewEvents.length, error: null }
}
```

**Deduplication**:
- **By `client_timestamp`**: Prevents duplicate events from same action
- **Why not `client_id`?**: Both work, but `client_timestamp` is simpler and already unique per event

---

### 2. Push Event (Optimistic)

**When**: User performs an action (plant sprout, water, harvest, shine, etc.)

**Algorithm**:
1. Read `clientId` from event (assigned at creation via `generateClientId()`)
2. Add `clientId` to `pendingUploadIds` set (mark as pending)
3. Persist `pendingUploadIds` to storage
4. Insert to Supabase `events` table
5. If success or 23505 (duplicate key error): remove from `pendingUploadIds`
6. If other error: leave in `pendingUploadIds` for retry

**Web Implementation**:
```typescript
async function pushEvent(event: TrunkEvent): Promise<{ error: string | null }> {
  const clientId = event.client_id
  pendingUploadIds.add(clientId)
  savePendingIds()

  const syncPayload = {
    user_id: user.id,
    type: event.type,
    payload: event,
    client_id: clientId,
    client_timestamp: event.timestamp,
  }

  const { error } = await supabase.from('events').insert(syncPayload)

  // 23505 = unique constraint violation (duplicate)
  if (!error || error.code === '23505') {
    pendingUploadIds.delete(clientId)
    savePendingIds()
    return { error: null }
  }

  // Leave in pendingUploadIds for retry
  return { error: error.message }
}
```

**Error Code 23505**: Postgres unique constraint violation. This means the event already exists on the server (idempotence working as intended).

**iOS Implementation**: Nearly identical, using EventStore.shared for pending tracking.

---

### 3. Retry Pending Uploads

**When**: On smart sync (before pulling), on app resume, on network reconnect

**Algorithm**:
1. Iterate through `pendingUploadIds` set
2. For each `clientId`:
   - Find matching local event (where `event.client_id === clientId`)
   - If not found: remove stale `clientId` from pending set
   - If found: re-push to Supabase
   - If success or 23505: remove from pending set
   - If other error: leave in pending set
3. Persist updated `pendingUploadIds`
4. Return count of successfully pushed events

**Web Implementation**:
```typescript
async function retryPendingUploads(): Promise<number> {
  let pushed = 0
  for (const clientId of [...pendingUploadIds]) {
    const event = events.find(e => e.client_id === clientId)
    if (!event) {
      pendingUploadIds.delete(clientId)
      continue
    }

    const { error } = await supabase.from('events').insert(localToSyncPayload(event, userId))
    if (!error || error.code === '23505') {
      pendingUploadIds.delete(clientId)
      pushed++
    }
  }
  savePendingIds()
  return pushed
}
```

---

### 4. Smart Sync

**When**: On app launch, manual refresh, tab visibility change

**Algorithm**:
1. Check if `isCacheValid()`
2. If cache valid: **incremental sync**
   - Retry pending uploads
   - Pull events since last sync
   - Update cache version on success
3. If cache invalid: **full sync**
   - Retry pending uploads
   - Fetch ALL events (no `created_at` filter)
   - **Don't clear cache until new data arrives** (fallback protection)
   - Replace local event store with server data
   - Set cache version to current
   - Update last sync timestamp
4. Return sync result with status, counts, and mode

**Web Implementation**:
```typescript
async function smartSync(): Promise<SyncResult> {
  const retried = await retryPendingUploads()
  const cacheValid = isCacheValid()
  const mode = cacheValid ? 'incremental' : 'full'

  if (cacheValid) {
    const result = await pullEvents()
    if (result.error) return { status: 'error', pulled: 0, error: result.error, mode }
    if (result.pulled > 0) setCacheVersion()
    return { status: 'success', pulled: result.pulled, error: null, mode }
  } else {
    const { data: syncEvents, error } = await supabase
      .from('events')
      .select('*')
      .order('created_at', { ascending: true })

    if (error) {
      // Network failed - use existing cache as fallback
      return { status: 'error', pulled: 0, error: error.message, mode }
    }

    // Success - now safe to replace cache
    const allEvents = syncEvents.map(syncToLocalEvent).filter(Boolean)
    replaceEvents(allEvents)
    setCacheVersion()
    if (syncEvents.length > 0) {
      localStorage.setItem('trunk-last-sync', syncEvents[syncEvents.length - 1].created_at)
    }
    return { status: 'success', pulled: allEvents.length, error: null, mode }
  }
}
```

**Fallback Protection**: On full sync, if network fails, the existing cache remains intact. This prevents data loss during transient network issues.

---

### 5. Realtime Subscription

**When**: After initial sync completes and user is authenticated

**Algorithm**:
1. Unsubscribe from any existing channel
2. Subscribe to `postgres_changes` on `events` table
3. Filter: `user_id = eq.{userId}`
4. Event: `INSERT`
5. On new event:
   - Convert `SyncEvent` to local format
   - Check if event already exists (by `client_timestamp`)
   - If new: append to local store and notify callback
   - If duplicate: ignore (we pushed it ourselves)

**Web Implementation**:
```typescript
function subscribeToRealtime(onEvent: (event: TrunkEvent) => void): void {
  realtimeChannel = supabase
    .channel('events-realtime')
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'events',
      filter: `user_id=eq.${user.id}`,
    }, (payload) => {
      const syncEvent = payload.new as SyncEvent
      const localEvent = syncToLocalEvent(syncEvent)

      const alreadyExists = getEvents().some(e => e.timestamp === localEvent.timestamp)
      if (!alreadyExists) {
        appendEvents([localEvent])
        onEvent(localEvent)
      }
    })
    .subscribe()
}
```

**iOS Implementation**: Uses `RealtimeChannelV2` with `postgresChange(InsertAction.self)` and async iteration.

**Deduplication**: Essential to prevent echoing our own pushes. The realtime broadcast includes events we just pushed, so we must check for duplicates before appending.

---

### 6. Visibility Sync

**When**: Tab/app becomes visible after being backgrounded

**Web Implementation**:
```typescript
function startVisibilitySync(): void {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      smartSync()
    }
  })
}
```

**iOS Implementation**: Use `scenePhase` change to trigger sync when app becomes active.

**Purpose**: Catch up on events from other devices while this device was backgrounded.

---

## Sync Status

### Status Values

**Basic Status** (internal):
- `idle`: No sync in progress
- `syncing`: Pull or push in progress
- `success`: Last sync succeeded
- `error`: Last sync failed

**Detailed Status** (UI-facing):
- `synced`: All events confirmed, no pending, last check found nothing new
- `syncing`: Currently pulling/pushing
- `pendingUpload`: Has local events not yet pushed to server
- `offline`: Last sync attempt failed (network issue or auth error)
- `loading`: No cache, first sync in progress

**Computation**:
```typescript
function getDetailedSyncStatus(): DetailedSyncStatus {
  if (currentSyncStatus === 'syncing') return 'syncing'
  if (currentSyncStatus === 'error') return 'offline'
  if (pendingUploadIds.size > 0) return 'pendingUpload'
  return 'synced'
}
```

### Metadata

**Exposed to UI**:
```typescript
type SyncMetadata = {
  status: DetailedSyncStatus
  lastConfirmedTimestamp: string | null  // Most recent server-confirmed event
  pendingCount: number                   // Number of events awaiting push
}
```

**Subscribe to Changes**:
```typescript
subscribeSyncMetadata((meta: SyncMetadata) => {
  // Update UI badge/icon based on meta.status
})
```

---

## Error Recovery

### Network Failures

**Scenario**: Supabase unreachable during sync

**Behavior**:
1. Return error status
2. Keep existing cache intact (don't clear events)
3. Use cached data for UI rendering
4. Retry on next sync trigger (visibility change, manual refresh)

**Code**:
```typescript
try {
  const { data, error } = await supabase.from('events').select('*')
  if (error) {
    // Don't clear cache - use existing data
    console.warn('Sync failed, using cached data:', error.message)
    return { status: 'error', error: error.message }
  }
  // Success - safe to replace cache
  replaceEvents(data)
} catch (err) {
  // Network exception - cached data remains
  console.warn('Sync exception, using cached data:', err)
}
```

### Push Failures

**Scenario**: Event fails to push to server

**Behavior**:
1. Event remains in `pendingUploadIds`
2. UI shows `pendingUpload` status
3. Retry on next smart sync
4. Event persists locally, so user sees their action reflected
5. Eventually consistent when network recovers

**Code**: See "Push Event" section above.

### Duplicate Detection

**Scenario**: Same event pushed twice (race condition, retry, etc.)

**Behavior**:
1. Supabase returns 23505 (unique constraint violation on `client_id`)
2. Treat as success (event already exists)
3. Remove from `pendingUploadIds`

**Code**:
```typescript
const { error } = await supabase.from('events').insert(payload)
if (!error || error.code === '23505') {
  pendingUploadIds.delete(clientId)
  return { error: null }
}
```

### Stale Pending IDs

**Scenario**: `pendingUploadIds` contains a `clientId` but local event was deleted

**Behavior**:
1. During retry, find matching event
2. If not found: remove stale `clientId` from pending set
3. Continue to next pending ID

**Code**:
```typescript
for (const clientId of [...pendingUploadIds]) {
  const event = events.find(e => e.client_id === clientId)
  if (!event) {
    pendingUploadIds.delete(clientId)  // Stale - remove
    continue
  }
  // ... retry push
}
```

---

## Deduplication Strategy

### Server-Side

**Unique Constraint**: `client_id` column has a unique index

**Behavior**: INSERT with duplicate `client_id` → 23505 error

**Idempotence**: Multiple identical pushes have no effect after the first succeeds

### Client-Side

**During Pull**:
- Filter out events whose `client_timestamp` already exists in local store
- Prevents duplicate events from server responses

**During Realtime**:
- Check if `client_timestamp` already exists before appending
- Prevents echoing our own pushes

**Code**:
```typescript
const existingTimestamps = new Set(getEvents().map(e => e.timestamp))
const uniqueNewEvents = serverEvents.filter(e => !existingTimestamps.has(e.client_timestamp))
appendEvents(uniqueNewEvents)
```

---

## Storage Keys

### Web (localStorage)

| Key | Value | Purpose |
|-----|-------|---------|
| `trunk-last-sync` | ISO8601 string | Most recent server `created_at` |
| `trunk-cache-version` | `"1"` | Cache schema version |
| `trunk-pending-uploads` | JSON array of client_id strings | Events awaiting server confirmation |
| `trunk-events-v1` | JSON array of TrunkEvent | Local event log |

### iOS (UserDefaults + File)

| Key/Path | Value | Purpose |
|----------|-------|---------|
| `trunk-last-sync` (UserDefaults) | ISO8601 string | Most recent server `created_at` |
| `trunk-cache-version` (UserDefaults) | `1` (Int) | Cache schema version |
| `ApplicationSupport/Trunk/events-cache.json` | CachedEventStore JSON | Event log + pending IDs + metadata |

**iOS Cache File Structure**:
```json
{
  "events": [...],
  "pendingUploadClientIds": ["2024-01-15T10:30:00Z-abc123", ...],
  "lastSyncTimestamp": "2024-01-15T10:30:00Z",
  "cacheVersion": 1,
  "lastWrittenAt": "2024-01-15T10:30:05Z"
}
```

**Write Debouncing**: iOS writes to disk are debounced (0.5s delay) to avoid thrashing on rapid updates.

---

## Platform Parity Checklist

Both web and iOS MUST implement:

- [x] Incremental pull (query since last sync)
- [x] Full pull (query all events)
- [x] Optimistic push with pending tracking
- [x] Retry pending uploads
- [x] Smart sync (cache validation + incremental/full decision)
- [x] Realtime subscription with deduplication
- [x] Visibility sync (re-sync when app becomes active)
- [x] Error recovery (cached fallback)
- [x] Client ID generation (UUID-based)
- [x] Deduplication by `client_id` and `client_timestamp`
- [x] Sync status metadata (for UI badges)

**Differences**:
- **Storage**: Web uses localStorage, iOS uses UserDefaults + JSON file
- **Disk persistence**: iOS debounces writes, web writes immediately to localStorage

---

## Testing Scenarios

### Scenario 1: Two Devices Online

1. Device A plants a sprout → pushes event
2. Realtime broadcasts to Device B
3. Device B receives event and updates UI
4. Both devices now have identical state

**Expected**: No duplicates, both show the new sprout

### Scenario 2: Offline Push, Later Sync

1. Device A goes offline
2. User plants sprout → event stored locally, added to pending
3. Device A comes online → smart sync retries pending
4. Event pushed to server, removed from pending
5. Device B pulls event on next sync

**Expected**: Event reaches server eventually, both devices converge

### Scenario 3: Cache Invalidation

1. Increment `CACHE_VERSION` to 2
2. Deploy new app version
3. User opens app → `isCacheValid()` returns false
4. Smart sync performs full pull
5. All events replaced with fresh server data
6. Cache version updated to 2

**Expected**: Clean slate, no stale events

### Scenario 4: Duplicate Push (Race Condition)

1. User clicks "water" twice rapidly
2. Two pushEvent calls fire
3. Both generate same `clientId`
4. First INSERT succeeds
5. Second INSERT fails with 23505
6. Both treated as success, removed from pending

**Expected**: Only one event in database, no user-visible error

### Scenario 5: Stale Pending ID

1. Event pushed but fails → added to pending
2. User manually deletes event from local cache
3. Smart sync retries → can't find event
4. Pending ID removed from set

**Expected**: No crash, stale ID cleaned up

---

## Performance Considerations

### Incremental vs Full Sync

- **Incremental**: Faster, lower bandwidth, preferred for normal operation
- **Full**: Slower, higher bandwidth, used on cache invalidation or first load

**Trigger Full Sync**:
- Cache version mismatch
- Manual "refresh from cloud" action
- Debugging/recovery (force resync)

### Realtime Subscription

**Trade-off**: Real-time updates are instant but add connection overhead

**When to Enable**:
- User is actively using the app
- Authenticated and connected

**When to Disable**:
- App in background (to save battery/bandwidth)
- User logged out

### Debounced Writes (iOS)

**Purpose**: Avoid disk I/O on every event change

**Interval**: 0.5 seconds

**Trade-off**: Small window of data loss if app crashes before write completes

**Mitigation**: Call `flushToDisk()` on app background/termination

---

## Security

### Row-Level Security (RLS)

**Policy**: Users can only access their own events

```sql
CREATE POLICY "Users can only access their own events"
ON events
FOR ALL
USING (user_id = auth.uid());
```

**Enforcement**: Supabase enforces this at the database level, so even if a client tries to query another user's events, the query returns empty.

### Authentication

**Required**: User must be authenticated to sync

**Check**:
```typescript
const { user } = getAuthState()
if (!user) return { error: 'Not authenticated' }
```

**Logout**: Clear all cached events and sync metadata

---

## Debugging

### Enable Logging

**Web**:
```typescript
console.info('Sync: Fetched N events, pushed M events, P pending')
```

**iOS**:
```swift
print("Sync: Fetched \(pulled) events, pushed \(pushed) events, \(pending) pending")
```

### Inspect Pending Uploads

**Web**:
```typescript
console.log('Pending uploads:', [...pendingUploadIds])
```

**iOS**:
```swift
print("Pending uploads: \(EventStore.shared.pendingUploadClientIds)")
```

### Force Full Sync

**Web**:
```typescript
await forceFullSync()
```

**iOS**:
```swift
await SyncService.shared.forceFullSync()
```

### Clear Cache

**Web**:
```typescript
localStorage.removeItem('trunk-last-sync')
localStorage.removeItem('trunk-cache-version')
replaceEvents([])
```

**iOS**:
```swift
SyncService.shared.clearLocalCache()
```

---

## Future Enhancements

### Conflict Resolution

**Current**: Last-write-wins (events are immutable)

**Future**: Could add merge strategies for mutable state (e.g., node labels)

### Compression

**Current**: Full events stored in payload

**Future**: Could delta-encode events or compress JSONB payload

### Selective Sync

**Current**: Sync all events for user

**Future**: Could filter by date range (e.g., only sync last 90 days)

### Offline Queueing

**Current**: Pending events stored in memory + localStorage/UserDefaults

**Future**: Could use IndexedDB (web) or SQLite (iOS) for larger offline queues

---

## References

- **Web Implementation**: `web/src/services/sync/operations.ts`, `web/src/services/sync/realtime.ts`, `web/src/services/sync/status.ts`, `web/src/bootstrap/sync.ts`
- **iOS Implementation**: `ios/Trunk/Services/SyncService.swift`, `ios/Trunk/Services/Sync/*.swift`, `ios/Trunk/Services/SyncEvent.swift`, `ios/Trunk/Services/EventStore.swift`
- **Supabase Docs**: https://supabase.com/docs/guides/realtime
- **Postgres Error Codes**: https://www.postgresql.org/docs/current/errcodes-appendix.html (23505 = unique_violation)
