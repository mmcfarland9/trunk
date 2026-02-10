//
//  BranchView.swift
//  Trunk
//
//  Graphical branch view showing twigs arranged radially around the branch center.
//  Matches the web app's zoomed-in branch aesthetic with ASCII-style boxes and guide lines.
//

import SwiftUI

// Wrapper for sheet presentation with twig index
struct TwigSelection: Identifiable {
    let id: Int
    var index: Int { id }
}

struct BranchView: View {
    let branchIndex: Int
    @Bindable var progression: ProgressionViewModel

    @State private var selectedTwig: TwigSelection?
    @State private var appeared = false
    @State private var centerAppeared = false
    @State private var isVisible = false

    // Cached sprout data (updated in .onAppear, not per frame)
    @State private var cachedBranchActive: Int = 0
    @State private var cachedTwigActive: [Int] = []

    private let twigCount = SharedConstants.Tree.twigCount

    // Wind animation
    private let windAmplitude: CGFloat = 8.0
    private let windSpeed: Double = 0.4

    var body: some View {
        ZStack {
            Color.parchment
                .ignoresSafeArea()

            GeometryReader { geo in
                let center = CGPoint(x: geo.size.width / 2, y: geo.size.height / 2)
                let radius = min(geo.size.width, geo.size.height) * 0.34
                let branchActive = cachedBranchActive
                let twigActive = cachedTwigActive.isEmpty ? Array(repeating: 0, count: twigCount) : cachedTwigActive

                if isVisible {
                    TimelineView(.animation) { timeline in
                        let time = timeline.date.timeIntervalSinceReferenceDate
                        branchContent(center: center, radius: radius, time: time, branchActive: branchActive, twigActive: twigActive)
                    }
                } else {
                    let time = Date().timeIntervalSinceReferenceDate
                    branchContent(center: center, radius: radius, time: time, branchActive: branchActive, twigActive: twigActive)
                }
            }
        }
        .navigationTitle("")
        .navigationBarTitleDisplayMode(.inline)
        .navigationBarBackButtonHidden(true)
        .swipeBackEnabled()
        .toolbar {
            ToolbarItem(placement: .topBarLeading) {
                BackButton()
            }
            ToolbarItem(placement: .principal) {
                Text(SharedConstants.Tree.branchName(branchIndex))
                    .font(.system(size: TrunkTheme.textBase, design: .monospaced))
                    .tracking(2)
                    .foregroundStyle(Color.wood)
            }
        }
        .sheet(item: $selectedTwig) { twig in
            NavigationStack {
                TwigDetailView(
                    branchIndex: branchIndex,
                    twigIndex: twig.index,
                    progression: progression
                )
            }
        }
        .onAppear {
            isVisible = true
            refreshSproutData()
            withAnimation {
                centerAppeared = true
            }
            // Slight delay so center appears first, then twigs bloom outward
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.08) {
                withAnimation {
                    appeared = true
                }
            }
        }
        .onChange(of: progression.version) {
            refreshSproutData()
        }
        .onDisappear {
            isVisible = false
            // Reset so re-entry re-animates
            appeared = false
            centerAppeared = false
        }
    }

    // MARK: - Branch Content (extracted from TimelineView closure)

    @ViewBuilder
    private func branchContent(center: CGPoint, radius: CGFloat, time: Double, branchActive: Int, twigActive: [Int]) -> some View {
        ZStack {
            // Guide lines from center to each twig
            ForEach(0..<twigCount, id: \.self) { twigIndex in
                let angle = angleForTwig(twigIndex)
                let windOffset = windOffsetFor(index: twigIndex, time: time)
                let endPoint = pointOnCircle(center: center, radius: radius, angle: angle)
                let swayedEnd = CGPoint(
                    x: endPoint.x + windOffset.x,
                    y: endPoint.y + windOffset.y
                )

                BranchGuideLine(from: center, to: swayedEnd)
                    .opacity(appeared ? 1 : 0)
                    .animation(.trunkFadeIn, value: appeared)
            }

            // Central branch node
            BranchCenterNode(
                branchIndex: branchIndex,
                activeSproutCount: branchActive
            )
            .position(center)
            .offset(
                x: sin(time * windSpeed * 0.3) * windAmplitude * 0.3,
                y: cos(time * windSpeed * 0.25) * windAmplitude * 0.2
            )
            .opacity(centerAppeared ? 1 : 0)
            .scaleEffect(centerAppeared ? 1 : 0.7)
            .animation(.trunkSpring, value: centerAppeared)

            // Twig nodes arranged radially
            ForEach(0..<twigCount, id: \.self) { twigIndex in
                let angle = angleForTwig(twigIndex)
                let position = pointOnCircle(center: center, radius: radius, angle: angle)
                let windOffset = windOffsetFor(index: twigIndex, time: time)
                let activeCount = twigActive[twigIndex]

                Button {
                    HapticManager.tap()
                    selectedTwig = TwigSelection(id: twigIndex)
                } label: {
                    TwigNode(
                        label: labelForTwig(twigIndex),
                        activeSproutCount: activeCount
                    )
                }
                .buttonStyle(.plain)
                .position(
                    x: position.x + windOffset.x,
                    y: position.y + windOffset.y
                )
                .staggeredRadial(index: twigIndex, appeared: appeared)
            }
        }
    }

    // MARK: - Helpers

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

    private func refreshSproutData() {
        let state = EventStore.shared.getState()
        let sprouts = Array(state.sprouts.values)
        cachedBranchActive = sprouts.filter { $0.twigId.hasPrefix("branch-\(branchIndex)") && $0.state == .active }.count
        cachedTwigActive = (0..<twigCount).map { twigIndex in
            let twigId = "branch-\(branchIndex)-twig-\(twigIndex)"
            return getSproutsForTwig(from: state, twigId: twigId).filter { $0.state == .active }.count
        }
    }

    private func labelForTwig(_ twigIndex: Int) -> String {
        SharedConstants.Tree.twigLabel(branchIndex: branchIndex, twigIndex: twigIndex)
    }
}

