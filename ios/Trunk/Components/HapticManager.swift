//
//  HapticManager.swift
//  Trunk
//
//  Centralized haptic feedback for consistent tactile responses.
//

import SwiftUI
import UIKit

@MainActor
enum HapticManager {
    /// Light tap for selections and button presses
    static func tap() {
        let generator = UIImpactFeedbackGenerator(style: .light)
        generator.impactOccurred()
    }

    /// Medium impact for successful actions
    static func impact() {
        let generator = UIImpactFeedbackGenerator(style: .medium)
        generator.impactOccurred()
    }

    /// Success notification for completed actions
    static func success() {
        let generator = UINotificationFeedbackGenerator()
        generator.notificationOccurred(.success)
    }

    /// Selection changed feedback
    static func selection() {
        let generator = UISelectionFeedbackGenerator()
        generator.selectionChanged()
    }
}
