//
//  RadarChartView.swift
//  Trunk
//
//  8-axis radar chart showing life balance across branches.
//  Renders behind the tree canvas as a subtle background visualization.
//  Polygon vertices are derived from animated branch positions so they
//  track the same wind sway as the branch nodes.
//
//  Interactive: tap a vertex to see branch name + engagement percentage.
//

import SwiftUI

struct RadarChartView: View {
    let scores: [Double]
    let branchPositions: [CGPoint]
    let center: CGPoint
    let branchNames: [String]

    private let branchCount = SharedConstants.Tree.branchCount
    /// Minimum fraction of center→branch distance (score=0 floor)
    private let floor: CGFloat = 0.05
    /// Additional fraction that a score of 1.0 adds on top of floor
    private let reach: CGFloat = 0.5
    /// Axis lines extend to max radar extent
    private var axisExtent: CGFloat { floor + reach }

    @State private var tappedIndex: Int? = nil
    @State private var dismissTask: Task<Void, Never>? = nil

    var body: some View {
        let allZero = scores.allSatisfy { $0 == 0 }

        if !allZero {
            ZStack {
                Canvas { context, _ in
                    draw(context: context)
                }
                .allowsHitTesting(false)

                // Overlay invisible tap targets at vertex positions (44pt per HIG)
                ForEach(0..<branchCount, id: \.self) { i in
                    let vertex = vertexPoint(i)
                    let name = i < branchNames.count ? branchNames[i] : "Branch \(i + 1)"
                    Circle()
                        .fill(Color.clear)
                        .frame(width: 44, height: 44)
                        .contentShape(Circle())
                        .position(vertex)
                        .onTapGesture {
                            handleTap(i)
                        }
                        .accessibilityLabel("\(name) engagement")
                        .accessibilityValue("\(Int(round(scores[i] * 100))) percent")
                }

                // Popover tooltip for tapped vertex
                if let idx = tappedIndex {
                    vertexTooltip(index: idx)
                        .transition(.scale(scale: 0.8).combined(with: .opacity))
                        .allowsHitTesting(false)
                }
            }
        }
    }

    // MARK: - Vertex Computation

    private func vertexPoint(_ i: Int) -> CGPoint {
        let s = floor + CGFloat(max(0.08, scores[i])) * reach
        let branchPos = branchPositions[i]
        return CGPoint(
            x: center.x + (branchPos.x - center.x) * s,
            y: center.y + (branchPos.y - center.y) * s
        )
    }

    // MARK: - Tooltip

    @ViewBuilder
    private func vertexTooltip(index: Int) -> some View {
        let vertex = vertexPoint(index)
        let name = index < branchNames.count ? branchNames[index] : "Branch \(index + 1)"
        let pct = Int(round(scores[index] * 100))

        VStack(spacing: 1) {
            Text(name)
                .font(.system(size: 10, weight: .semibold, design: .monospaced))
                .foregroundStyle(Color.ink)
                .textCase(.uppercase)
                .tracking(TrunkTheme.trackingUppercase)
            Text("\(pct)%")
                .font(.system(size: 9, design: .monospaced))
                .foregroundStyle(Color.twig)
        }
        .padding(.horizontal, 6)
        .padding(.vertical, 3)
        .background(
            RoundedRectangle(cornerRadius: 3)
                .fill(Color.paper)
                .overlay(
                    RoundedRectangle(cornerRadius: 3)
                        .strokeBorder(Color.twig.opacity(0.3), lineWidth: 0.5)
                )
        )
        .shadow(color: Color.ink.opacity(0.06), radius: 3, y: 1)
        .position(tooltipPosition(for: vertex))
    }

    /// Offset tooltip radially away from center so it doesn't overlap the vertex dot
    private func tooltipPosition(for vertex: CGPoint) -> CGPoint {
        let dx = vertex.x - center.x
        let dy = vertex.y - center.y
        let dist = hypot(dx, dy)
        guard dist > 0 else { return CGPoint(x: vertex.x, y: vertex.y - 22) }

        let offset: CGFloat = 22
        return CGPoint(
            x: vertex.x + (dx / dist) * offset,
            y: vertex.y + (dy / dist) * offset
        )
    }

    // MARK: - Tap Handling

    private func handleTap(_ index: Int) {
        dismissTask?.cancel()

        let isDeselect = tappedIndex == index
        withAnimation(.trunkQuick) {
            tappedIndex = isDeselect ? nil : index
        }

        guard !isDeselect else { return }

        HapticManager.tap()

        // Auto-dismiss after 3 seconds
        dismissTask = Task { @MainActor in
            try? await Task.sleep(for: .seconds(3))
            guard !Task.isCancelled else { return }
            withAnimation(.trunkQuick) {
                tappedIndex = nil
            }
        }
    }

    // MARK: - Drawing

