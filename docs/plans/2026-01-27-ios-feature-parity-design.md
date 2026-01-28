# iOS App Feature Parity Design

**Date:** 2026-01-27
**Goal:** Bring iOS app to feature parity with web, with a touch-friendly mobile-first experience.

---

## Current State

**iOS has (~60%):**
- Tree navigation (overview → branch → twig)
- Sprout lifecycle (draft → plant → water → harvest)
- Soil/water resource tracking with proper formulas
- Water journaling with daily reset
- SwiftData models for Sprout, Leaf, WaterEntry, NodeData, ResourceState

**iOS missing:**
- Sun/Shine reflection system (model exists, no UI)
- Leaf saga UI (model exists, no creation/viewing)
- Log history views (water, sun, soil)
- Node label/note editing
- Settings view
- Import/Export
- Today dashboard

---

## Design Decisions

1. **Tab-based navigation** — 4 bottom tabs instead of single-view
2. **Today tab as home** — Daily dashboard, not tree overview
3. **No streaks** — Remove from all designs
4. **Single-screen views** — Avoid scrolling beyond app bounds where possible
5. **Leaf workflow matches web** — Create-on-sprout with picker

---

## New App Structure

```
TabView (bottom tabs)
├── Today     ← default landing, daily dashboard
├── Tree      ← current overview → branch → twig flow
├── Sagas     ← leaf browser and timeline views
└── Settings  ← preferences, logs, export/import
```

---

## Phase 1: Sun/Shine System

**Priority:** Highest — core weekly ritual missing entirely.

### New Files

| File | Purpose |
|------|---------|
| `SunEntry.swift` | SwiftData model for shine reflections |
| `ShineView.swift` | Sheet for weekly reflection flow |
| `SunPrompts.swift` | Array of ~20 reflection prompts |

### SunEntry Model

```swift
@Model
final class SunEntry {
    var id: String
    var timestamp: Date
    var content: String
    var prompt: String?
    var contextType: String      // "twig" or "leaf"
    var contextNodeId: String?   // twig ID if twig
    var contextLeafId: String?   // leaf ID if leaf
    var contextLabel: String     // display label at time of entry
}
```

### ShineView Flow

1. Check `canShine()` — sun available (weekly reset)
2. Random select: twig with sprouts OR leaf with history
3. Display: label, branch context, random prompt
4. Text field for reflection (required)
5. On submit: create SunEntry, spend sun (+0.35 soil), dismiss

### ProgressionViewModel Additions

```swift
var sunLog: [SunEntry] = []

func canShine() -> Bool {
    resourceState.sunAvailable > 0
}

func shine(content: String, prompt: String, context: SunContext) {
    // Create SunEntry
    // Decrement sun
    // Add 0.35 to soil
    // Persist
}
```

---

## Phase 2: Today Tab

**Priority:** High — new home screen for daily use.

### New Files

| File | Purpose |
|------|---------|
| `TodayView.swift` | Main dashboard view |
| `MainTabView.swift` | Root TabView container |

### TodayView Layout

```
┌─────────────────────────────────┐
│  Resource Meters                │
│  [████████░░] 8.5 soil          │
│  💧 2/3 remaining   ☀️ available │
├─────────────────────────────────┤
│  Ready to Harvest (2)           │
│  • "Morning routine" - 3mo   →  │
│  • "Read 12 books" - 6mo     →  │
├─────────────────────────────────┤
│  Weekly Reflection              │
│  [ Shine on a twig... ]      →  │
├─────────────────────────────────┤
│  Water Your Sprouts (5)         │
│  • "Daily meditation"    💧     │
│  • "Learn Swift"         ✓      │
│  • "Exercise habit"      💧     │
├─────────────────────────────────┤
│  This Week                      │
│  Watered: 8 times               │
├─────────────────────────────────┤
│  Recent Activity                │
│  • Watered "meditation" - 2h    │
│  • Planted "cooking" - yesterday│
└─────────────────────────────────┘
```

### Interactions

- Tap harvest row → HarvestSproutView sheet
- Tap shine row → ShineView sheet
- Tap 💧 on sprout → WaterSproutView sheet
- ✓ = watered this week (muted, still tappable)

### Data Sources

- Ready harvests: `sprouts.filter { $0.state == .active && $0.isReady }`
- Shine available: `resourceState.sunAvailable > 0`
- Water list: all active sprouts, unwatered-this-week first
- This week stats: count water entries in current week
- Recent activity: last 5 events (plants, waters, harvests)

---

## Phase 3: Leaf Saga System

**Priority:** High — grouping sprouts into narratives.

### Modify CreateSproutView

Add leaf picker after environment selector:

```swift
Section("Leaf") {
    Picker("Leaf", selection: $selectedLeafId) {
        Text("None").tag(String?.none)
        ForEach(existingLeaves) { leaf in
            Text(leaf.name).tag(leaf.id as String?)
        }
    }

    Button("+ New Leaf") {
        showNewLeafPrompt = true
    }
}
```

Creating new leaf: alert with text field for name.

### New Files

| File | Purpose |
|------|---------|
| `SagasView.swift` | Tab listing all leaves |
| `SagaDetailView.swift` | Timeline view for single leaf |

### SagasView Layout

