//
//  Theme.swift
//  Trunk
//
//  Design tokens matching the web app aesthetic.
//

import SwiftUI
import UIKit

// MARK: - Colors

extension Color {
    // Core palette - adaptive for light/dark mode
    static let ink = Color(
        light: Color(red: 0.169, green: 0.102, blue: 0.071),          // #2b1a12
        dark: Color(red: 0.910, green: 0.878, blue: 0.847)            // #e8e0d8
    )
    static let inkLight = Color(
        light: Color(red: 0.290, green: 0.200, blue: 0.145),          // #4a3325
        dark: Color(red: 0.749, green: 0.698, blue: 0.651)            // #bfb2a6
    )
    static let inkFaint = Color(
        light: Color(red: 0.435, green: 0.337, blue: 0.267),          // #6f5644
        dark: Color(red: 0.576, green: 0.529, blue: 0.482)            // #93877b
    )
    static let wood = Color(
        light: Color(red: 0.420, green: 0.267, blue: 0.137),          // #6b4423
        dark: Color(red: 0.671, green: 0.498, blue: 0.337)            // #ab7f56
    )
    static let twig = Color(
        light: Color(red: 0.545, green: 0.353, blue: 0.169),          // #8b5a2b
        dark: Color(red: 0.722, green: 0.545, blue: 0.369)            // #b88b5e
    )
    static let paper = Color(
        light: Color(red: 0.973, green: 0.965, blue: 0.945),          // #f8f6f1
        dark: Color(red: 0.161, green: 0.137, blue: 0.118)            // #29231e
    )
    static let parchment = Color(
        light: Color(red: 0.953, green: 0.922, blue: 0.878),          // #f3ebe0
        dark: Color(red: 0.118, green: 0.098, blue: 0.082)            // #1e1915
    )

    // Semantic colors - slightly brighter in dark mode for contrast
    static let trunkWater = Color(
        light: Color(red: 0.275, green: 0.510, blue: 0.706),          // steelblue
        dark: Color(red: 0.396, green: 0.616, blue: 0.800)            // lighter steel
    )
    static let trunkSun = Color(
        light: Color(red: 0.831, green: 0.627, blue: 0.000),          // #d4a000
        dark: Color(red: 0.918, green: 0.729, blue: 0.118)            // brighter gold
    )
    static let trunkDestructive = Color(
        light: Color(red: 0.54, green: 0.29, blue: 0.23),             // #8a4a3a
        dark: Color(red: 0.698, green: 0.420, blue: 0.353)            // lighter russet
    )

    // Muted success green for completed states
    static let trunkSuccess = Color(
        light: Color(red: 0.4, green: 0.6, blue: 0.4),               // muted green
        dark: Color(red: 0.5, green: 0.7, blue: 0.5)                 // lighter muted green
    )

    // Muted warning for negative amounts / unaffordable costs
    static let trunkWarning = Color(
        light: Color(red: 0.6, green: 0.35, blue: 0.3),              // muted rust
        dark: Color(red: 0.75, green: 0.47, blue: 0.4)               // lighter rust
    )

    // Borders - adaptive
    static let borderSubtle = Color(
        light: Color(red: 0.420, green: 0.267, blue: 0.137).opacity(0.08),
        dark: Color(red: 0.671, green: 0.498, blue: 0.337).opacity(0.10)
    )
    static let border = Color(
        light: Color(red: 0.420, green: 0.267, blue: 0.137).opacity(0.15),
        dark: Color(red: 0.671, green: 0.498, blue: 0.337).opacity(0.20)
    )
}

// MARK: - Adaptive Color Helper

extension Color {
    init(light: Color, dark: Color) {
        self.init(uiColor: UIColor { traitCollection in
            switch traitCollection.userInterfaceStyle {
            case .dark:
                return UIColor(dark)
            default:
                return UIColor(light)
            }
        })
    }
}

// MARK: - Theme

enum TrunkTheme {
    // Spacing scale
    static let space1: CGFloat = 4
    static let space2: CGFloat = 8
    static let space3: CGFloat = 12
    static let space4: CGFloat = 16
    static let space5: CGFloat = 24
    static let space6: CGFloat = 32

