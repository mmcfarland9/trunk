//
//  TreeCanvasView.swift
//  Trunk
//
//  Interactive zoomable tree canvas with gesture navigation.
//

import SwiftUI
import SwiftData

/// Zoom levels for the tree canvas
enum ZoomLevel: Equatable {
    case overview
    case branch(Int)
}

struct TreeCanvasView: View {
    let sprouts: [Sprout]
    @Bindable var progression: ProgressionViewModel

    // Navigation callback when zooming to a branch
    var onNavigateToBranch: ((Int) -> Void)?

    // MARK: - State

    @State private var currentZoom: ZoomLevel = .overview
    @State private var scale: CGFloat = 1.0
    @State private var lastScale: CGFloat = 1.0
    @State private var offset: CGSize = .zero
    @State private var lastOffset: CGSize = .zero
    @State private var selectedBranchIndex: Int? = nil

    // Wind animation
    private let windAmplitude: CGFloat = 6.0
    private let windSpeed: Double = 0.4
    private let branchCount = TrunkConstants.Tree.branchCount

    // Zoom thresholds
    private let zoomOutThreshold: CGFloat = 0.7
    private let zoomInThreshold: CGFloat = 1.5

    var body: some View {
        GeometryReader { geo in
            let center = CGPoint(x: geo.size.width / 2, y: geo.size.height / 2)
            let radius = min(geo.size.width, geo.size.height) * 0.38

            TimelineView(.animation) { timeline in
                let time = timeline.date.timeIntervalSinceReferenceDate

                ZStack {
                    // Main tree content
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
    private func treeContent(center: CGPoint, radius: Double, time: Double, geo: GeometryProxy) -> some View {
        ZStack {
            // Branch lines (ASCII-style dashed)
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

            // Trunk (center)
            VStack(spacing: 2) {
                Text("*")
                    .font(.system(size: 32, design: .monospaced))
                    .foregroundStyle(Color.wood)
            }
            .position(center)
            .offset(x: sin(time * windSpeed * 0.3) * windAmplitude * 0.3,
                    y: cos(time * windSpeed * 0.25) * windAmplitude * 0.2)
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
                    isSelected: selectedBranchIndex == index,
                    onTap: {
                        HapticManager.selection()
                        withAnimation(.trunkSpring) {
                            selectedBranchIndex = index
                        }
                    },
                    onDoubleTap: {
                        HapticManager.impact()
                        onNavigateToBranch?(index)
                    }
                )
                .position(x: position.x + windOffset.x, y: position.y + windOffset.y)
            }

            // Floating info panel when branch is selected
            if let branchIndex = selectedBranchIndex {
                FloatingInfoPanel(
                    branchIndex: branchIndex,
                    sprouts: sproutsForBranch(branchIndex),
                    onNavigate: {
                        onNavigateToBranch?(branchIndex)
                    },
                    onDismiss: {
                        withAnimation(.trunkQuick) {
                            selectedBranchIndex = nil
                        }
                    }
                )
                .position(x: center.x, y: geo.size.height - 80)
                .transition(.move(edge: .bottom).combined(with: .opacity))
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

                // Snap to zoom levels based on scale
                withAnimation(.trunkSpring) {
                    if scale < zoomOutThreshold {
                        resetToOverview()
                    } else if scale > zoomInThreshold, let selected = selectedBranchIndex {
                        // Navigate to branch
                        onNavigateToBranch?(selected)
                    }
                    // Clamp scale
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

                // Snap back if scale is at 1.0
                if scale <= 1.0 {
                    withAnimation(.trunkSpring) {
                        offset = .zero
                        lastOffset = .zero
                    }
                }
            }
    }

    private func doubleTapGesture(center: CGPoint, radius: Double) -> some Gesture {
        SpatialTapGesture(count: 2)
            .onEnded { value in
                // Check if tapped on or near a branch
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

                // Tapped elsewhere - reset to overview
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
        selectedBranchIndex = nil
    }

    private func windOffsetFor(index: Int, time: Double) -> CGPoint {
        let phase = Double(index) * 0.7 + Double(index * index) * 0.13
        let speed = windSpeed * (0.85 + Double(index % 3) * 0.1)
        let x = sin(time * speed + phase) * windAmplitude
        let y = cos(time * speed * 0.8 + phase) * windAmplitude * 0.6
        return CGPoint(x: x, y: y)
    }

    private func angleForBranch(_ index: Int) -> Double {
        let startAngle = -Double.pi / 2
        let angleStep = (2 * Double.pi) / Double(branchCount)
        return startAngle + Double(index) * angleStep
    }

    private func pointOnCircle(center: CGPoint, radius: Double, angle: Double) -> CGPoint {
        CGPoint(
            x: center.x + radius * cos(angle),
            y: center.y + radius * sin(angle)
        )
    }

    private func sproutsForBranch(_ branchIndex: Int) -> [Sprout] {
        sprouts.filter { sprout in
            sprout.nodeId.hasPrefix("branch-\(branchIndex)")
        }
    }
}

// MARK: - Interactive Branch Node

struct InteractiveBranchNode: View {
    let index: Int
    let hasActiveSprouts: Bool
    let activeSproutCount: Int
    let isSelected: Bool
    let onTap: () -> Void
    let onDoubleTap: () -> Void

    @State private var isPressed = false

    var body: some View {
        VStack(spacing: 2) {
            // ASCII-style box
            VStack(spacing: 0) {
                Text("+---------+")
                    .font(.system(size: 9, design: .monospaced))
                    .foregroundStyle(isSelected ? Color.twig : Color.inkFaint.opacity(0.5))

                Text(SharedConstants.Tree.branchName(index))
                    .font(.system(size: 10, design: .monospaced))
                    .foregroundStyle(hasActiveSprouts ? Color.wood : Color.inkFaint)

                Text("+---------+")
                    .font(.system(size: 9, design: .monospaced))
                    .foregroundStyle(isSelected ? Color.twig : Color.inkFaint.opacity(0.5))
            }

            // Sprout indicator
            if activeSproutCount > 0 {
                Text("*\(activeSproutCount)")
                    .font(.system(size: 9, design: .monospaced))
                    .foregroundStyle(Color.twig)
            }
        }
        .scaleEffect(isPressed ? 0.95 : (isSelected ? 1.05 : 1.0))
        .animation(.trunkQuick, value: isPressed)
        .animation(.trunkSpring, value: isSelected)
        .onTapGesture {
            onTap()
        }
        .onTapGesture(count: 2) {
            onDoubleTap()
        }
        .onLongPressGesture(minimumDuration: 0.1, pressing: { pressing in
            isPressed = pressing
        }, perform: {})
    }
}

// MARK: - Floating Info Panel

struct FloatingInfoPanel: View {
    let branchIndex: Int
    let sprouts: [Sprout]
    let onNavigate: () -> Void
    let onDismiss: () -> Void

    private var activeSprouts: [Sprout] {
        sprouts.filter { $0.state == .active }
    }

    var body: some View {
        HStack(spacing: TrunkTheme.space3) {
            // Branch info
            VStack(alignment: .leading, spacing: 2) {
                Text(SharedConstants.Tree.branchName(branchIndex))
                    .font(.system(size: TrunkTheme.textBase, weight: .medium, design: .monospaced))
                    .foregroundStyle(Color.ink)

                Text("\(activeSprouts.count) active sprout\(activeSprouts.count == 1 ? "" : "s")")
                    .font(.system(size: TrunkTheme.textXs, design: .monospaced))
                    .foregroundStyle(Color.inkFaint)
            }

            Spacer()

            // Navigate button
            Button {
                HapticManager.tap()
                onNavigate()
            } label: {
                Text("View")
                    .font(.system(size: TrunkTheme.textSm, design: .monospaced))
                    .foregroundStyle(Color.ink)
                    .padding(.horizontal, TrunkTheme.space3)
                    .padding(.vertical, TrunkTheme.space2)
                    .background(Color.paper)
                    .overlay(
                        Rectangle()
                            .stroke(Color.twig, lineWidth: 1)
                    )
            }
            .buttonStyle(.plain)

            // Dismiss button
            Button {
                onDismiss()
            } label: {
                Text("x")
                    .font(.system(size: TrunkTheme.textSm, design: .monospaced))
                    .foregroundStyle(Color.inkFaint)
                    .frame(width: 24, height: 24)
            }
            .buttonStyle(.plain)
        }
        .padding(TrunkTheme.space3)
        .background(Color.paper)
        .overlay(
            Rectangle()
                .stroke(Color.border, lineWidth: 1)
        )
        .shadow(color: Color.black.opacity(0.1), radius: 4, y: 2)
        .padding(.horizontal, TrunkTheme.space4)
    }
}

#Preview {
    TreeCanvasView(sprouts: [], progression: ProgressionViewModel())
        .modelContainer(for: [Sprout.self, WaterEntry.self, Leaf.self, NodeData.self, SunEntry.self], inMemory: true)
}
