# Cloud Sync Design for Trunk

**Date:** 2026-02-01
**Status:** Approved
**Author:** Michael McFarland + Claude

## Overview

Add cloud-based data synchronization between the Trunk iOS and web apps, enabling seamless access from multiple devices with a single source of truth.

## Goals

- **Full control & ownership** - Supabase is open source, can self-host if needed
- **Production-ready** - Multi-tenant from the start, scalable for eventual public use
- **Simple & robust** - Leverage Supabase's built-in auth and APIs, minimal custom code

## Non-Goals

- Real-time sync (WebSockets) - may add later, Supabase supports it
- Social login
- Offline-first conflict resolution complexity

---

## Architecture

```
┌────────────────────────────────────────────────────────────────────────────┐
│                              SUPABASE                                      │
│                                                                            │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────────┐   │
│  │      Auth       │  │    Postgres     │  │      REST API           │   │
│  │  (magic links)  │  │  users, events  │  │  (auto-generated)       │   │
│  └─────────────────┘  └─────────────────┘  └─────────────────────────┘   │
│                                                                            │
└────────────────────────────────────────────────────────────────────────────┘
          ▲                      ▲                        ▲
          │                      │                        │
          └──────────────────────┼────────────────────────┘
                                 │ HTTPS
                 ┌───────────────┴───────────────┐
                 │                               │
        ┌────────┴────────┐           ┌─────────┴────────┐
        │    iOS App      │           │    Web App       │
        │  Supabase SDK   │           │  Supabase SDK    │
        │   (SwiftData    │           │   (localStorage  │
        │    as cache)    │           │    as cache)     │
        └─────────────────┘           └──────────────────┘


┌─────────────────────────────────────────────────────────────────┐
│                         VERCEL                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │              Web App (Vite) - Static Hosting            │   │
│  │                  trunk.michaelmcfarland.com             │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

### What Supabase Provides

| Feature | What We Get | Custom Code Needed |
|---------|-------------|-------------------|
| **Auth** | Magic link email, session management, JWT tokens | None - just config |
| **Database** | Postgres with row-level security | Just schema + policies |
| **REST API** | Auto-generated CRUD for all tables | None |
| **SDKs** | JavaScript + Swift clients | Just import and use |

### Data Flow

- **Supabase Postgres:** Single source of truth for all user data
- **Device local storage:** Cache for offline use and instant UI responsiveness
- **Sync model:** Pull on app open, push immediately on action

---

## Database Schema

```sql
-- Events table (append-only event log per user)
-- Note: Supabase Auth handles users table automatically
CREATE TABLE events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    payload JSONB NOT NULL,
    client_id UUID NOT NULL,
    client_timestamp TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, client_id)  -- Prevents duplicate events
);

-- Indexes for fast queries
CREATE INDEX idx_events_user_created ON events(user_id, created_at);

-- Row Level Security (multi-tenancy in one line)
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can only access their own events"
ON events FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
```

That's it. No users table (Supabase Auth handles it), no sessions table (Supabase handles it), no custom API routes.

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

## Authentication

### Configuration (Supabase Dashboard)

1. Enable "Email" provider
2. Enable "Confirm email" (magic link)
3. Set email template for magic link
4. Configure OTP settings:
   - OTP expiry: 10 minutes
   - OTP length: 6 digits

### Flow (6-Digit Code)

Supabase supports OTP (one-time password) via email out of the box:

```typescript
// Request code
const { error } = await supabase.auth.signInWithOtp({
  email: 'user@example.com',
  options: {
    shouldCreateUser: true,
  }
})

