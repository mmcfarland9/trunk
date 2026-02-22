//
//  RadarChartView.swift
//  Trunk
//
//  8-axis radar chart showing life balance across branches.
//  Renders behind the tree canvas as a subtle background visualization.
//

import SwiftUI

struct RadarChartView: View {
    let events: [SyncEvent]

    private let branchCount = SharedConstants.Tree.branchCount

    var body: some View {
        let scores = computeBranchScores()
        let allZero = scores.allSatisfy { $0 == 0 }

        GeometryReader { geo in
            let size = min(geo.size.width, geo.size.height)
            let center = CGPoint(x: geo.size.width / 2, y: geo.size.height / 2)
            let maxRadius = size * 0.38

            if !allZero {
                Canvas { context, _ in
                    drawGrid(context: context, center: center, maxRadius: maxRadius)
                    drawAxes(context: context, center: center, maxRadius: maxRadius)
                    drawPolygon(context: context, center: center, maxRadius: maxRadius, scores: scores)
                    drawDots(context: context, center: center, maxRadius: maxRadius, scores: scores)
                }
            }
        }
    }

    // MARK: - Drawing

    private func drawGrid(context: GraphicsContext, center: CGPoint, maxRadius: CGFloat) {
        for ring in 1...3 {
            let ratio = CGFloat(ring) / 4.0
            let r = maxRadius * ratio
            let rect = CGRect(x: center.x - r, y: center.y - r, width: r * 2, height: r * 2)
            context.stroke(
                Path(ellipseIn: rect),
                with: .color(Color.inkFaint.opacity(0.12)),
                lineWidth: 0.5
            )
        }
    }

    private func drawAxes(context: GraphicsContext, center: CGPoint, maxRadius: CGFloat) {
        for i in 0..<branchCount {
            let angle = angleFor(i)
            let end = pointAt(center: center, radius: maxRadius, angle: angle)
            var path = Path()
            path.move(to: center)
            path.addLine(to: end)
            context.stroke(path, with: .color(Color.inkFaint.opacity(0.12)), lineWidth: 0.5)
        }
    }

    private func drawPolygon(context: GraphicsContext, center: CGPoint, maxRadius: CGFloat, scores: [Double]) {
        var path = Path()
        for i in 0..<branchCount {
            let angle = angleFor(i)
            let r = maxRadius * CGFloat(scores[i])
            let point = pointAt(center: center, radius: r, angle: angle)
            if i == 0 {
                path.move(to: point)
            } else {
                path.addLine(to: point)
            }
        }
        path.closeSubpath()

        context.fill(path, with: .color(Color.twig.opacity(0.12)))
        context.stroke(path, with: .color(Color.twig.opacity(0.4)), lineWidth: 1)
    }

    private func drawDots(context: GraphicsContext, center: CGPoint, maxRadius: CGFloat, scores: [Double]) {
        for i in 0..<branchCount {
            let angle = angleFor(i)
            let r = maxRadius * CGFloat(scores[i])
            let point = pointAt(center: center, radius: r, angle: angle)
            let dotRect = CGRect(x: point.x - 2, y: point.y - 2, width: 4, height: 4)
            context.fill(Path(ellipseIn: dotRect), with: .color(Color.twig.opacity(0.6)))
        }
    }

    // MARK: - Geometry

    private func angleFor(_ index: Int) -> Double {
        let startAngle = -Double.pi / 2
        let angleStep = (2 * Double.pi) / Double(branchCount)
        return startAngle + Double(index) * angleStep
    }

    private func pointAt(center: CGPoint, radius: CGFloat, angle: Double) -> CGPoint {
        CGPoint(
            x: center.x + radius * CGFloat(cos(angle)),
            y: center.y + radius * CGFloat(sin(angle))
        )
    }

    // MARK: - Data Computation

    private func computeBranchScores() -> [Double] {
        var sproutTwigMap: [String: String] = [:]
        var branchCounts = Array(repeating: 0, count: branchCount)

        let sorted = events.sorted { $0.clientTimestamp < $1.clientTimestamp }

        for event in sorted {
            switch event.type {
            case "sprout_planted":
                if let sproutId = event.payload["sproutId"]?.stringValue,
                   let twigId = event.payload["twigId"]?.stringValue {
                    sproutTwigMap[sproutId] = twigId
                    if let bi = extractBranchIndex(from: twigId) {
                        branchCounts[bi] += 1
                    }
                }

            case "sprout_watered":
                if let sproutId = event.payload["sproutId"]?.stringValue,
                   let twigId = sproutTwigMap[sproutId],
                   let bi = extractBranchIndex(from: twigId) {
                    branchCounts[bi] += 1
                }

            case "sprout_harvested":
                if let sproutId = event.payload["sproutId"]?.stringValue,
                   let twigId = sproutTwigMap[sproutId],
                   let bi = extractBranchIndex(from: twigId) {
                    branchCounts[bi] += 1
                }

            case "sun_shone":
                if let twigId = event.payload["twigId"]?.stringValue,
                   let bi = extractBranchIndex(from: twigId) {
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

    private func extractBranchIndex(from twigId: String) -> Int? {
        for i in 0..<branchCount {
            if twigId.hasPrefix("branch-\(i)") {
                return i
            }
        }
        return nil
    }
}
