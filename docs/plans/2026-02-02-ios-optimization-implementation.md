# iOS Optimization Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Transform iOS app with haptics, spring animations, enhanced Today view, polished dialogs, and interactive tree canvas.

**Architecture:** Layer-by-layer enhancement starting with foundational utilities (haptics, animations), then view polish (Today, dialogs), and finally the tree canvas. Each layer builds on the previous.

**Tech Stack:** SwiftUI, SwiftData, iOS 17+ APIs (sensoryFeedback, spring animations, MagnifyGesture)

---

## Phase 1: Foundation

### Task 1: Create HapticManager

**Files:**
- Create: `ios/Trunk/Components/HapticManager.swift`

**Step 1: Create Components directory and HapticManager file**

```swift
//
//  HapticManager.swift
//  Trunk
//
//  Centralized haptic feedback for consistent tactile responses.
//

import SwiftUI
import UIKit

enum HapticManager {
    /// Light tap for selections and button presses
    static func tap() {
        let generator = UIImpactFeedbackGenerator(style: .light)
        generator.impactOccurred()
    }

    /// Medium impact for successful actions
    static func impact() {
        let generator = UIImpactFeedbackGenerator(style: .medium)
        generator.impactOccurred()
    }

    /// Heavy impact for significant actions
    static func heavy() {
        let generator = UIImpactFeedbackGenerator(style: .heavy)
        generator.impactOccurred()
    }

    /// Success notification for completed actions
    static func success() {
        let generator = UINotificationFeedbackGenerator()
        generator.notificationOccurred(.success)
    }

    /// Warning notification
    static func warning() {
        let generator = UINotificationFeedbackGenerator()
        generator.notificationOccurred(.warning)
    }

    /// Selection changed feedback
    static func selection() {
        let generator = UISelectionFeedbackGenerator()
        generator.selectionChanged()
    }
}
```

**Step 2: Verify file compiles**

Run: Open Xcode, build the project (Cmd+B)
Expected: Build succeeds with no errors

**Step 3: Commit**

```bash
git add ios/Trunk/Components/HapticManager.swift
git commit -m "feat(ios): add HapticManager for centralized haptic feedback"
```

---

### Task 2: Create Animation Extensions

**Files:**
- Create: `ios/Trunk/Extensions/View+Animations.swift`

**Step 1: Create Extensions directory and animation helpers**

```swift
//
//  View+Animations.swift
//  Trunk
//
//  Spring animation presets and stagger helpers for organic feel.
//

import SwiftUI

// MARK: - Animation Presets

extension Animation {
    /// Standard spring for most transitions (0.35s, slightly bouncy)
    static let trunkSpring = Animation.spring(response: 0.35, dampingFraction: 0.7)

    /// Bouncier spring for celebratory moments
    static let trunkBounce = Animation.spring(response: 0.4, dampingFraction: 0.6)

    /// Quick spring for micro-interactions
    static let trunkQuick = Animation.spring(response: 0.2, dampingFraction: 0.8)

    /// Slow spring for major view transitions
    static let trunkSlow = Animation.spring(response: 0.5, dampingFraction: 0.75)
}

// MARK: - View Modifiers

extension View {
    /// Staggered entrance animation for list items
    func staggeredEntrance(index: Int, appeared: Bool, delay: Double = 0.08) -> some View {
        self
            .opacity(appeared ? 1 : 0)
            .offset(y: appeared ? 0 : 20)
            .animation(.trunkSpring.delay(Double(index) * delay), value: appeared)
    }

    /// Scale feedback for button presses
    func pressScale(_ isPressed: Bool) -> some View {
        self.scaleEffect(isPressed ? 0.96 : 1.0)
            .animation(.trunkQuick, value: isPressed)
    }

    /// Pulse animation for attention-grabbing elements
    func pulse(_ isPulsing: Bool) -> some View {
        self.opacity(isPulsing ? 0.7 : 1.0)
            .animation(
                isPulsing
                    ? Animation.easeInOut(duration: 0.8).repeatForever(autoreverses: true)
                    : .default,
                value: isPulsing
            )
    }
}

// MARK: - Animated Card Modifier

struct AnimatedCardModifier: ViewModifier {
    let index: Int
    @State private var appeared = false

    func body(content: Content) -> some View {
        content
            .staggeredEntrance(index: index, appeared: appeared)
            .onAppear {
                appeared = true
            }
    }
}

extension View {
    /// Apply staggered card entrance animation
    func animatedCard(index: Int) -> some View {
        modifier(AnimatedCardModifier(index: index))
    }
}
```

