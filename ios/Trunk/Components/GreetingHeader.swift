//
//  GreetingHeader.swift
//  Trunk
//
//  Time-aware greeting with user name and stats summary.
//

import SwiftUI

struct GreetingHeader: View {
    let userName: String?
    let activeSproutCount: Int
    let readyToHarvestCount: Int
    var onAvatarTap: (() -> Void)?

    private var greeting: String {
        let hour = Calendar.current.component(.hour, from: Date())
        switch hour {
        case 5..<12: return "Good morning"
        case 12..<17: return "Good afternoon"
        case 17..<21: return "Good evening"
        default: return "Good night"
        }
    }

    private var firstName: String? {
        guard let name = userName, !name.isEmpty else { return nil }
        return name.split(separator: " ").first.map(String.init)
    }

    private var summaryText: String {
        var parts: [String] = []
        if activeSproutCount > 0 {
            parts.append("\(activeSproutCount) sprout\(activeSproutCount == 1 ? "" : "s") growing")
        }
        if readyToHarvestCount > 0 {
            parts.append("\(readyToHarvestCount) ready to harvest")
        }
        if parts.isEmpty {
            return "No active sprouts"
        }
        return parts.joined(separator: " · ")
    }

    var body: some View {
        VStack(alignment: .leading, spacing: TrunkTheme.space1) {
            HStack(spacing: TrunkTheme.space2) {
                Text(greeting)
                    .font(.system(size: TrunkTheme.textLg, design: .monospaced))
                    .foregroundStyle(Color.inkLight)

                if let name = firstName {
                    Text(name)
                        .font(.system(size: TrunkTheme.textLg, weight: .medium, design: .monospaced))
                        .foregroundStyle(Color.ink)
                }

                Spacer()

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

                SyncIndicatorView()
            }

            Rectangle()
                .fill(Color.border)
                .frame(height: 1)

            Text(summaryText)
                .font(.system(size: TrunkTheme.textSm, design: .monospaced))
                .foregroundStyle(Color.inkFaint)
        }
        .padding(.bottom, TrunkTheme.space2)
    }
}

#Preview {
    VStack(spacing: 20) {
        GreetingHeader(userName: "Michael McFarland", activeSproutCount: 3, readyToHarvestCount: 1)
        GreetingHeader(userName: nil, activeSproutCount: 0, readyToHarvestCount: 0)
    }
    .padding()
    .background(Color.parchment)
}
