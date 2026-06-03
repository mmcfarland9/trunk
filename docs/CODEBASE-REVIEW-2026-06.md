# Trunk — Codebase Review & Improvement Plan

**Date:** 2026-06-01
**Reviewer:** Claude (Opus 4.8), full-system pass
**Scope:** `web/` (Vite + TS, vanilla DOM), `ios/` (SwiftUI), `shared/` (constants, schemas, fixtures), build/CI, sync, security surface
**Method:** Read the architecture doc and the event-sourcing core on both platforms; measured the production bundle; traced the mirrored-logic modules, the render model, dead code, and the security surface. Findings cite `file:line` where applicable.

---

## TL;DR — overall health: **strong**

This is a well-built, disciplined codebase. Small focused files, a real test culture on web (83 test files + Stryker mutation testing), a clean event-sourced core, a lean runtime (one production dependency, lazy-split Supabase SDK, 45 KB gzip main bundle, 165 ms build), and a genuine cross-platform DRY mechanism for constants. The improvements below are **refinements to a healthy system**, not rescue work.

The single most important theme: **the business logic isn't shared — it's hand-reimplemented in two languages with two *different architectures*, kept aligned only by fixture tests that run on web CI only.** Everything in the "Parity & Maintainability" and "Testing & CI" sections orbits that one fact.

### Start here (highest value first)

| ID | Finding | Theme | Severity | Effort |
|----|---------|-------|----------|--------|
| **SC-1** | 🟡 RLS **confirmed enabled** on `events` (dashboard, 2026-06-03). Remaining: confirm policies scope to `auth.uid() = user_id` with no permissive `anon` policy | Security | ~~P0~~→P2 | S |
| **SC-2** | Backend (DB schema, RLS, edge functions) is **not in the repo** — can't review, version, or roll back | Security / Maint | **P0** | M |
| **TC-1** | **No iOS CI** → 🟡 workflow drafted (`ios-ci.yml`); **131 tests green locally**, pending first GitHub run | Testing | **P1** | M |
| **PM-1** | 🟡 Expand parity fixtures to cover the divergent code — **radar + streak done** (web verified, iOS pending CI); soil-history found to **diverge by construction** (see §1) → feeds PM-2 | Parity | **P1** | M |
| **CL-1** | iOS streak: consolidate the duplicate routine + add the missing streak test (the other "dead" `derive*` fns are parity-test entry points — keep them) | Cleanup / Test | **P3** | M |
| **PM-2** | Decide & document the derivation-architecture stance (converge vs. deliberately diverge) | Parity | **P2** | S (decision) |
| **CL-2** | Fix stale Biome ignore path (generated files are currently being linted/formatted) — ✅ **done 2026-06-01** | Cleanup | **P2** | S |
| **CL-3** | Retire the legacy `Sprout` type + `toSprout()` adapter; let the UI consume `DerivedSprout` | Cleanup | **P2** | M |
| **PF-1** | Self-host / subset the 3 render-blocking Google Font families | Perf | **P2** | S |
| **PM-3** | Generate the iOS event-type enum (kill 19 hand-typed string literals) | Parity | **P2** | S |
| **PF-2** | Give iOS `DerivedState` the same O(1) indexes web has | Perf / Parity | **P3** | S |
| **CL-4** | Split `twig-view.css` (886 lines) | Cleanup | **P3** | S |
| **TC-2** | Extract iOS form-view logic into ViewModels for testability (carried from Mar-2026 audit) | Testing | **P3** | M |

**Severity:** P0 = correctness/security risk · P1 = high leverage · P2 = worthwhile · P3 = polish
**Effort:** S = <½ day · M = ½–2 days · L = multi-day

---

## 1. Cross-Platform Parity & Maintainability *(primary focus)*

The defining cost of this system is that **`derive.ts` (647 lines, TS) and `EventDerivation.swift` (863 lines, Swift) are two hand-maintained implementations of the same rules** — and they've drifted apart *structurally*, not just syntactically.

