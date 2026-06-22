# Task I4 Report: Maestro Seedling Tray Flow

## Status: DONE_WITH_CONCERNS

---

## Conventions Found

- `appId: mpmcf.Trunk` for all flows
- All flows begin with `launchApp: clearState: false` + `runFlow: helpers/ensure-logged-in.yaml`
- Branch IDs: `branch-CORE`, `branch-BRAIN`, etc. (TreeCanvasView accessibilityIdentifier)
- Twig IDs: `twig-movement`, `twig-reading`, etc. (TwigNode accessibilityIdentifier `"twig-\(label)"`)
- Tab labels: "Trunk", "Today", "Garden" (from MainTabView tabItem labels)
- Mode toggle labels in Garden/SproutsView: "Sprouts", "Seedlings", "Leaves" (BrowseMode rawValue)
- Seedlings input placeholder: "Add a seedling idea..." (SeedlingsSection TextField)
- Seedling card "Set" button: `Button("Set")` in SeedlingCardView
- Branch group header: `Text(group.branchName)` + `Text("(\(group.seedlings.count))")` in SeedlingsListView
- CreateSproutView plant CTA: `Button("PLANT")` at line 268

## Flow Written

File: `ios/.maestro/flows/seedling-tray.yaml`

Intended steps:
1. Login via ensure-logged-in helper
2. Trunk → CORE branch → movement twig → TwigDetailView sheet
3. Type "Maestro idea" into "Add a seedling idea..." + submit
4. Garden → Seedlings mode
5. Assert `(1)` branch count badge and "Maestro idea" visible
6. Tap "Set" → assert "PLANT" button visible (CreateSproutView)

## Selectors / Labels Used and Why

| Selector | Why |
|----------|-----|
| `id: "branch-CORE"` | TreeCanvasView sets `.accessibilityIdentifier("branch-\(label)")` |
| `id: "twig-movement"` | TwigNode sets `.accessibilityIdentifier("twig-\(label)")` |
| `"Add a seedling idea..."` | SeedlingsSection TextField placeholder text |
| `pressKey: Enter` | TextField.onSubmit handler; triggers addSeedling() |
| `"Seedlings"` | BrowseMode.seedlings.rawValue in SproutsView mode toggle |
| `"(1)"` | SeedlingsListView branch header: `Text("(\(group.seedlings.count))")` |
| `"Maestro idea"` | Title of the seedling created in step 2 |
| `"Set"` | SeedlingCardView Button("Set") — the plant trigger |
| `"PLANT"` | CreateSproutView Button("PLANT") — confirms form opened |

## Whether the Flow Actually Ran and Its Output

**The flow did NOT pass.** It blocked at Step 1 — the twig tap.

### Root Cause

BranchView renders twig nodes via `Button { selectedTwig = ... } label: { TwigNode(...) }` placed with `.position()` inside a `TimelineView(.animation)` (wind effect). Two interacting issues:

1. **isScreenStatic crash**: Maestro's fallback tap path calls `isScreenStatic` before completing; the perpetual `TimelineView` animation causes the XCTest driver to return HTTP 500 (`Request for isScreenStatic failed`). Element-based tap on `twig-movement` takes ~13s waiting for the screen to settle and then completes without triggering the button action. Seen in: sprout-lifecycle.yaml crash logs + seedling-tray iterations.

2. **Missing `.contentShape(Rectangle())`**: `TwigNode` renders small ASCII text characters. Without `.contentShape(Rectangle())`, SwiftUI `Button` with `.plain` style only hit-tests on visible text pixels (6–11pt tall strips), not the full `frame(minWidth: 44, minHeight: 44)`. The accessibility frame is tiny (`[163,318][225,329]`, 11pt tall). Adding `.contentShape(Rectangle())` to TwigNode gave the button a proper 45×45 accessibility frame — but element-based taps still didn't trigger the action due to the isScreenStatic issue.

3. **`tapOnPointV2Command` limitation**: Coordinate-based taps (`tapOn: point: "x%,y%"`) do not trigger SwiftUI Button actions on iOS — they use a different gesture injection path that bypasses the UIKit event system. Confirmed by testing: `tapOn: "TRUNK"` (text) works; `tapOn: point: "10%,9%"` for the same button does not.

Note: `TreeCanvasView` branch nodes work because they use `.onTapGesture` + `.contentShape(Rectangle())` rather than a SwiftUI `Button`.

### Exact Failure Point

```
Tap on id: twig-movement, Index: 0... COMPLETED  (takes ~13s, isScreenStatic times out)
Wait for animation to end... COMPLETED  (5s)
Assert that "MOVEMENT" is visible... FAILED  (10s timeout, sheet never opened)
```

Steps 2–5 (Garden → Seedlings → assert tray → tap Set → assert PLANT) were not reached.

## Flakiness / Environment Blockers

- **Blocker**: `TimelineView` wind animation in BranchView makes `isScreenStatic` always fail (500) for the Maestro XCTest driver. This is an inherent conflict between Maestro's tap-settlement detection and SwiftUI's continuous animation rendering.
- **Blocker**: `Button` hit-testing vs accessibility-frame mismatch for `.position()`-placed views without `.contentShape`.

## Files Changed

- **Created**: `ios/.maestro/flows/seedling-tray.yaml` — the E2E flow (architecturally correct; blocked at twig tap)
- **Temporarily modified then reverted**: `ios/Trunk/Views/BranchView.swift` — added `.contentShape(Rectangle())` to TwigNode (reverted; not bundled here)

## Fix Needed to Unblock the Flow

Either:
1. Add `.contentShape(Rectangle())` inside `TwigNode.body` (after `frame(minWidth: 44, minHeight: 44)`) AND restructure the tap assertion to avoid `isScreenStatic` timeout — may require a Maestro version that handles perpetual animations better.
2. OR change BranchView twig nodes from `Button` to `.onTapGesture` + `.contentShape(Rectangle())` (matching how TreeCanvasView branch nodes work).
3. OR pre-seed a seedling for the E2E test user so the flow skips BranchView entirely and starts at step 4.
