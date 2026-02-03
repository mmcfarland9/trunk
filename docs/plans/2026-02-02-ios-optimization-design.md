# iOS App Optimization Design

**Date**: 2026-02-02
**Goal**: Transform the iOS app from functional to "wowing" - comprehensive polish across visual system, tree visualization, Today view, and dialogs while maintaining stability and sync reliability.

**Approach**: iOS-native feel (haptics, springy animations, gestures) while preserving Trunk's earthy visual aesthetic.

---

## 1. Visual System & Micro-interactions

### Haptic Feedback System
- **Light tap**: Node selection, button presses
- **Medium impact**: Successful actions (water, plant, harvest)
- **Success notification**: Completed harvest, first water of week
- **Soft taps**: Scrolling through lists with items

### Animation Principles
- **Spring-based** for all transitions (iOS-native bounce)
- **Organic timing**: 0.3-0.5s for major transitions, 0.15-0.2s for micro-interactions
- **Staggered entrances**: List items animate in with 50-80ms delays
- **Wind animation**: Enhance existing with subtle leaf/twig shivers

### Improved Transitions
- **View changes**: Cross-dissolve with slight scale (0.98→1.0)
- **Sheet presentations**: Custom detents with springy bounce
- **Button feedback**: Scale to 0.96 on press with 0.1s spring back

### Core Modifiers
```swift
.sensoryFeedback(.impact(weight: .light), trigger: ...)
.animation(.spring(response: 0.35, dampingFraction: 0.7))
.scaleEffect(isPressed ? 0.96 : 1.0)
```

---

## 2. Interactive Tree Canvas

### Zoom Navigation Model
Three zoom levels with smooth transitions:

1. **Overview** (default): All 8 branches visible around trunk asterisk
2. **Branch view**: Zoomed into one branch, showing 8 twigs arranged around it
3. **Twig view**: Full detail panel slides up (sheet)

### Gesture System
| Gesture | Action |
|---------|--------|
| Pinch-to-zoom | Transition between overview ↔ branch view |
| Double-tap branch | Quick zoom to that branch |
| Double-tap trunk/empty | Zoom back out to overview |
| Pan | Move around when zoomed in |
| Single tap | Select node, show floating info panel |

### Visual Layout
```
OVERVIEW                    BRANCH VIEW
    ╭──────╮                    ( )  ( )  ╭─╮
    │Health│                  ( )   ╭────╮  ( )
    ╰──────╯                       │Move-│
  *            ╭──────╮        ( ) │ment │ ( )
               │Career│            ╰────╯
    ╭──────╮   ╰──────╯           ( )  (*)
    │ Mind │
    ╰──────╯                  Twigs: ( ) empty, (*) has sprout
```

### Implementation
- `ScrollView` with `MagnifyGesture` for zoom
- `GeometryReader` to calculate node positions
- `matchedGeometryEffect` for seamless branch→twig transitions
- Wind animation continues at all zoom levels (scaled appropriately)

### Floating Info Panel
When a node is selected, a small floating card appears at bottom:
- Node name
- Active sprout count (if any)
- Quick action buttons (Water/Shine)

---

## 3. Today View Experience

### Greeting Header
Replace static "TODAY" with contextual greeting:
```
Good morning, Michael
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
3 sprouts growing · 1 ready to harvest
```
Time-aware: "Good morning" / "Good afternoon" / "Good evening"

### Enhanced Resource Meters
```
┌─────────────────────────────────────┐
│  SOIL  ████████░░░░  8.5 / 12       │
│  ─────────────────────────────────  │
│  💧 ●●○  resets in 14h    ☀️ ● ready │
└─────────────────────────────────────┘
```
- Animated fill on appear (grows from 0)
- Pulse glow when resource is full/ready
- Tap to see detailed breakdown (popover)

### Card Animations
- Cards fade+slide in on appear (staggered 80ms each)
- Pull-to-refresh with custom spring animation
- Swipe actions on sprout rows:
  - Swipe right → Water (blue)
  - Swipe left → View details (gray)

### Empty States
```
    🌱

  Plant your first sprout
  to begin growing

  [Go to Tree →]
```

### Visual Rhythm
- Section headers: `READY TO HARVEST (2)` with subtle separator line
- Consistent 16px padding, 12px gaps
- Cards have 1px border with subtle shadow on press

---

## 4. Dialogs & Sheets

### Sheet Presentation Style
- Custom detents: `.medium` for quick actions, `.large` for journaling
- Slight blur on background (0.3 opacity)
- Rounded corners with grab indicator
- Dismiss with swipe or tap outside

