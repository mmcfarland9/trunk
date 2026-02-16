# Refactor Log

Refactoring session based on [CODEBASE_REVIEW.md](CODEBASE_REVIEW.md) findings.
All changes are behavior-preserving unless noted as bug fixes.

**Final verification**: 21 test files, 349 tests passing. Build produces 76 modules, 276.48 kB bundle (gzip: 74.40 kB).

---

## Addressed Items (19 of 43)

### Critical (1/1)

| ID | Item | Commit | Owner |
|----|------|--------|-------|
| C1 | Fix weekly reset day (Sunday to Monday) | `13589ba` | events-lead |

Fixed `calculations.ts` to use Monday 6:00 AM as the weekly boundary, matching the spec in `shared/formulas.md` and `derive.ts`. Added regression tests pinning the expected reset day.

### High (4/6)

| ID | Item | Commit | Owner |
|----|------|--------|-------|
| H1 | Delete dead sprout-card.ts and sprout-form.ts | `9e8fd5b` | ui-lead |
| H2 | Add time-based cache invalidation for water/sun | `cd6f34d` | events-lead |
| H3 | Add sync payload validation | `0ea894c` | services-lead |
| H4 | Remove dead editor module | `b45d51e` | ui-lead |

**H1**: Deleted 4 files (557 lines) — extracted modules that were never imported by production code, plus their test files.

**H2**: Added `cachedAt` timestamp comparison against the next reset boundary before returning cached resource values.

**H3**: Added `isValidTrunkEvent()` validation in `sync-types.ts`, applied before merging incoming sync payloads into the local event log.

**H4**: Deleted `editor.ts` (152 lines), removed `EditorApi` type, `editor` field from `AppContext`, `buildEditor` usage from `main.ts`, `editor.reposition()` from `layout.ts`, `ctx.editor.close()`/`open()` from `navigation.ts`, and unused `EDITOR_OPEN_DELAY` constant.

### Medium (11/18)

| ID | Item | Commit | Owner |
|----|------|--------|-------|
| M4 | Add event validation on load | `3eaf866` | events-lead |
| M5 | Add base case to getRandomPrompt recursion | `646ca45` | features-lead |
| M7 | Clean console.log in production code | `a1029b4`, `d07c0ac` | ui-lead, services-lead |
| M9 | Make event store initialization explicit | `e257eab`, `e150f53` | events-lead, ui-lead |
| M11 | Clean unused underscore-prefixed params | `76583b2` | features-lead |
| M12 | Cache numeric positions for wind animation | `c342f3a` | ui-lead |
| M15 | Capture getState() once in sidebar update | `224cb26` | features-lead |
| M16 | Precompile regex in presets.ts | `9c806b3` | features-lead |
| M18 | Replace hardcoded 8 with constants | `db78269`, `c2845c7` | ui-lead, features-lead |

**M4**: Added `validateEvent()` function in `store.ts` that checks required fields (`type`, `timestamp`, `id`). Invalid events are logged and skipped rather than crashing.

**M7**: Converted `console.log` to `console.info` in `main.ts` and `sync-service.ts`. No debug artifacts were found — all calls were intentional diagnostic logging.

**M9**: Two-part change: events-lead removed the module-level `initEventStore()` call from `store.ts`; ui-lead added an explicit `initEventStore()` call in `main.ts` before any state derivation.

**M12**: Added `positionCache` and `twigRadiusCache` Maps populated in `positionNodes()`, read in `applyWind()` via `getBase()`/`getTwigRadius()`. Eliminates ~30,000 parseFloat operations per second during 60fps animation.

### Low (4/18)

| ID | Item | Commit | Owner |
|----|------|--------|-------|
| L2 | DerivedSprout mutation comment | `0d795c0` | events-lead |
| L3 | Division by zero guard in soil meter | `9034bad` | ui-lead |
| L9 | Extract magic numbers in layout.ts | `db78269` | ui-lead |
| L10 | Remove orphaned settings dialog DOM | `6186fd5` | ui-lead |
| L12 | Deduplicate timestamp formatters | `1766925` | features-lead |

**L9**: Extracted layout radii, bloom caps, wind parameters, and line spacing to named constants. `Math.PI / 4` replaced with `BRANCH_ANGLE_STEP` derived from `BRANCH_COUNT`.

**L10**: Removed settings dialog construction (103 lines) from `dom-builder.ts` and 9 type fields from `AppElements`. The account dialog has fully replaced this functionality.

---

## Not Addressed (24 items)

### High (2)

| ID | Item | Reason |
|----|------|--------|
| H5 | Event log size limit / compaction | Large effort, architectural design needed. Multi-decade runway before hitting localStorage limits at normal usage. |
| H6 | Low unit test coverage (~20%) | Large effort, not scoped to this refactoring session. Critical paths (events, derivation) are well-tested. |

### Medium (7)

| ID | Item | Reason |
|----|------|--------|
| M1 | dom-builder.ts size (736 lines) | Large effort. Incremental extraction recommended (one dialog per PR). |
| M2 | twig-view.ts size (887 lines) | Large effort. Dead extraction modules removed (H1); full extraction deferred. |
| M3 | Mixed concerns in log-dialogs.ts | Moderate effort, deferred to separate PR. |
| M6 | getPresetLabel returns undefined | Not assigned to any teammate this session. |
| M8 | Non-null assertions in DOM builder | Better solved by integration test (as review noted). |
| M10 | Redundant event log replays in dialogs | Only on dialog open, not hot path. Deferred to compaction strategy (H5). |
| M13 | twig-view rebuilds all listeners | Moderate effort, event delegation refactor deferred. |
| M14 | derive.ts mixed concerns (469 lines) | Within acceptable range per review. No action unless it grows past 600 lines. |
| M17 | Auth initialization race condition | Self-correcting via listener. Low urgency. |

### Low (14)

| ID | Item | Reason |
|----|------|--------|
| L1 | Event dedup by timestamp only | Near-zero collision probability for single-user. |
| L4 | No default case in deriveState switch | Standard event-sourcing practice (ignore unknown types). |
| L5 | Client ID hash collision | Handled by Supabase uniqueness constraints. |
| L6 | preventDoubleClick timer without cleanup | SPA, components never unmount. |
| L7 | escapeHTML uses DOM (not SSR-safe) | Browser-only app by design. |
| L8 | Layout.ts compressed variable names | Standard geometry naming (cx, cy, r, a). |
| L11 | Inconsistent error handling patterns | Intentional: storage = silent fallback, sync = surfaced. |
| L13 | Redundant Date objects in time checks | Micro-optimization, not worth the churn. |
| L14 | generateTwigLineCandidates O(n^3) | n=8, bounded at 512 iterations. |
| L15 | saveEvents serializes full array | Acceptable until compaction (H5) is implemented. |
| L16 | Facade re-exports in state/index.ts | Valid convenience pattern, no circular deps. |
| L17 | Cross-layer feature/UI dependencies | Acceptable in vanilla TS without a framework. |
| L18 | AppElements flat object (~95 fields) | TypeScript structural typing prevents runtime coupling. |

---

## Remaining Cleanup

- `web/src/styles/editor.css` is now orphaned (imported by `styles/index.css` but no TS code references its classes). Can be removed in a follow-up.
