//
//  SproutListRow.swift
//  Trunk
//
//  Individual sprout row in the list.
//

import SwiftUI

struct SproutListRow: View {
    let sprout: DerivedSprout
    let state: DerivedState

    private var isReady: Bool {
        isSproutReady(sprout)
    }

    private var locationLabel: String {
        twigLocationLabel(for: sprout.twigId)
    }

    private var leafName: String? {
        guard let leafId = sprout.leafId else { return nil }
        return state.leaves[leafId]?.name
    }

    var body: some View {
        HStack(spacing: TrunkTheme.space3) {
            // Left border indicator
            Rectangle()
                .fill(sprout.state == .active ? Color.twig : sprout.state == .uprooted ? Color.trunkDestructive : Color.border)
                .frame(width: 2)

            VStack(alignment: .leading, spacing: TrunkTheme.space1) {
                // Leaf name (prominent — above title for visual primacy)
                if let leafName {
                    Text(leafName)
                        .font(.system(size: TrunkTheme.textBase, weight: .medium, design: .monospaced))
                        .foregroundStyle(Color.wood)
                        .lineLimit(1)
                }

                // Title row
                HStack {
                    Text(sprout.title)
                        .font(.system(size: TrunkTheme.textSm, design: .monospaced))
                        .foregroundStyle(Color.ink)
                        .lineLimit(1)

                    Spacer()

                    // Status badge
                    if sprout.state == .completed, let result = sprout.result {
                        Text(resultToEmoji(result))
                            .font(.system(size: TrunkTheme.textSm))
                    } else if isReady {
                        Text("ready")
                            .font(.system(size: TrunkTheme.textXs, design: .monospaced))
                            .foregroundStyle(Color.twig)
                            .padding(.horizontal, TrunkTheme.space1)
                            .overlay(
                                Rectangle()
                                    .stroke(Color.twig, lineWidth: 1)
                            )
                    }
                }

                // Detail row
                HStack(spacing: TrunkTheme.space2) {
                    // Status
                    Text(sprout.state == .active ? "active" : sprout.state == .uprooted ? "uprooted" : "completed")
                        .font(.system(size: TrunkTheme.textXs, design: .monospaced))
                        .foregroundStyle(sprout.state == .active ? Color.twig : sprout.state == .uprooted ? Color.trunkDestructive : Color.inkFaint)

                    Text("·")
                        .foregroundStyle(Color.inkFaint)

                    // Season
                    Text(sprout.season.label)
                        .font(.system(size: TrunkTheme.textXs, design: .monospaced))
                        .foregroundStyle(Color.inkFaint)

                    Text("·")
                        .foregroundStyle(Color.inkFaint)

                    // Environment
                    Text(sprout.environment.label)
                        .font(.system(size: TrunkTheme.textXs, design: .monospaced))
                        .foregroundStyle(Color.inkFaint)
                }

                // Location row
                Text(locationLabel)
                    .font(.system(size: TrunkTheme.textXs, design: .monospaced))
                    .foregroundStyle(Color.inkFaint)
                    .lineLimit(1)
            }

            Text(">")
                .font(.system(size: TrunkTheme.textSm, design: .monospaced))
                .foregroundStyle(Color.inkFaint)
        }
        .padding(.vertical, TrunkTheme.space3)
        .padding(.horizontal, TrunkTheme.space3)
        .background(Color.paper)
        .overlay(
            Rectangle()
                .stroke(Color.border, lineWidth: 1)
        )
        .accessibilityLabel("Sprout: \(sprout.title), Status: \(sprout.state.rawValue)")
        .accessibilityHint("Double tap to view details")
    }
}
