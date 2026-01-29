//
//  WaterLogView.swift
//  Trunk
//
//  Historical view of all water journal entries.
//

import SwiftUI
import SwiftData

struct WaterLogView: View {
    @Query(sort: \Sprout.createdAt) private var sprouts: [Sprout]

    private var allWaterEntries: [(entry: WaterEntry, sproutTitle: String)] {
        var entries: [(WaterEntry, String)] = []
        for sprout in sprouts {
            for entry in sprout.waterEntries {
                entries.append((entry, sprout.title))
            }
        }
        return entries.sorted { $0.0.timestamp > $1.0.timestamp }
    }

    private var groupedEntries: [(String, [(entry: WaterEntry, sproutTitle: String)])] {
        let grouped = Dictionary(grouping: allWaterEntries) { entry in
            dateGroupKey(entry.entry.timestamp)
        }
        return grouped.sorted { $0.key > $1.key }
    }

    var body: some View {
        ZStack {
            Color.parchment
                .ignoresSafeArea()

            if allWaterEntries.isEmpty {
                emptyState
            } else {
                ScrollView {
                    VStack(alignment: .leading, spacing: TrunkTheme.space4) {
                        ForEach(groupedEntries, id: \.0) { group in
                            VStack(alignment: .leading, spacing: TrunkTheme.space2) {
                                Text(group.0.uppercased())
                                    .monoLabel(size: TrunkTheme.textXs)
                                    .padding(.horizontal, TrunkTheme.space1)

                                ForEach(group.1.indices, id: \.self) { index in
                                    let item = group.1[index]
                                    WaterLogRow(
                                        entry: item.entry,
                                        sproutTitle: item.sproutTitle
                                    )
                                }
                            }
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
                Text("WATER LOG")
                    .font(.system(size: TrunkTheme.textBase, design: .monospaced))
                    .tracking(2)
                    .foregroundStyle(Color.trunkWater)
            }
        }
    }

    private var emptyState: some View {
        VStack(spacing: TrunkTheme.space4) {
            Text("No water entries yet")
                .font(.system(size: TrunkTheme.textLg, design: .monospaced))
                .foregroundStyle(Color.inkFaint)

            Text("Water your sprouts to see your journal entries here.")
                .font(.system(size: TrunkTheme.textSm, design: .monospaced))
                .foregroundStyle(Color.inkFaint)
                .multilineTextAlignment(.center)
        }
        .padding(TrunkTheme.space4)
    }

    private func dateGroupKey(_ date: Date) -> String {
        let calendar = Calendar.current
        if calendar.isDateInToday(date) {
            return "Today"
        } else if calendar.isDateInYesterday(date) {
            return "Yesterday"
        } else {
            let formatter = DateFormatter()
            formatter.dateFormat = "MMM d, yyyy"
            return formatter.string(from: date)
        }
    }
}

// MARK: - Water Log Row

struct WaterLogRow: View {
    let entry: WaterEntry
    let sproutTitle: String

    private var formattedTime: String {
        let formatter = DateFormatter()
        formatter.dateFormat = "h:mm a"
        return formatter.string(from: entry.timestamp)
    }

    var body: some View {
        VStack(alignment: .leading, spacing: TrunkTheme.space2) {
            HStack {
                Text("💧")
                    .font(.system(size: TrunkTheme.textSm))

                Text(sproutTitle)
                    .font(.system(size: TrunkTheme.textBase, design: .monospaced))
                    .foregroundStyle(Color.ink)

                Spacer()

                Text(formattedTime)
                    .font(.system(size: TrunkTheme.textXs, design: .monospaced))
                    .foregroundStyle(Color.inkFaint)
            }

            if !entry.note.isEmpty {
                Text(entry.note)
                    .font(.system(size: TrunkTheme.textSm, design: .monospaced))
                    .foregroundStyle(Color.inkLight)
                    .lineLimit(3)
            }
        }
        .padding(TrunkTheme.space3)
        .background(Color.paper)
        .overlay(
            Rectangle()
                .stroke(Color.border, lineWidth: 1)
        )
    }
}

#Preview {
    NavigationStack {
        WaterLogView()
    }
    .modelContainer(for: [Sprout.self, WaterEntry.self, Leaf.self, NodeData.self, SunEntry.self], inMemory: true)
}
