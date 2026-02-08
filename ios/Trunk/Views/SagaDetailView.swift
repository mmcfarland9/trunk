//
//  SagaDetailView.swift
//  Trunk
//
//  Chronological timeline view for a leaf (saga).
//

import SwiftUI

struct SagaDetailView: View {
    let leaf: DerivedLeaf
    @Bindable var progression: ProgressionViewModel

    // Derived state from EventStore
    private var state: DerivedState {
        EventStore.shared.getState()
    }

    private var leafSprouts: [DerivedSprout] {
        state.sprouts.values.filter { $0.leafId == leaf.id }
    }

    private var timelineEvents: [TimelineEvent] {
        var events: [TimelineEvent] = []

        for sprout in leafSprouts {
            // Planted event
            events.append(TimelineEvent(
                date: sprout.plantedAt,
                type: .planted,
                title: sprout.title,
                subtitle: "\(sprout.season.label) · \(sprout.environment.label)",
                detail: nil
            ))

            // Water entries
            for entry in sprout.waterEntries {
                events.append(TimelineEvent(
                    date: entry.timestamp,
                    type: .watered,
                    title: sprout.title,
                    subtitle: "Watered",
                    detail: entry.content.isEmpty ? nil : entry.content
                ))
            }

            // Harvest event
            if let harvestedAt = sprout.harvestedAt, sprout.state == .completed {
                let resultEmoji = resultToEmoji(sprout.result ?? 3)
                events.append(TimelineEvent(
                    date: harvestedAt,
                    type: .harvested,
                    title: sprout.title,
                    subtitle: "Harvested \(resultEmoji)",
                    detail: nil
                ))
            }
        }

        return events.sorted { $0.date > $1.date }
    }

    var body: some View {
        ZStack {
            Color.parchment
                .ignoresSafeArea()

            if timelineEvents.isEmpty {
                emptyState
            } else {
                ScrollView {
                    VStack(spacing: 0) {
                        ForEach(Array(timelineEvents.enumerated()), id: \.offset) { index, event in
                            TimelineRow(
                                event: event,
                                isLast: index == timelineEvents.count - 1
                            )
                        }
                    }
                    .padding(TrunkTheme.space4)
                }
            }
        }
        .navigationTitle("")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .principal) {
                Text(leaf.name.uppercased())
                    .font(.system(size: TrunkTheme.textBase, design: .monospaced))
                    .tracking(2)
                    .foregroundStyle(Color.wood)
                    .lineLimit(1)
            }
        }
    }

    private var emptyState: some View {
        VStack(spacing: TrunkTheme.space4) {
            Text("No activity yet")
                .font(.system(size: TrunkTheme.textLg, design: .monospaced))
                .foregroundStyle(Color.inkFaint)

            Text("Start a sprout in this saga to see your journey unfold.")
                .font(.system(size: TrunkTheme.textSm, design: .monospaced))
                .foregroundStyle(Color.inkFaint)
                .multilineTextAlignment(.center)
        }
        .padding(TrunkTheme.space4)
    }

}

// MARK: - Timeline Event

struct TimelineEvent {
    enum EventType {
        case planted
        case watered
        case harvested
    }

    let date: Date
    let type: EventType
    let title: String
    let subtitle: String
    let detail: String?

    var icon: String {
        switch type {
        case .planted: return "●"
        case .watered: return "💧"
        case .harvested: return "✓"
        }
    }

    var color: Color {
        switch type {
        case .planted: return .twig
        case .watered: return .trunkWater
        case .harvested: return .twig
        }
    }
}

// MARK: - Timeline Row

struct TimelineRow: View {
    let event: TimelineEvent
    let isLast: Bool

    private var formattedDate: String {
        let formatter = DateFormatter()
        formatter.dateFormat = "MMM d, yyyy"
        return formatter.string(from: event.date)
    }

    private var formattedTime: String {
        let formatter = DateFormatter()
        formatter.dateFormat = "h:mm a"
        return formatter.string(from: event.date)
    }

    var body: some View {
        HStack(alignment: .top, spacing: TrunkTheme.space3) {
            // Timeline line and dot
            VStack(spacing: 0) {
                Text(event.icon)
                    .font(.system(size: TrunkTheme.textSm, design: .monospaced))
                    .foregroundStyle(event.color)
                    .frame(width: 24, height: 24)

                if !isLast {
                    Rectangle()
                        .fill(Color.border)
                        .frame(width: 1)
                        .frame(maxHeight: .infinity)
                }
            }

            // Content
            VStack(alignment: .leading, spacing: TrunkTheme.space1) {
                HStack {
                    Text(formattedDate)
                        .font(.system(size: TrunkTheme.textXs, design: .monospaced))
                        .foregroundStyle(Color.inkFaint)

                    Text("·")
                        .foregroundStyle(Color.inkFaint)

                    Text(formattedTime)
                        .font(.system(size: TrunkTheme.textXs, design: .monospaced))
                        .foregroundStyle(Color.inkFaint)
                }

                Text(event.title)
                    .font(.system(size: TrunkTheme.textBase, design: .monospaced))
                    .foregroundStyle(Color.ink)

                Text(event.subtitle)
                    .font(.system(size: TrunkTheme.textSm, design: .monospaced))
                    .foregroundStyle(event.color)

                if let detail = event.detail {
                    Text(detail)
                        .font(.system(size: TrunkTheme.textSm, design: .monospaced))
                        .foregroundStyle(Color.inkLight)
                        .padding(TrunkTheme.space2)
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .background(Color.paper)
                        .overlay(
                            Rectangle()
                                .stroke(Color.borderSubtle, lineWidth: 1)
                        )
                }
            }
            .padding(.bottom, TrunkTheme.space4)

            Spacer()
        }
    }
}

#Preview {
    let leaf = DerivedLeaf(id: "preview-leaf", twigId: "branch-1-twig-0", name: "Learning Piano", createdAt: Date())

    return NavigationStack {
        SagaDetailView(leaf: leaf, progression: ProgressionViewModel())
    }
}
