# iOS Design Convergence

**Date**: 2026-01-28
**Status**: Approved

## Summary

Modify the iOS app to match the web design with high fidelity while retaining iOS-native interaction patterns (tabs, sheets, navigation). Focus on design token precision with monospaced typography throughout, adding weight variety for hierarchy.

## Design Decisions

| Aspect | Decision |
|--------|----------|
| Typography | Keep monospaced, add weight variety (regular/medium/semibold) |
| Buttons | Match web exactly: ghost/outline style with transparent backgrounds |
| Interaction patterns | Keep iOS-native (TabView, NavigationStack, sheet modals) |

## Changes Required

### 1. Button Style Overhaul

**Current (filled backgrounds):**
```swift
private var backgroundColor: Color {
    switch variant {
    case .primary: return .wood
    case .secondary: return .clear
    case .water: return .trunkWater
    case .sun: return .trunkSun
    case .destructive: return Color(red: 0.54, green: 0.29, blue: 0.23)
    }
}
```

**Target (ghost/outline style):**
```swift
private var backgroundColor: Color {
    switch variant {
    case .primary: return .clear
    case .secondary: return .clear
    case .water: return .clear
    case .sun: return .clear
    case .destructive: return .clear
    }
}

private var foregroundColor: Color {
    switch variant {
    case .primary: return .wood
    case .secondary: return .inkFaint
    case .water: return .trunkWater
    case .sun: return .trunkSun
    case .destructive: return Color(red: 0.54, green: 0.29, blue: 0.23)
    }
}
```

**Hover/Press state (subtle fill on interaction):**
```swift
// Add pressed state background matching web hover
private var pressedBackgroundColor: Color {
    switch variant {
    case .primary: return .wood.opacity(0.08)
    case .secondary: return .ink.opacity(0.03)
    case .water: return .trunkWater.opacity(0.08)
    case .sun: return .trunkSun.opacity(0.08)
    case .destructive: return Color(red: 0.54, green: 0.29, blue: 0.23).opacity(0.08)
    }
}
```

### 2. Typography Weight System

**Current:** Only uses `.monospaced` design with no weight differentiation.

**Target:** Add weight variants while keeping monospaced:

```swift
// MARK: - Typography Weights

enum TrunkFontWeight {
    case regular    // Body text, descriptions
    case medium     // Labels, secondary emphasis
    case semibold   // Headings, primary emphasis
}

extension View {
    func trunkFont(size: CGFloat, weight: TrunkFontWeight = .regular) -> some View {
        let uiWeight: Font.Weight = switch weight {
        case .regular: .regular
        case .medium: .medium
        case .semibold: .semibold
        }
        return self.font(.system(size: size, weight: uiWeight, design: .monospaced))
    }
}
```

**Usage hierarchy:**
| Element | Weight | Example |
|---------|--------|---------|
| Page titles | semibold | "Today", "Tree", "Settings" |
| Section headers | medium | "Active Sprouts", "Resources" |
| Body text | regular | Descriptions, notes, journal entries |
| Button labels | medium | "WATER", "SHINE", "PLANT" |
| Meter labels | regular | "2/3", "1/1" |

### 3. Letter Spacing Adjustment

**Current:** `tracking(1.5)` for uppercase labels (quite wide)

**Target:** Match web's `letter-spacing: 0.03em`:
```swift
// 0.03em at typical 14px size = 0.42pt
static let trackingNormal: CGFloat = 0.42

// For uppercase button labels (slightly wider)
static let trackingUppercase: CGFloat = 0.5
```

**Update MonoLabel modifier:**
```swift
struct MonoLabel: ViewModifier {
    var size: CGFloat = TrunkTheme.textSm
    var uppercase: Bool = true

    func body(content: Content) -> some View {
        content
            .font(.system(size: size, design: .monospaced))
            .textCase(uppercase ? .uppercase : nil)
            .tracking(uppercase ? TrunkTheme.trackingUppercase : TrunkTheme.trackingNormal)
            .foregroundStyle(Color.inkFaint)
    }
}
```

### 4. Border Color Adjustment (Minor)

**Current:** `Color.ink.opacity(0.08)` for borderSubtle

**Target:** Match web's `rgba(139, 90, 43, 0.08)` (wood-based):
```swift
static let borderSubtle = Color.wood.opacity(0.08)
static let border = Color.wood.opacity(0.15)
static let borderStrong = Color.wood.opacity(0.25)
```

## Files to Change

| File | Change |
|------|--------|
| `app/Trunk/Resources/Theme.swift` | Button style overhaul, add font weight system, update letter spacing, adjust border colors |

## Not Changing

- Tab navigation structure (TabView with 4 tabs)
- Sheet presentation for modals
- NavigationStack for drill-down
- Core color palette (already matches)
- Spacing scale (already matches)
- Type scale values (already matches)

## Visual Reference

**Web button pattern:**
```css
.btn-water {
  border-color: var(--water);
  color: var(--water);
  background: transparent;
}
.btn-water:hover:not(:disabled) {
  background: rgba(70, 130, 180, 0.08);
}
```

**iOS equivalent:**
```swift
Button("Water") { ... }
    .buttonStyle(.trunkWater)  // Ghost style, water color text/border
```

## Implementation Notes

1. The `TrunkButtonStyle` struct needs complete rewrite of color logic
2. Font weight system should be additive (new modifier, existing code still works)
3. Letter spacing is a small visual polish but improves consistency
4. Border color change is subtle but aligns the earthy tone throughout

## Validation

After implementation:
- [ ] All buttons display as outlined/ghost (no filled backgrounds)
- [ ] Pressed state shows subtle 8% opacity fill
- [ ] Section headers appear slightly bolder than body text
- [ ] Letter spacing feels balanced (not too tight or too wide)
- [ ] Borders have warm wood undertone, not pure black