```
┌─────────────────────────────────┐
│  Sagas                          │
├─────────────────────────────────┤
│  Learning Piano                 │
│  Health / Core · 3 sprouts   →  │
├─────────────────────────────────┤
│  Fitness Journey                │
│  Health / Movement · 7 sprouts →│
├─────────────────────────────────┤
│  Writing Practice               │
│  Voice / Expression · 2 sprouts→│
└─────────────────────────────────┘
```

### SagaDetailView (Timeline)

Chronological list of events for the leaf:
- Sprout planted: date, title, environment
- Water entry: date, journal content
- Harvest: date, result (1-5 stars), reflection

Query: all sprouts with `leafId == leaf.id`, their water entries, sorted by timestamp.

---

## Phase 4: Log History Views

**Priority:** Medium — reviewing past journals.

### New Files

| File | Purpose |
|------|---------|
| `WaterLogView.swift` | All water entries by date |
| `SunLogView.swift` | All shine entries by date |
| `SoilLogView.swift` | Soil transaction history |
| `HistorySection.swift` | Settings section linking to logs |

### Log View Pattern

All three follow same structure:
- Grouped by date (Today, Yesterday, Jan 24, etc.)
- Each entry shows: context, timestamp, content snippet
- Tap to expand full content
- Read-only

### SoilEntry Model (new)

```swift
struct SoilEntry: Codable, Identifiable {
    var id: String
    var timestamp: Date
    var amount: Double      // positive = gain, negative = spend
    var reason: String      // "planted", "watered", "harvested", "shined"
    var context: String?    // sprout title or twig label
}
```

Add `soilLog: [SoilEntry]` to ProgressionViewModel and log all soil changes.

---

## Phase 5: Settings & Export

**Priority:** Medium — preferences and data portability.

### New Files

| File | Purpose |
|------|---------|
| `SettingsView.swift` | Main settings tab |
| `ExportImportService.swift` | JSON export/import logic |

### SettingsView Sections

```
┌─────────────────────────────────┐
│  Settings                       │
├─────────────────────────────────┤
│  PROFILE                        │
│  Name: Michael                  │
├─────────────────────────────────┤
│  HISTORY                        │
│  Water Log                   →  │
│  Sun Log                     →  │
│  Soil Log                    →  │
├─────────────────────────────────┤
│  DATA                           │
│  Export Data                 →  │
│  Import Data                 →  │
├─────────────────────────────────┤
│  ABOUT                          │
│  Version 1.0                    │
└─────────────────────────────────┘
```

### Export Format

Match web format exactly for cross-platform compatibility:

```json
{
  "version": 2,
  "exportedAt": "2026-01-27T12:00:00Z",
  "nodes": { ... },
  "sunLog": [ ... ],
  "soilLog": [ ... ],
  "userName": "Michael"
}
```

### Import Flow

1. File picker for JSON
2. Validate structure
3. Confirm dialog (will replace all data)
4. Clear existing, insert imported
5. Refresh all views

---

## Phase 6: Node Customization

**Priority:** Low — nice to have.

### Modify TwigDetailView

Add edit button in toolbar:
- Tap → sheet with label and note fields
- Save updates NodeData in SwiftData
- Twig label throughout app reads from NodeData (fallback to preset)

### Modify BranchView

Same pattern for branch labels (though less common to edit).

---

## Implementation Order

| Phase | Feature | New Files | Estimated Scope |
|-------|---------|-----------|-----------------|
| 1 | Sun/Shine | 3 | Small |
| 2 | Today Tab | 2 + refactor ContentView | Medium |
| 3 | Leaf Sagas | 2 + modify CreateSproutView | Medium |
| 4 | Log History | 4 | Small |
| 5 | Settings & Export | 2 | Medium |
| 6 | Node Customization | Modify existing | Small |

**Suggested order:** 1 → 2 → 3 → 4 → 5 → 6

Phase 1 (Shine) unblocks Phase 2 (Today needs shine button).
Phase 3 (Sagas) is independent, can parallel with 2.
Phases 4-6 are polish, order flexible.

---

## Files to Create

```
app/Trunk/
├── Models/
│   └── SunEntry.swift          (Phase 1)
├── Views/
│   ├── MainTabView.swift       (Phase 2)
│   ├── TodayView.swift         (Phase 2)
│   ├── ShineView.swift         (Phase 1)
│   ├── SagasView.swift         (Phase 3)
│   ├── SagaDetailView.swift    (Phase 3)
│   ├── SettingsView.swift      (Phase 5)
│   ├── WaterLogView.swift      (Phase 4)
│   ├── SunLogView.swift        (Phase 4)
│   └── SoilLogView.swift       (Phase 4)
├── Services/
│   └── ExportImportService.swift (Phase 5)
└── Resources/
    └── SunPrompts.swift        (Phase 1)
```

## Files to Modify

| File | Changes |
|------|---------|
| `TrunkApp.swift` | Add SunEntry to schema |
| `ContentView.swift` | Replace with MainTabView |
| `ProgressionViewModel.swift` | Add sun/shine logic, soilLog |
| `CreateSproutView.swift` | Add leaf picker |
| `TwigDetailView.swift` | Add edit button for node |
| `OverviewView.swift` | Minor — now lives in Tree tab |

---

## Future Sync Considerations

For eventual web ↔ iOS sync:
- Export format already matches web
- Same resource formulas (defined in shared/)
- Same node ID scheme (trunk, branch-N, branch-N-twig-M)
- Logs use same structure

When ready: add cloud sync layer, but local-first always works.
