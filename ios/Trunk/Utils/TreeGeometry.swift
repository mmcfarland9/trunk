//
//  TreeGeometry.swift
//  Trunk
//
//  Shared radial layout geometry used by TreeCanvasView, BranchView,
//  and RadarChartView. Eliminates duplicated angle/position formulas.
//

import CoreGraphics

enum TreeGeometry {
    /// Angle in radians for a node at `index` out of `count` nodes,
    /// starting at 12 o'clock (-π/2) and proceeding clockwise.
    static func angle(for index: Int, count: Int) -> Double {
        let startAngle = -Double.pi / 2
        let step = (2 * Double.pi) / Double(count)
        return startAngle + Double(index) * step
    }

    /// Point on a circle at the given center, radius, and angle.
    static func point(center: CGPoint, radius: CGFloat, angle: Double) -> CGPoint {
        CGPoint(
            x: center.x + radius * CGFloat(cos(angle)),
            y: center.y + radius * CGFloat(sin(angle))
        )
    }
}
