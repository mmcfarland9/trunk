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

    /// Gentle ease-out for content fading in
    static let trunkFadeIn = Animation.easeOut(duration: 0.3)
}

// MARK: - View Modifiers

extension View {
    /// Staggered entrance animation for list items (capped at index 5 for max 0.4s delay)
    func staggeredEntrance(index: Int, appeared: Bool, delay: Double = 0.08) -> some View {
        self
            .opacity(appeared ? 1 : 0)
            .offset(y: appeared ? 0 : 20)
            .animation(.trunkSpring.delay(min(Double(index), 5.0) * delay), value: appeared)
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

// MARK: - Staggered Radial Modifier

/// Manages both entrance and exit staggered animations for radially-placed items.
/// On appear: items scale+fade in with stagger. On disappear: reverse stagger out.
struct StaggeredRadialModifier: ViewModifier {
    let index: Int
    let appeared: Bool
    let staggerDelay: Double

    func body(content: Content) -> some View {
        content
            .opacity(appeared ? 1 : 0)
            .scaleEffect(appeared ? 1 : 0.5)
            .animation(
                .trunkSpring.delay(Double(index) * staggerDelay),
                value: appeared
            )
    }
}

extension View {
    /// Staggered radial entrance/exit for branch twig nodes
    func staggeredRadial(index: Int, appeared: Bool, delay: Double = 0.04) -> some View {
        modifier(StaggeredRadialModifier(index: index, appeared: appeared, staggerDelay: delay))
    }
}
