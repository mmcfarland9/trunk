# Cloud Sync Design for Trunk

**Date:** 2026-02-01
**Status:** Approved
**Author:** Michael McFarland + Claude

## Overview

Add cloud-based data synchronization between the Trunk iOS and web apps, enabling seamless access from multiple devices with a single source of truth.

## Goals

- **Full control & ownership** - Self-hosted on Vercel, you own all data
- **Production-ready** - Multi-tenant from the start, scalable for eventual public use
- **Simple & robust** - No over-engineering, leverage existing event-sourced architecture

## Non-Goals

- Real-time sync (WebSockets)
- Social login
- Offline-first conflict resolution complexity

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         VERCEL                                  │
│  ┌─────────────────────┐    ┌─────────────────────────────┐    │
│  │   Web App (Vite)    │    │     API Routes (Edge)       │    │
│  │   trunk.michael...  │───▶│  /api/auth/*  /api/sync/*   │    │
│  └─────────────────────┘    └──────────────┬──────────────┘    │
│                                            │                    │
│                              ┌─────────────▼──────────────┐    │
│                              │     Neon Postgres          │    │
│                              │  users, events, sessions   │    │
│                              └────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
                                            ▲
                                            │ HTTPS
                 ┌──────────────────────────┴───────────────┐
                 │                                          │
        ┌────────┴────────┐                      ┌──────────┴───────┐
        │    iOS App      │                      │   Web Browser    │
        │   (SwiftData)   │                      │  (localStorage)  │
        │   local cache   │                      │   local cache    │
        └─────────────────┘                      └──────────────────┘
```

### Data Flow

- **Cloud (Neon Postgres):** Single source of truth for all user data
- **Device local storage:** Cache for offline use and instant UI responsiveness
- **Sync model:** Pull on app open, push immediately on action

---

## Database Schema

```sql
-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_seen_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sessions table (for refresh tokens)
CREATE TABLE sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Events table (append-only event log per user)
CREATE TABLE events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    payload JSONB NOT NULL,
    client_id UUID NOT NULL,
    client_timestamp TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, client_id)  -- Prevents duplicate events
);

-- Indexes
CREATE INDEX idx_events_user_created ON events(user_id, created_at);
CREATE INDEX idx_sessions_user ON sessions(user_id);
```

### Event Types

Matches existing `shared/schemas/events.schema.json`:

| Type | Description |
|------|-------------|
| `sprout_planted` | User plants a sprout (spends soil) |
| `sprout_watered` | Daily watering with journal entry |
| `sprout_harvested` | Sprout completed with result (1-5) |
| `sprout_uprooted` | Sprout abandoned (partial soil refund) |
| `sun_shone` | Weekly reflection on a twig |
| `leaf_created` | New saga/narrative created |
| `node_updated` | Label or note changed on a node |

---

## API Endpoints

### Authentication

```
POST /api/auth/request-code
     Body: { email: string }
     Response: { success: true }
     Action: Sends 6-digit code to email, valid for 10 minutes

POST /api/auth/verify-code
     Body: { email: string, code: string }
     Response: { accessToken: string, refreshToken: string, user: User }
     Action: Validates code, creates session, returns tokens

POST /api/auth/refresh
     Body: { refreshToken: string }
     Response: { accessToken: string, refreshToken: string }
     Action: Rotates refresh token, issues new access token
```

### Sync

```
GET  /api/sync/events?since={ISO timestamp}
     Headers: Authorization: Bearer {accessToken}
     Response: { events: Event[], latestTimestamp: string }
     Action: Returns all user's events after timestamp (omit `since` for all)

POST /api/sync/events
     Headers: Authorization: Bearer {accessToken}
     Body: { events: Event[] }
     Response: { accepted: string[], duplicates: string[] }
     Action: Stores new events, deduplicates by client_id

GET  /api/sync/status
     Headers: Authorization: Bearer {accessToken}
     Response: { latestTimestamp: string, eventCount: number }
     Action: Quick sync check without fetching events
```

---

## Authentication Flow

### 6-Digit Code Login

```
┌─────────────┐                    ┌─────────────┐                    ┌─────────────┐
│   Device    │                    │   Server    │                    │   Email     │
└──────┬──────┘                    └──────┬──────┘                    └──────┬──────┘
       │                                  │                                  │
       │  POST /auth/request-code         │                                  │
       │  { email: "you@..." }            │                                  │
       │─────────────────────────────────▶│                                  │
       │                                  │  Send code: 847291               │
       │                                  │─────────────────────────────────▶│
       │         { success: true }        │                                  │
       │◀─────────────────────────────────│                                  │
       │                                  │                                  │
       │  POST /auth/verify-code          │                                  │
       │  { email, code: "847291" }       │                                  │
       │─────────────────────────────────▶│                                  │
       │                                  │                                  │
       │  { accessToken, refreshToken }   │                                  │
       │◀─────────────────────────────────│                                  │
       │                                  │                                  │
       │  Store tokens locally            │                                  │
       │  (Keychain / secure storage)     │                                  │
```

### Token Configuration

| Token | Lifetime | Storage |
|-------|----------|---------|
| Access token | 15 minutes | Memory / secure storage |
| Refresh token | Indefinite (rotates on use) | Keychain (iOS) / secure storage (web) |
| Inactivity expiry | 60 days without app use | Server-side enforcement |

### Security Measures

- Codes expire after 10 minutes
- Max 5 code attempts before 15-minute lockout
- Refresh tokens are one-time-use (rotation prevents theft)
- Tokens hashed with bcrypt before storage

---

## Sync Logic

### Pull (App Opens)

```typescript
async function pullEvents() {
  const lastSync = getLastSyncTimestamp()
  const response = await fetch(`/api/sync/events?since=${lastSync}`, {
    headers: { Authorization: `Bearer ${accessToken}` }
  })
  const { events } = await response.json()

  // Append to local event log
  appendLocalEvents(events)

  // Re-derive state from full log
  const state = deriveState(getAllLocalEvents())
  updateUI(state)

  setLastSyncTimestamp(response.latestTimestamp)
}
```

### Push (After Action)

```typescript
async function pushEvent(event: TrunkEvent) {
  // Save locally first (instant UI)
  appendLocalEvent({ ...event, synced: false })
  updateUI(deriveState(getAllLocalEvents()))

  // Push to server
  try {
    await fetch('/api/sync/events', {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({ events: [event] })
    })
    markEventSynced(event.client_id)
  } catch (error) {
    // Queue for retry on next app open
    queueForRetry(event)
  }
}
```

### Conflict Handling

Events are append-only facts - they merge naturally:

| Scenario | Resolution |
|----------|------------|
| Same event pushed twice (network retry) | `client_id` deduplication rejects duplicate |
| Same sprout watered from two devices | Both events stored; `deriveState()` enforces daily cap |
| Same sprout harvested twice | `deriveState()` checks `if already completed, skip` |

---

## Implementation Stack

### Backend

| Component | Technology |
|-----------|------------|
| Database | Neon Postgres (via Vercel Marketplace) |
| API Routes | Vercel Edge Functions |
| Email | Resend (3,000 free emails/month) |
| Auth tokens | JWT (access) + bcrypt-hashed refresh tokens |

### Web App Changes

```
web/
├── api/                          # NEW: API routes
│   ├── auth/
│   │   ├── request-code.ts
│   │   ├── verify-code.ts
│   │   └── refresh.ts
│   └── sync/
│       ├── events.ts
│       └── status.ts
├── src/
│   ├── services/                 # NEW: Client services
│   │   ├── auth-service.ts
│   │   └── sync-service.ts
│   ├── components/               # NEW: Auth UI
│   │   └── login-modal.ts
│   └── ...existing code
```

### iOS App Changes

```
ios/Trunk/
├── Services/
│   ├── AuthService.swift         # NEW: Login flow
│   └── SyncService.swift         # NEW: Push/pull logic
├── Views/
│   └── LoginView.swift           # NEW: Auth UI
├── Keychain/
│   └── TokenStorage.swift        # NEW: Secure token storage
└── ...existing code
```

---

## Migration Path

### Phase 1: Add Auth (No Sync Yet)

1. Set up Neon Postgres database
2. Implement auth API routes
3. Add login UI to both apps
4. Existing local data stays untouched
5. Apps work exactly as before

### Phase 2: Initial Upload

1. After login, prompt: "Upload your existing data to the cloud?"
2. Push all local events to server (one-time migration)
3. Server becomes source of truth
4. Local storage becomes cache

### Phase 3: Ongoing Sync

1. All new actions push to server
2. App open pulls latest
3. Remove local-only codepath

### Your Migration

1. Deploy auth + sync backend
2. Log in on web → upload localStorage events
3. Log in on iOS → data appears (pulled from cloud)
4. Both devices now share the same data

---

## Cost Estimate

| Service | Free Tier | Your Usage | Cost |
|---------|-----------|------------|------|
| Neon Postgres | 0.5 GB, 191 compute hrs | ~2 MB, minimal compute | $0 |
| Vercel Functions | 100 GB-hrs/month | Minimal | $0 |
| Resend | 3,000 emails/month | ~10 emails/month | $0 |

**Total: $0/month** until you have hundreds of active users.

---

## Security Considerations

- All API routes require valid access token (except auth endpoints)
- User data isolated by `user_id` in all queries
- Refresh tokens hashed before storage
- HTTPS enforced by Vercel
- No secrets in client code (tokens are user-specific, not app secrets)
- Rate limiting on auth endpoints prevents brute force

---

## Future Enhancements (Not in Scope)

- **Snapshots:** Periodic state checkpoints for faster initial sync
- **Real-time:** WebSocket updates for multi-device simultaneous use
- **Sharing:** Share tree views with others (read-only)
- **Admin dashboard:** User management, usage stats

---

## Open Questions

None - design approved for implementation.

---

## Appendix: Environment Variables

```bash
# Vercel Environment Variables
POSTGRES_URL=           # From Neon dashboard
RESEND_API_KEY=         # From Resend dashboard
JWT_SECRET=             # Generate: openssl rand -base64 32
```
