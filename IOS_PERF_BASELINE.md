# iOS Performance Baseline

> Measured on iPhone 17 Pro Simulator (iOS 26.2), Apple M4, Xcode 16.4, Debug build.
> All timings are medians of 5 runs after 1 warmup iteration.

---

## BEFORE

### 1. Derivation Pipeline (XCTest benchmarks)

| Operation | 215 events | 500 events | 1000 events | 2000 events |
|-----------|-----------|-----------|------------|------------|
| `deriveState()` | **7.85ms** | 23.34ms | 47.80ms | 93.90ms |
| `deriveWaterAvailable()` | **5.34ms** | — | — | — |
| `deriveSunAvailable()` | **0.47ms** | — | — | — |
| `deriveWateringStreak()` | **6.47ms** | — | — | — |
| `computeSoilHistory()` (replay) | **7.76ms** | — | — | — |
| `RadarChartView.computeScores()` | **0.16ms** | — | — | — |
| **Full refresh cycle** (all 4) | **20.06ms** | — | 117.00ms | — |

Scaling is ~linear: 215→2000 events = 7.85→93.90ms (~12x events, ~12x time).

### 2. ProgressionViewModel.refresh() (live app)

| Operation | Time |
|-----------|------|
| `ProgressionVM.refresh()` | **29.81ms** |
| `ProgressionVM.recompute()` | 0.94ms (median, 3 samples) |
| `EventStore.deriveState()` | 9.49ms (median, 2 samples) |

`refresh()` calls `EventStore.refresh()` (invalidate) + `recompute()`. The 29.81ms includes the full `EventStore.refresh()` + `recompute()` pipeline.

### 3. View Body Evaluation Counts (app launch, unauthenticated, no user interaction)

| View | Count |
|------|-------|
| ContentView | 3 |

With authentication and data, expected counts will be higher. Key concern areas from code analysis:

### 4. Identified Bottlenecks (code analysis)

#### A. Typing Path — Full derivation on every keystroke
- `CreateSproutView` and `EditSproutView` both declare `var state` as computed properties that call `EventStore.shared.getState()`.
- Since SwiftUI re-evaluates `body` on any `@State` change (including text field keystrokes), this triggers a full `deriveState()` on every character typed.
- At 215 events, that's ~8ms per keystroke. At 1000 events, ~48ms per keystroke.

#### B. Submission Path — Synchronous event push blocks UI
- `pushEvent()` in `SyncOperations.swift` appends the event to `EventStore` (optimistic), then awaits the Supabase insert.
- The `appendEvent()` triggers `@Published events` `willSet` → `objectWillChange` → `ProgressionViewModel.refresh()` (full re-derivation).
- Water/Shine/Harvest/Plant submit functions all `await pushEvent()` synchronously.

#### C. Cascade Re-derivation
- `ProgressionViewModel` subscribes to `EventStore.objectWillChange` via Combine.
- Every event mutation (append, set, remove) triggers `objectWillChange` → full invalidation + recompute.
- `recompute()` calls `getState()` + `getWaterAvailable()` + `getSunAvailable()` + `getWateringStreak()` — each iterating ALL events independently.
- Total cost per mutation at 215 events: ~20ms (full refresh cycle).

#### D. List Performance
- `SproutsListView` uses `VStack` instead of `LazyVStack`, causing all rows to render eagerly.
- Not an issue at 15 sprouts, but scales poorly.

#### E. Redundant Event Iteration
- `deriveState()`, `deriveWaterAvailable()`, `deriveSunAvailable()`, and `deriveWateringStreak()` each independently iterate ALL events.
- Water/sun/streak could be computed in a single pass during `deriveState()`.

#### F. SoilHistoryService.computeSoilHistory()
- Independently replays ALL events, duplicating work done by `deriveState()`.
- Called in `TodayView.refreshCachedState()` on every `progression.version` change.

#### G. TreeCanvasView 60fps body evaluations
- Uses `TimelineView(.animation)` which evaluates body at ~60fps.
- Already has `Equatable` optimization but still triggers the containing view hierarchy.

### 5. Summary of BEFORE metrics

| Metric | Value |
|--------|-------|
| Full refresh (215 events) | 20.06ms |
| Full refresh (1000 events) | 117.00ms |
| deriveState (215 events) | 7.85ms |
| deriveState per-keystroke (est.) | 7.85ms |
| Submission latency (est.) | 30-50ms (refresh + network) |
| Independent event iterations per refresh | 4 (state + water + sun + streak) |
| SoilHistory redundant replay | Yes (separate full replay) |
| SproutsListView lazy | No (VStack) |