**Step 2: Verify file compiles**

Run: Build in Xcode (Cmd+B)
Expected: Build succeeds

**Step 3: Commit**

```bash
git add ios/Trunk/Extensions/View+Animations.swift
git commit -m "feat(ios): add spring animation presets and stagger helpers"
```

---

### Task 3: Add Haptics to Existing Buttons

**Files:**
- Modify: `ios/Trunk/Views/TodayView.swift`
- Modify: `ios/Trunk/Views/OverviewView.swift`

**Step 1: Update TodayView harvest button with haptic**

In `ios/Trunk/Views/TodayView.swift`, find the harvest button in `harvestSection`:

```swift
// Find this in harvestSection:
Button {
    selectedSproutForHarvest = sprout
} label: {
```

Change to:

```swift
Button {
    HapticManager.tap()
    selectedSproutForHarvest = sprout
} label: {
```

**Step 2: Update TodayView water button with haptic**

In `waterSection`, find:

```swift
Button {
    selectedSproutForWater = sprout
} label: {
```

Change to:

```swift
Button {
    HapticManager.tap()
    selectedSproutForWater = sprout
} label: {
```

**Step 3: Update TodayView shine button with haptic**

In `shineSection`, find:

```swift
Button {
    showShineSheet = true
} label: {
```

Change to:

```swift
Button {
    HapticManager.tap()
    showShineSheet = true
} label: {
```

**Step 4: Update OverviewView water button with haptic**

In `ios/Trunk/Views/OverviewView.swift`, in `ActiveSproutRow`, find:

```swift
Button {
    onWater(sprout)
} label: {
```

Change to:

```swift
Button {
    HapticManager.tap()
    onWater(sprout)
} label: {
```

**Step 5: Build and test**

Run: Build in Xcode, run on device/simulator
Expected: Tapping buttons triggers light haptic feedback

**Step 6: Commit**

```bash
git add ios/Trunk/Views/TodayView.swift ios/Trunk/Views/OverviewView.swift
git commit -m "feat(ios): add haptic feedback to Today and Overview buttons"
```

---

## Phase 2: Today View Polish

### Task 4: Create GreetingHeader Component

**Files:**
- Create: `ios/Trunk/Components/GreetingHeader.swift`
- Modify: `ios/Trunk/Services/AuthService.swift` (add user profile fetch)

**Step 1: Add profile fetch to AuthService**

In `ios/Trunk/Services/AuthService.swift`, add after `private(set) var isLoading`:

```swift
private(set) var userFullName: String?
```

Add this method after `initialize()`:

```swift
/// Fetch user profile from Supabase
func fetchProfile() async {
    guard let client = SupabaseClientProvider.shared,
          let userId = user?.id else { return }

    do {
        let response: [String: String?] = try await client
            .from("profiles")
            .select("full_name")
            .eq("id", value: userId.uuidString)
            .single()
            .execute()
            .value

        userFullName = response["full_name"] ?? nil
    } catch {
        print("Failed to fetch profile: \(error)")
    }
}
```

In `initialize()`, after setting `user = session?.user`, add:

```swift
if user != nil {
    await fetchProfile()
}
```

**Step 2: Create GreetingHeader**