// MARK: - Branch Center Node

struct BranchCenterNode: View {
    let branchIndex: Int
    let activeSproutCount: Int

    var body: some View {
        VStack(spacing: 2) {
            // Unicode box for branch
            VStack(spacing: 0) {
                Text("\u{256D}\u{2501}\u{2501}\u{2501}\u{2501}\u{2501}\u{2501}\u{2501}\u{2501}\u{2501}\u{2501}\u{2501}\u{256E}")
                    .font(.system(size: 11, design: .monospaced))
                    .foregroundStyle(Color.wood)

                Text(SharedConstants.Tree.branchName(branchIndex))
                    .font(.system(size: 13, weight: .medium, design: .monospaced))
                    .foregroundStyle(Color.wood)
                    .padding(.horizontal, TrunkTheme.space1)

                Text(SharedConstants.Tree.branchDescriptions[branchIndex])
                    .font(.system(size: 9, design: .monospaced))
                    .foregroundStyle(Color.inkFaint)
                    .padding(.horizontal, TrunkTheme.space1)

                Text("\u{2570}\u{2501}\u{2501}\u{2501}\u{2501}\u{2501}\u{2501}\u{2501}\u{2501}\u{2501}\u{2501}\u{2501}\u{256F}")
                    .font(.system(size: 11, design: .monospaced))
                    .foregroundStyle(Color.wood)
            }

            // Active sprout count
            if activeSproutCount > 0 {
                Text("*\(activeSproutCount) active")
                    .font(.system(size: TrunkTheme.textXs, design: .monospaced))
                    .foregroundStyle(Color.twig)
            }
        }
    }
}

// MARK: - Twig Node (radial)

struct TwigNode: View {
    let label: String
    let activeSproutCount: Int

    @State private var isPressed = false

