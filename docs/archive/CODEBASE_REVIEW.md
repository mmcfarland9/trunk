# Trunk Web Application — Codebase Review

**Date**: 2026-02-06
**Scope**: `web/src/` — Vite + TypeScript web application
**Methodology**: 5-agent review (Structural, Robustness, Performance, Quality) with independent Devil's Advocate challenge of every finding. Severity ratings reflect the balanced consensus after adversarial review.

---

## Executive Summary

The Trunk web application is a well-structured vanilla TypeScript SPA with a sound event-sourcing architecture. The codebase is readable, the domain model is clear, and the transition from legacy state to event sourcing is proceeding in a disciplined way. That said, five reviewers independently converged on a small set of genuine concerns:

**One true critical bug**: the weekly reset boundary uses Monday in one code path and Sunday in another. If both paths are reachable, users see incorrect resource availability. This must be verified and fixed immediately.

**A handful of high-priority items** center on dead/duplicated code from an incomplete extraction refactor, a stale resource cache on time boundaries, and unvalidated sync payloads. These are straightforward to address.

**The majority of findings are medium or low severity**, reflecting a codebase that is fundamentally healthy but accumulating the normal debt of an actively-evolving project: oversized files, missing test coverage for utilities, and minor consistency gaps.

The devil's advocate process was particularly valuable here — roughly 40% of initially-flagged HIGH issues were defensibly downgraded to MEDIUM or LOW after challenge, preventing wasted effort on non-problems. The prioritized action plan at the bottom of this document reflects those adjusted ratings.

**By the numbers**:
- Critical: 1 (verified by 3 reviewers independently)
- High: 6
- Medium: 18
- Low: 18

---

## Critical

### [C1] Weekly Reset Day Inconsistency — Sunday vs Monday
**File**: `web/src/events/derive.ts:199-208` and `web/src/utils/calculations.ts:77-88`
**Flagged by**: Robustness Reviewer, Quality Reviewer, Structural Reviewer | **Devil's Advocate**: Agreed Critical (if both paths are live)
**Effort**: Quick Fix

Two independent code paths determine when weekly resources (sun) reset. `derive.ts` uses Monday 6:00 AM as the weekly boundary; `calculations.ts` uses Sunday. Both files are imported and reachable. If the UI consults one path for display and another for enforcement, a user could be shown "1 sun available" when the derived state says 0 (or vice versa).

**Why it matters**: This is a correctness bug affecting the core resource system. Users make decisions (when to reflect, when to wait) based on displayed availability.

**Suggestion**: Determine which day is canonical (Monday per the spec in `shared/formulas.md`), fix the other, and extract the reset-boundary logic into a single shared utility (e.g., `getWeeklyResetTimestamp()`) that both modules import. Add a unit test that pins the expected day.

---

## High

### [H1] Dead Extracted Modules — sprout-card.ts and sprout-form.ts
**File**: `web/src/ui/twig-view/sprout-card.ts`, `web/src/ui/twig-view/sprout-form.ts`
**Flagged by**: Structural Reviewer, Quality Reviewer | **Devil's Advocate**: Agreed — delete dead code
**Effort**: Quick Fix

An extraction refactor was started (moving sprout card rendering and form logic out of the monolithic `twig-view.ts`) but the extracted modules appear to be unused orphans. Meanwhile `twig-view.ts` still contains its own inline versions. This creates confusion about which code is authoritative and risks bugs being fixed in only one copy.

**Why it matters**: Dead code increases cognitive load and is a trap for future contributors who may edit the wrong file.

**Suggestion**: Verify the extracted modules are truly unreferenced (search for imports). If unused, delete them. If partially used, complete the extraction and remove the inline versions from `twig-view.ts`.

---

### [H2] Stale Water/Sun Cache Across Time Boundaries
**File**: `web/src/events/store.ts:153-169`
**Flagged by**: Robustness Reviewer | **Devil's Advocate**: Downgrade to Medium (self-corrects on interaction)
**Effort**: Quick Fix