### PM-1 — Parity is only enforced on the overlap, on one platform *(P1, M)*

The two engines compute different shapes:

| | Web (`derive.ts` + helpers) | iOS (`EventDerivation.swift`) |
|---|---|---|
| Core entities (sprouts/leaves/seedlings/sun/soil) | `deriveState()` | `deriveState()` |
| Water / sun / streak | separate fns (`deriveWaterAvailable`, `deriveWateringStreak`…), cached in `store.ts` | **folded inline** into `deriveState()` single pass |
| Radar scores | separate module `radar-charting.ts` (`computeBranchEngagement`) | **folded inline** into `deriveState()` |
| Soil history | separate module `soil-charting.ts` (`computeRawSoilHistory`) | **folded inline** into `deriveState()` |
| O(1) lookup indexes | `activeSproutsByTwig`, `sproutsByTwig`, `sproutsByLeaf`, `leavesByTwig` | **none** — uses `.values.filter` per lookup |

Both produce correct results today, but **the only thing keeping them in sync is the parity fixtures in `shared/test-fixtures/`** — and those primarily assert the *core entity* state. The radar and soil-history computations — the parts most likely to drift, because they live in totally different places on each platform — are the least covered cross-platform.

**Recommendation:** Extend `derivation-parity.json` / `cross-platform-validation.json` so each fixture asserts the **complete** derived surface: `soilAvailable`, `soilCapacity`, `waterAvailable`, `sunAvailable`, `wateringStreak`, **`radarScores`**, and bucketed **soil-history** values. Then a soil-formula or radar-weight change can't pass on one platform and silently break the other. Pair this with **TC-1** (run it on iOS CI) and the #1 systemic risk is essentially neutralized — without rewriting any working code.

**Progress (2026-06-03):**
- ✅ **Radar scores** + **watering streak** added to `derivation-parity.json` `expectedState`, with assertions in **both** `web/src/tests/parity.test.ts` (verified — full web suite green, 1413 tests) and `ios/TrunkTests/ParityTests.swift` (added; pending first Xcode/CI run). The radar weight constants and harvest formula were checked by hand and are **identical** across platforms (`W_WATER=0.05`, `W_SUN=0.35`, ceiling `100`, harvest `= soilCost × resultMultiplier`), so these should pass on iOS — the new test simply *guarantees* it going forward.
- ⚠️ **Soil-history is a confirmed structural divergence — do NOT just assert it.** The raw series is built differently on each platform: web's `computeRawSoilHistory` (`soil-charting.ts:52`) pushes exactly **one snapshot per soil-changing event** and **no initial point**; iOS (`EventDerivation.swift:215-219, 259-263`) **seeds an initial snapshot** from the first event *and* only appends on `sprout_watered` when the sprout is still active. So the two raw series have different lengths/contents by construction. This is likely benign at the *chart* level (bucketing smooths it), but it means there's no single "soil history" to assert. **Action:** before adding a soil-history fixture, decide whether to (a) converge the two raw builders, or (b) assert only the *bucketed* output both platforms actually render. This is the concrete instance that should drive the PM-2 decision below.
- Remaining for full PM-1: water/sun *already* covered; add bucketed soil-history once (a)/(b) above is decided; widen to `cross-platform-validation.json` (the larger narrative fixture).

### PM-2 — Pick a stance on the architectural divergence *(P2, decision only)*

Three options; my recommendation is **(B) for now**:

- **(A) Converge the structures** so a reader can diff them line-for-line (e.g., give iOS the same separate radar/soil functions + indexes, *or* move web to a single pass). Cleanest long-term, but it's a real refactor on code that works.
- **(B) Keep the divergence, lock it with tests** (PM-1 + TC-1). Lowest risk, highest leverage for a solo-maintained app. Document *why* they differ (iOS optimizes for one pass + SwiftUI; web optimizes for modular/testable/cached) so it's an intentional decision, not rot.
- **(C) Single shared implementation** (shared WASM/JS core, or generate Swift from TS). Eliminates duplication entirely but is almost certainly **YAGNI** here — it trades a well-understood duplication for a novel build-pipeline complexity. Not recommended.

