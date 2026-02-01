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

All data is stored **client-side** in localStorage:

| Key | Purpose | Size Concern |
|-----|---------|--------------|
| `trunk-events-v1` | Event log | Grows over time |
| `trunk-notes-v1` | Node data, logs | Medium |
| `trunk-resources-v1` | Resource state | Small |
| `trunk-settings-v1` | User preferences | Small |

**No server-side storage** - users own their data locally.

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
1. Check if localStorage was cleared (browser settings)
2. Ask user to export data regularly (7-day reminder built-in)
3. No server recovery possible - data is local only

---

**Issue**: State seems corrupted

**Solution**:
1. Open browser DevTools > Application > Local Storage
2. Check `trunk-notes-v1` for valid JSON
3. User can clear and re-import from backup
4. Debug panel (d+b) has "Reset" options

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

1. Ask user to check browser's localStorage
2. If they have JSON export, guide them to import
3. If no backup exists, data cannot be recovered

### Bug Reports

1. Ask for browser/OS version
2. Check if reproducible in incognito mode
3. Get localStorage export if possible (sanitized)

---

## Security Considerations

### No Secrets

- No API keys in codebase
- No server-side credentials
- All data is user-controlled

### localStorage Risks

- Data visible to browser extensions
- Cleared with browser data
- No encryption (planned future enhancement)

### XSS Prevention

- All user input escaped via `escapeHtml()` utility
- No `innerHTML` with raw user data
- Content Security Policy recommended for hosting
