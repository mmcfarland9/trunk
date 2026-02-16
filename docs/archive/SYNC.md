# Sync Architecture

Bilateral sync between iOS and web via Supabase. Both platforms follow an identical local-first protocol: render from cache immediately, sync in the background, retry failed pushes on next cycle.

---

## Backend

- **Supabase PostgreSQL** with a single append-only `events` table
- Row-level security scoped to `user_id` (authenticated user owns their rows)
- Unique constraint on `client_id` column prevents duplicate event insertion
- **Auth**: Email OTP via Supabase Auth (passwordless magic link)
- **Realtime**: Supabase Realtime channel subscription delivers cross-device events live

## Local Storage

### iOS
- **Event cache**: JSON file at `Application Support/Trunk/events-cache.json`
- **Sync cursors**: `UserDefaults` keys for `lastSync` timestamp and `cacheVersion`

### Web
- `trunk-events-v1` -- event log (localStorage)
- `trunk-last-sync` -- ISO timestamp of last successful pull
- `trunk-cache-version` -- schema version for cache invalidation
- `trunk-pending-uploads` -- JSON array of `client_id` values that failed to push

## Sync Protocol

Identical on both platforms (`smartSync()` in each codebase):

1. **On launch**: Load local cache, render immediately, call `smartSync()` async
2. **On foreground/visibility**: Same `smartSync()` flow
3. **On user write**: Optimistic local append, async push to Supabase, track `client_id` in pending set on failure
4. **smartSync() flow**: Retry pending uploads first, then pull delta via `created_at > lastSync`, merge into local cache, update cursor
5. **Realtime**: Supabase Realtime subscription inserts incoming events into local cache on arrival
6. **Deduplication**: Local dedup by `clientTimestamp`; server dedup by `client_id` unique constraint (23505 violations silently ignored)

## Key Files

| Platform | File | Responsibility |
|----------|------|----------------|
| iOS | `Services/EventStore.swift` | Event storage, JSON persistence, state derivation cache |
| iOS | `Services/SyncService.swift` | Push/pull/retry, sync status, realtime subscription |
| iOS | `Components/SyncIndicatorView.swift` | Status indicator UI |
| iOS | `ContentView.swift` | Sync orchestration (launch, foreground, background) |
| Web | `services/sync-service.ts` | Push/pull/retry, visibility sync, metadata broadcasting |
| Web | `services/sync-types.ts` | Event conversion (local <-> Supabase format), `client_id` generation |
| Web | `events/store.ts` | Event storage, localStorage persistence, state derivation |
| Web | `main.ts` | Sync orchestration, indicator wiring |

## Sync Status Indicator

Both platforms render the same two-part indicator:

```
2026-02-09T14:32:07Z  ✓ Synced
```

- **Left**: Yellow timestamp -- `created_at` of the latest server-confirmed event (UTC, seconds precision)
- **Right**: Status label with color:
  - Green `✓ Synced` -- all events confirmed, nothing pending
  - Yellow `Syncing...` -- currently pulling or pushing
  - Orange `↑ Pushing...` -- pending uploads being retried
  - Red `✗ Offline` -- last sync attempt failed