Whatever you choose, write one paragraph in `ARCHITECTURE.md` stating it. The danger isn't the divergence; it's *undocumented* divergence.

### PM-3 — Generate the iOS event-type enum *(P2, S)*

iOS has **19 hand-typed event-type string literals** (`case "sprout_planted":` …) vs web's single `EVENT_TYPES` constant. A typo or a new event type is a silent drift surface. `shared/generate-constants.js` already emits `SharedConstants.swift` — extend it to emit an `EventType` enum (and ideally the dedup-key field list), so the strings have one source of truth.

### PM-4 — De-duplicate the magic weights *(P3, S)*

Radar weights are triple-defined: a comment "from constants.json" plus hardcoded literals in **both** `radar-charting.ts:21-26` (`W_WATER = 0.05`, `W_SUN = 0.35`, `ENGAGEMENT_CEILING = 100`) **and** `EventDerivation.swift:190-192`. They happen to match the soil recovery rates but aren't read from them. Promote to `constants.json` and generate, or read the existing recovery-rate constants directly.

### PM-5 — Radar uses different twig-parsing on each platform *(P3, note)*

Web derives the branch via `parseTwigId(...).branchIndex` (`radar-charting.ts:59`); iOS uses prefix matching `twigId.hasPrefix("branch-\(i)")` (`EventDerivation.swift:363-370`). Same result for well-formed IDs, but two parsers for one concept. The memory of known radar misalignments (amplitude 3 pt web vs 6 pt iOS; min-score 0 vs 0.08) lives in the *presentation* layer, which is fine to differ — but the *scoring* should share one parsing rule (covered if PM-1 lands).

### PM-6 — JSON schemas aren't the source of truth *(P3, note)*

`shared/schemas/*.schema.json` exist but aren't enforced at runtime; the hand-written `validateEvent()` (`types.ts:176`) is the real gate, and it already intentionally diverges from the schema (the `prompt` field, `types.ts:200`). So the schemas are documentation that can rot. Either (a) generate `validateEvent` from the schema, or (b) demote the schemas to clearly-labeled docs. Don't leave two "truths."

---

## 2. Performance & Bundle *(primary focus)*

**Verdict: already lean. Little to do here.** Measured production build:

```
index.js    162 KB │ gzip 45.4 KB   (app)
dist.js     160 KB │ gzip 41.6 KB   (Supabase SDK — lazy, dynamic import)
index.css    73 KB │ gzip 12.0 KB
prompts.js   30 KB │ gzip  9.9 KB   (lazy)
build: 165 ms · 125 modules · tsc clean
```

The Supabase SDK and prompt strings are correctly code-split out of the critical path; the app renders from `localStorage` while the SDK loads. The web render model is efficient: navigation toggles CSS classes / custom properties (no DOM rebuild — `navigation.ts`), and updates are targeted (`card.innerHTML` on a single card). This is good engineering; don't chase it further.

### PF-1 — Fonts are the biggest real front-end cost *(P2, S)*

`index.html:11` loads **three** Google Font families (DotGothic16, Shippori Mincho, Zen Kaku Gothic New) with multiple weights, render-blocking, from a third party. That's likely a larger first-paint cost than the entire JS bundle, plus a privacy/availability dependency on Google. **Self-host** the subset you actually use (and consider dropping to two families). `font-display: swap` if not already set.

### PF-2 — iOS lacks the O(1) indexes web builds *(P3, S — also a parity win)*

`getSproutsForTwig` / `getActiveSprouts` / `getLeavesForTwig` (`EventDerivation.swift:754-776`) do `state.sprouts.values.filter` on every call. Call sites are modest today (2/2/4), but SwiftUI re-evaluates `body` freely, so these can run O(n) per render. Building the same index maps web has makes iOS consistent and removes a future foot-gun. Low effort, and it nudges the two platforms back toward structural parity.

