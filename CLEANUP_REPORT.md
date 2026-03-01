# Cleanup Report

> Full codebase audit: dead code, stale docs, config cruft. Report only — nothing modified.
>
> Generated February 28, 2026.

---

## 1. Dead Code

### Web (TypeScript/CSS/HTML)

**Overall: Very clean.** TypeScript strict mode + Biome keep it tight.

#### Truly Dead Code (4 items, ~20 lines)

| File | Line | Item | Why Dead |
|------|------|------|----------|
| `web/src/events/store.ts` | 340 | `startVisibilityCacheInvalidation()` | Exported, re-exported via `events/index.ts:65`, never called anywhere |
| `web/src/generated/constants.ts` | 313 | `EventType` type | Defined, never used |
| `web/src/generated/constants.ts` | 337-340 | `ChartBucketConfig` type | Only used by `CHART_BUCKETS` (also dead) |
| `web/src/generated/constants.ts` | 342-350 | `CHART_BUCKETS` constant | Defined, never imported or used |

#### Test-Only Production File (1 file, ~196 lines)

| File | Lines | Item | Why Flagged |
|------|-------|------|-------------|
| `web/src/utils/validate-import.ts` | 196 | `validateSprout`, `validateLeaf`, `sanitizeSprout`, `sanitizeLeaf` | Only imported by test files, never by production code. Should live in `tests/` |

#### Unused Barrel Re-exports (12 symbols, ~14 lines)

`events/index.ts` re-exports these but no production module imports them (tests only):
- Types: `SproutUprootedEvent`, `SunShoneEvent`, `LeafCreatedEvent`
- Functions: `deriveState`, `deriveWaterAvailable`, `deriveSunAvailable`, `wasSproutWateredThisWeek`, `wasSproutWateredToday`, `deriveWateringStreak`
- Type: `WateringStreak`

`state/index.ts` re-exports but only tests consume:
- `getActiveNode`, `setActiveNode`

#### Unnecessary `export` Keywords (3 items)

Functions exported but only called within their own file:
- `ui/twig-view/sprout-cards.ts:19` — `getDaysRemaining()`
- `ui/node-ui.ts:145` — `getNodePlaceholder()`
- `ui/progress-panel.ts:121` — `createStackedLeafCard()`

#### Clean Areas (no issues)

- Dead CSS selectors: 0 / 404 checked
- Unused HTML elements: 0
- Unused assets: 0
- Dead internal functions: 0
- Unused imports: 0 (tsc strict catches these)
- Orphaned source files: 0

**Web total removable: ~34 lines dead code + 196 lines to relocate**

---

### iOS (Swift)

#### Entire Dead File (1 file, 84 lines)

| File | Lines | Why Dead |
|------|-------|----------|
| `ios/Trunk/Utils/ErrorCodes.swift` | 84 | `ErrorInfo`, `ErrorCodes` class, 3 methods — never called from any code. References non-existent `error-codes.json` bundle resource |

#### Unreachable Views (2 structs, ~116 lines)

| File | Lines | Item | Why Dead |
|------|-------|------|----------|
| `ios/Trunk/Views/OverviewView.swift` | 232-283 | `ActiveSproutsSection` | Never instantiated in any view body |
| `ios/Trunk/Views/OverviewView.swift` | 286-349 | `ActiveSproutRow` | Only used inside `ActiveSproutsSection` (itself dead) |

#### Unused Functions (3 items, ~14 lines)

| File | Line | Item | Why Dead |
|------|------|------|----------|
| `ios/Trunk/Services/SyncEvent.swift` | 21-27 | `TrunkEventType.isValid(_:)` | Never called anywhere |
| `ios/Trunk/Services/EventDerivation.swift` | 511-513 | `contextLabel(for:)` | Test-only, never called in production |
| `ios/Trunk/Services/EventDerivation.swift` | 484-487 | `getCompletedSprouts(from:)` | Test-only, never called in production |

#### Unused Properties (4 items, ~17 lines)

