//
//  LeafListRow.swift
//  Trunk
//
//  Individual leaf row in the list.
//

import SwiftUI

struct LeafListRow: View {
    let leaf: DerivedLeaf
    let state: DerivedState

    private var locationLabel: String {
        twigLocationLabel(for: leaf.twigId)
    }

    private var sproutsForLeaf: [DerivedSprout] {
        state.sprouts.values.filter { $0.leafId == leaf.id }
    }

    private var activeSproutCount: Int {
        sproutsForLeaf.filter { $0.state == .active }.count
    }

    private var totalSproutCount: Int {
        sproutsForLeaf.count
    }

    private var sproutSummary: String {
        if activeSproutCount > 0 {
            return "\(activeSproutCount) active / \(totalSproutCount) total"
        }
        return "\(totalSproutCount) sprout\(totalSproutCount == 1 ? "" : "s")"
    }

    var body: some View {
        HStack(spacing: TrunkTheme.space3) {
            // Left border indicator
            Rectangle()
                .fill(Color.wood)
                .frame(width: 2)

            VStack(alignment: .leading, spacing: TrunkTheme.space1) {
                // Leaf name
                Text(leaf.name)
                    .font(.system(size: TrunkTheme.textBase, weight: .medium, design: .monospaced))
                    .foregroundStyle(Color.wood)
                    .lineLimit(1)

                // Sprout count
                Text(sproutSummary)
                    .font(.system(size: TrunkTheme.textSm, design: .monospaced))
                    .foregroundStyle(Color.ink)

                // Location row
                Text(locationLabel)
                    .font(.system(size: TrunkTheme.textXs, design: .monospaced))
                    .foregroundStyle(Color.inkFaint)
                    .lineLimit(1)
            }

            Spacer()

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
        .accessibilityLabel("Leaf: \(leaf.name), \(sproutSummary)")
        .accessibilityHint("Double tap to view details")
    }
}