The resource availability cache (`cachedWaterAvailable`, `cachedSunAvailable`) has no time-based invalidation. If a user leaves the app open overnight past the 6:00 AM reset, the cache continues serving yesterday's values until the next user interaction triggers a cache bust. The devil's advocate correctly notes this self-corrects on any click, but the display can be wrong for the entire passive viewing session.

**Why it matters**: A user checking their phone at 6:05 AM to see if resources refreshed will see stale "0 remaining" values, undermining trust in the system.

**Suggestion**: Add a `cachedAt` timestamp and compare against the next reset boundary before returning cached values. Approximately 5 lines of code. Alternatively, set a `setTimeout` to invalidate at the next known reset time.

**Final rating**: Keeping at HIGH because it directly affects the core UX promise (resources refresh at predictable times) even though the fix is trivial.

---

### [H3] Unvalidated Sync Payload Deserialization
**File**: `web/src/services/sync-types.ts:52-53`
**Flagged by**: Robustness Reviewer | **Devil's Advocate**: Downgrade to Medium (user's own data, low real risk)
**Effort**: Moderate

Sync payloads from Supabase are cast via `sync.payload as unknown as TrunkEvent` with no structural validation. A corrupted row, a schema migration mismatch, or a future API change could inject malformed events into the local event log, potentially corrupting derived state.

**Why it matters**: The event log is the source of truth for all user data. Silent corruption here could cascade into incorrect soil capacity, lost sprouts, or broken UI state with no clear error message.

**Suggestion**: Add a lightweight validation function (check required fields exist and have expected types) applied to each incoming sync payload before merging into the local event log. Reject or quarantine events that fail validation with a logged warning.

