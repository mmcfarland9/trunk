# Operations Runbook

## Deployment

### Web App (Static Hosting)

This is a static single-page application. Deploy the `dist/` folder to any static host.

```bash
cd web
npm run build    # Creates dist/ folder
```

**Build output:**
- `dist/index.html` - Entry point
- `dist/assets/` - JS, CSS, images (hashed filenames)

**Hosting options:**
- Netlify (drag-and-drop dist/)
- Vercel (`vercel --prod`)
- GitHub Pages
- Any static file server

### iOS App

Build and distribute via Xcode:
1. Open `ios/Trunk.xcodeproj`
2. Archive (Product > Archive)
3. Distribute via App Store Connect or TestFlight

---

## Data Storage

### Cloud Storage (Supabase)

Primary data storage is **cloud-based** via Supabase for authenticated users:

| Table | Purpose |
|-------|---------|
| `events` | All user events (plants, waters, harvests, etc.) |
| `auth.users` | User accounts (managed by Supabase Auth) |

### Local Cache (localStorage)

Local storage acts as a **cache** for offline support:

| Key | Purpose | Notes |
|-----|---------|-------|
| `trunk-events-v1` | Cached event log | Synced to/from cloud |
| `trunk-last-sync` | Last sync timestamp | For incremental sync |
| `trunk-cache-version` | Cache version | Forces full sync when changed |

### Sync Architecture

- **Cloud is source of truth** - local cache is derived
- **Incremental sync** - only fetches events since last sync
- **Full sync on cache miss** - rebuilds from cloud if cache invalid
- **Offline fallback** - uses cached data if network fails

---

## Common Issues

### Build Failures

**Issue**: TypeScript compilation errors
```bash
npm run build
# error TS2552: Cannot find name 'X'
```

**Solution**:
1. Check for typos in imports
2. Run `npm install` to ensure dependencies
3. Check `tsconfig.json` for path issues

---

**Issue**: Vite build hangs
```bash
npm run build
# Hangs at "transforming..."
```

**Solution**:
1. Clear Vite cache: `rm -rf node_modules/.vite`
2. Reinstall: `rm -rf node_modules && npm install`

---

### Test Failures

**Issue**: Tests pass locally but fail in CI

**Solution**:
1. Check for time-dependent tests (use mocked dates)
2. Verify localStorage mocks in `src/tests/setup.ts`
3. Run `npm run test:coverage` to find untested paths

---

**Issue**: E2E tests timeout

**Solution**:
1. Increase timeout in `playwright.config.ts`
2. Check for missing `await` on async operations
3. Verify dev server is running for local tests

---

### Data Issues

**Issue**: User reports lost data

**Solution**:
1. If user was signed in: data should be in Supabase - check `events` table
2. If anonymous: check if localStorage was cleared (browser settings)
3. Ask user to sign in to recover cloud data
4. Last resort: restore from JSON export if user has one

---

**Issue**: State seems corrupted

**Solution**:
1. Open browser DevTools > Application > Local Storage
2. Check `trunk-events-v1` for valid JSON
3. Clear local cache to force full sync from cloud: remove `trunk-*` keys
4. If cloud data is bad: use "Reset All Data" in Account Settings (requires confirmation)
5. Debug panel (d+b) has additional reset options for development

---

### Sync Issues

**Issue**: Sync indicator shows error

**Solution**:
1. Check network connectivity
2. Verify Supabase project is online
3. Check browser console for specific error
4. Try signing out and back in to refresh auth token

---

**Issue**: Data not syncing between devices

**Solution**:
1. Ensure user is signed in on both devices
2. Check sync indicator status
3. Pull to refresh or reload the app
4. Verify events exist in Supabase `events` table

---

**Issue**: Sync stuck in "syncing" state

**Solution**:
1. Check browser console for network errors
2. Look for Postgres error 23505 (duplicate `client_id`) — these are safe and expected
3. Check `trunk-pending-uploads` in localStorage for stuck items
4. Try clearing `trunk-cache-version` to force a full sync on next load
5. Sign out and back in to refresh auth tokens

---

**Issue**: Duplicate events after sync

**Solution**:
1. Events are deduplicated at multiple levels (server, pull, realtime, derivation)
2. If duplicates appear, force a full sync: clear `trunk-cache-version` from localStorage and reload
3. The `deriveState()` function deduplicates using `client_id` or composite keys, so UI state should remain correct even if the local log has duplicates

---

**Issue**: Pending uploads not clearing

**Solution**:
1. Check `trunk-pending-uploads` in localStorage for the stuck `client_id` values
2. Verify network connectivity and Supabase project status
3. Pending uploads retry automatically on next `smartSync()` call
4. If events are confirmed in the server `events` table, manually clear `trunk-pending-uploads`

---

### Performance Issues

**Issue**: App slow with many sprouts

**Cause**: Event log replay on each state access

**Solution**:
1. Check event log size in localStorage
2. Consider implementing event log compaction (future)
3. Clear completed sprouts if excessive

---

## Rollback Procedures

### Web App Rollback

Static hosting makes rollback simple:

1. **Netlify/Vercel**: Use deploy history in dashboard
2. **Manual**: Re-deploy previous `dist/` folder
3. **Git**: `git checkout <commit> && npm run build`

### Data Rollback

Users can restore from exported JSON:

1. User clicks Import in app
2. Selects previous `trunk{timestamp}.json` backup
3. Confirms replacement of current data

---

## Monitoring

### Client-Side Only

No server-side monitoring needed. Consider:

- Error tracking (Sentry) for production
- Analytics (privacy-respecting) for usage patterns
- Performance monitoring (Web Vitals)

### Health Checks

For static hosting, standard CDN health checks apply.

---

## Support Procedures

### User Data Recovery

1. Ask if user was signed in (email associated with account)
2. If signed in: data should be recoverable from Supabase
3. If anonymous: check browser's localStorage for cached events
4. If they have JSON export, guide them to import
5. Cloud data can be queried in Supabase dashboard (`events` table)

### Bug Reports

1. Ask for browser/OS version
2. Check if reproducible in incognito mode
3. Get localStorage export if possible (sanitized)

---

## Security Considerations

### Environment Variables

- `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are **public** (anon key is safe to expose)
- No server-side secrets in the codebase
- Supabase Row Level Security (RLS) protects user data

### Authentication

- Email OTP via Supabase Auth
- No passwords stored
- Session managed via Supabase client

### localStorage Risks

- Local cache visible to browser extensions
- Cleared with browser data
- Cloud data protected by authentication

### XSS Prevention

- All user input escaped via `escapeHtml()` utility
- No `innerHTML` with raw user data
- Content Security Policy recommended for hosting


---

## Related Documentation

- [CLAUDE.md](../CLAUDE.md) — Codebase guide (system prompt)
- [ARCHITECTURE.md](./ARCHITECTURE.md) — System diagrams, event sourcing, sync architecture
- [ONBOARDING.md](./ONBOARDING.md) — Quick start, common tasks, contributing
- [DATA_MODEL.md](./DATA_MODEL.md) — Entity relationships, event types, storage
- [INTERFACES.md](./INTERFACES.md) — Module APIs, extension points
- [VERSIONING.md](./VERSIONING.md) — Version strategy, release process
