//
//  Wind.swift
//  Trunk
//
//  Shared seeded wind animation utilities.
//  Used by TreeCanvasView, BranchView, and RadarChartView for consistent
//  organic sway. Each node gets a deterministic speed and phase derived
//  from its seed, producing varied but repeatable motion.
//

import CoreGraphics
import Foundation

enum Wind {
    static let branchAmplitude: CGFloat = 6.0
    static let twigAmplitude: CGFloat = 8.0
    static let yDamping: Double = 0.6
    static let minSpeed: Double = 0.35
    static let maxSpeed: Double = 0.7

    /// Seeded pseudo-random value in [0, 1) matching the web implementation.
    static func seeded(seed: Int, salt: Double) -> Double {
        let v = sin(Double(seed) * salt) * 43758.5453
        return v - floor(v)
    }

    static func lerp(_ a: Double, _ b: Double, _ t: Double) -> Double {
        a + (b - a) * t
    }

    /// Wind offset for a branch node at a given time.
    /// Seed formula: 97 + index * 41 (matches web layout.ts).
    static func branchOffset(index: Int, time: Double, amplitude: CGFloat = branchAmplitude) -> CGPoint {
        let seed = 97 + index * 41
        let speed = lerp(minSpeed, maxSpeed, seeded(seed: seed, salt: 13.7))
        let phase = seeded(seed: seed, salt: 23.1) * Double.pi * 2
        let x = sin(time * speed + phase) * Double(amplitude)
        let y = cos(time * speed * 0.8 + phase) * Double(amplitude) * yDamping
        return CGPoint(x: x, y: y)
    }

    /// Wind offset for a twig node within a branch.
    /// Seed formula: 131 + branchIndex * 71 + twigIndex * 17 (matches web layout.ts).
    static func twigOffset(branchIndex: Int, twigIndex: Int, time: Double, amplitude: CGFloat = twigAmplitude) -> CGPoint {
        let seed = 131 + branchIndex * 71 + twigIndex * 17
        let speed = lerp(minSpeed, maxSpeed, seeded(seed: seed, salt: 17.9))
        let phase = seeded(seed: seed, salt: 29.3) * Double.pi * 2
        let x = sin(time * speed + phase) * Double(amplitude)
        let y = cos(time * speed * 0.8 + phase) * Double(amplitude) * yDamping
        return CGPoint(x: x, y: y)
    }
}