### PF-3 — Web iterates the event log several times *(note, not urgent)*

`deriveState`, `computeBranchEngagement`, `computeRawSoilHistory`, and the water/sun/streak helpers each iterate `events` independently. The store caches each result with sensible invalidation, so in practice this is fine at personal-scale event counts. **Not worth changing for perf alone** — but it's the same divergence as PM-1 wearing a performance hat. If you ever converge (PM-2 option A), web moving to iOS's single pass would resolve both.

---

## 3. Cleanup & Refactors *(primary focus)*

### CL-1 — Consolidate iOS streak logic & add its missing test *(P2/P3, M — needs Xcode to verify)*

> **Correction (2026-06-01, caught during implementation):** an earlier draft claimed `deriveWaterAvailable`, `deriveSunAvailable`, and `getCompletedSprouts` were dead (~120 lines). **Wrong.** They have zero *app* call sites but are the public entry points the **iOS tests** call — `deriveWaterAvailable` (6 refs), `deriveSunAvailable` (7), `getCompletedSprouts` (3) across `EventDerivationTests.swift` and `ParityTests.swift`. They mirror web's exported `derive*` API and exist to be unit-tested in isolation. **Keep them.** Lesson for this codebase: *"not called by app code" ≠ dead* — the standalone `derive*` functions are a deliberately tested parity surface.

The one real issue is **streak**:
- `deriveWateringStreak(from:now:)` (`:815-863`) has **0 refs** (app + tests), yet it mirrors web's well-tested `deriveWateringStreak` (`derive.ts:601`, covered by `watering-streak.test.ts`, 373 lines).
- The app instead uses a near-verbatim **duplicate**, the private `computeStreakFromTimestamps` (`:373-416`), inline in `deriveState`.
- `state.wateringStreak` has **no iOS test assertion** — streak is effectively **untested on iOS**, while web tests it thoroughly.

**Recommendation (one small refactor, not a deletion):** make `deriveWateringStreak` the single streak implementation, have `deriveState` call it (delete the duplicate `computeStreakFromTimestamps`), and add an iOS streak test mirroring `watering-streak.test.ts`. Net: one implementation, a parity API matching web, and the coverage gap closed. Requires an Xcode build/test run to verify — so it's a deliberate change, not a blind "safe win."

### CL-2 — Stale Biome ignore path *(P2, S)* — ✅ Fixed 2026-06-01

`biome.json:11` ignored `"!src/generated-constants.ts"`, but the generated files are actually `src/generated/constants.ts` and `src/generated/prompts.ts`. So **the generator output was being linted and formatted** — noise, and a risk that a format pass fights `generate-constants.js`.

**Fixed:** changed to `"!src/generated/**"`. Verified — `biome check src/` now covers **150 files** (was 152), excludes `src/generated/`, and is clean.

### CL-3 — Retire the legacy `Sprout` shape *(P2, M)*

`toSprout()` (`derive.ts:468-491`) converts `DerivedSprout` → a pre-event-sourcing `Sprout` type, and it's called in 5+ UI sites (`leaf-view.ts:63`, `twig-view/event-handlers.ts:43`, `twig-view/index.ts:72`, `features/progress.ts:128,135`). The UI is still coupled to the old shape. Migrating those consumers to read `DerivedSprout` directly removes the adapter, the legacy type, and a class of "which sprout type is this?" confusion. Do it incrementally, one consumer at a time, behind the existing tests.

### CL-4 — Split `twig-view.css` *(P3, S)*

886 lines — the one stylesheet over your informal 800 limit (everything else is well-split, 60–354 lines). Break out the edit-form / card / panel sections.

### CL-5 — Housekeeping *(P3, trivial)*