```swift
//
//  GreetingHeader.swift
//  Trunk
//
//  Time-aware greeting with user name and stats summary.
//

import SwiftUI

struct GreetingHeader: View {
    let userName: String?
    let activeSproutCount: Int
    let readyToHarvestCount: Int

    private var greeting: String {
        let hour = Calendar.current.component(.hour, from: Date())
        switch hour {
        case 5..<12: return "Good morning"
        case 12..<17: return "Good afternoon"
        case 17..<21: return "Good evening"
        default: return "Good night"
        }
    }

    private var summaryText: String {
        var parts: [String] = []
        if activeSproutCount > 0 {
            parts.append("\(activeSproutCount) sprout\(activeSproutCount == 1 ? "" : "s") growing")
        }
        if readyToHarvestCount > 0 {
            parts.append("\(readyToHarvestCount) ready to harvest")
        }
        if parts.isEmpty {
            return "No active sprouts"
        }
        return parts.joined(separator: " · ")
    }

    var body: some View {
        VStack(alignment: .leading, spacing: TrunkTheme.space1) {
            HStack(spacing: TrunkTheme.space2) {
                Text(greeting)
                    .font(.system(size: TrunkTheme.textLg, design: .monospaced))
                    .foregroundStyle(Color.inkLight)

                if let name = userName, !name.isEmpty {
                    Text(name)
                        .font(.system(size: TrunkTheme.textLg, weight: .medium, design: .monospaced))
                        .foregroundStyle(Color.ink)
                }
            }

            Rectangle()
                .fill(Color.border)
                .frame(height: 1)

            Text(summaryText)
                .font(.system(size: TrunkTheme.textSm, design: .monospaced))
                .foregroundStyle(Color.inkFaint)
        }
        .padding(.bottom, TrunkTheme.space2)
    }
}

#Preview {
    VStack(spacing: 20) {
        GreetingHeader(userName: "Michael", activeSproutCount: 3, readyToHarvestCount: 1)
        GreetingHeader(userName: nil, activeSproutCount: 0, readyToHarvestCount: 0)
    }
    .padding()
    .background(Color.parchment)
}
```

**Step 3: Build and verify**

Run: Build in Xcode
Expected: Build succeeds

**Step 4: Commit**

```bash
git add ios/Trunk/Services/AuthService.swift ios/Trunk/Components/GreetingHeader.swift
git commit -m "feat(ios): add GreetingHeader with time-aware greeting"
```

---

### Task 5: Integrate GreetingHeader into TodayView

**Files:**
- Modify: `ios/Trunk/Views/TodayView.swift`

**Step 1: Add auth service environment**

At the top of TodayView struct, add:

```swift
@Environment(AuthService.self) private var authService
```

**Step 2: Replace toolbar title with GreetingHeader**

Find the `body` var and replace the toolbar section. Remove:

```swift
.toolbar {
    ToolbarItem(placement: .principal) {
        Text("TODAY")
            .font(.system(size: TrunkTheme.textBase, design: .monospaced))
            .tracking(2)
            .foregroundStyle(Color.wood)
    }
}
```

With:

```swift
.toolbar {
    ToolbarItem(placement: .principal) {
        Text("TODAY")
            .font(.system(size: TrunkTheme.textBase, design: .monospaced))
            .tracking(2)
            .foregroundStyle(Color.wood)
    }
}
```

**Step 3: Add GreetingHeader at top of VStack**

In the body, find the VStack inside ScrollView and add GreetingHeader as first item:

```swift
VStack(alignment: .leading, spacing: TrunkTheme.space4) {
    // Add this at the top:
    GreetingHeader(
        userName: authService.userFullName,
        activeSproutCount: activeSprouts.count,
        readyToHarvestCount: readyToHarvest.count
    )

    // Resource meters
    resourceMeters
    // ... rest of content
}
```

**Step 4: Build and test**

Run: Build and run in Xcode
Expected: Greeting header shows at top of Today view

**Step 5: Commit**

```bash
git add ios/Trunk/Views/TodayView.swift
git commit -m "feat(ios): integrate GreetingHeader into TodayView"
```

---

### Task 6: Add Staggered Card Animations to TodayView

**Files:**
- Modify: `ios/Trunk/Views/TodayView.swift`

**Step 1: Add appeared state**

Add to TodayView's state properties:

```swift
@State private var cardsAppeared = false
```

**Step 2: Apply staggered animation to sections**

Wrap each section with animatedCard modifier. In body, update the VStack:

```swift
VStack(alignment: .leading, spacing: TrunkTheme.space4) {
    GreetingHeader(
        userName: authService.userFullName,
        activeSproutCount: activeSprouts.count,
        readyToHarvestCount: readyToHarvest.count
    )
    .animatedCard(index: 0)

    // Resource meters
    resourceMeters
        .animatedCard(index: 1)

    // Ready to harvest
    if !readyToHarvest.isEmpty {
        harvestSection
            .animatedCard(index: 2)
    }

    // Weekly reflection
    shineSection
        .animatedCard(index: 3)

    // Water your sprouts
    if !waterable.isEmpty {
        waterSection
            .animatedCard(index: 4)
    }

    // Active Leafs section
    if !activeLeafs.isEmpty {
        leafsSection
            .animatedCard(index: 5)
    }

    // Recent activity
    if !recentActivity.isEmpty {
        activitySection
            .animatedCard(index: 6)
    }
}
```