---

## AFTER

### 1. Derivation Pipeline (XCTest benchmarks)

| Operation | 215 events | 500 events | 1000 events | 2000 events |
|-----------|-----------|-----------|------------|------------|
| `deriveState()` (consolidated) | **15.85ms** | 47.31ms | 93.29ms | 184.68ms |
| `deriveWaterAvailable()` (standalone) | **5.13ms** | — | — | — |
| `deriveSunAvailable()` (standalone) | **0.45ms** | — | — | — |
| `deriveWateringStreak()` (standalone) | **6.41ms** | — | — | — |
| `computeSoilHistory()` (standalone) | **7.65ms** | — | — | — |
| `RadarChartView.computeScores()` | **0.15ms** | — | — | — |
| **Full refresh cycle** (single call) | **16.13ms** | — | 92.00ms | — |
| Legacy full refresh (4 calls) | 28.07ms | — | — | — |

`deriveState()` now computes water/sun/streak/soilHistory in a single pass. The "Full refresh cycle" is now a single `deriveState()` call — no separate functions needed.

### 2. Optimizations Applied

| Bottleneck | Fix | Status |
|-----------|-----|--------|
| A. Typing path (8ms/keystroke) | Cached leaves in `@State`, refresh on `.onChange(of: progression.version)` | **Fixed** — ~0ms per keystroke |
| B. Submission path | Already optimistic (dismiss → push in background) | **Already optimal** |
| C. Cascade re-derivation | Single `getState()` returns all values; `recompute()` reads one cached state | **Fixed** — 1 call instead of 4 |
| D. List performance (VStack) | `SproutsListView` + `LeafsListView` switched to `LazyVStack` | **Fixed** |
| E. Redundant event iteration | Water/sun/streak computed in single pass during `deriveState()` | **Fixed** — 1 pass instead of 4 |
| F. SoilHistory redundant replay | Soil history built during `deriveState()`, read from `state.soilHistory` | **Fixed** — 0 extra replays |
| G. TreeCanvasView 60fps | Existing `Equatable` optimization sufficient | **No change needed** |

### 3. Summary of AFTER metrics

| Metric | Value |
|--------|-------|
| Full refresh (215 events) | 16.13ms |
| Full refresh (1000 events) | 92.00ms |
| deriveState (215 events) | 15.85ms |
| deriveState per-keystroke | ~0ms (cached, no recomputation) |
| Submission latency (est.) | 16-20ms (single refresh + network) |
| Independent event iterations per refresh | 1 (consolidated) |
| SoilHistory redundant replay | No (included in single pass) |
| SproutsListView lazy | Yes (LazyVStack) |

---

## DELTA

| Metric | BEFORE | AFTER | Change |
|--------|--------|-------|--------|
| Full refresh (215 events) | 20.06ms | 16.13ms | **-20%** |
| Full refresh (1000 events) | 117.00ms | 92.00ms | **-21%** |
| Full refresh + soilHistory (215 events) | ~28ms | 16.13ms | **-42%** |
| Per-keystroke derivation cost | 7.85ms | ~0ms | **-100%** |
| Event iterations per refresh | 4–5 | 1 | **-75%** |
| SoilHistory redundant replay | 7.76ms | 0ms | **Eliminated** |
| SproutsListView rendering | Eager (VStack) | Lazy (LazyVStack) | **Improved** |

### Key Wins (Round 1)

1. **Typing responsiveness**: Eliminated ~8ms per-keystroke derivation. Forms (CreateSprout, EditSprout) no longer trigger `getState()` on every body evaluation.
2. **Single-pass consolidation**: Water, sun, streak, and soil history are now computed alongside the main `deriveState()` pass. This avoids 4 redundant full-event-log iterations.
3. **Total refresh cost reduced 42%**: When accounting for all 5 previously-separate derivation functions (state + water + sun + streak + soilHistory), the consolidated single pass is 42% faster at 215 events.
4. **Lazy list rendering**: `SproutsListView` and `LeafsListView` now use `LazyVStack`, deferring off-screen row rendering.

---

## ROUND 2 — Further Optimizations

### Benchmark Method

Manual timing: `CFAbsoluteTimeGetCurrent()`, 10 iterations, 2 warmup, median of 10.
iPhone 17 Pro Simulator (iOS 26.2), Apple M4, Xcode 16.4, Debug build.