    // Type scale
    static let textXs: CGFloat = 10
    static let textSm: CGFloat = 12
    static let textBase: CGFloat = 14
    static let textLg: CGFloat = 16
    static let textXl: CGFloat = 18

    // Letter spacing
    static let trackingNormal: CGFloat = 0.42   // 0.03em at ~14px
    static let trackingUppercase: CGFloat = 0.5 // Slightly wider for uppercase
}

// MARK: - Typography

enum TrunkFontWeight {
    case regular    // Body text, descriptions
    case medium     // Labels, secondary emphasis
    case semibold   // Headings, primary emphasis
}

// MARK: - View Modifiers

struct PaperCard: ViewModifier {
    func body(content: Content) -> some View {
        content
            .background(Color.paper)
            .overlay(
                Rectangle()
                    .stroke(Color.border, lineWidth: 1)
            )
    }
}

struct MonoLabel: ViewModifier {
    var size: CGFloat = TrunkTheme.textSm
    var uppercase: Bool = true

    func body(content: Content) -> some View {
        content
            .font(.system(size: size, design: .monospaced))
            .textCase(uppercase ? .uppercase : nil)
            .tracking(uppercase ? TrunkTheme.trackingUppercase : TrunkTheme.trackingNormal)
            .foregroundStyle(Color.inkFaint)
    }
}

// MARK: - Extensions

extension View {
    func paperCard() -> some View {
        modifier(PaperCard())
    }

    func monoLabel(size: CGFloat = TrunkTheme.textSm, uppercase: Bool = true) -> some View {
        modifier(MonoLabel(size: size, uppercase: uppercase))
    }

    func trunkFont(size: CGFloat, weight: TrunkFontWeight = .regular) -> some View {
        let fontWeight: Font.Weight = switch weight {
        case .regular: .regular
        case .medium: .medium
        case .semibold: .semibold
        }
        return self.font(.system(size: size, weight: fontWeight, design: .monospaced))
    }
}

// MARK: - Custom Button Styles

struct TrunkButtonStyle: ButtonStyle {
    var variant: Variant = .primary

    enum Variant {
        case primary, water, sun, destructive
    }

    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.system(size: TrunkTheme.textSm, design: .monospaced))
            .textCase(.uppercase)
            .tracking(TrunkTheme.trackingUppercase)
            .padding(.horizontal, TrunkTheme.space4)
            .padding(.vertical, TrunkTheme.space2)
            .foregroundStyle(foregroundColor)
            .background(configuration.isPressed ? pressedBackgroundColor : backgroundColor)
            .overlay(
                Rectangle()
                    .stroke(borderColor, lineWidth: 1)
            )
            .opacity(configuration.isPressed ? 0.7 : 1)
    }

    private var foregroundColor: Color {
        switch variant {
        case .primary: return .wood
        case .water: return .trunkWater
        case .sun: return .trunkSun
        case .destructive: return .trunkDestructive
        }
    }

    private var backgroundColor: Color {
        switch variant {
        case .primary: return .clear
        case .water: return .clear
        case .sun: return .clear
        case .destructive: return .clear
        }
    }

    private var pressedBackgroundColor: Color {
        switch variant {
        case .primary: return .wood.opacity(0.08)
        case .water: return .trunkWater.opacity(0.08)
        case .sun: return .trunkSun.opacity(0.08)
        case .destructive: return .trunkDestructive.opacity(0.08)
        }
    }

    private var borderColor: Color {
        switch variant {
        case .primary: return .wood
        case .water: return .trunkWater
        case .sun: return .trunkSun
        case .destructive: return .trunkDestructive
        }
    }
}

extension ButtonStyle where Self == TrunkButtonStyle {
    static var trunk: TrunkButtonStyle { TrunkButtonStyle() }
    static var trunkWater: TrunkButtonStyle { TrunkButtonStyle(variant: .water) }
    static var trunkSun: TrunkButtonStyle { TrunkButtonStyle(variant: .sun) }
    static var trunkDestructive: TrunkButtonStyle { TrunkButtonStyle(variant: .destructive) }
}