**Step 3: Build and test**

Run: Build and run, navigate to Today view
Expected: Cards fade in with staggered delay on appear

**Step 4: Commit**

```bash
git add ios/Trunk/Views/TodayView.swift
git commit -m "feat(ios): add staggered entrance animations to TodayView cards"
```

---

## Phase 3: Dialog Upgrades

### Task 7: Polish WaterSproutView

**Files:**
- Modify: `ios/Trunk/Views/Dialogs/WaterSproutView.swift`

**Step 1: Replace Form with custom styled view**

Replace the entire body with:

```swift
var body: some View {
    ZStack {
        Color.parchment
            .ignoresSafeArea()

        ScrollView {
            VStack(alignment: .leading, spacing: TrunkTheme.space4) {
                // Header
                VStack(alignment: .center, spacing: TrunkTheme.space2) {
                    Text("💧")
                        .font(.system(size: 40))

                    Text("WATER")
                        .font(.system(size: TrunkTheme.textLg, design: .monospaced))
                        .tracking(2)
                        .foregroundStyle(Color.trunkWater)

                    Text(sprout.title)
                        .font(.system(size: TrunkTheme.textBase, design: .monospaced))
                        .foregroundStyle(Color.ink)
                        .multilineTextAlignment(.center)
                }
                .frame(maxWidth: .infinity)
                .padding(.top, TrunkTheme.space4)

                // Journal prompt
                VStack(alignment: .leading, spacing: TrunkTheme.space2) {
                    Text("TODAY'S PROMPT")
                        .monoLabel(size: TrunkTheme.textXs)

                    Text("\"What progress did you make today?\"")
                        .font(.system(size: TrunkTheme.textBase, design: .monospaced))
                        .italic()
                        .foregroundStyle(Color.inkLight)
                        .padding(TrunkTheme.space3)
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .background(Color.paper)
                        .overlay(
                            Rectangle()
                                .stroke(Color.border, lineWidth: 1)
                        )
                }

                // Note input
                VStack(alignment: .leading, spacing: TrunkTheme.space2) {
                    Text("YOUR REFLECTION")
                        .monoLabel(size: TrunkTheme.textXs)

                    TextField("Write your thoughts...", text: $note, axis: .vertical)
                        .font(.system(size: TrunkTheme.textBase, design: .monospaced))
                        .foregroundStyle(Color.ink)
                        .lineLimit(3...6)
                        .padding(TrunkTheme.space3)
                        .background(Color.paper)
                        .overlay(
                            Rectangle()
                                .stroke(Color.trunkWater.opacity(isNoteFocused ? 1 : 0.3), lineWidth: 1)
                        )
                        .focused($isNoteFocused)
                }

                // Soil recovery info
                HStack {
                    Text("SOIL RECOVERY")
                        .font(.system(size: TrunkTheme.textXs, design: .monospaced))
                        .foregroundStyle(Color.inkFaint)

                    Spacer()

                    Text("+\(String(format: "%.2f", ProgressionService.waterRecovery))")
                        .font(.system(size: TrunkTheme.textBase, design: .monospaced))
                        .foregroundStyle(Color.twig)
                }
                .padding(TrunkTheme.space3)
                .background(Color.paper)
                .overlay(
                    Rectangle()
                        .stroke(Color.border, lineWidth: 1)
                )

                // Action buttons
                HStack(spacing: TrunkTheme.space3) {
                    Button("CANCEL") {
                        dismiss()
                    }
                    .buttonStyle(.trunkSecondary)

                    Spacer()

                    Button {
                        HapticManager.impact()
                        waterSprout()
                    } label: {
                        HStack(spacing: TrunkTheme.space2) {
                            Text("💧")
                            Text("WATER")
                        }
                    }
                    .buttonStyle(.trunkWater)
                    .disabled(!progression.canWater)
                    .opacity(progression.canWater ? 1 : 0.5)
                }
                .padding(.top, TrunkTheme.space2)
            }
            .padding(TrunkTheme.space4)
        }
    }
    .navigationTitle("")
    .navigationBarTitleDisplayMode(.inline)
    .navigationBarHidden(true)
    .onAppear {
        isNoteFocused = true
    }
}
```

