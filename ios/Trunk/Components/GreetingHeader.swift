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

    private var greeting: String {
        let hour = Calendar.current.component(.hour, from: Date())
        switch hour {
        case 5..<12: return "Good morning"
        case 12..<17: return "Good afternoon"
        case 17..<21: return "Good evening"
        default: return "Good night"
        }
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

                if let name = userName, !name.isEmpty {
                    Text(name)
                        .font(.system(size: TrunkTheme.textLg, weight: .medium, design: .monospaced))
                        .foregroundStyle(Color.ink)
                }

                Spacer()

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
        GreetingHeader(userName: "Michael", activeSproutCount: 3, readyToHarvestCount: 1)
        GreetingHeader(userName: nil, activeSproutCount: 0, readyToHarvestCount: 0)
    }
    .padding()
    .background(Color.parchment)
}