| File | Line | Item | Why Dead |
|------|------|------|----------|
| `ios/Trunk/Services/EventDerivation.swift` | 40-48 | `SproutEnvironment.sproutDescription` | Never read in production, test-only |
| `ios/Trunk/ViewModels/ProgressionViewModel.swift` | 23 | `wateringStreak` | Written to but never read by any view |
| `ios/Trunk/ViewModels/ProgressionViewModel.swift` | 24 | `longestWateringStreak` | Written to but never read by any view |
| `ios/Trunk/Services/SyncEvent.swift` | 100-103 | `JSONValue.boolValue` | Defined but never accessed |

#### Unused Convenience Initializers (4 items, 4 lines)

| File | Lines | Items |
|------|-------|-------|
| `ios/Trunk/Services/SyncEvent.swift` | 75-78 | `JSONValue.init(_ value: String/Int/Double/Bool)` — all 4 never called. Code uses `ExpressibleBy*Literal` conformances instead |

#### Test-Only Production File (flagged, ~186 lines)

| File | Lines | Why Flagged |
|------|-------|-------------|
| `ios/Trunk/Services/DataExportService.swift` | 186 | `TrunkEvent` struct + factories, export/import service — never called from any view or service. Only used in tests. Likely a pre-built feature not yet wired to UI |

#### Clean Areas (no issues)

- Storyboard/XIB remnants: 0 (pure SwiftUI)
- Unused assets: 0 (only AppIcon + AccentColor)
- Redundant imports: 0
- Unused extensions: 0
- All animation presets and view modifiers actively used

**iOS total removable: ~235 lines confirmed dead + 186 lines test-only (flagged)**

---

## 2. Markdown Files

65 `.md` files audited. **20 KEEP, 5 UPDATE, 40 DELETE.**

### KEEP (20 files)

| File | Rationale |
|------|-----------|
| `CLAUDE.md` | Primary onboarding doc, loaded into context system |
| `BUGS.md` | Active issue tracker, 9 deferred items open |
| `IDEAS.md` | Forward-looking feature catalog |
| `SUMMARY.md` | Canonical Feb 2026 arc summary |
| `docs/ARCHITECTURE.md` | Recently updated, accurate module graph |
| `docs/INTERFACES.md` | Recently updated with Radar/Soil Charting APIs |
| `docs/ONBOARDING.md` | Comprehensive, recently updated |
| `docs/RUNBOOK.md` | Operations reference, accurate |
| `docs/VERSIONING.md` | Versioning strategy, accurate |
| `docs/archive/future-ideas-archive.md` | Creative Flowerdex concept, properly archived |
| `docs/archive/plans/event-log-compaction.md` | Implementation not started, actively referenced by BUGS.md #9 |
| `shared/formulas.md` | Source of truth for progression math |
| `shared/protocols.md` | Timestamp/ID standards |
| `shared/sync-protocol.md` | Comprehensive sync spec |
| `web/README.md` | Standard project README |
| `web/CHANGELOG.md` | Active changelog |
| `ios/CHANGELOG.md` | Active changelog |
| `README.md` | Repo root README (needs link fix — see UPDATE) |
| `docs/DATA_MODEL.md` | Entity reference (needs sprout_edited — see UPDATE) |
| `ios/README.md` | iOS README (needs stale ref fix — see UPDATE) |

### UPDATE (5 files)

| File | What Needs Changing |
|------|---------------------|
| `README.md` | Line 67: `docs/plans/` link should be `docs/archive/plans/` |
| `docs/DATA_MODEL.md` | Missing `sprout_edited` event type in Event Types table |
| `shared/README.md` | References deleted `assets/trunk-map-preset.json` — remove section |
| `ios/README.md` | Line 119: references deleted `assets/trunk-map-preset.json` — remove reference |
| `web/.reports/dead-code-analysis.md` | Stale paths and resolved findings — recommend DELETE instead |

### DELETE (40 files)

**Root-level (4 files):**