**Step 2: Build and test**

Run: Build and run, tap Water on a sprout
Expected: Styled water dialog appears with haptic on Water button

**Step 3: Commit**

```bash
git add ios/Trunk/Views/Dialogs/WaterSproutView.swift
git commit -m "feat(ios): polish WaterSproutView with custom styling and haptics"
```

---

### Task 8: Polish HarvestSproutView with Emoji Picker

**Files:**
- Modify: `ios/Trunk/Views/Dialogs/HarvestSproutView.swift`

**Step 1: Add result emoji mapping**

Add at top of struct, after state properties:

```swift
private let resultEmojis = ["🥀", "🌱", "🌿", "🌳", "🌲"]

@State private var showConfetti = false
```

**Step 2: Replace body with custom styled view**

Replace the entire body with:

```swift
var body: some View {
    ZStack {
        Color.parchment
            .ignoresSafeArea()

        ScrollView {
            VStack(alignment: .leading, spacing: TrunkTheme.space4) {
                // Header
                VStack(alignment: .center, spacing: TrunkTheme.space2) {
                    Text("🌻")
                        .font(.system(size: 40))

                    Text("HARVEST")
                        .font(.system(size: TrunkTheme.textLg, design: .monospaced))
                        .tracking(2)
                        .foregroundStyle(Color.twig)

                    Text(sprout.title)
                        .font(.system(size: TrunkTheme.textBase, design: .monospaced))
                        .foregroundStyle(Color.ink)
                        .multilineTextAlignment(.center)

                    Text("\(sprout.season.label) · \(sprout.environment.label)")
                        .font(.system(size: TrunkTheme.textSm, design: .monospaced))
                        .foregroundStyle(Color.inkFaint)
                }
                .frame(maxWidth: .infinity)
                .padding(.top, TrunkTheme.space4)

                // Emoji result picker
                VStack(alignment: .leading, spacing: TrunkTheme.space3) {
                    Text("HOW DID IT BLOOM?")
                        .monoLabel(size: TrunkTheme.textXs)

                    HStack(spacing: TrunkTheme.space4) {
                        ForEach(1...5, id: \.self) { result in
                            Button {
                                HapticManager.selection()
                                withAnimation(.trunkBounce) {
                                    selectedResult = result
                                }
                            } label: {
                                VStack(spacing: TrunkTheme.space1) {
                                    Text(resultEmojis[result - 1])
                                        .font(.system(size: selectedResult == result ? 36 : 28))
                                        .scaleEffect(selectedResult == result ? 1.1 : 1.0)

                                    Text("\(result)")
                                        .font(.system(size: TrunkTheme.textXs, design: .monospaced))
                                        .foregroundStyle(selectedResult == result ? Color.ink : Color.inkFaint)
                                }
                            }
                            .buttonStyle(.plain)
                        }
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, TrunkTheme.space3)
                    .background(Color.paper)
                    .overlay(
                        Rectangle()
                            .stroke(Color.border, lineWidth: 1)
                    )
                }

                // Reward preview
                VStack(spacing: TrunkTheme.space2) {
                    HStack {
                        Text("Soil Returned")
                            .font(.system(size: TrunkTheme.textBase, design: .monospaced))
                            .foregroundStyle(Color.ink)
                        Spacer()
                        Text("+\(sprout.soilCost)")
                            .font(.system(size: TrunkTheme.textBase, design: .monospaced))
                            .foregroundStyle(Color.twig)
                    }

                    HStack {
                        Text("Capacity Reward")
                            .font(.system(size: TrunkTheme.textBase, design: .monospaced))
                            .foregroundStyle(Color.ink)
                        Spacer()
                        Text("+\(String(format: "%.2f", reward))")
                            .font(.system(size: TrunkTheme.textBase, weight: .medium, design: .monospaced))
                            .foregroundStyle(Color.twig)
                    }
                }
                .padding(TrunkTheme.space3)
                .background(Color.paper)
                .overlay(
                    Rectangle()
                        .stroke(Color.border, lineWidth: 1)
                )

                // Action button
                Button {
                    HapticManager.success()
                    harvestSprout()
                } label: {
                    HStack(spacing: TrunkTheme.space2) {
                        Text("🌻")
                        Text("HARVEST")
                    }
                    .frame(maxWidth: .infinity)
                }
                .buttonStyle(.trunk)
                .padding(.top, TrunkTheme.space2)
            }
            .padding(TrunkTheme.space4)
        }
    }
    .navigationTitle("")
    .navigationBarTitleDisplayMode(.inline)
    .toolbar {
        ToolbarItem(placement: .cancellationAction) {
            Button("Cancel") {
                dismiss()
            }
            .font(.system(size: TrunkTheme.textSm, design: .monospaced))
            .foregroundStyle(Color.inkFaint)
        }
    }
}
```