`ios/build/` is 489 MB of SPM checkouts + DerivedData on disk (correctly git-ignored, so not a repo problem). A periodic `xcodebuild clean` / DerivedData purge keeps `find`/search fast locally. No action in-repo.

---

## 4. Security & Correctness *(flagged regardless of focus)*

### SC-1 — RLS on `events` — core confirmed *(was P0 → now P2, S)*

The web client ships the Supabase **anon key** (correct — `lib/supabase.ts` is clean, key from env, lazy-loaded). That means **Row-Level Security is the only thing preventing one authenticated user from reading or writing another's events.**

**Update 2026-06-03:** maintainer confirmed via the dashboard that **RLS is enabled** on the `events` table. That closes the critical data-isolation concern. (Could not verify via MCP — the Supabase server returns `Unauthorized` in this environment because `SUPABASE_ACCESS_TOKEN` isn't resolving from `.mcp.json`'s env interpolation.)

**Remaining (P2, verification only — no known hole):** confirm the policy *shape*, not just that RLS is on —
- `SELECT/INSERT` policies restrict rows to `auth.uid() = user_id`,
- there's no permissive `anon` policy that bypasses the above.

Easiest path is SC-2 below: once the policies live in `supabase/migrations/` as SQL, this is reviewable in the repo instead of behind the dashboard.

### SC-2 — Version the backend *(P0→ongoing, M)*

There is **no `supabase/` directory** — no migrations, no RLS policy SQL, no edge-function source in the repo. The `events` table, the `UNIQUE(client_id)` constraint that the whole dedup story depends on, and the `e2e-login` edge function (`verify_jwt: false`, per CLAUDE.md) all live only in the hosted project. That means they can't be code-reviewed, can't be rolled back, and aren't reproducible. **Action:** `supabase db pull` into `supabase/migrations/`, download edge functions into `supabase/functions/`, and commit them. This also makes SC-1 reviewable as code, and lets you confirm `e2e-login` can *only* mint a session for the allowlisted test email (a `verify_jwt:false` function is a backdoor if its allowlist is wrong).

### SC-3 — XSS discipline is good — ✅ swept, clean *(P2, S)*

The `innerHTML` template in `event-handlers.ts:190-196` escapes **every** interpolation via `escapeHtml()` — exactly right.

**Update 2026-06-03:** ran the full repo-wide sweep (`grep` for `innerHTML`/`outerHTML`/`insertAdjacentHTML`, cross-referenced against `escapeHtml` call sites). Result: **every sink that touches user content is escaped** — sprout titles, reflections, bloom fields, water/sun content + prompts, leaf names, seedling notes (`leaf-view.ts`, `sprout-cards.ts`, `seedlings.ts`, `event-handlers.ts`, `soilbag-/sunlog-/watercan-/water-dialog.ts`). The one hand-rolled case, `node-ui.ts:265`, escapes `&`/`<`/`>` inline before converting `\n`→`<br>` (safe in a text context). All remaining `innerHTML` writes are static template strings or numeric `toFixed`/count interpolation — no user data. **No hole found; item closed.**

---

## 5. Testing & CI *(secondary, but it's the safety net for §1)*

### TC-1 — Add iOS CI *(P1, M)* — 🟡 drafted 2026-06-01, pending first GitHub run

`.github/workflows/ci.yml` runs only the web job (type-check, lint, format, build, coverage). There was **no iOS automation at all** — no `macos-` runner, no `xcodebuild test`. So `ParityTests.swift`, `EventDerivationTests.swift`, `ProgressionServiceTests.swift`, etc. only ran if someone ran them by hand. Given that hand-mirrored derivation is the #1 risk, **the parity tests not running on iOS CI was the biggest gap in the safety net.**

**Drafted:** `.github/workflows/ios-ci.yml` — `macos-15` runner, `latest-stable` Xcode, generates a placeholder `Secrets.swift` (so the build compiles offline), resolves SPM packages, selects an iPhone simulator by UDID (robust across Xcode versions), and runs `xcodebuild test -scheme Trunk -testPlan Trunk`. Triggers on `push`/`pull_request` to `main` touching `ios/**` or `shared/**`, plus `workflow_dispatch`.