| File | Lines | Rationale |
|------|-------|-----------|
| `ROADMAP.md` | 319 | All items executed except compaction (tracked in BUGS.md #9). Served its purpose |
| `STATE_OF_THE_CODE.md` | 298 | Feb 27 diagnostic — every finding fixed or tracked in BUGS.md. Multiple "open" items now resolved |
| `CLEANUP.md` | 169 | All 15 items completed including the 2 HARD deferred ones. 100% done |
| `TEST_AUDIT.md` | 232 | Feb 22 snapshot with outdated metrics. SUMMARY.md has authoritative numbers |

**docs/archive/ (8 files):**

| File | Lines | Rationale |
|------|-------|-----------|
| `PROPOSAL.md` | 740 | 75-finding audit fully addressed. SUMMARY.md covers the arc |
| `CODEBASE_REVIEW.md` | — | Feb 6 review superseded by PROPOSAL.md then SUMMARY.md |
| `CONTRIB.md` | — | Duplicates ONBOARDING.md with less detail |
| `IMPLEMENTATION_PLAN.md` | — | Feb 15 plan fully executed |
| `REFACTOR_LOG.md` | — | Completed work captured in CHANGELOGs |
| `SYNC.md` | 50 | Superseded by `shared/sync-protocol.md` (836 lines) |
| `ARRAY_BOUNDS_AUDIT_SYNC_SERVICE.md` | — | One-off audit on since-refactored code |
| `swiftui_best_practices.md` | — | Generic reference, not project-specific |

**docs/archive/plans/ (34 files):**

All fully executed implementation plans (dates 2026-01-16 through 2026-02-14). Outcomes captured in SUMMARY.md and CHANGELOGs. Exception: `event-log-compaction.md` (KEEP).

**shared/ (1 file):**

| File | Lines | Rationale |
|------|-------|-----------|
| `shared/test-fixtures/FIELD_AUDIT.md` | 239 | All gaps fixed (BUGS.md #2,3,4,5,8,13,14,18). Maximal events in field-coverage.json |

**web/ (1 file):**

| File | Lines | Rationale |
|------|-------|-----------|
| `web/.reports/dead-code-analysis.md` | — | Feb 6 report, stale paths, resolved findings |

---

## 3. Config & Build Cruft

### Stale Config Entries (4 items)

| File | Line | Entry | Issue |
|------|------|-------|-------|
| `web/tsconfig.json` | 27-28 | `paths: { "@shared/*" }` | Path alias never used in any import. Vitest alias also unused |
| `web/tsconfig.json` | 4 | `useDefineForClassFields: true` | No classes exist in the codebase |
| `web/biome.json` | 33 | `useNodejsImportProtocol: "warn"` | Browser app — zero Node.js imports. Rule has no effect |
| `web/stryker.config.mjs` | 29 | `mutate` excludes `vite-env.d.ts` | File doesn't exist |

### Security Concern (1 item)

| File | Line | Issue |
|------|------|-------|
| `web/.env.local` | 3 | `SUPABASE_SERVICE_ROLE_KEY` — never referenced in code, not `VITE_`-prefixed. Service role key grants admin access and should not be in a web client .env file |

### Stale .gitignore Entries (2 items)

| File | Line | Entry | Issue |
|------|------|-------|-------|
| `.gitignore` | 16 | `.venv` | No Python in this repo |
| `.gitignore` | 29 | `ramblings.txt.worktrees/` | One-off entry, nothing by this name exists |

### Test Fixture Misplacement (1 item)

| File | Lines | Issue |
|------|-------|-------|
| `shared/test-fixtures/FIELD_AUDIT.md` | 239 | Markdown doc in test-fixtures directory — not a fixture, never imported by tests |

### Generated Files (1 concern)

`web/src/generated/constants.ts` and `ios/Trunk/Generated/SharedConstants.swift` are committed but not in `.gitignore`. Could drift from `shared/constants.json` if someone forgets `npm run generate`.

### Clean Areas

- All npm dependencies actively used (0 unused)
- All iOS SPM dependencies actively used (0 unused)
- All package.json scripts functional and referenced
- `.env.example` entries all consumed
- `.mcp.json` uses env var substitution (no hardcoded tokens)
- No unused build scripts

---

## Summary

| Category | Removable |
|----------|-----------|
| Web dead code | ~34 lines + 196 lines to relocate |
| iOS dead code | ~235 lines + 186 lines flagged (test-only) |
| Markdown files to delete | 40 files (~2,000+ lines) |
| Config entries to clean | 4 stale entries |
| Security item | 1 (service role key in .env.local) |
| **Total estimated removable** | **~2,500+ lines across ~50 files** |
