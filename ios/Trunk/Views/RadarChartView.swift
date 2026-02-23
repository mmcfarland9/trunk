//
//  RadarChartView.swift
//  Trunk
//
//  8-axis radar chart showing life balance across branches.
//  Renders behind the tree canvas as a subtle background visualization.
//  Data polygon vertices sway with wind passed from the parent view.
//

import SwiftUI

struct RadarChartView: View {
    let scores: [Double]
    let windOffsetFor: (Int) -> CGPoint

    private let branchCount = SharedConstants.Tree.branchCount

    var body: some View {
        let allZero = scores.allSatisfy { $0 == 0 }

        GeometryReader { geo in
            let size = min(geo.size.width, geo.size.height)
            let center = CGPoint(x: geo.size.width / 2, y: geo.size.height / 2)
            let maxRadius = size * 0.52

            if !allZero {
                Canvas { context, _ in
                    draw(context: context, center: center, maxRadius: maxRadius, scores: scores)
                }
            }
        }
    }

    // MARK: - Drawing

    private func draw(context: GraphicsContext, center: CGPoint, maxRadius: CGFloat, scores: [Double]) {
        var path = Path()
        var dotPoints: [CGPoint] = []

        for i in 0..<branchCount {
            let angle = TreeGeometry.angle(for: i, count: branchCount)
            let s = max(0.08, scores[i])
            let r = maxRadius * CGFloat(s)
            let wind = windOffsetFor(i)
            let vertex = TreeGeometry.point(center: center, radius: r, angle: angle)
            let swayed = CGPoint(x: vertex.x + wind.x * CGFloat(s), y: vertex.y + wind.y * CGFloat(s))

            if i == 0 {
                path.move(to: swayed)
            } else {
                path.addLine(to: swayed)
            }
            dotPoints.append(swayed)
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
