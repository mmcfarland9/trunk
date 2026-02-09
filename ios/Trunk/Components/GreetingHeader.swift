//
//  GreetingHeader.swift
//  Trunk
//
//  Time-aware greeting with sync indicator and user avatar.
//

import SwiftUI

struct GreetingHeader: View {
    let userName: String?
    var onAvatarTap: (() -> Void)?

    private var greeting: String {
        let hour = Calendar.current.component(.hour, from: Date())
        let dayOfYear = Calendar.current.ordinality(of: .day, in: .year, for: Date()) ?? 0

        let greetings: [String]
        switch hour {
        case 5..<12:
            greetings = [
                "Good morning.",
                "Rise and grow.",
                "A fresh start.",
                "New day, new growth.",
                "Morning light.",
                "Tend your garden."
            ]
        case 12..<17:
            greetings = [
                "Good afternoon.",
                "Keep growing.",
                "Steady progress.",
                "Stay the course.",
                "One step at a time.",
                "Tend your garden."
            ]
        case 17..<21:
            greetings = [
                "Good evening.",
                "Wind down well.",
                "Reflect and rest.",
                "Day well spent.",
                "Evening calm.",
                "Tend your garden."
            ]
        default:
            greetings = [
                "Good night.",
                "Rest and recover.",
                "Until tomorrow.",
                "Sleep well.",
                "Stars are out.",
                "Tend your garden."
            ]
        }

        return greetings[dayOfYear % greetings.count]
    }

    private var firstName: String? {
        guard let name = userName, !name.isEmpty else { return nil }
        return name.split(separator: " ").first.map(String.init)
    }

    var body: some View {
        HStack(spacing: TrunkTheme.space2) {
            SyncIndicatorView()

            Spacer()

            Text(greeting)
                .font(.system(size: TrunkTheme.textLg, design: .monospaced))
                .foregroundStyle(Color.inkLight)

            Button {
                onAvatarTap?()
            } label: {
                ZStack {
                    Capsule()
                        .fill(Color.paper)
                        .overlay(
                            Capsule()
                                .stroke(Color.border, lineWidth: 1)
                        )

                    HStack(spacing: 6) {
                        // Person silhouette (matches web profileIcon)
                        Image(systemName: "person.fill")
                            .font(.system(size: 12))
                            .foregroundStyle(Color.inkFaint)

                        if let name = firstName {
                            Text(name)
                                .font(.system(size: TrunkTheme.textXs, design: .monospaced))
                                .foregroundStyle(Color.inkLight)
                        }
                    }
                    .padding(.horizontal, 10)
                    .padding(.vertical, 6)
                }
                .fixedSize()
            }
            .buttonStyle(.plain)
        }
        .padding(.bottom, TrunkTheme.space2)
    }
}

#Preview {
    VStack(spacing: 20) {
        GreetingHeader(userName: "Michael McFarland")
        GreetingHeader(userName: nil)
    }
    .padding()
    .background(Color.parchment)
}
