# CLAUDE.md

## What This Is

Trunk is a personal growth tracker built around gardening metaphors. Users plant sprouts (goals) on a 64-twig tree, water them daily, reflect weekly via sun, and harvest when complete. Soil capacity grows over a lifetime. Both web and iOS apps are fully implemented with event-sourced sync via Supabase.

---

## Monorepo

```
web/     Vite + TypeScript (vanilla DOM, no framework)
ios/     Swift 5.9+ / SwiftUI (iOS 17+)
shared/  Constants, schemas, formulas, prompts
docs/    Architecture, data model, interfaces, onboarding, runbook
```

**Build (web)** — all commands from `web/`:
```bash
npm run dev            # Vite dev server
npm run build          # tsc + vite build
npm test               # Vitest
npm run test:e2e       # Playwright
npm run generate       # Regenerate constants from shared/
```

**Build (iOS)** — open `ios/Trunk.xcodeproj` in Xcode. Maestro E2E: `ios/.maestro/run-all.sh`.

**Before committing**: `cd web && npx biome format --write src/` — Lefthook pre-commit runs Biome check + `tsc --noEmit`.

---

## Architecture

**Event-sourced**: All state derived by replaying an immutable event log. No mutable stored state. Seven event types:

| Event | Key Fields |
|-------|------------|
| `sprout_planted` | sproutId, twigId, title, season, environment, soilCost, leafId |
| `sprout_watered` | sproutId, content, prompt |
| `sprout_harvested` | sproutId, result (1-5), capacityGained, reflection? |
| `sprout_uprooted` | sproutId, soilReturned |
| `sprout_edited` | sproutId, then any field (sparse merge) |
| `sun_shone` | twigId, twigLabel, content, prompt? |
| `leaf_created` | leafId, twigId, name |

**Derivation**: `web/src/events/derive.ts` / `ios/Trunk/Services/EventDerivation.swift` — sorts events, deduplicates by `client_id`, replays into `DerivedState` (soil, sprouts, leaves, indexed lookups). Both platforms must produce identical results.

**Sync**: Local-first, optimistic push to Supabase `events` table. Incremental pull (by `created_at`), full-sync fallback. Realtime subscription for multi-device. Pending uploads tracked and retried. Dedup via `UNIQUE(client_id)` server-side.

**Web patterns**: `AppContext` carries all DOM refs + feature APIs. Features coordinate via callback objects (`NavCallbacks`), not direct imports. View state is in-memory only. Hash-based routing (`#/branch/3/twig/branch-3-twig-5`) for browser history.

**iOS patterns**: MVVM with `@Observable` ViewModels. `EventStore` is a `@MainActor` singleton with debounced disk writes. `ProgressionViewModel` and `SproutsViewModel` observe store changes.

---

## Key Conventions

**Naming**: Files `kebab-case.ts` (web) / `PascalCase.swift` (iOS). Exports `camelCase`. Constants `UPPER_SNAKE_CASE`. CSS classes `kebab-case` with `.is-*` state modifiers.

**Code style**: 2-space indent (web), strict TypeScript. Biome for formatting + linting. Conventional commits: `feat:`, `fix:`, `refactor:`, `docs:`, `chore:`, `test:`, `perf:`.

**Twig IDs**: Format `branch-{N}-twig-{twigId}` — e.g., `branch-3-twig-branch-3-twig-5`. Parsed by `parseTwigId()` in both platforms.

**Entity IDs**: `sprout-{uuid}`, `leaf-{uuid}` — lowercase prefix-UUID.

**Client IDs**: `{ISO8601}-{random}` — used for event deduplication.

**Export format**: Version 4. Structure: `{ version, exportedAt, events, circles, settings }`.

---

## Non-Obvious Gotchas

**6am reset boundary**: Water resets at 6:00 AM local daily, sun at 6:00 AM Monday. Streak calculation uses 6am-to-6am days, not midnight. If `hour < 6`, reset time is yesterday/last week.

**Generated constants**: `shared/constants.json` → `web/src/generated/constants.ts` + `ios/Trunk/Generated/SharedConstants.swift`. Run `node shared/generate-constants.js` after editing. Generated files are checked in.

**soilCost is Double**: Not Int. Fractional values are valid. `DataExportService` uses `Double?` for `soilCost` and `soilReturned`.

**Wind seeding must match**: Branch seed = `97 + index * 41`, twig seed = `131 + branchIndex * 71 + twigIndex * 17`. Both platforms use `sin(seed * salt) * 43758.5453` fractional part. Radar chart vertices derive from animated branch positions (coupled to wind).

**Guard-let on iOS**: `EventDerivation` skips malformed events via `guard let` instead of defaulting to empty/zero. Intentional — prevents bad data from corrupting state.

**Concurrent sync guard**: Web reuses a single `currentSyncPromise`. iOS checks `syncStatus != .syncing`. Don't bypass these.

**Supabase is optional**: Both platforms handle null client gracefully. App works local-only without credentials.

**E2E test user**: `test@trunk.michaelpmcfarland.com` — web uses `?e2e` URL param, iOS uses edge function `e2e-login`. Seed data: `scripts/seed-test-user.mjs`.

---

## Documentation Index

| Document | Covers |
|----------|--------|
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | System diagrams, module graph, sync flow, callback patterns |
| [docs/DATA_MODEL.md](docs/DATA_MODEL.md) | Event schemas, DerivedState shape, storage keys, enums |
| [docs/INTERFACES.md](docs/INTERFACES.md) | Module APIs for both platforms |
| [docs/ONBOARDING.md](docs/ONBOARDING.md) | Quick start, common tasks, gotchas |
| [docs/RUNBOOK.md](docs/RUNBOOK.md) | Deployment, troubleshooting |
| [docs/VERSIONING.md](docs/VERSIONING.md) | Semver strategy, release process |
| [shared/formulas.md](shared/formulas.md) | Soil economy: costs, rewards, diminishing returns |
| [shared/sync-protocol.md](shared/sync-protocol.md) | Sync protocol specification |
