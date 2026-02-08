//
//  TreeCanvasView.swift
//  Trunk
//
//  Interactive zoomable tree canvas with gesture navigation.
//  Visual rendering matches the web app: Unicode box-drawing characters,
//  ASCII dot guide lines, elliptical orbit, and seeded wind animation.
//

import SwiftUI

/// Zoom levels for the tree canvas
enum ZoomLevel: Equatable {
    case overview
    case branch(Int)
}

struct TreeCanvasView: View {
    let sprouts: [DerivedSprout]
    @Bindable var progression: ProgressionViewModel

    // Navigation callback when zooming to a branch
    var onNavigateToBranch: ((Int) -> Void)?

    // MARK: - State

    @State private var currentZoom: ZoomLevel = .overview
    @State private var scale: CGFloat = 1.0
    @State private var lastScale: CGFloat = 1.0
    @State private var offset: CGSize = .zero
    @State private var lastOffset: CGSize = .zero

    // MARK: - Layout constants (matching web)

    private let branchCount = SharedConstants.Tree.branchCount

    // Circular orbit ratio (matches branch view: 0.34 of smallest dimension)
    private let orbitRatio: CGFloat = 0.34

    // Wind animation (web: WIND_BRANCH_AMP=6, WIND_MIN=0.35, WIND_MAX=0.7)
    private let windAmplitude: CGFloat = 6.0
    private let windYDamping: Double = 0.6
    private let windMin: Double = 0.35
    private let windMax: Double = 0.7

    // Guide line dot spacing (web: BRANCH_LINE_SPACING=12)
    private let guideGap: CGFloat = 8
    private let guideDotSpacing: CGFloat = 12

    // Zoom thresholds
    private let zoomOutThreshold: CGFloat = 0.7
    private let zoomInThreshold: CGFloat = 1.5

    var body: some View {
        GeometryReader { geo in
            let base = min(geo.size.width, geo.size.height)
            let radius = base * orbitRatio
            let center = CGPoint(x: geo.size.width / 2, y: geo.size.height / 2)

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
        }
    }

    // MARK: - Tree Content

