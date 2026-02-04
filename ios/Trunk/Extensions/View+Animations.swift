//
//  View+Animations.swift
//  Trunk
//
//  Spring animation presets and stagger helpers for organic feel.
//

import SwiftUI

// MARK: - Animation Presets

extension Animation {
    /// Standard spring for most transitions (0.35s, slightly bouncy)
    static let trunkSpring = Animation.spring(response: 0.35, dampingFraction: 0.7)

    /// Bouncier spring for celebratory moments
    static let trunkBounce = Animation.spring(response: 0.4, dampingFraction: 0.6)

    /// Quick spring for micro-interactions
    static let trunkQuick = Animation.spring(response: 0.2, dampingFraction: 0.8)
}

// MARK: - View Modifiers

extension View {
    /// Staggered entrance animation for list items
    func staggeredEntrance(index: Int, appeared: Bool, delay: Double = 0.08) -> some View {
        self
            .opacity(appeared ? 1 : 0)
            .offset(y: appeared ? 0 : 20)
            .animation(.trunkSpring.delay(Double(index) * delay), value: appeared)
    }

    /// Pulse animation for attention-grabbing elements
    func pulse(_ isPulsing: Bool) -> some View {
        self.opacity(isPulsing ? 0.7 : 1.0)
            .animation(
                isPulsing
                    ? Animation.easeInOut(duration: 0.8).repeatForever(autoreverses: true)
                    : .default,
                value: isPulsing
            )
    }
}

// MARK: - Animated Card Modifier

struct AnimatedCardModifier: ViewModifier {
    let index: Int
    @State private var appeared = false

    func body(content: Content) -> some View {
        content
            .staggeredEntrance(index: index, appeared: appeared)
            .onAppear {
                appeared = true
            }
    }
}

extension View {
    /// Apply staggered card entrance animation
    func animatedCard(index: Int) -> some View {
        modifier(AnimatedCardModifier(index: index))
    }
}
