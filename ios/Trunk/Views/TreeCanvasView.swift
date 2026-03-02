//
//  TreeCanvasView.swift
//  Trunk
//
//  Interactive zoomable tree canvas with gesture navigation.
//  Visual rendering matches the web app: Unicode box-drawing characters,
//  ASCII dot guide lines, elliptical orbit, and seeded wind animation.
//

import SwiftUI

struct TreeCanvasView: View {
    let sprouts: [DerivedSprout]
    @Bindable var progression: ProgressionViewModel

    // Navigation callback when zooming to a branch
    var onNavigateToBranch: ((Int) -> Void)?

    // MARK: - State

    @State private var scale: CGFloat = 1.0
    @State private var lastScale: CGFloat = 1.0
    @State private var offset: CGSize = .zero
    @State private var lastOffset: CGSize = .zero
    @State private var isVisible = false

    // MARK: - Layout constants (matching web)

    private let branchCount = SharedConstants.Tree.branchCount

    // Circular orbit ratio (matches branch view: 0.34 of smallest dimension)
    private let orbitRatio: CGFloat = 0.34

    // Guide line dot spacing (web: BRANCH_LINE_SPACING=12)
    private let guideGap: CGFloat = 8
    private let guideDotSpacing: CGFloat = 12

    // Zoom thresholds
    private let zoomOutThreshold: CGFloat = 0.7
    private let zoomInThreshold: CGFloat = 1.5

    // Cached radar scores (refreshed on appear/version change, not per frame)
    @State private var radarScores: [Double] = Array(repeating: 0.0, count: SharedConstants.Tree.branchCount)

    // Cached per-branch sprout data (refreshed on appear/version change, not per frame)
    @State private var branchSproutData: [(hasActive: Bool, activeCount: Int)] = Array(
        repeating: (hasActive: false, activeCount: 0),
        count: SharedConstants.Tree.branchCount
    )

    var body: some View {
        GeometryReader { geo in
            let base = min(geo.size.width, geo.size.height)
            let radius = base * orbitRatio
            let center = CGPoint(x: geo.size.width / 2, y: geo.size.height / 2)

            if isVisible {
                TimelineView(.animation) { timeline in
                    let time = timeline.date.timeIntervalSinceReferenceDate

                    ZStack {
                        treeContent(center: center, radius: radius, time: time, geo: geo)
                            .scaleEffect(scale)
                            .offset(offset)
                    }
                }
                .gesture(magnifyGesture)
                .gesture(dragGesture)
                .simultaneousGesture(doubleTapGesture(center: center, radius: radius))
            } else {
                let time = Date().timeIntervalSinceReferenceDate

                ZStack {
                    treeContent(center: center, radius: radius, time: time, geo: geo)
                        .scaleEffect(scale)
                        .offset(offset)
                }
                .gesture(magnifyGesture)
                .gesture(dragGesture)
                .simultaneousGesture(doubleTapGesture(center: center, radius: radius))
            }
        }
        .onAppear {
            isVisible = true
            refreshCachedData()
        }
        .onChange(of: progression.version) {
            refreshCachedData()
        }
        .onDisappear { isVisible = false }
    }

    // MARK: - Tree Content

    @ViewBuilder
    private func treeContent(center: CGPoint, radius: CGFloat, time: Double, geo: GeometryProxy) -> some View {
        let cachedData = branchSproutData

        // Compute animated branch positions once (with wind), shared by radar + nodes
        let branchPositions = (0..<branchCount).map { index -> CGPoint in
            let angle = TreeGeometry.angle(for: index, count: branchCount)
            let position = TreeGeometry.point(center: center, radius: radius, angle: angle)
            let windOffset = Wind.branchOffset(index: index, time: time)
            return CGPoint(x: position.x + windOffset.x, y: position.y + windOffset.y)
        }

        ZStack {
            // Radar chart background — vertices derived from branch positions
            RadarChartView(
                scores: radarScores,
                branchPositions: branchPositions,
                center: center,
                branchNames: (0..<branchCount).map { SharedConstants.Tree.branchName($0) }
            )

            // ASCII dot guide lines — single Canvas for all 8 branches
            CanvasDotGuideLines(
                branchCount: branchCount,
                center: center,
                radius: radius,
                time: time,
                guideGap: guideGap,
                guideDotSpacing: guideDotSpacing
            )
            .equatable()

            // Invisible center tap target (reset to overview on double-tap)
            Color.clear
                .frame(width: 44, height: 44)
                .contentShape(Rectangle())
                .position(center)
                .onTapGesture(count: 2) {
                    withAnimation(.trunkBounce) {
                        resetToOverview()
                    }
                    HapticManager.tap()
                }

            // Branch nodes — positioned at the same animated branch positions
            ForEach(0..<branchCount, id: \.self) { index in
                let data = cachedData[index]

                InteractiveBranchNode(
                    index: index,
                    hasActiveSprouts: data.hasActive,
                    activeSproutCount: data.activeCount,
                    onTap: {
                        HapticManager.impact()
                        onNavigateToBranch?(index)
                    }
                )
                .equatable()
                .position(branchPositions[index])
                .transition(.scale.combined(with: .opacity))
            }
        }
    }

