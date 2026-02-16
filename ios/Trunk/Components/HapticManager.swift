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
    private static let lightGenerator = UIImpactFeedbackGenerator(style: .light)
    private static let mediumGenerator = UIImpactFeedbackGenerator(style: .medium)
    private static let notificationGenerator = UINotificationFeedbackGenerator()
    private static let selectionGenerator = UISelectionFeedbackGenerator()

    /// Light tap for selections and button presses
    static func tap() {
        lightGenerator.prepare()
        lightGenerator.impactOccurred()
    }

    /// Medium impact for successful actions
    static func impact() {
        mediumGenerator.prepare()
        mediumGenerator.impactOccurred()
    }

    /// Success notification for completed actions
    static func success() {
        notificationGenerator.prepare()
        notificationGenerator.notificationOccurred(.success)
    }

    /// Selection changed feedback
    static func selection() {
        selectionGenerator.prepare()
        selectionGenerator.selectionChanged()
    }

}