    private func draw(context: GraphicsContext) {
        var path = Path()
        var dotPoints: [CGPoint] = []

        for i in 0..<branchCount {
            let vertex = vertexPoint(i)

            if i == 0 {
                path.move(to: vertex)
            } else {
                path.addLine(to: vertex)
            }
            dotPoints.append(vertex)
        }
        path.closeSubpath()

        // Axis guide lines (center → max extent)
        for i in 0..<branchCount {
            let branchPos = branchPositions[i]
            let axisEnd = CGPoint(
                x: center.x + (branchPos.x - center.x) * axisExtent,
                y: center.y + (branchPos.y - center.y) * axisExtent
            )
            var axisPath = Path()
            axisPath.move(to: center)
            axisPath.addLine(to: axisEnd)

            let isHighlighted = tappedIndex == i
            let axisOpacity = isHighlighted ? 0.35 : (tappedIndex != nil ? 0.04 : 0.10)
            let axisWidth: CGFloat = isHighlighted ? 1.0 : 0.5

            context.stroke(
                axisPath,
                with: .color(Color.twig.opacity(axisOpacity)),
                style: StrokeStyle(lineWidth: axisWidth, dash: isHighlighted ? [] : [2, 3])
            )
        }

        // Filled polygon
        context.fill(path, with: .color(Color.twig.opacity(0.07)))
        context.stroke(path, with: .color(Color.twig.opacity(0.20)), lineWidth: 1)

        // Vertex dots with ring stroke
        for (i, pt) in dotPoints.enumerated() {
            let isActive = tappedIndex == i
            let dotRadius: CGFloat = isActive ? 5 : 3.5

            // Paper-colored ring
            let ringRect = CGRect(
                x: pt.x - dotRadius - 0.75,
                y: pt.y - dotRadius - 0.75,
                width: (dotRadius + 0.75) * 2,
                height: (dotRadius + 0.75) * 2
            )
            context.stroke(
                Path(ellipseIn: ringRect),
                with: .color(Color.paper.opacity(0.9)),
                lineWidth: 1.5
            )

            // Filled dot
            let dotRect = CGRect(
                x: pt.x - dotRadius,
                y: pt.y - dotRadius,
                width: dotRadius * 2,
                height: dotRadius * 2
            )
            let dotColor = isActive ? Color.wood : Color.twig
            context.fill(Path(ellipseIn: dotRect), with: .color(dotColor.opacity(isActive ? 1.0 : 0.7)))
        }
    }

    // MARK: - Score Computation (static, called once by parent)

    // Flat per-event weights from soil recovery rates (constants.json)
    private static let wWater = 0.05
    private static let wSun = 0.35

    static func computeScores(from events: [SyncEvent]) -> [Double] {
        let branchCount = SharedConstants.Tree.branchCount
        // Map sproutId -> (twigId, soilCost) for harvest lookups
        var sproutInfo: [String: (twigId: String, soilCost: Double)] = [:]
        var weighted = Array(repeating: 0.0, count: branchCount)

        let sorted = events.sorted { $0.clientTimestamp < $1.clientTimestamp }

        for event in sorted {
            switch event.type {
            case "sprout_planted":
                if let sproutId = event.payload["sproutId"]?.stringValue,
                   let twigId = event.payload["twigId"]?.stringValue {
                    let soilCost = event.payload["soilCost"]?.doubleValue ?? 0
                    sproutInfo[sproutId] = (twigId: twigId, soilCost: soilCost)
                    if let bi = extractBranchIndex(from: twigId, branchCount: branchCount) {
                        weighted[bi] += soilCost
                    }
                }

            case "sprout_watered":
                if let sproutId = event.payload["sproutId"]?.stringValue,
                   let twigId = sproutInfo[sproutId]?.twigId,
                   let bi = extractBranchIndex(from: twigId, branchCount: branchCount) {
                    weighted[bi] += wWater
                }

            case "sprout_harvested":
                if let sproutId = event.payload["sproutId"]?.stringValue,
                   let info = sproutInfo[sproutId],
                   let bi = extractBranchIndex(from: info.twigId, branchCount: branchCount) {
                    let result = event.payload["result"]?.intValue ?? 3
                    let rm = SharedConstants.Soil.resultMultipliers[result] ?? 0.7
                    weighted[bi] += info.soilCost * rm
                }

            case "sun_shone":
                if let twigId = event.payload["twigId"]?.stringValue,
                   let bi = extractBranchIndex(from: twigId, branchCount: branchCount) {
                    weighted[bi] += wSun
                }

            default:
                break
            }
        }

        let maxWeighted = weighted.max() ?? 0
        guard maxWeighted > 0 else {
            return Array(repeating: 0.0, count: branchCount)
        }

        return weighted.map { $0 / maxWeighted }
    }

    private static func extractBranchIndex(from twigId: String, branchCount: Int) -> Int? {
        for i in 0..<branchCount {
            if twigId.hasPrefix("branch-\(i)") {
                return i
            }
        }
        return nil
    }
}