    @ViewBuilder
    private func treeContent(center: CGPoint, radius: CGFloat, time: Double, geo: GeometryProxy) -> some View {
        ZStack {
            // ASCII dot guide lines (replacing dashed Path strokes)
            ForEach(0..<branchCount, id: \.self) { index in
                let angle = angleForBranch(index)
                let windOffset = windOffsetFor(index: index, time: time)
                let endPoint = pointOnCircle(center: center, radius: radius, angle: angle)
                let swayedEnd = CGPoint(x: endPoint.x + windOffset.x, y: endPoint.y + windOffset.y)

                AsciiDotLine(
                    from: center,
                    to: swayedEnd,
                    startGap: guideGap,      // gap from center
                    endGap: guideGap + 36,   // gap before branch box
                    dotSpacing: guideDotSpacing
                )
            }

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

            // Branch nodes
            ForEach(0..<branchCount, id: \.self) { index in
                let angle = angleForBranch(index)
                let position = pointOnCircle(center: center, radius: radius, angle: angle)
                let branchSprouts = sproutsForBranch(index)
                let hasActive = branchSprouts.contains { $0.state == .active }
                let windOffset = windOffsetFor(index: index, time: time)

                InteractiveBranchNode(
                    index: index,
                    hasActiveSprouts: hasActive,
                    activeSproutCount: branchSprouts.filter { $0.state == .active }.count,
                    isSelected: false,
                    onTap: {
                        HapticManager.impact()
                        onNavigateToBranch?(index)
                    },
                    onDoubleTap: {
                        HapticManager.impact()
                        onNavigateToBranch?(index)
                    }
                )
                .position(x: position.x + windOffset.x, y: position.y + windOffset.y)
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
                    let angle = angleForBranch(i)
                    let branchPos = pointOnCircle(center: center, radius: radius, angle: angle)
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

    private func resetToOverview() {
        currentZoom = .overview
        scale = 1.0
        lastScale = 1.0
        offset = .zero
        lastOffset = .zero
    }

    /// Seeded wind offset per branch (matches web: seeded speed + phase, Y damped to 60%)
    private func windOffsetFor(index: Int, time: Double) -> CGPoint {
        let seed = 97 + index * 41
        let speed = lerp(windMin, windMax, seeded(seed: seed, salt: 13.7))
        let phase = seeded(seed: seed, salt: 23.1) * Double.pi * 2
        let x = sin(time * speed + phase) * windAmplitude
        let y = cos(time * speed * 0.8 + phase) * windAmplitude * windYDamping
        return CGPoint(x: x, y: y)
    }

    private func angleForBranch(_ index: Int) -> Double {
        let startAngle = -Double.pi / 2
        let angleStep = (2 * Double.pi) / Double(branchCount)
        return startAngle + Double(index) * angleStep
    }

    /// Circular positioning (matches branch view layout)
    private func pointOnCircle(center: CGPoint, radius: CGFloat, angle: Double) -> CGPoint {
        CGPoint(
            x: center.x + radius * CGFloat(cos(angle)),
            y: center.y + radius * CGFloat(sin(angle))
        )
    }

    private func sproutsForBranch(_ branchIndex: Int) -> [DerivedSprout] {
        sprouts.filter { sprout in
            sprout.twigId.hasPrefix("branch-\(branchIndex)")
        }
    }

    // MARK: - Seeded random (matches web: Math.sin(seed * salt) * 43758.5453 fractional)

    private func seeded(seed: Int, salt: Double) -> Double {
        let v = sin(Double(seed) * salt) * 43758.5453
        return v - floor(v)
    }

    private func lerp(_ a: Double, _ b: Double, _ t: Double) -> Double {
        a + (b - a) * t
    }
}

// MARK: - ASCII Dot Guide Line

/// Renders a trail of "." characters between two points, matching the web's guide lines.
struct AsciiDotLine: View {
    let from: CGPoint
    let to: CGPoint
    let startGap: CGFloat
    let endGap: CGFloat
    let dotSpacing: CGFloat

    var body: some View {
        let dx = to.x - from.x
        let dy = to.y - from.y
        let dist = hypot(dx, dy)

        if dist > startGap + endGap {
            let ux = dx / dist
            let uy = dy / dist
            let x1 = from.x + ux * startGap
            let y1 = from.y + uy * startGap
            let x2 = to.x - ux * endGap
            let y2 = to.y - uy * endGap
            let lineDx = x2 - x1
            let lineDy = y2 - y1
            let lineDist = hypot(lineDx, lineDy)
            let dotCount = max(1, Int(lineDist / dotSpacing))

            ForEach(0..<dotCount, id: \.self) { i in
                let t = dotCount > 1 ? CGFloat(i) / CGFloat(dotCount - 1) : 0.5
                Text(".")
                    .font(.system(size: 10, design: .monospaced))
                    .foregroundStyle(Color.inkFaint.opacity(0.35))
                    .position(
                        x: x1 + lineDx * t,
                        y: y1 + lineDy * t
                    )
            }
            .allowsHitTesting(false)
        }
    }
}

// MARK: - Interactive Branch Node (Unicode box-drawing)

struct InteractiveBranchNode: View {
    let index: Int
    let hasActiveSprouts: Bool
    let activeSproutCount: Int
    let isSelected: Bool
    let onTap: () -> Void
    let onDoubleTap: () -> Void

    @State private var isPressed = false

    var body: some View {
        let label = SharedConstants.Tree.branchName(index)
        let boxLines = formatBoxLabel(label)

        VStack(spacing: 2) {
            // Unicode box with rounded heavy borders
            VStack(spacing: 0) {
                Text(boxLines.topBorder)
                    .font(.system(size: 13, design: .monospaced))
                    .foregroundStyle(borderColor)

                ForEach(Array(boxLines.middleRows.enumerated()), id: \.offset) { _, row in
                    Text(row)
                        .font(.system(size: 15, design: .monospaced))
                        .foregroundStyle(hasActiveSprouts ? Color.wood : Color.inkFaint)
                }

                Text(boxLines.bottomBorder)
                    .font(.system(size: 13, design: .monospaced))
                    .foregroundStyle(borderColor)
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
    }

    private var borderColor: Color {
        isSelected ? Color.twig : Color.inkFaint.opacity(0.5)
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