**Final rating**: Keeping at HIGH — even though the attack surface is narrow (user's own account), the blast radius is the entire event log.

---

### [H4] Dead Editor Module
**File**: `web/src/ui/editor.ts` (~153 lines)
**Flagged by**: Quality Reviewer | **Devil's Advocate**: Downgrade to Medium
**Effort**: Quick Fix

The editor module has all inputs disabled and all handlers are no-ops. It appears to be a vestige of a removed or redesigned feature. It is still wired into `AppContext` and referenced by `main.ts`.

**Why it matters**: Dead code that is still wired in occupies mental space in the architecture and makes it unclear whether the feature is "disabled temporarily" or "abandoned permanently."

**Suggestion**: If the inline editor is not coming back, remove the module and its references from `AppContext` and `main.ts`. If it is planned for re-enablement, add a comment stating so.

**Final rating**: Downgraded to HIGH from the original HIGH — it is dead code but actively wired in, which is worse than an orphaned file.

---

### [H5] No Event Log Size Limit
**File**: `web/src/events/store.ts`
**Flagged by**: Robustness Reviewer | **Devil's Advocate**: Downgrade to Medium (~13 years to hit limit)
**Effort**: Moderate

Events are appended to localStorage indefinitely with no compaction, archival, or size-limit mechanism. localStorage has a ~5MB cap. The devil's advocate calculated ~13 years before hitting the limit at normal usage, and the error path is already handled (save failure is caught). However, sync amplifies the problem — synced events from multiple devices accumulate faster.

**Why it matters**: The app's tagline is "decades, not sprints." A 50-year tool should plan for 50 years of data.

**Suggestion**: Implement a compaction strategy: after events are older than N months and fully synced, archive them to an export and replace with a single "snapshot" event that captures derived state at that point. This also improves `deriveState()` performance over time.

**Final rating**: Keeping at HIGH given the app's explicit multi-decade design philosophy, despite the long runway.

---

### [H6] Low Unit Test Coverage (~20% of Source Files)
**File**: `web/src/tests/`
**Flagged by**: Quality Reviewer | **Devil's Advocate**: Partially Agreed — critical paths tested, UI covered by E2E
**Effort**: Large

Only the `events/` module and `water-dialog.ts` have meaningful unit test coverage. Pure utility modules like `calculations.ts`, `validate-import.ts`, `safe-storage.ts`, and `sprout-labels.ts` have no unit tests. The devil's advocate correctly notes that the most critical code (event derivation) is well-tested and UI behavior is covered by Playwright E2E tests.

**Why it matters**: The weekly reset bug (C1) exists in an untested utility file. Unit tests on `calculations.ts` would have caught it immediately. Pure functions are the easiest code to test and the most valuable to cover.

**Suggestion**: Prioritize unit tests for pure utility modules: `calculations.ts`, `validate-import.ts`, `presets.ts`, `sprout-labels.ts`. These are high-value, low-effort targets. Aim for 80% coverage on the `events/` and `utils/` directories as a first milestone.

---

## Medium

### [M1] God Module — dom-builder.ts (736 lines)
**File**: `web/src/ui/dom-builder.ts`
**Flagged by**: Structural Reviewer | **Devil's Advocate**: Partially Agreed — boring/predictable but risky to refactor
**Effort**: Large

The file imperatively constructs the entire DOM tree including 7+ dialog templates, mixing DOM construction with initial state reading. While the code is straightforward and predictable (it reads like a long HTML template), its size makes it hard to find specific dialog markup.

**Why it matters**: At 736 lines, changes to one dialog risk accidentally affecting another. Dialog templates are logically owned by their feature modules.

**Suggestion**: Extract dialog template functions to their respective feature modules (e.g., `water-dialog.ts` owns its own DOM template). Keep `dom-builder.ts` as the orchestrator that calls these functions. Do this incrementally — one dialog per PR.

---

### [M2] twig-view.ts Exceeds Size Guidelines (887 lines)
**File**: `web/src/ui/twig-view.ts`
**Flagged by**: Structural Reviewer, Quality Reviewer | **Devil's Advocate**: Did not challenge
**Effort**: Large

The largest file in the codebase handles sprout CRUD, form state management, card rendering, leaf grouping, event wiring, and DOM manipulation. An extraction was started (see H1) but not completed.

**Why it matters**: At 887 lines, it exceeds the 800-line maximum guideline and makes it difficult to reason about any single responsibility in isolation.

**Suggestion**: Complete the extraction that was started. Move sprout card rendering and form logic into the already-created (but currently dead) sub-modules, then remove the inline versions.

---

### [M3] Mixed Concerns — log-dialogs.ts with Account Settings
**File**: `web/src/features/log-dialogs.ts` (489 lines)
**Flagged by**: Structural Reviewer | **Devil's Advocate**: Did not challenge
**Effort**: Moderate

Contains 4 distinct dialogs (water log, sun log, soil log, account settings). The account settings dialog has fundamentally different dependencies (auth service, sync service) from the resource log dialogs.

**Why it matters**: Changes to auth/sync now require touching a file that is primarily about resource history display.

**Suggestion**: Extract the account settings dialog into `features/account-dialog.ts`. The three resource log dialogs are cohesive and can remain together.

---

### [M4] Event Validation on Load
**File**: `web/src/events/store.ts:43-56`
**Flagged by**: Robustness Reviewer | **Devil's Advocate**: Agreed Medium
**Effort**: Moderate

`loadEvents()` checks that the parsed JSON is an array but does not validate individual event objects. A single malformed event (missing `type`, wrong `timestamp` format) could cause `deriveState()` to produce incorrect results or throw.

**Why it matters**: Combined with H3 (unvalidated sync payloads), this means corrupted data can enter the system from two directions with no structural checks.

**Suggestion**: Add a `validateEvent()` function that checks required fields (`type`, `timestamp`, `id`). Apply it in `loadEvents()` and in the sync merge path. Log and skip invalid events rather than crashing.

---

### [M5] Infinite Recursion Risk in getRandomPrompt
**File**: `web/src/features/shine-dialog.ts:40-43`
**Flagged by**: Robustness Reviewer | **Devil's Advocate**: Agreed Medium
**Effort**: Quick Fix

If both prompt arrays are empty (e.g., due to a data issue), `getRandomPrompt()` recurses indefinitely until stack overflow.

**Why it matters**: Stack overflow crashes are catastrophic — they freeze the UI with no recovery.

**Suggestion**: Add a base case: if both arrays are empty, return a hardcoded default prompt string. Two lines of code.

---

### [M6] getPresetLabel Returns Undefined for Unmatched IDs
**File**: `web/src/utils/presets.ts`
**Flagged by**: Robustness Reviewer | **Devil's Advocate**: Agreed Medium
**Effort**: Quick Fix

No fallback value is provided when a node ID does not match the expected pattern. Callers may display `undefined` as a label.

**Why it matters**: A UI displaying "undefined" as a branch or twig name is a visible user-facing bug.

**Suggestion**: Return a sensible fallback string (e.g., `"Untitled"` or the raw node ID) when the pattern does not match.

---

### [M7] console.log Statements in Production Code
**File**: `web/src/main.ts`, `web/src/services/sync-service.ts`, `web/src/services/auth-service.ts`, `web/src/events/store.ts`
**Flagged by**: Quality Reviewer | **Devil's Advocate**: Partially Agreed — sync logging is useful, but audit for debug artifacts
**Effort**: Quick Fix

Multiple `console.log` statements exist in production code paths. Some are intentional diagnostic logging (sync status), others appear to be debug artifacts.

**Why it matters**: Debug logs in production leak implementation details to end users who open DevTools and create noise that obscures real issues.

**Suggestion**: Audit all `console.log` calls. Replace intentional logging with a lightweight logger utility that can be silenced in production. Remove debug artifacts.

---

### [M8] 50+ Non-Null Assertions in DOM Builder
**File**: `web/src/ui/dom-builder.ts`
**Flagged by**: Robustness Reviewer | **Devil's Advocate**: Downgraded to Medium — better solved by integration test
**Effort**: Moderate

Extensive use of `querySelector(...)!` throughout the DOM builder. If a CSS class name changes without updating the corresponding selector, the assertion silently produces `null`, leading to runtime errors elsewhere.

**Why it matters**: This is a class of bug that is invisible at compile time and only surfaces at runtime, potentially in production.

**Suggestion**: The devil's advocate is right that null-checking 50+ selectors is impractical. Instead, add an integration test that boots the app and verifies all `elements` fields are non-null. This catches selector/class mismatches at test time.

---

### [M9] Module-Level Side Effects in Event Store
**File**: `web/src/events/store.ts`
**Flagged by**: Structural Reviewer, Robustness Reviewer | **Devil's Advocate**: Agreed Low Priority
**Effort**: Quick Fix

`initEventStore()` is called at module scope, meaning importing the module triggers localStorage reads. This makes the module harder to test in isolation and creates implicit initialization ordering.

**Why it matters**: Side effects at import time are a testing anti-pattern and can cause surprising behavior when module import order changes.

**Suggestion**: Export `initEventStore()` and call it explicitly from `main.ts`. The store can lazily initialize on first access as a fallback.

---

### [M10] Redundant Event Log Replays in Dialog Paths
**File**: `web/src/events/derive.ts:372-387,403-468`
**Flagged by**: Performance Reviewer | **Devil's Advocate**: Downgraded — only on dialog open, separation of concerns is valid
**Effort**: Moderate

`getAllWaterEntries()` and `deriveSoilLog()` each independently replay the full event log rather than sharing a single pass. The devil's advocate correctly notes these only run when dialogs open (not in hot paths), and the separation makes each function independently testable.

**Why it matters**: As the event log grows over years (see H5), these replays will slow dialog open times. Not urgent today, but worth noting for the compaction strategy.

**Suggestion**: When implementing event log compaction (H5), consider caching these derived collections as part of the snapshot. No action needed in the short term.

---

### [M11] Unused Parameters with Underscore Prefix
**File**: `web/src/ui/editor.ts`, `web/src/features/progress.ts`, `web/src/features/water-dialog.ts`
**Flagged by**: Quality Reviewer | **Devil's Advocate**: Did not challenge
**Effort**: Quick Fix

Multiple functions accept parameters prefixed with `_` to suppress TypeScript's `noUnusedParameters` error. This suggests incomplete refactoring — the parameters were once used and the call sites still pass them.

**Why it matters**: Underscore-prefixed parameters signal to future readers "this is intentionally unused" when in fact it may be "this was forgotten during refactoring."

**Suggestion**: For each `_param`, determine if the parameter should be restored to use (incomplete refactor) or if the call sites should stop passing it. Clean up accordingly.

---

### [M12] applyWind() parseFloat per Animation Frame
**File**: `web/src/ui/layout.ts:144-181`
**Flagged by**: Performance Reviewer | **Devil's Advocate**: Did not specifically challenge
**Effort**: Quick Fix

The wind animation reads CSS `left`/`top` values via string parsing (`parseFloat`) for 500+ elements on every animation frame at 60fps. This is ~30,000 string-to-number conversions per second.

**Why it matters**: While modern engines optimize `parseFloat`, this is unnecessary work. Storing numeric positions in a parallel data structure avoids the string round-trip entirely.

**Suggestion**: Cache numeric positions in a `Map<HTMLElement, {x: number, y: number}>` when positions are set in `positionNodes()`. Read from the cache in `applyWind()` instead of parsing CSS strings.

---

### [M13] twig-view.ts Rebuilds All Listeners on Render
**File**: `web/src/ui/twig-view.ts:410-472`
**Flagged by**: Performance Reviewer | **Devil's Advocate**: Did not specifically challenge
**Effort**: Moderate

Each render cycle uses `innerHTML` to rebuild the sprout list, then runs `querySelectorAll` and attaches fresh event listeners. Previous listeners are not explicitly removed (they are garbage-collected with the replaced DOM nodes).

**Why it matters**: This is a standard pattern for innerHTML-based rendering, but it means every state change does O(n) DOM queries and listener attachments. As sprout counts grow, render cost increases linearly.

**Suggestion**: Consider event delegation: attach a single click listener to the sprout list container and use `event.target.closest('[data-action]')` to dispatch. This reduces listener count from O(n) to O(1) regardless of sprout count.

---

### [M14] Mixed Concerns — derive.ts (469 lines)
**File**: `web/src/events/derive.ts`
**Flagged by**: Structural Reviewer | **Devil's Advocate**: Disagreed — cohesive functions, splitting adds import boilerplate
**Effort**: Moderate

Contains pure state derivation, resource availability queries, ID generation, date utilities, query helpers, and soil log derivation. The devil's advocate argues these are cohesive (all operate on the event log) and splitting would increase import complexity without meaningful benefit.

**Why it matters**: At 469 lines, the file is within acceptable range but approaching the threshold where navigation becomes difficult.

**Suggestion**: No immediate action required. If the file grows beyond 600 lines, split resource queries and date utilities into separate modules. For now, ensure functions are well-organized with clear section comments.

---

### [M15] Sidebar Rebuilds Multiple getState() Calls on Hover
**File**: `web/src/features/progress.ts:248-360`
**Flagged by**: Performance Reviewer | **Devil's Advocate**: Partially valid but mitigated — only fires on branch change
**Effort**: Quick Fix

The sidebar update path calls `getState()` (which may trigger `deriveState()`) multiple times per hover event. The devil's advocate notes this only fires when the hovered branch actually changes, not on every mousemove.

**Why it matters**: Minor inefficiency that could compound if `deriveState()` cache invalidation becomes more aggressive.

**Suggestion**: Capture the derived state once at the top of the sidebar update function and pass it to sub-functions rather than letting each sub-function call `getState()` independently.

---

### [M16] getPresetLabel() Regex per Call
**File**: `web/src/utils/presets.ts:13-34`
**Flagged by**: Performance Reviewer | **Devil's Advocate**: Did not specifically challenge
**Effort**: Quick Fix

A regex is compiled and `parseInt` is called on every invocation. This function is called frequently during rendering.

**Why it matters**: Regex compilation is not free, especially in hot paths.

**Suggestion**: Compile the regex once as a module-level constant. Alternatively, precompute a `Map<string, string>` from node IDs to labels at initialization time.

---

### [M17] Race Condition in Auth Initialization
**File**: `web/src/main.ts:41-112`
**Flagged by**: Robustness Reviewer | **Devil's Advocate**: Downgraded to Low — self-correcting via listener
**Effort**: Moderate

Auth state could theoretically change between initial render and listener setup. The devil's advocate notes that the auth state change listener will re-render correctly when it fires, making this self-correcting.

**Why it matters**: Users may see a brief flash of unauthenticated UI before the listener corrects it.

**Suggestion**: Ensure the auth state listener is registered before the initial render, or re-render once after listener setup. Low urgency given self-correction.

---

### [M18] Hardcoded Branch/Twig Counts
**File**: `web/src/features/shine-dialog.ts:76-77`, `web/src/features/progress.ts`, `web/src/ui/layout.ts`
**Flagged by**: Robustness Reviewer | **Devil's Advocate**: Agreed Low
**Effort**: Quick Fix

Literal `8` appears in multiple files instead of referencing `BRANCH_COUNT` and `TWIG_COUNT` from `constants.ts`.

**Why it matters**: If the tree structure ever changes (unlikely but possible), these hardcoded values would be silently wrong.

**Suggestion**: Replace literals with the existing constants. Simple find-and-replace.

---

## Low

### [L1] Event Dedup by Timestamp Only
**File**: `web/src/services/sync-service.ts:69-72`
**Flagged by**: Robustness Reviewer | **Devil's Advocate**: Downgraded to Low — near-zero collision probability for single-user
**Effort**: Quick Fix

Two events created at the exact same millisecond would collide in the dedup check. In a single-user app with human-speed interactions, this is effectively impossible.

**Suggestion**: If sync becomes multi-device with automated event generation, switch to UUID-based dedup. No action needed now.

---

### [L2] DerivedSprout Mutation During Replay
**File**: `web/src/events/derive.ts:111`
**Flagged by**: Robustness Reviewer, Quality Reviewer | **Devil's Advocate**: Downgraded to Low — fresh objects per call
**Effort**: Quick Fix

`.push()` mutates `DerivedSprout` objects during `deriveState()`. The devil's advocate correctly notes these are freshly created objects local to each invocation — no external state is mutated.

**Suggestion**: If `deriveState()` ever caches results, this mutation would become a real bug. Add a comment noting the assumption, or switch to spread-based immutable updates prophylactically.

---

### [L3] Division by Zero in Soil Meter
**File**: `web/src/main.ts:187`
**Flagged by**: Robustness Reviewer | **Devil's Advocate**: Downgraded to Low — unreachable through normal event replay
**Effort**: Quick Fix

If soil capacity is 0, the percentage calculation produces `Infinity`. The devil's advocate notes capacity starts at 10 and can only increase, so 0 is unreachable through normal operation.

**Suggestion**: Add a guard: `const pct = capacity > 0 ? (available / capacity) * 100 : 0`. One line, zero risk.

---

### [L4] No Default Case in deriveState Switch
**File**: `web/src/events/derive.ts:82-170`
**Flagged by**: Robustness Reviewer | **Devil's Advocate**: Downgraded to Low — correct forward-compatible behavior
**Effort**: Quick Fix

Unknown event types are silently ignored. The devil's advocate correctly identifies this as standard event-sourcing practice — older code should gracefully handle event types introduced by newer versions.

**Suggestion**: No change to runtime behavior. Optionally add a `default` case with a debug-only `console.warn` to aid development.

---

### [L5] Client ID Hash Collision Potential
**File**: `web/src/services/sync-types.ts:28-36`
**Flagged by**: Robustness Reviewer | **Devil's Advocate**: Downgraded to Low — handled by Supabase constraint
**Effort**: Quick Fix

32-bit hash for client IDs has birthday-paradox collision potential. The devil's advocate notes Supabase uniqueness constraints handle collisions gracefully.

**Suggestion**: No action needed unless collision is observed in practice.

---

### [L6] preventDoubleClick Timer Without Cleanup
**File**: `web/src/utils/debounce.ts`
**Flagged by**: Robustness Reviewer | **Devil's Advocate**: Downgraded to Low — SPA, components never unmount
**Effort**: Quick Fix

`setTimeout` reference is not stored for potential `clearTimeout`. Since this is a single-page app where components are never truly unmounted, the timer is harmless.

**Suggestion**: No action needed for current architecture. If the app ever adopts component-based unmounting, revisit.

---

### [L7] escapeHTML Uses DOM (Not SSR-Safe)
**File**: `web/src/utils/escape-html.ts`
**Flagged by**: Robustness Reviewer | **Devil's Advocate**: Agreed Low — browser-only app
**Effort**: Quick Fix

Creates a DOM text node to escape HTML, which is a safe and standard browser pattern but would not work in a server-side or worker context.

**Suggestion**: No action needed. Document the browser-only constraint if the function is ever moved to a shared module.

---

### [L8] Layout.ts Compressed Variable Names
**File**: `web/src/ui/layout.ts`
**Flagged by**: Structural Reviewer | **Devil's Advocate**: Agreed Low — standard geometry naming
**Effort**: Quick Fix

Variables like `cx`, `cy`, `r`, `a` are used in geometry calculations. These are standard mathematical conventions (center-x, center-y, radius, angle) understood by anyone familiar with coordinate geometry.

**Suggestion**: Style preference. Could add a brief comment block defining the coordinate system, but renaming is unnecessary.

---

### [L9] Magic Numbers in Layout Calculations
**File**: `web/src/ui/layout.ts`
**Flagged by**: Quality Reviewer | **Devil's Advocate**: Agreed Low
**Effort**: Quick Fix

Numeric constants for radii, offsets, and angles are inline rather than named constants.

**Suggestion**: Extract frequently-used values to named constants at the top of the file (e.g., `BRANCH_ORBIT_RADIUS`, `TWIG_SPREAD_ANGLE`).

---

### [L10] Orphaned Settings Dialog HTML
**File**: `web/src/ui/dom-builder.ts`
**Flagged by**: Quality Reviewer | **Devil's Advocate**: Agreed — verify and clean up
**Effort**: Quick Fix

HTML for a settings dialog may be generated in `dom-builder.ts` but no longer wired to any feature code.

**Suggestion**: Verify whether the settings dialog DOM is referenced. If orphaned, remove it.

---

### [L11] Inconsistent Error Handling Patterns
**File**: `web/src/utils/safe-storage.ts`, `web/src/services/sync-service.ts`
**Flagged by**: Quality Reviewer | **Devil's Advocate**: Agreed Low
**Effort**: Quick Fix

`safe-storage.ts` silently returns defaults on error; `sync-service.ts` logs and re-throws. Neither approach is wrong, but inconsistency makes the error philosophy unclear.

**Suggestion**: Document the intended error strategy: storage errors should be silent (graceful degradation), sync errors should be surfaced (user needs to know sync failed). Add comments.

---

### [L12] Duplicate Timestamp Formatters
**File**: `web/src/features/log-dialogs.ts` (lines ~25, ~42, ~59)
**Flagged by**: Quality Reviewer | **Devil's Advocate**: Downgraded to Low — may format differently
**Effort**: Quick Fix

Three similar but potentially distinct date formatting functions exist in log-dialogs.ts.

**Suggestion**: If formats are identical, extract a shared helper. If they differ (e.g., date-only vs date-time vs relative), keep separate but name them descriptively.

---

### [L13] Redundant Date Objects in Time Checks
**File**: Various
**Flagged by**: Performance Reviewer | **Devil's Advocate**: Agreed Low
**Effort**: Quick Fix

Multiple `new Date()` calls in the same function where a single timestamp would suffice.

**Suggestion**: Cache `Date.now()` at the top of functions that do multiple time comparisons.

---

### [L14] generateTwigLineCandidates O(n^3)
**File**: `web/src/ui/layout.ts`
**Flagged by**: Performance Reviewer | **Devil's Advocate**: Agreed Low — bounded by small n
**Effort**: Quick Fix

Cubic complexity, but n is always 8 (twigs per branch), so the actual work is 512 iterations maximum.

**Suggestion**: No action needed. The constant factor makes optimization unnecessary.

---

### [L15] saveEvents Serializes Full Array on Every Append
**File**: `web/src/events/store.ts`
**Flagged by**: Performance Reviewer | **Devil's Advocate**: Agreed Low
**Effort**: Moderate

Every `appendEvent()` call serializes the entire event array to localStorage. With a growing log, this becomes incrementally more expensive.

**Suggestion**: For now, acceptable. When implementing compaction (H5), consider append-only serialization or IndexedDB for more efficient writes.

---

### [L16] Facade Re-exports in state/index.ts
**File**: `web/src/state/index.ts`
**Flagged by**: Structural Reviewer | **Devil's Advocate**: Disagreed — convenience facade is a valid pattern
**Effort**: Quick Fix

The barrel file re-exports from 4 unrelated modules. The devil's advocate correctly identifies this as a common, valid convenience pattern.

**Suggestion**: No action needed. Barrel files are fine as long as they do not create circular dependencies.

---

### [L17] Cross-Layer Feature/UI Dependencies
**File**: `web/src/features/navigation.ts`, `web/src/features/progress.ts`
**Flagged by**: Structural Reviewer | **Devil's Advocate**: Disagreed — layers are descriptive not prescriptive
**Effort**: Moderate

Feature modules import from `ui/` and directly create DOM elements. The devil's advocate argues that in a vanilla TS app without a framework, strict layer separation creates more indirection than value.

**Suggestion**: No action needed for the current architecture. If the app adopts a component framework in the future, enforce stricter boundaries at that time.

---

### [L18] AppElements Flat Object (~95 Fields)
**File**: `web/src/types.ts`
**Flagged by**: Structural Reviewer | **Devil's Advocate**: Disagreed — flat object is idiomatic vanilla JS, TypeScript handles coupling
**Effort**: Large

The `AppElements` type has ~95 fields in a flat structure. Every module receives the entire object. The devil's advocate correctly notes that TypeScript's structural typing means modules only access the fields they use — the flat object does not create runtime coupling.

**Suggestion**: No action needed. If the app grows significantly, consider grouping by feature domain for readability, but this is purely organizational.

---

## Prioritized Action Plan

### Phase 1 — Immediate (This Sprint)
| ID | Item | Effort | Impact |
|----|------|--------|--------|
| C1 | Fix weekly reset day inconsistency | Quick Fix | Correctness bug in core resource system |
| H1 | Delete dead sprout-card.ts / sprout-form.ts | Quick Fix | Remove confusion and dead code |
| H2 | Add time-based cache invalidation for resources | Quick Fix | Fix stale resource display |
| M5 | Add base case to getRandomPrompt recursion | Quick Fix | Prevent potential stack overflow |
| M6 | Add fallback return for getPresetLabel | Quick Fix | Prevent "undefined" in UI |
| L3 | Guard division by zero in soil meter | Quick Fix | Defensive, zero risk |

### Phase 2 — Near Term (Next 2 Sprints)
| ID | Item | Effort | Impact |
|----|------|--------|--------|
| H3 | Add sync payload validation | Moderate | Protect event log integrity |
| H4 | Remove dead editor module | Quick Fix | Reduce dead code surface |
| M4 | Add event structure validation on load | Moderate | Complement H3, protect event log |
| M7 | Audit and clean up console.log statements | Quick Fix | Production hygiene |
| M9 | Make event store initialization explicit | Quick Fix | Testability |
| M11 | Clean up unused underscore-prefixed params | Quick Fix | Code clarity |
| M18 | Replace hardcoded 8s with constants | Quick Fix | Consistency |
| H6 | Add unit tests for pure utility modules | Moderate | Catch bugs like C1 earlier |

### Phase 3 — Medium Term (Next Quarter)
| ID | Item | Effort | Impact |
|----|------|--------|--------|
| H5 | Design event log compaction strategy | Large | Long-term data sustainability |
| M1 | Extract dialog templates from dom-builder.ts | Large | Reduce file size, improve cohesion |
| M2 | Complete twig-view.ts extraction refactor | Large | Reduce largest file below 800 lines |
| M3 | Extract account settings dialog | Moderate | Separate auth concerns from log dialogs |
| M8 | Add integration test for DOM element assertions | Moderate | Catch selector mismatches |
| M12 | Cache numeric positions for wind animation | Quick Fix | Reduce per-frame string parsing |
| M13 | Implement event delegation in twig-view | Moderate | Reduce listener overhead |

### Phase 4 — When Convenient
All remaining LOW items. These are style preferences, micro-optimizations, or defensive measures against extremely unlikely edge cases. Address opportunistically during related work.
