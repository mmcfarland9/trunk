# Onboarding Guide

## Quick Start

### Web App
```bash
cd web
npm install
npm run dev    # http://localhost:5173
```

### iOS App
```bash
cd ios
open Trunk.xcodeproj  # Build with Cmd+R in Xcode
```

### Run Tests
```bash
cd web
npm test              # Unit tests (Vitest)
npm run test:e2e      # E2E tests (Playwright)
```

---

## Available Scripts

All scripts run from `web/` directory:

| Script | Command | Description |
|--------|---------|-------------|
| **generate** | `npm run generate` | Regenerate constants from shared/constants.json |
| **dev** | `npm run dev` | Start Vite development server with HMR |
| **build** | `npm run build` | TypeScript compile + production build |
| **preview** | `npm run preview` | Preview production build locally |
| **test** | `npm test` | Run unit tests (Vitest) |
| **test:watch** | `npm run test:watch` | Run tests in watch mode |
| **test:coverage** | `npm run test:coverage` | Run tests with coverage report |
| **test:e2e** | `npm run test:e2e` | Run E2E tests (Playwright) |
| **test:mutation** | `npm run test:mutation` | Run mutation tests (Stryker) |
| **lint** | `npm run lint` | Run Biome linter on src/ |
| **lint:fix** | `npm run lint:fix` | Auto-fix lint issues |
| **format** | `npm run format` | Format code with Biome |
| **format:check** | `npm run format:check` | Check formatting without writing |
| **check** | `npm run check` | Run all Biome checks (lint + format) |
| **check:fix** | `npm run check:fix` | Auto-fix all Biome issues |

---

## Project Layout Cheat Sheet

| Path | What's There |
|------|--------------|
| `web/src/main.ts` | Web entry point |
| `web/src/events/` | Event sourcing (state management) |
| `web/src/features/` | Business logic modules |
| `web/src/ui/` | DOM rendering |
| `ios/Trunk/` | iOS source |
| `shared/constants.json` | All magic numbers |
| `shared/formulas.md` | Progression math |
| `CLAUDE.md` | Detailed codebase guide |

---

## MCP Setup

To enable Claude Code integration with Supabase via MCP (Model Context Protocol):

1. **Copy the example configuration:**
   ```bash
   cp .mcp.example.json .mcp.json
   ```

