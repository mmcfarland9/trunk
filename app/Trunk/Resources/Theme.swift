//
//  Theme.swift
//  Trunk
//
//  Design tokens matching the web app aesthetic.
//

import SwiftUI

// MARK: - Colors

extension Color {
    // Core palette - warm, earthy tones
    static let ink = Color(red: 0.169, green: 0.102, blue: 0.071)          // #2b1a12
    static let inkLight = Color(red: 0.290, green: 0.200, blue: 0.145)     // #4a3325
    static let inkFaint = Color(red: 0.435, green: 0.337, blue: 0.267)     // #6f5644
    static let wood = Color(red: 0.420, green: 0.267, blue: 0.137)         // #6b4423
    static let twig = Color(red: 0.545, green: 0.353, blue: 0.169)         // #8b5a2b
    static let paper = Color(red: 0.973, green: 0.965, blue: 0.945)        // #f8f6f1
    static let parchment = Color(red: 0.953, green: 0.922, blue: 0.878)    // #f3ebe0

    // Semantic colors
    static let trunkWater = Color(red: 0.275, green: 0.510, blue: 0.706)   // steelblue
    static let trunkSun = Color(red: 0.831, green: 0.627, blue: 0.000)     // #d4a000

    // Borders
    static let borderSubtle = Color.ink.opacity(0.08)
    static let border = Color.ink.opacity(0.15)
    static let borderStrong = Color.ink.opacity(0.25)
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
}

// MARK: - View Modifiers

struct ParchmentBackground: ViewModifier {
    func body(content: Content) -> some View {
        content
            .background(Color.parchment)
    }
}

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

struct InkText: ViewModifier {
    var style: InkStyle = .primary

    enum InkStyle {
        case primary, light, faint
    }

    func body(content: Content) -> some View {
        content
            .foregroundStyle(color)
    }

    private var color: Color {
        switch style {
        case .primary: return .ink
        case .light: return .inkLight
        case .faint: return .inkFaint
        }
    }
}

struct MonoLabel: ViewModifier {
    var size: CGFloat = TrunkTheme.textSm
    var uppercase: Bool = true

    func body(content: Content) -> some View {
        content
            .font(.system(size: size, design: .monospaced))
            .textCase(uppercase ? .uppercase : nil)
            .tracking(uppercase ? 1.5 : 0)
            .foregroundStyle(Color.inkFaint)
    }
}

// MARK: - Extensions

extension View {
    func parchmentBackground() -> some View {
        modifier(ParchmentBackground())
    }

    func paperCard() -> some View {
        modifier(PaperCard())
    }

    func inkText(_ style: InkText.InkStyle = .primary) -> some View {
        modifier(InkText(style: style))
    }

    func monoLabel(size: CGFloat = TrunkTheme.textSm, uppercase: Bool = true) -> some View {
        modifier(MonoLabel(size: size, uppercase: uppercase))
    }
}

// MARK: - Custom Button Styles

struct TrunkButtonStyle: ButtonStyle {
    var variant: Variant = .primary

    enum Variant {
        case primary, secondary, water, sun, destructive
    }

    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.system(size: TrunkTheme.textSm, design: .monospaced))
            .textCase(.uppercase)
            .tracking(1)
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
        case .secondary: return .ink
        case .water: return .trunkWater
        case .sun: return .trunkSun
        case .destructive: return Color(red: 0.54, green: 0.29, blue: 0.23)
        }
    }

    private var backgroundColor: Color {
        switch variant {
        case .primary: return .clear
        case .secondary: return .clear
        case .water: return .clear
        case .sun: return .clear
        case .destructive: return .clear
        }
    }

    private var pressedBackgroundColor: Color {
        switch variant {
        case .primary: return .wood.opacity(0.08)
        case .secondary: return .ink.opacity(0.03)
        case .water: return .trunkWater.opacity(0.08)
        case .sun: return .trunkSun.opacity(0.08)
        case .destructive: return Color(red: 0.54, green: 0.29, blue: 0.23).opacity(0.08)
        }
    }

    private var borderColor: Color {
        switch variant {
        case .primary: return .wood
        case .secondary: return .border
        case .water: return .trunkWater
        case .sun: return .trunkSun
        case .destructive: return Color(red: 0.54, green: 0.29, blue: 0.23)
        }
    }
}

extension ButtonStyle where Self == TrunkButtonStyle {
    static var trunk: TrunkButtonStyle { TrunkButtonStyle() }
    static var trunkSecondary: TrunkButtonStyle { TrunkButtonStyle(variant: .secondary) }
    static var trunkWater: TrunkButtonStyle { TrunkButtonStyle(variant: .water) }
    static var trunkSun: TrunkButtonStyle { TrunkButtonStyle(variant: .sun) }
    static var trunkDestructive: TrunkButtonStyle { TrunkButtonStyle(variant: .destructive) }
}