**Step 3: Build and test**

Run: Build and run, harvest a sprout
Expected: Emoji picker with spring animation, success haptic on harvest

**Step 4: Commit**

```bash
git add ios/Trunk/Views/Dialogs/HarvestSproutView.swift
git commit -m "feat(ios): polish HarvestSproutView with emoji picker and haptics"
```

---

### Task 9: Add Success Haptic to ShineView

**Files:**
- Modify: `ios/Trunk/Views/Dialogs/ShineView.swift`

**Step 1: Add haptic to performShine**

In the `performShine` method, add haptic at the start:

```swift
private func performShine(twig: TwigContext) {
    HapticManager.success()

    // Create SunEntry (twig-only)
    // ... rest of method
}
```

**Step 2: Build and test**

Run: Build and run, perform a shine
Expected: Success haptic triggers on shine

**Step 3: Commit**

```bash
git add ios/Trunk/Views/Dialogs/ShineView.swift
git commit -m "feat(ios): add success haptic to ShineView"
```

---

## Phase 4: Tree Canvas

### Task 10: Create TreeCanvasView with Zoom Gestures

**Files:**
- Create: `ios/Trunk/Components/TreeCanvasView.swift`

**Step 1: Create the zoomable tree canvas**

```swift
//
//  TreeCanvasView.swift
//  Trunk
//
//  Interactive zoomable tree visualization with pinch and pan gestures.
//

import SwiftUI

enum TreeZoomLevel {
    case overview
    case branch(Int)
}

struct TreeCanvasView: View {
    let sprouts: [Sprout]
    let progression: ProgressionViewModel
    let onSelectBranch: (Int) -> Void

    @State private var zoomLevel: TreeZoomLevel = .overview
    @State private var scale: CGFloat = 1.0
    @State private var lastScale: CGFloat = 1.0
    @State private var offset: CGSize = .zero
    @State private var lastOffset: CGSize = .zero

    private let branchCount = TrunkConstants.Tree.branchCount
    private let twigCount = TrunkConstants.Tree.twigCount

    // Wind animation
    private let windAmplitude: CGFloat = 6.0
    private let windSpeed: Double = 0.4

    var body: some View {
        GeometryReader { geo in
            TimelineView(.animation) { timeline in
                let time = timeline.date.timeIntervalSinceReferenceDate
                let center = CGPoint(x: geo.size.width / 2, y: geo.size.height / 2)

                ZStack {
                    // Canvas content based on zoom level
                    switch zoomLevel {
                    case .overview:
                        overviewContent(center: center, size: geo.size, time: time)
                    case .branch(let index):
                        branchContent(index: index, center: center, size: geo.size, time: time)
                    }
                }
                .scaleEffect(scale)
                .offset(offset)
                .gesture(zoomGesture)
                .gesture(panGesture)
                .onTapGesture(count: 2) {
                    withAnimation(.trunkSpring) {
                        resetZoom()
                    }
                }
            }
        }
    }

    // MARK: - Overview Content

    private func overviewContent(center: CGPoint, size: CGSize, time: Double) -> some View {
        let radius = min(size.width, size.height) * 0.38

        return ZStack {
            // Branch lines
            ForEach(0..<branchCount, id: \.self) { index in
                let angle = angleForBranch(index)
                let windOffset = windOffsetFor(index: index, time: time)
                let endPoint = pointOnCircle(center: center, radius: radius, angle: angle)
                let swayedEnd = CGPoint(x: endPoint.x + windOffset.x, y: endPoint.y + windOffset.y)

                Path { path in
                    path.move(to: center)
                    path.addLine(to: swayedEnd)
                }
                .stroke(Color.inkFaint.opacity(0.3), style: StrokeStyle(lineWidth: 1, dash: [4, 4]))
            }

            // Trunk
            Text("*")
                .font(.system(size: 32, design: .monospaced))
                .foregroundStyle(Color.wood)
                .position(center)
                .offset(x: sin(time * windSpeed * 0.3) * windAmplitude * 0.3,
                        y: cos(time * windSpeed * 0.25) * windAmplitude * 0.2)

            // Branches
            ForEach(0..<branchCount, id: \.self) { index in
                let angle = angleForBranch(index)
                let position = pointOnCircle(center: center, radius: radius, angle: angle)
                let branchSprouts = sproutsForBranch(index)
                let hasActive = branchSprouts.contains { $0.state == .active }
                let windOffset = windOffsetFor(index: index, time: time)

                Button {
                    HapticManager.tap()
                    withAnimation(.trunkSpring) {
                        zoomLevel = .branch(index)
                    }
                    onSelectBranch(index)
                } label: {
                    BranchNode(
                        index: index,
                        hasActiveSprouts: hasActive,
                        activeSproutCount: branchSprouts.filter { $0.state == .active }.count
                    )
                }
                .buttonStyle(.plain)
                .position(x: position.x + windOffset.x, y: position.y + windOffset.y)
            }
        }
    }

    // MARK: - Branch Content

    private func branchContent(index: Int, center: CGPoint, size: CGSize, time: Double) -> some View {
        let radius = min(size.width, size.height) * 0.35

        return ZStack {
            // Twig lines
            ForEach(0..<twigCount, id: \.self) { twigIndex in
                let angle = angleForTwig(twigIndex)
                let windOffset = windOffsetFor(index: twigIndex, time: time)
                let endPoint = pointOnCircle(center: center, radius: radius, angle: angle)
                let swayedEnd = CGPoint(x: endPoint.x + windOffset.x * 0.5, y: endPoint.y + windOffset.y * 0.5)

                Path { path in
                    path.move(to: center)
                    path.addLine(to: swayedEnd)
                }
                .stroke(Color.inkFaint.opacity(0.2), style: StrokeStyle(lineWidth: 1, dash: [2, 2]))
            }

            // Branch center
            VStack(spacing: 2) {
                Text("╭────╮")
                    .font(.system(size: 10, design: .monospaced))
                    .foregroundStyle(Color.inkFaint.opacity(0.5))
                Text(SharedConstants.Tree.branchName(index))
                    .font(.system(size: 12, design: .monospaced))
                    .foregroundStyle(Color.wood)
                Text("╰────╯")
                    .font(.system(size: 10, design: .monospaced))
                    .foregroundStyle(Color.inkFaint.opacity(0.5))
            }
            .position(center)

            // Twigs
            ForEach(0..<twigCount, id: \.self) { twigIndex in
                let angle = angleForTwig(twigIndex)
                let position = pointOnCircle(center: center, radius: radius, angle: angle)
                let windOffset = windOffsetFor(index: twigIndex, time: time)
                let nodeId = "branch-\(index)-twig-\(twigIndex)"
                let hasSprout = sprouts.contains { $0.nodeId == nodeId && $0.state == .active }

                TwigNode(
                    branchIndex: index,
                    twigIndex: twigIndex,
                    hasSprout: hasSprout
                )
                .position(x: position.x + windOffset.x * 0.5, y: position.y + windOffset.y * 0.5)
            }
        }
    }

    // MARK: - Gestures

    private var zoomGesture: some Gesture {
        MagnifyGesture()
            .onChanged { value in
                let delta = value.magnification / lastScale
                lastScale = value.magnification
                scale = min(max(scale * delta, 0.5), 3.0)
            }
            .onEnded { _ in
                lastScale = 1.0

                // Snap to zoom level based on scale
                withAnimation(.trunkSpring) {
                    if scale > 1.5 && zoomLevel == .overview {
                        // Stay at current level, user can double-tap branch
                    } else if scale < 0.8 {
                        zoomLevel = .overview
                        scale = 1.0
                        offset = .zero
                    }
                }
            }
    }

    private var panGesture: some Gesture {
        DragGesture()
            .onChanged { value in
                offset = CGSize(
                    width: lastOffset.width + value.translation.width,
                    height: lastOffset.height + value.translation.height
                )
            }
            .onEnded { _ in
                lastOffset = offset
            }
    }

    private func resetZoom() {
        scale = 1.0
        offset = .zero
        lastOffset = .zero
        zoomLevel = .overview
    }

    // MARK: - Helpers

    private func angleForBranch(_ index: Int) -> Double {
        let startAngle = -Double.pi / 2
        let angleStep = (2 * Double.pi) / Double(branchCount)
        return startAngle + Double(index) * angleStep
    }

    private func angleForTwig(_ index: Int) -> Double {
        let startAngle = -Double.pi / 2
        let angleStep = (2 * Double.pi) / Double(twigCount)
        return startAngle + Double(index) * angleStep
    }

    private func pointOnCircle(center: CGPoint, radius: Double, angle: Double) -> CGPoint {
        CGPoint(
            x: center.x + radius * cos(angle),
            y: center.y + radius * sin(angle)
        )
    }

    private func windOffsetFor(index: Int, time: Double) -> CGPoint {
        let phase = Double(index) * 0.7 + Double(index * index) * 0.13
        let speed = windSpeed * (0.85 + Double(index % 3) * 0.1)
        let x = sin(time * speed + phase) * windAmplitude
        let y = cos(time * speed * 0.8 + phase) * windAmplitude * 0.6
        return CGPoint(x: x, y: y)
    }

    private func sproutsForBranch(_ branchIndex: Int) -> [Sprout] {
        sprouts.filter { $0.nodeId.hasPrefix("branch-\(branchIndex)") }
    }
}

// MARK: - Twig Node

struct TwigNode: View {
    let branchIndex: Int
    let twigIndex: Int
    let hasSprout: Bool

    var body: some View {
        VStack(spacing: 0) {
            Text(hasSprout ? "(*)" : "( )")
                .font(.system(size: 11, design: .monospaced))
                .foregroundStyle(hasSprout ? Color.twig : Color.inkFaint)

            Text(SharedConstants.Tree.twigLabel(branchIndex: branchIndex, twigIndex: twigIndex))
                .font(.system(size: 8, design: .monospaced))
                .foregroundStyle(Color.inkFaint)
                .lineLimit(1)
        }
    }
}
```

