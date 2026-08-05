//
//  LeafTimelineView.swift
//  Trunk
//
//  Ordered node timeline for a leaf (saga): one node per sprout in plant order,
//  so a sprout reads as a segment of an ongoing series rather than a standalone
//  goal. Mirrors the web twig view's leaf timeline (web/src/ui/twig-view/
//  sprout-cards.ts) — keep the two in step.
//

import SwiftUI

struct LeafTimelineView: View {
    let sprouts: [DerivedSprout]

    /// Ringed to show which sprout the surrounding row/card is about.
    var currentSproutId: String?

    /// Compact drops the progress summary, for tight rows.
    var compact: Bool = false

    private var ordered: [DerivedSprout] {
        sprouts.sorted { $0.plantedAt < $1.plantedAt }
    }

    /// Counts come from EventDerivation's countLeafProgress so this view can't
    /// drift from web — see the leafProgress parity fixture.
    private var progress: LeafProgress {
        countLeafProgress(sprouts)
    }

    private var doneCount: Int { progress.done }
    private var growingCount: Int { progress.growing }

    /// "3 done · 1 growing" — uprooted sprouts keep their node but never count
    /// as progress.
    private var progressLabel: String {
        var parts: [String] = []
        if doneCount > 0 { parts.append("\(doneCount) done") }
        if growingCount > 0 { parts.append("\(growingCount) growing") }
        return parts.isEmpty ? "just planted" : parts.joined(separator: " · ")
    }

    var body: some View {
        HStack(spacing: TrunkTheme.space2) {
            HStack(spacing: 3) {
                ForEach(ordered, id: \.id) { sprout in
                    node(for: sprout)
                }
            }

            if !compact {
                Text(progressLabel)
                    .font(.system(size: TrunkTheme.textXs, design: .monospaced))
                    .foregroundStyle(Color.inkFaint)
            }
        }
        .accessibilityElement(children: .ignore)
        .accessibilityLabel(accessibilitySummary)
    }

    private func node(for sprout: DerivedSprout) -> some View {
        let isCurrent = sprout.id == currentSproutId

        return Text(glyph(for: sprout))
            .font(.system(size: TrunkTheme.textXs, design: .monospaced))
            .foregroundStyle(color(for: sprout))
            .overlay(
                Circle()
                    .stroke(isCurrent ? Color.border : Color.clear, lineWidth: 1)
                    .padding(-2)
            )
    }

    private func glyph(for sprout: DerivedSprout) -> String {
        switch sprout.state {
        case .completed: return "\u{25CF}"   // ●
        case .uprooted: return "\u{00D7}"    // ×
        default: return "\u{25C9}"           // ◉
        }
    }

    private func color(for sprout: DerivedSprout) -> Color {
        switch sprout.state {
        case .completed: return .twig
        case .uprooted: return .inkFaint
        default: return .wood
        }
    }

    private var accessibilitySummary: String {
        let total = ordered.count
        let position = currentSproutId.flatMap { id in
            ordered.firstIndex { $0.id == id }.map { $0 + 1 }
        }
        let where_ = position.map { "part \($0) of \(total)" } ?? "\(total) sprouts"
        return "\(where_), \(progressLabel)"
    }
}

private func previewSprout(
    id: String,
    state: SproutState,
    daysAgo: Double,
    result: Int?
) -> DerivedSprout {
    DerivedSprout(
        id: id,
        twigId: "branch-0-twig-0",
        title: "10k steps",
        season: .oneMonth,
        environment: .fertile,
        soilCost: 2,
        leafId: "leaf-1",
        bloomWither: nil,
        bloomBudding: nil,
        bloomFlourish: nil,
        state: state,
        plantedAt: Date().addingTimeInterval(-daysAgo * 86400),
        harvestedAt: result != nil ? Date().addingTimeInterval(-(daysAgo - 30) * 86400) : nil,
        result: result,
        reflection: nil,
        waterEntries: []
    )
}

#Preview {
    LeafTimelineView(
        sprouts: [
            previewSprout(id: "s1", state: .completed, daysAgo: 120, result: 4),
            previewSprout(id: "s2", state: .completed, daysAgo: 90, result: 5),
            previewSprout(id: "s3", state: .active, daysAgo: 10, result: nil),
        ],
        currentSproutId: "s3"
    )
    .padding()
    .background(Color.parchment)
}