// Verify code
const { data, error } = await supabase.auth.verifyOtp({
  email: 'user@example.com',
  token: '847291',
  type: 'email'
})
// data.session contains access_token, refresh_token
```

### Session Management

| Setting | Value |
|---------|-------|
| JWT expiry | 1 hour (access token) |
| Refresh token | Indefinite, rotates on use |
| Inactivity expiry | 60 days (configurable) |

Supabase SDKs handle token refresh automatically.

---

## Sync Implementation

### Pull (App Opens)

```typescript
// Web (TypeScript)
async function pullEvents() {
  const lastSync = localStorage.getItem('lastSyncTimestamp')

  let query = supabase
    .from('events')
    .select('*')
    .order('created_at', { ascending: true })

  if (lastSync) {
    query = query.gt('created_at', lastSync)
  }

  const { data: events, error } = await query

  if (events?.length) {
    // Append to local event log
    appendLocalEvents(events)

    // Re-derive state
    const state = deriveState(getAllLocalEvents())
    updateUI(state)

    // Update sync timestamp
    const latest = events[events.length - 1].created_at
    localStorage.setItem('lastSyncTimestamp', latest)
  }
}
```

```swift
// iOS (Swift)
func pullEvents() async throws {
    let lastSync = UserDefaults.standard.string(forKey: "lastSyncTimestamp")

    var query = supabase
        .from("events")
        .select()
        .order("created_at")

    if let lastSync {
        query = query.gt("created_at", value: lastSync)
    }

    let events: [TrunkEvent] = try await query.execute().value

    // Merge into local SwiftData cache
    // Re-derive state
    // Update lastSyncTimestamp
}
```

### Push (After Action)

```typescript
// Web (TypeScript)
async function pushEvent(event: TrunkEvent) {
  const user = await supabase.auth.getUser()

  // Save locally first (instant UI)
  appendLocalEvent(event)
  updateUI(deriveState(getAllLocalEvents()))

  // Push to Supabase
  const { error } = await supabase
    .from('events')
    .insert({
      user_id: user.data.user.id,
      type: event.type,
      payload: event.payload,
      client_id: event.clientId,
      client_timestamp: event.timestamp
    })

  if (error && error.code !== '23505') { // 23505 = duplicate (already synced)
    queueForRetry(event)
  }
}
```

### Conflict Handling

Same as before - events are append-only, they merge naturally:

| Scenario | Resolution |
|----------|------------|
| Same event pushed twice | `client_id` UNIQUE constraint rejects duplicate |
| Same sprout watered from two devices | Both events stored; `deriveState()` enforces daily cap |
| Same sprout harvested twice | `deriveState()` checks `if already completed, skip` |

---

## Project Structure Changes

### Web App

```
web/
├── src/
│   ├── lib/
│   │   └── supabase.ts           # NEW: Supabase client init
│   ├── services/
│   │   ├── auth-service.ts       # NEW: Login/logout wrapper
│   │   └── sync-service.ts       # NEW: Pull/push logic
│   ├── ui/
│   │   └── login-view.ts         # NEW: Login UI
│   └── ...existing code
├── .env.local                     # NEW: Supabase URL + anon key
└── ...existing files
```

### iOS App

```
ios/Trunk/
├── Services/
│   ├── SupabaseClient.swift      # NEW: Supabase client init
│   ├── AuthService.swift         # NEW: Login/logout
│   └── SyncService.swift         # NEW: Pull/push
├── Views/
│   └── LoginView.swift           # NEW: Login UI
└── ...existing code
```

### New Dependencies

**Web:**
```json
{
  "dependencies": {
    "@supabase/supabase-js": "^2.x"
  }
}
```

**iOS (Swift Package Manager):**
```
https://github.com/supabase/supabase-swift
```

---

## Migration Path

### Phase 1: Set Up Supabase

1. Create Supabase project
2. Run schema SQL (one table, one policy)
3. Configure auth (enable email OTP)
4. Get project URL + anon key

### Phase 2: Add Auth to Apps

1. Add Supabase SDK to both apps
2. Create login UI (email input + code input)
3. Gate app behind auth check
4. Existing local data still works (no sync yet)

### Phase 3: Add Sync

1. Implement pull on app open
2. Implement push on action
3. Test with fresh account

### Phase 4: Migrate Your Data

1. Log in on web
2. One-time upload: push all localStorage events to Supabase
3. Log in on iOS → data appears
4. Done

---

## Environment Variables

### Web (.env.local)

```bash
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### iOS (Config.xcconfig or Info.plist)

```
SUPABASE_URL = https://xxxxx.supabase.co
SUPABASE_ANON_KEY = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## Cost Estimate

| Resource | Free Tier | Your Usage | Cost |
|----------|-----------|------------|------|
| Database | 500 MB | ~5 MB | $0 |
| Auth | 50,000 MAU | ~10 users | $0 |
| API requests | Unlimited | Minimal | $0 |
| Edge functions | 500K/month | Not using | $0 |

**Total: $0/month** until you have thousands of users.

---

## Security

- **Row Level Security (RLS):** Users can only read/write their own events - enforced at database level
- **Anon key is safe to expose:** It only allows operations permitted by RLS policies
- **Auth tokens:** Handled entirely by Supabase SDK, stored securely
- **HTTPS:** Enforced by Supabase

---

## What We Deleted (vs. Vercel + Neon design)

| Removed | Why |
|---------|-----|
| Custom auth endpoints | Supabase Auth handles it |
| Sessions table | Supabase Auth handles it |
| Users table | Supabase Auth handles it |
| JWT signing code | Supabase SDK handles it |
| Refresh token rotation | Supabase SDK handles it |
| Email sending (Resend) | Supabase sends emails |
| 6 API routes | Supabase auto-generates REST |

**Lines of backend code: ~0** (just SQL schema + RLS policy)

---

## Future Enhancements (Not in Scope)

- **Real-time sync:** Supabase Realtime can push changes to other devices instantly
- **Offline queue:** More robust offline support with background sync
- **Admin dashboard:** Supabase has a built-in table viewer
- **Self-hosting:** Can migrate to self-hosted Supabase if needed

---

## Summary

Supabase gives us:
- **Auth** with magic links / OTP codes
- **Postgres** database with row-level security
- **Auto-generated REST API**
- **SDKs** for web and iOS

We write:
- One SQL table + one RLS policy
- Thin sync service (~100 lines per platform)
- Login UI

That's it.