    // MARK: - Gestures

    private var magnifyGesture: some Gesture {
        MagnifyGesture()
            .onChanged { value in
                let delta = value.magnification / lastScale
                lastScale = value.magnification
                scale = max(0.5, min(3.0, scale * delta))
            }
            .onEnded { _ in
                lastScale = 1.0

                withAnimation(.trunkSpring) {
                    if scale < zoomOutThreshold {
                        resetToOverview()
                    }
                    scale = max(0.8, min(2.0, scale))
                }
            }
    }

    private var dragGesture: some Gesture {
        DragGesture()
            .onChanged { value in
                offset = CGSize(
                    width: lastOffset.width + value.translation.width,
                    height: lastOffset.height + value.translation.height
                )
            }
            .onEnded { _ in
                lastOffset = offset

                if scale <= 1.0 {
                    withAnimation(.trunkSpring) {
                        offset = .zero
                        lastOffset = .zero
                    }
                }
            }
    }

    private func doubleTapGesture(center: CGPoint, radius: CGFloat) -> some Gesture {
        SpatialTapGesture(count: 2)
            .onEnded { value in
                for i in 0..<branchCount {
                    let angle = TreeGeometry.angle(for: i, count: branchCount)
                    let branchPos = TreeGeometry.point(center: center, radius: radius, angle: angle)
                    let distance = hypot(value.location.x - branchPos.x, value.location.y - branchPos.y)

                    if distance < 40 {
                        HapticManager.impact()
                        onNavigateToBranch?(i)
                        return
                    }
                }

                withAnimation(.trunkBounce) {
                    resetToOverview()
                }
                HapticManager.tap()
            }
    }

    // MARK: - Helpers

    /// Refresh radar scores and branch sprout data from EventStore.
    /// Called on appear and version change — not per frame.
    private func refreshCachedData() {
        let state = EventStore.shared.getState()
        radarScores = state.radarScores
        branchSproutData = (0..<branchCount).map { index in
            let branchSprouts = sproutsForBranch(index)
            let activeCount = branchSprouts.filter { $0.state == .active }.count
            return (hasActive: activeCount > 0, activeCount: activeCount)
        }
    }

    private func resetToOverview() {
        scale = 1.0
        lastScale = 1.0
        offset = .zero
        lastOffset = .zero
    }

    private func sproutsForBranch(_ branchIndex: Int) -> [DerivedSprout] {
        sprouts.filter { sprout in
            sprout.twigId.hasPrefix("branch-\(branchIndex)")
        }
    }

}

// MARK: - Canvas Dot Guide Lines (all branches in a single Canvas)

/// Renders dot guide lines for all branches using a single Canvas draw call,
/// replacing the previous AsciiDotLine that created individual Text(".") views per dot.
struct CanvasDotGuideLines: View, Equatable {
    let branchCount: Int
    let center: CGPoint
    let radius: CGFloat
    let time: Double
    let guideGap: CGFloat
    let guideDotSpacing: CGFloat

    private let dotSize: CGFloat = 2
    private let endGapExtra: CGFloat = 36

    // Quantize time comparison to ~20fps — guide line sway is subtle
    // and doesn't need full 60fps redraws.
    static func == (lhs: Self, rhs: Self) -> Bool {
        lhs.branchCount == rhs.branchCount &&
        lhs.center == rhs.center &&
        lhs.radius == rhs.radius &&
        lhs.guideGap == rhs.guideGap &&
        lhs.guideDotSpacing == rhs.guideDotSpacing &&
        Int(lhs.time * 20) == Int(rhs.time * 20)
    }

    var body: some View {
        Canvas { context, _ in
            for index in 0..<branchCount {
                let angle = TreeGeometry.angle(for: index, count: branchCount)
                let windOffset = Wind.branchOffset(index: index, time: time)
                let endPoint = TreeGeometry.point(center: center, radius: radius, angle: angle)
                let swayedEnd = CGPoint(x: endPoint.x + windOffset.x, y: endPoint.y + windOffset.y)

                let dx = swayedEnd.x - center.x
                let dy = swayedEnd.y - center.y
                let dist = hypot(dx, dy)
                guard dist > guideGap + guideGap + endGapExtra else { continue }

                let ux = dx / dist
                let uy = dy / dist
                let startX = center.x + ux * guideGap
                let startY = center.y + uy * guideGap
                let endX = swayedEnd.x - ux * (guideGap + endGapExtra)
                let endY = swayedEnd.y - uy * (guideGap + endGapExtra)
                let lineDist = hypot(endX - startX, endY - startY)
                let dotCount = max(1, Int(lineDist / guideDotSpacing))

                for i in 0..<dotCount {
                    let t = dotCount > 1 ? CGFloat(i) / CGFloat(dotCount - 1) : 0.5
                    let x = startX + (endX - startX) * t
                    let y = startY + (endY - startY) * t
                    let rect = CGRect(
                        x: x - dotSize / 2,
                        y: y - dotSize / 2,
                        width: dotSize,
                        height: dotSize
                    )
                    context.fill(Path(ellipseIn: rect), with: .color(Color.inkFaint.opacity(0.35)))
                }
            }
        }
        .allowsHitTesting(false)
    }
}