### Water Dialog
```
┌─────────────────────────────────────┐
│           💧 WATER                  │
│     "Learn Spanish basics"          │
├─────────────────────────────────────┤
│                                     │
│  Today's prompt:                    │
│  "What small win happened today?"   │
│                                     │
│  ┌─────────────────────────────┐    │
│  │ I practiced for 10 minutes  │    │
│  │ and remembered 3 new words_ │    │
│  └─────────────────────────────┘    │
│                                     │
│  ┌─────────┐  ┌─────────────────┐   │
│  │ CANCEL  │  │   💧 WATER      │   │
│  └─────────┘  └─────────────────┘   │
└─────────────────────────────────────┘
```
- Text field auto-focuses with keyboard
- Water button pulses gently when text entered
- Success: Haptic + water droplet animation + dismiss

### Harvest Dialog
```
┌─────────────────────────────────────┐
│           🌻 HARVEST                │
│     "Learn Spanish basics"          │
│         1 month · firm              │
├─────────────────────────────────────┤
│                                     │
│  How did it bloom?                  │
│                                     │
│   🥀    🌱    🌿    🌳    🌲        │
│   1     2     3     4     5         │
│              ▲ selected             │
│                                     │
│  +2.4 soil capacity                 │
│                                     │
│  ┌─────────────────────────────┐    │
│  │        🌻 HARVEST           │    │
│  └─────────────────────────────┘    │
└─────────────────────────────────────┘
```
- Emoji scale is tappable with spring animation on select
- Shows reward preview before confirming
- Success: Confetti particles + celebration haptic

### Shine Dialog
- Similar to water but with sun theme (☀️ golden accents)
- Twig picker at top with horizontal scroll
- Weekly prompt displayed prominently

---

## 5. Implementation Architecture

### New Files/Components

```
ios/Trunk/
├── Components/
│   ├── HapticManager.swift        # Centralized haptic feedback
│   ├── AnimatedCard.swift         # Reusable card with entrance animation
│   ├── ResourceMeterView.swift    # Enhanced animated meters
│   └── FloatingInfoPanel.swift    # Selection info overlay
├── Views/
│   ├── TreeCanvasView.swift       # New zoomable tree (replaces TreeView)
│   ├── GreetingHeader.swift       # Time-aware greeting
│   └── EmptyStateView.swift       # Reusable empty states
└── Extensions/
    └── View+Animations.swift      # Spring presets, stagger helpers
```

### Implementation Phases

#### Phase 1: Foundation (stability first)
- [ ] HapticManager singleton
- [ ] Animation extension with spring presets
- [ ] Add haptics to existing buttons/actions
- [ ] Test sync still works correctly

#### Phase 2: Today View Polish
- [ ] GreetingHeader with user name from profile
- [ ] Enhanced ResourceMeterView with animations
- [ ] Card entrance animations (staggered)
- [ ] Swipe actions on sprout rows
- [ ] Empty state views

#### Phase 3: Dialog Upgrades
- [ ] Water dialog: auto-focus, pulse button, success animation
- [ ] Harvest dialog: emoji picker with spring, reward preview, confetti
- [ ] Shine dialog: golden theme, twig picker improvements

#### Phase 4: Tree Canvas (biggest change)
- [ ] TreeCanvasView with zoom gestures
- [ ] Branch → Twig zoom transitions
- [ ] Floating info panel
- [ ] Preserve wind animation at all levels
- [ ] matchedGeometryEffect for smooth transitions

### Key SwiftUI Patterns

```swift
// Staggered entrance
.opacity(appeared ? 1 : 0)
.offset(y: appeared ? 0 : 20)
.animation(.spring().delay(Double(index) * 0.08), value: appeared)

// Haptic on action
.sensoryFeedback(.impact(weight: .medium), trigger: actionTrigger)

// Zoom gesture
.gesture(MagnifyGesture().onChanged { ... }.onEnded { ... })

// Spring presets
extension Animation {
    static let trunkSpring = Animation.spring(response: 0.35, dampingFraction: 0.7)
    static let trunkBounce = Animation.spring(response: 0.4, dampingFraction: 0.6)
}
```

---

## Success Criteria

- [ ] All interactions have appropriate haptic feedback
- [ ] Animations feel organic and spring-based
- [ ] Tree canvas supports pinch-zoom and pan
- [ ] Today view feels warm and inviting on open
- [ ] Dialogs feel rewarding and celebratory
- [ ] Sync remains stable throughout all changes
- [ ] No regression in existing functionality
