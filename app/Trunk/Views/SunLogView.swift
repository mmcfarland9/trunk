//
//  SunLogView.swift
//  Trunk
//
//  Historical view of all sun/shine reflections.
//

import SwiftUI
import SwiftData

struct SunLogView: View {
    @Query(sort: \SunEntry.timestamp, order: .reverse) private var sunEntries: [SunEntry]

    private var groupedEntries: [(String, [SunEntry])] {
        let grouped = Dictionary(grouping: sunEntries) { entry in
            dateGroupKey(entry.timestamp)
        }
        return grouped.sorted { $0.key > $1.key }
    }

    var body: some View {
        ZStack {
            Color.parchment
                .ignoresSafeArea()

            if sunEntries.isEmpty {
                emptyState
            } else {
                ScrollView {
                    VStack(alignment: .leading, spacing: TrunkTheme.space4) {
                        ForEach(groupedEntries, id: \.0) { group in
                            VStack(alignment: .leading, spacing: TrunkTheme.space2) {
                                Text(group.0.uppercased())
                                    .monoLabel(size: TrunkTheme.textXs)
                                    .padding(.horizontal, TrunkTheme.space1)

                                ForEach(group.1) { entry in
                                    SunLogRow(entry: entry)
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
                Text("SUN LOG")
                    .font(.system(size: TrunkTheme.textBase, design: .monospaced))
                    .tracking(2)
                    .foregroundStyle(Color.trunkSun)
            }
        }
    }

    private var emptyState: some View {
        VStack(spacing: TrunkTheme.space4) {
            Text("No reflections yet")
                .font(.system(size: TrunkTheme.textLg, design: .monospaced))
                .foregroundStyle(Color.inkFaint)

            Text("Use your weekly shine to reflect and see your thoughts here.")
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

// MARK: - Sun Log Row

struct SunLogRow: View {
    let entry: SunEntry

    private var formattedTime: String {
        let formatter = DateFormatter()
        formatter.dateFormat = "h:mm a"
        return formatter.string(from: entry.timestamp)
    }

    var body: some View {
        VStack(alignment: .leading, spacing: TrunkTheme.space2) {
            HStack {
                Text("☀️")
                    .font(.system(size: TrunkTheme.textSm))

                Text(entry.contextLabel)
                    .font(.system(size: TrunkTheme.textBase, design: .monospaced))
                    .foregroundStyle(Color.ink)

                Spacer()

                Text(formattedTime)
                    .font(.system(size: TrunkTheme.textXs, design: .monospaced))
                    .foregroundStyle(Color.inkFaint)
            }

            if let prompt = entry.prompt {
                Text("\"\(prompt)\"")
                    .font(.system(size: TrunkTheme.textXs, design: .monospaced))
                    .italic()
                    .foregroundStyle(Color.inkFaint)
            }

            Text(entry.content)
                .font(.system(size: TrunkTheme.textSm, design: .monospaced))
                .foregroundStyle(Color.inkLight)
                .lineLimit(4)
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
        SunLogView()
    }
    .modelContainer(for: [Sprout.self, WaterEntry.self, Leaf.self, NodeData.self, SunEntry.self], inMemory: true)
}