**Validated locally (2026-06-01):** the exact test command was run against the `Trunk` scheme on an iPhone 17 simulator — **`** TEST SUCCEEDED **`, 131 tests, 0 failures**, including `DerivationParityTests`, `ParityTests`, and `WeekBoundaryParityTests`. So the command and the cross-platform baseline are confirmed green. **Remaining:** push and confirm the first run on GitHub's runner — the two things most likely to need a tweak are the Xcode image (local is 26.2; the workflow defaults to `macos-15` + `latest-stable`) and nothing else, since the simulator is now chosen dynamically.

### TC-2 — Lift iOS coverage via ViewModels *(P3, M)*

iOS has 8 test files vs web's 83. The core *is* covered (derivation, parity, progression, export). The gap is UI/flow logic, which is hard to test because it lives in large views — `SettingsView` (512), `CreateSproutView` (443), `EditSproutView` (326). Extracting that logic into `@Observable` ViewModels (carried item #9 from Mar-2026) makes it unit-testable without the view layer. Do it opportunistically when you next touch each form.

---

## What's already excellent (don't "fix" these)

- **File discipline.** Largest web source is 647 lines; sync is 7 small modules; iOS app files are nearly all <350 lines. You follow your own "many small files" rule.
- **Event-sourcing core** (`derive.ts`) — dedup before replay, `roundSoil` to kill FP drift, capacity left unrounded for precision, O(1) indexes, clear guard conditions (C2/C3/C13/C14).
- **Bundle & build** — one prod dependency, lazy-split SDK and prompts, 45 KB gzip main, 165 ms rolldown build, tsc clean.
- **Constants DRY** — `generate-constants.js` emits TS + Swift + prompts from `constants.json`. The right idea; PM-3 just extends it.
- **Test seriousness on web** — 83 test files, Stryker mutation testing, adversarial/edge-case/boundary suites, cross-platform fixtures.
- **Memory-leak hygiene** — AbortController-based listener cleanup, ResizeObserver disconnect, wind pauses on `visibilitychange`, debounced saves with `beforeunload` flush.

## Completed since the Mar-2026 audit (for reference)

Tier-2 perf (watered-set caching, tooltip layout, realtime microtask batching) and Tier-3 structural cleanup (`layout.ts` split, CSS split, dead-CSS removal, shared `dedup.ts`) are **done**. Open carry-overs folded into this review: iOS `EventDerivation` size (863 lines, over the 800 limit) → addressed by the structural decision in **PM-2** (and modestly by the **CL-1** streak dedupe); iOS form ViewModels → **TC-2**.

## Deliberately *not* recommended

- **A shared logic engine / WASM core (PM-2 option C)** — eliminates duplication but adds build complexity disproportionate to a solo personal app.
- **Replacing `rolldown-vite`** — it's bleeding-edge, but it's building cleanly and fast; the only watch-item is pinning the version (already pinned via `overrides`). Keep an eye on it; don't pre-emptively migrate.
- **A UI framework for web** — the vanilla-DOM + targeted-update model is fast and dependency-free. Adding React/etc. would be a regression here.

---

### Suggested sequencing

1. **SC-1** (verify RLS) — ✅ RLS confirmed enabled (2026-06-03). Only the policy-shape check remains, which SC-2 makes trivial.
2. **CL-2** — fix the Biome ignore path. ✅ *Done & verified 2026-06-01.*
3. **TC-1 + PM-1** — the keystone: iOS CI running full-surface parity fixtures. This is what makes everything else safe to change.
4. **SC-2** — commit the backend.
5. Then the P2/P3s opportunistically (CL-3, PF-1, PM-3, CL-1) as you touch those areas — CL-1 in particular wants an Xcode build/test, so fold it into the iOS-CI work (TC-1).