**Step 2: Build and verify**

Run: Build in Xcode
Expected: Build succeeds

**Step 3: Commit**

```bash
git add ios/Trunk/Components/TreeCanvasView.swift
git commit -m "feat(ios): add TreeCanvasView with zoom gestures and wind animation"
```

---

### Task 11: Integrate TreeCanvasView into OverviewView

**Files:**
- Modify: `ios/Trunk/Views/OverviewView.swift`

**Step 1: Replace TreeView with TreeCanvasView**

In the body of OverviewView, find:

```swift
// Tree visualization
TreeView(sprouts: sprouts, progression: progression)
    .frame(maxHeight: .infinity)
```

Replace with:

```swift
// Tree visualization
TreeCanvasView(
    sprouts: sprouts,
    progression: progression,
    onSelectBranch: { _ in }
)
.frame(maxHeight: .infinity)
```

**Step 2: Build and test**

Run: Build and run, test pinch and pan on tree
Expected: Tree zooms and pans, double-tap resets

**Step 3: Commit**

```bash
git add ios/Trunk/Views/OverviewView.swift
git commit -m "feat(ios): integrate TreeCanvasView into OverviewView"
```

---

### Task 12: Final Polish - Update NavigationLink Transitions

**Files:**
- Modify: `ios/Trunk/Views/MainTabView.swift`

**Step 1: Disable tab animation for snappier feel**

The MainTabView already has this, verify it's present:

```swift
.transaction { transaction in
    transaction.animation = nil
}
```

**Step 2: Build final version**

Run: Full build and test all features
Expected: All haptics, animations, and tree canvas working

**Step 3: Final commit**

```bash
git add -A
git commit -m "feat(ios): complete iOS optimization with polish and animations"
```

---

## Verification Checklist

- [ ] HapticManager provides feedback on all button taps
- [ ] Spring animations feel organic and iOS-native
- [ ] GreetingHeader shows time-aware greeting with user name
- [ ] TodayView cards animate in with stagger
- [ ] WaterSproutView has styled input with haptic on water
- [ ] HarvestSproutView has emoji picker with spring animation
- [ ] ShineView triggers success haptic
- [ ] TreeCanvasView supports pinch-zoom and pan
- [ ] Double-tap resets tree zoom
- [ ] Wind animation works at all zoom levels
- [ ] Sync still works correctly (test with web)