### BEFORE Round 2

| Operation | 215 events | 500 events | 1000 events |
|-----------|-----------|-----------|------------|
| `deriveState()` | 13.45ms | 31.16ms | 61.91ms |
| `RadarChartView.computeScores()` | 0.20ms | 0.48ms | 0.96ms |
| **Full refresh** (deriveState + radar) | **13.93ms** | — | **64.31ms** |
| JSON encode (prettyPrinted, 215) | 1.22ms (105,972 bytes) | — | — |
| JSON encode (compact, 215) | 1.16ms (79,713 bytes) | — | — |
| ISO8601 parse (215 timestamps) | 5.56ms | — | — |

### Optimizations Applied

| # | Optimization | Impact |
|---|-------------|--------|
| 1 | **Timestamp parse caching** — `cachedParse()` in `deriveState()` avoids re-parsing the same ISO8601 string (was parsed 2-3× per event: once in loop, again in each process function) | **-45% deriveState** |
| 2 | **Remove `.prettyPrinted` JSON encoding** — compact output for disk cache | **-25% file size** |
| 3 | **Radar scores in DerivedState** — `radarScores: [Double]` computed during single-pass event loop, eliminating separate `RadarChartView.computeScores()` call with its own sort | **Eliminated redundant sort + iteration** |
| 4 | **Cache ISO8601DateFormatter in streak** — reuse single formatter in longest-streak loop instead of allocating new one per iteration | **Reduced allocations** |

### AFTER Round 2

| Operation | 215 events | 500 events | 1000 events |
|-----------|-----------|-----------|------------|
| `deriveState()` (with radar + cache) | **7.36ms** | **16.87ms** | **33.50ms** |
| `RadarChartView.computeScores()` (standalone) | 0.22ms | — | 1.02ms |
| **Full refresh** (single deriveState) | **7.49ms** | — | **34.03ms** |
| JSON encode (compact, 215) | 1.13ms (79,713 bytes) | — | — |
| ISO8601 parse (215 timestamps) | 5.45ms | — | — |

### DELTA — Round 2

| Metric | BEFORE R2 | AFTER R2 | Change |
|--------|-----------|----------|--------|
| deriveState (215 events) | 13.45ms | 7.36ms | **-45%** |
| deriveState (500 events) | 31.16ms | 16.87ms | **-46%** |
| deriveState (1000 events) | 61.91ms | 33.50ms | **-46%** |
| Full refresh (215 events) | 13.93ms | 7.49ms | **-46%** |
| Full refresh (1000 events) | 64.31ms | 34.03ms | **-47%** |
| JSON cache file size | 105,972 bytes | 79,713 bytes | **-25%** |
| Radar: separate sort + iteration | Yes (0.20ms) | No (included in single pass) | **Eliminated** |

### CUMULATIVE — BEFORE (original) vs AFTER Round 2

| Metric | Original BEFORE | After Round 2 | Cumulative Change |
|--------|----------------|---------------|-------------------|
| Full refresh (215 events) | 20.06ms | 7.49ms | **-63%** |
| Full refresh (1000 events) | 117.00ms | 34.03ms | **-71%** |
| Full refresh + soilHistory (215) | ~28ms | 7.49ms | **-73%** |
| Per-keystroke derivation cost | 7.85ms | ~0ms | **-100%** |
| Event iterations per refresh | 4–5 | 1 | **-75%** |
| Radar: separate computation | Yes | No (in single pass) | **Eliminated** |
| JSON cache file size | ~106KB | ~80KB | **-25%** |

### Key Wins (Round 2)

1. **Timestamp parse caching**: The biggest single win. ISO8601 parsing was the dominant cost in `deriveState()` — each event's timestamp was parsed 2-3 times (once in the main loop, once inside each `process*` function). A local `[String: Date]` cache + passing pre-parsed `Date?` to process functions cut deriveState nearly in half.
2. **Radar scores consolidated**: `RadarChartView.computeScores()` sorted all events and iterated them separately. Now radar weighted scores are accumulated during the existing event loop in `deriveState()`, stored as `state.radarScores`. TreeCanvasView reads them from the cached state — zero extra work.
3. **Compact JSON encoding**: Removing `.prettyPrinted` from the EventStore disk cache encoder saves 25% file size with no readability cost (the cache file is not human-readable anyway).
4. **Formatter reuse**: `ISO8601DateFormatter()` was allocated per-iteration in the longest-streak loop. Reusing a single instance eliminates unnecessary allocations.
