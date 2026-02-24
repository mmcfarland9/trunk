//
//  RadarChartView.swift
//  Trunk
//
//  8-axis radar chart showing life balance across branches.
//  Renders behind the tree canvas as a subtle background visualization.
//  Polygon vertices are derived from animated branch positions so they
//  track the same wind sway as the branch nodes.
//

import SwiftUI

struct RadarChartView: View {
    let scores: [Double]
    let branchPositions: [CGPoint]
    let center: CGPoint

    private let branchCount = SharedConstants.Tree.branchCount
    /// Minimum fraction of center→branch distance (score=0 floor)
    private let floor: CGFloat = 0.05
    /// Additional fraction that a score of 1.0 adds on top of floor
    private let reach: CGFloat = 0.5

    var body: some View {
        let allZero = scores.allSatisfy { $0 == 0 }

        if !allZero {
            Canvas { context, _ in
                draw(context: context)
            }
            .allowsHitTesting(false)
        }
    }

    // MARK: - Drawing

    private func draw(context: GraphicsContext) {
        var path = Path()
        var dotPoints: [CGPoint] = []

        for i in 0..<branchCount {
            let s = floor + CGFloat(max(0.08, scores[i])) * reach
            let branchPos = branchPositions[i]
            let vertex = CGPoint(
                x: center.x + (branchPos.x - center.x) * s,
                y: center.y + (branchPos.y - center.y) * s
            )

            if i == 0 {
                path.move(to: vertex)
            } else {
                path.addLine(to: vertex)
            }
            dotPoints.append(vertex)
        }
        path.closeSubpath()

        context.fill(path, with: .color(Color.twig.opacity(0.07)))
        context.stroke(path, with: .color(Color.twig.opacity(0.20)), lineWidth: 1)

        for pt in dotPoints {
            let dotRect = CGRect(x: pt.x - 2, y: pt.y - 2, width: 4, height: 4)
            context.fill(Path(ellipseIn: dotRect), with: .color(Color.twig.opacity(0.35)))
        }
    }

    // MARK: - Score Computation (static, called once by parent)

    static func computeScores(from events: [SyncEvent]) -> [Double] {
        let branchCount = SharedConstants.Tree.branchCount
        var sproutTwigMap: [String: String] = [:]
        var branchCounts = Array(repeating: 0, count: branchCount)

        let sorted = events.sorted { $0.clientTimestamp < $1.clientTimestamp }

        for event in sorted {
            switch event.type {
            case "sprout_planted":
                if let sproutId = event.payload["sproutId"]?.stringValue,
                   let twigId = event.payload["twigId"]?.stringValue {
                    sproutTwigMap[sproutId] = twigId
                    if let bi = extractBranchIndex(from: twigId, branchCount: branchCount) {
                        branchCounts[bi] += 1
                    }
                }

            case "sprout_watered":
                if let sproutId = event.payload["sproutId"]?.stringValue,
                   let twigId = sproutTwigMap[sproutId],
                   let bi = extractBranchIndex(from: twigId, branchCount: branchCount) {
                    branchCounts[bi] += 1
                }

            case "sprout_harvested":
                if let sproutId = event.payload["sproutId"]?.stringValue,
                   let twigId = sproutTwigMap[sproutId],
                   let bi = extractBranchIndex(from: twigId, branchCount: branchCount) {
                    branchCounts[bi] += 1
                }

            case "sun_shone":
                if let twigId = event.payload["twigId"]?.stringValue,
                   let bi = extractBranchIndex(from: twigId, branchCount: branchCount) {
                    branchCounts[bi] += 1
                }

            default:
                break
            }
        }

        let maxCount = branchCounts.max() ?? 0
        guard maxCount > 0 else {
            return Array(repeating: 0.0, count: branchCount)
        }

        return branchCounts.map { Double($0) / Double(maxCount) }
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
