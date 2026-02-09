//
//  SunLogView.swift
//  Trunk
//
//  Historical view of all sun/shine reflections.
//

import SwiftUI

struct SunLogView: View {
    // Derived state from EventStore
    private var state: DerivedState {
        EventStore.shared.getState()
    }

    private var sunEntries: [DerivedSunEntry] {
        state.sunEntries.sorted { $0.timestamp > $1.timestamp }
    }

    private var groupedEntries: [(String, [DerivedSunEntry])] {
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
                    LazyVStack(alignment: .leading, spacing: TrunkTheme.space4, pinnedViews: [.sectionHeaders]) {
                        ForEach(groupedEntries, id: \.0) { group in
                            Section {
                                ForEach(group.1) { entry in
                                    SunLogRow(entry: entry)
                                }
                            } header: {
                                Text(group.0.uppercased())
                                    .monoLabel(size: TrunkTheme.textXs)
                                    .padding(.horizontal, TrunkTheme.space1)
                                    .frame(maxWidth: .infinity, alignment: .leading)
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

    private static let dateGroupFormatter: DateFormatter = {
        let f = DateFormatter()
        f.dateFormat = "MMM d, yyyy"
        return f
    }()

    private func dateGroupKey(_ date: Date) -> String {
        let calendar = Calendar.current
        if calendar.isDateInToday(date) {
            return "Today"
        } else if calendar.isDateInYesterday(date) {
            return "Yesterday"
        } else {
            return Self.dateGroupFormatter.string(from: date)
        }
    }
}

// MARK: - Sun Log Row

struct SunLogRow: View {
    let entry: DerivedSunEntry

    private static let timeFormatter: DateFormatter = {
        let f = DateFormatter()
        f.dateFormat = "h:mm a"
        return f
    }()

    private var formattedTime: String {
        Self.timeFormatter.string(from: entry.timestamp)
    }

    var body: some View {
        VStack(alignment: .leading, spacing: TrunkTheme.space2) {
            HStack {
                Text("☀️")
                    .font(.system(size: TrunkTheme.textSm))

                Text(entry.twigLabel)
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
        .paperCard()
    }
}

#Preview {
    NavigationStack {
        SunLogView()
    }
}