// MARK: - Interactive Branch Node (Unicode box-drawing)

struct InteractiveBranchNode: View, Equatable {
    let index: Int
    let hasActiveSprouts: Bool
    let activeSproutCount: Int
    let onTap: () -> Void

    @State private var isPressed = false

    // Compare data properties only — skip closure and @State.
    // Allows SwiftUI to skip body re-evaluation inside TimelineView
    // when only the .position() changes (wind sway).
    static func == (lhs: InteractiveBranchNode, rhs: InteractiveBranchNode) -> Bool {
        lhs.index == rhs.index &&
        lhs.hasActiveSprouts == rhs.hasActiveSprouts &&
        lhs.activeSproutCount == rhs.activeSproutCount
    }

    var body: some View {
        let label = SharedConstants.Tree.branchName(index)
        let boxLines = formatBoxLabel(label)

        VStack(spacing: 2) {
            // Unicode box with rounded heavy borders
            VStack(spacing: 0) {
                Text(boxLines.topBorder)
                    .font(.system(size: 13, design: .monospaced))
                    .foregroundStyle(Color.inkFaint.opacity(0.5))

                ForEach(Array(boxLines.middleRows.enumerated()), id: \.offset) { _, row in
                    Text(row)
                        .font(.system(size: 15, design: .monospaced))
                        .foregroundStyle(hasActiveSprouts ? Color.wood : Color.inkFaint)
                }

                Text(boxLines.bottomBorder)
                    .font(.system(size: 13, design: .monospaced))
                    .foregroundStyle(Color.inkFaint.opacity(0.5))
            }

            // Sprout indicator
            if activeSproutCount > 0 {
                Text("*\(activeSproutCount)")
                    .font(.system(size: 12, design: .monospaced))
                    .foregroundStyle(Color.twig)
            }
        }
        .padding(TrunkTheme.space2)
        .frame(minWidth: 44, minHeight: 44)
        .scaleEffect(isPressed ? 0.95 : 1.0)
        .animation(.trunkQuick, value: isPressed)
        .contentShape(Rectangle())
        .onTapGesture {
            onTap()
        }
        .onLongPressGesture(minimumDuration: 0.1, pressing: { pressing in
            isPressed = pressing
        }, perform: {})
        .accessibilityLabel("\(label), \(activeSproutCount) active sprouts")
        .accessibilityIdentifier("branch-\(label)")
    }

    // MARK: - Box label formatting (matches web formatBoxLabel)

    /// Wraps label text inside Unicode rounded box: ╭━━━╮ / lines / ╰━━━╯
    private func formatBoxLabel(_ label: String) -> BoxFormat {
        let trimmed = label.trimmingCharacters(in: .whitespaces)
        let words = trimmed.split(separator: " ").map(String.init)

        // Target width: wider 16:9-ish boxes, allow 2 lines max
        let totalChars = words.reduce(0) { $0 + $1.count } + max(words.count - 1, 0)
        let longestWord = words.map(\.count).max() ?? 1
        let targetWidth = max(longestWord, Int(ceil(Double(totalChars) / 2.0)))

        // Wrap text to target width
        var lines: [String] = []
        var currentLine = ""
        for word in words {
            if currentLine.isEmpty {
                currentLine = word
            } else if currentLine.count + 1 + word.count <= targetWidth {
                currentLine += " " + word
            } else {
                lines.append(currentLine)
                currentLine = word
            }
        }
        if !currentLine.isEmpty { lines.append(currentLine) }

        let maxLineLength = max(lines.map(\.count).max() ?? 1, 1)

        // Center-pad each line
        let paddedLines = lines.map { line -> String in
            let padding = maxLineLength - line.count
            let leftPad = padding / 2
            let rightPad = padding - leftPad
            return String(repeating: " ", count: leftPad) + line + String(repeating: " ", count: rightPad)
        }

        // Unicode heavy rounded borders (matching web: ╭━╮ / ╰━╯)
        let dashes = String(repeating: "\u{2501}", count: maxLineLength) // ━
        let topBorder = "\u{256D}" + dashes + "\u{256E}"    // ╭━━━╮
        let bottomBorder = "\u{2570}" + dashes + "\u{256F}" // ╰━━━╯

        return BoxFormat(
            topBorder: topBorder,
            middleRows: paddedLines,
            bottomBorder: bottomBorder
        )
    }
}

/// Formatted box with Unicode borders and centered label lines
private struct BoxFormat {
    let topBorder: String
    let middleRows: [String]
    let bottomBorder: String
}

#Preview {
    TreeCanvasView(sprouts: [], progression: ProgressionViewModel())
}