2. **Get your Supabase credentials:**
   - Log into the [Supabase console](https://supabase.com/dashboard)
   - Navigate to your project settings
   - Copy your **Project Reference ID** (found in Project Settings → General)
   - Generate an **Access Token** (found in Project Settings → API → Service Role Key or create a new one)

3. **Fill in the values in `.mcp.json`:**
   - Replace `YOUR_PROJECT_REF` with your project reference ID
   - Replace `YOUR_ACCESS_TOKEN_HERE` with your access token

**Important:** `.mcp.json` is already in `.gitignore` and will not be committed. Never commit actual credentials to version control.

---

## Environment Variables

Copy `.env.example` to `.env` for local development with cloud sync:

```bash
cp .env.example .env
# Edit .env with your Supabase credentials
```

| Variable | Purpose | Required |
|----------|---------|----------|
| `VITE_SUPABASE_URL` | Supabase project URL | For cloud sync |
| `VITE_SUPABASE_ANON_KEY` | Supabase anonymous key | For cloud sync |

**Note**: The app works offline without these variables — cloud sync is optional.

Additional configuration lives in:
- `shared/constants.json` — Application constants (run `npm run generate` after changes)
- `vite.config.ts` — Build configuration
- `tsconfig.json` — TypeScript settings

---

## Common Tasks

### Adding a New Feature

1. **Business logic** → `web/src/features/new-feature.ts`
2. **UI components** → `web/src/ui/` (if needed)
3. **Wire it up** → `web/src/bootstrap/ui.ts` (call setup function)
4. **Add tests** → `web/src/tests/new-feature.test.ts`

### Adding a New Event Type

1. Define type in `web/src/events/types.ts`
2. Add handler in `web/src/events/derive.ts`
3. Add to `shared/constants.json` → `eventTypes` array, then run `npm run generate` from `web/`
4. Add schema in `shared/schemas/events.schema.json`
5. Add test fixtures in `shared/test-fixtures/`

### Adding a Sync Operation

1. Add the new function in `web/src/services/sync/operations.ts`
2. Export it from `web/src/services/sync/index.ts`
3. Wire it into the bootstrap in `web/src/bootstrap/sync.ts`
4. Add corresponding iOS implementation in `ios/Trunk/Services/Sync/SyncOperations.swift`

### Adding a Twig View Component

1. Create a new file in `web/src/ui/twig-view/` (e.g., `my-component.ts`)
2. Import and use it from `web/src/ui/twig-view/index.ts`
3. Follow the callback pattern — receive callbacks, don't import features directly

### Adding a Bootstrap Step

1. Determine which bootstrap phase it belongs to: `auth.ts`, `events.ts`, `sync.ts`, or `ui.ts`
2. Add the initialization logic to the appropriate file in `web/src/bootstrap/`
3. If it requires a new module, create the module first, then wire it in the bootstrap

### Modifying Progression Formulas

1. Update math in `shared/formulas.md` (source of truth)
2. Update `shared/constants.json` if values change
3. Update `web/src/events/derive.ts` (web implementation)
4. Update `ios/Trunk/Services/ProgressionService.swift` (iOS)
5. Run cross-platform parity tests

### Adding a Dialog/Modal

1. Create `web/src/features/new-dialog.ts`
2. Add styles to `web/src/styles/dialogs.css`
3. Add DOM structure in `web/src/ui/dom-builder/build-dialogs.ts`
4. Wire callbacks in `web/src/bootstrap/ui.ts`

### Running Tests

**Unit tests:**
```bash
cd web
npm test                    # Run all tests once
npm run test:watch          # Watch mode
npm run test:coverage       # With coverage report (target: 80%+)
```

**E2E tests:**
```bash
cd web
npx playwright install      # First time only
npm run test:e2e            # Run all E2E tests
npm run test:e2e -- --ui    # Interactive mode
```

**E2E test details:**

E2E tests live in `web/e2e/` and cover critical user flows:
- Navigation between views (overview → branch → twig)
- Sprout lifecycle (plant, water, harvest, uproot)
- Resource management (soil spending, water/sun usage)
- Import/export functionality
- Authentication flows

To write a new E2E test:
1. Add a spec file in `web/e2e/` (e.g., `my-feature.spec.ts`)
2. Use Playwright's `test` and `expect` from `@playwright/test`
3. Tests run against `http://localhost:5173` — start dev server first with `npm run dev`
4. Run with `npm run test:e2e -- --ui` for interactive debugging

**Mutation tests:**
```bash
cd web
npm run test:mutation       # Verify test quality
```

### Generated Constants Pipeline

Shared constants are defined in `shared/constants.json` and transformed into platform-specific code:

```bash
npm run generate    # from web/ directory
```

This runs `shared/generate-constants.js`, which outputs:
- `web/src/generated/constants.ts` — TypeScript constants, validation sets, and prompt arrays
- `ios/Trunk/Generated/SharedConstants.swift` — Swift constants mirroring web values

Always run `npm run generate` after modifying `shared/constants.json`.

### Debugging State Issues

1. Press `d` then `b` (within 500ms) → Debug panel
2. Check localStorage: `trunk-events-v1` (event log)
3. Use "Advance clock" to test time-based logic
4. Check `web/src/events/derive.ts` for derivation bugs

### Finding Where Something Lives

| Looking for... | Check... |
|----------------|----------|
| Magic numbers | `shared/constants.json` |
| Type definitions | `web/src/types.ts` |
| DOM element refs | `web/src/ui/dom-builder/index.ts` |
| CSS variables | `web/src/styles/base.css` (`:root` block) |
| State getters | `web/src/events/index.ts` |
| Node positioning | `web/src/ui/layout.ts` |
| Keyboard shortcuts | `web/src/bootstrap/events.ts` (search "keydown") |

---

## Key Patterns

### AppContext Object
Most functions receive `ctx` with all shared references:
```typescript
function doSomething(ctx: AppContext) {
  ctx.elements.sidePanel  // DOM elements
  ctx.nodeLookup        // Map<nodeId, element>
  ctx.twigView          // Twig panel API
}
```

### CSS State Classes
- `.is-active` — selected/active state
- `.is-hovered` — hover state
- `.is-ready` — sprout ready to harvest
- `.hidden` — display: none

### View Mode Classes (on `.canvas`)
- `.is-overview` — all branches visible
- `.is-branch` — zoomed to one branch
- `.is-twig` — twig panel open

---

## Gotchas

| Issue | Cause | Solution |
|-------|-------|----------|
| State not persisting | Event not appended | Use `appendEvent()` — state persists automatically |
| Resources seem wrong | Derived from logs | Check event log, not counters |
| CSS not applying | Wrong specificity | Check view mode class context |
| Node not found | Wrong ID format | Use `branch-{b}-twig-{t}` |
| Tests failing | Stale fixtures | Regenerate from `shared/test-fixtures/` |

---

## Commit Guidelines

Use [Conventional Commits](https://www.conventionalcommits.org/):

| Prefix | Use For |
|--------|---------|
| `feat:` | New features |
| `fix:` | Bug fixes |
| `docs:` | Documentation changes |
| `refactor:` | Code restructuring |
| `test:` | Test additions/changes |
| `chore:` | Build/tooling changes |

Example: `feat: add harvest dialog animation`

---

## Related Documentation

- [CLAUDE.md](../CLAUDE.md) — Codebase guide (system prompt)
- [ARCHITECTURE.md](./ARCHITECTURE.md) — System diagrams, event sourcing, sync architecture
- [DATA_MODEL.md](./DATA_MODEL.md) — Entity relationships, event types, storage
- [INTERFACES.md](./INTERFACES.md) — Module APIs, extension points
- [RUNBOOK.md](./RUNBOOK.md) — Deployment, common issues
- [VERSIONING.md](./VERSIONING.md) — Version strategy, release process