    private var hasSprouts: Bool {
        activeSproutCount > 0
    }

    var body: some View {
        VStack(spacing: 1) {
            // Twig box using lighter box characters
            VStack(spacing: 0) {
                Text("\u{250C}\u{2500}\u{2500}\u{2500}\u{2500}\u{2500}\u{2500}\u{2500}\u{2500}\u{2500}\u{2510}")
                    .font(.system(size: 9, design: .monospaced))
                    .foregroundStyle(hasSprouts ? Color.twig : Color.inkFaint.opacity(0.4))

                Text(label)
                    .font(.system(size: 10, design: .monospaced))
                    .foregroundStyle(hasSprouts ? Color.ink : Color.inkFaint)
                    .lineLimit(1)

                Text("\u{2514}\u{2500}\u{2500}\u{2500}\u{2500}\u{2500}\u{2500}\u{2500}\u{2500}\u{2500}\u{2518}")
                    .font(.system(size: 9, design: .monospaced))
                    .foregroundStyle(hasSprouts ? Color.twig : Color.inkFaint.opacity(0.4))
            }

            // Sprout indicator
            if hasSprouts {
                Text("*\(activeSproutCount)")
                    .font(.system(size: 8, design: .monospaced))
                    .foregroundStyle(Color.twig)
            }
        }
        .frame(minWidth: 44, minHeight: 44)
        .scaleEffect(isPressed ? 0.92 : 1.0)
        .animation(.trunkQuick, value: isPressed)
        .onLongPressGesture(minimumDuration: 0.1, pressing: { pressing in
            isPressed = pressing
        }, perform: {})
        .accessibilityLabel("\(label), \(activeSproutCount) active sprouts")
    }
}

// MARK: - Branch Guide Line (ASCII dots)

struct BranchGuideLine: View {
    let from: CGPoint
    let to: CGPoint

    private let dotSpacing: CGFloat = 10
    private let dotSize: CGFloat = 2

    var body: some View {
        Canvas { context, _ in
            let dx = to.x - from.x
            let dy = to.y - from.y
            let dist = hypot(dx, dy)
            guard dist > 0 else { return }

            // Start and end with gap for the nodes
            let startGap: CGFloat = 40
            let endGap: CGFloat = 30
            let effectiveDist = dist - startGap - endGap
            guard effectiveDist > 0 else { return }

            let ux = dx / dist
            let uy = dy / dist
            let count = Int(effectiveDist / dotSpacing)

            for i in 0..<count {
                let t = startGap + CGFloat(i) * dotSpacing
                let x = from.x + ux * t
                let y = from.y + uy * t
                let rect = CGRect(x: x - dotSize / 2, y: y - dotSize / 2, width: dotSize, height: dotSize)
                context.fill(Path(ellipseIn: rect), with: .color(Color.inkFaint.opacity(0.25)))
            }
        }
        .allowsHitTesting(false)
    }
}

// MARK: - Back Button

struct BackButton: View {
    @Environment(\.dismiss) private var dismiss
    @State private var isPressed = false

    var body: some View {
        Button {
            HapticManager.tap()
            dismiss()
        } label: {
            HStack(spacing: 2) {
                Image(systemName: "chevron.left")
                    .font(.system(size: TrunkTheme.textSm, design: .monospaced))
                Text("TRUNK")
                    .font(.system(size: TrunkTheme.textXs, design: .monospaced))
                    .tracking(1)
            }
            .foregroundStyle(Color.inkFaint)
            .frame(minHeight: 44)
            .scaleEffect(isPressed ? 0.92 : 1.0)
            .animation(.trunkQuick, value: isPressed)
        }
        .accessibilityLabel("Back to trunk")
        .onLongPressGesture(minimumDuration: 0.1, pressing: { pressing in
            isPressed = pressing
        }, perform: {})
    }
}

#Preview {
    NavigationStack {
        BranchView(branchIndex: 0, progression: ProgressionViewModel())
    }
}
