//
//  SoilLogView.swift
//  Trunk
//
//  Historical view of soil transactions (derived from sprouts and entries).
//

import SwiftUI

struct SoilLogView: View {
    // Derived state from EventStore
    private var state: DerivedState {
        EventStore.shared.getState()
    }

    private var sprouts: [DerivedSprout] {
        Array(state.sprouts.values)
    }

    private var sunEntries: [DerivedSunEntry] {
        state.sunEntries
    }

    private var transactions: [SoilTransaction] {
        var txns: [SoilTransaction] = []

        for sprout in sprouts {
            // Planted = soil spent
            txns.append(SoilTransaction(
                date: sprout.plantedAt,
                amount: -Double(sprout.soilCost),
                reason: "Planted",
                context: sprout.title
            ))

            // Watered = small soil recovery
            for entry in sprout.waterEntries {
                txns.append(SoilTransaction(
                    date: entry.timestamp,
                    amount: ProgressionService.waterRecovery,
                    reason: "Watered",
                    context: sprout.title
                ))
            }

            // Harvested = soil returned (we don't have exact reward stored, so show cost returned)
            if let harvestedAt = sprout.harvestedAt, sprout.state == .completed {
                txns.append(SoilTransaction(
                    date: harvestedAt,
                    amount: Double(sprout.soilCost),
                    reason: "Harvested",
                    context: sprout.title
                ))
            }
        }

        // Sun entries = soil recovery
        for entry in sunEntries {
            txns.append(SoilTransaction(
                date: entry.timestamp,
                amount: ProgressionService.sunRecovery,
                reason: "Shined",
                context: entry.twigLabel
            ))
        }

        return txns.sorted { $0.date > $1.date }
    }

    private var groupedTransactions: [(String, [SoilTransaction])] {
        let grouped = Dictionary(grouping: transactions) { txn in
            dateGroupKey(txn.date)
        }
        return grouped.sorted { $0.key > $1.key }
    }

    var body: some View {
        ZStack {
            Color.parchment
                .ignoresSafeArea()

            if transactions.isEmpty {
                emptyState
            } else {
                ScrollView {
                    LazyVStack(alignment: .leading, spacing: TrunkTheme.space4, pinnedViews: [.sectionHeaders]) {
                        ForEach(groupedTransactions, id: \.0) { group in
                            Section {
                                ForEach(group.1) { transaction in
                                    SoilLogRow(transaction: transaction)
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
                Text("SOIL LOG")
                    .font(.system(size: TrunkTheme.textBase, design: .monospaced))
                    .tracking(2)
                    .foregroundStyle(Color.twig)
            }
        }
    }

    private var emptyState: some View {
        VStack(spacing: TrunkTheme.space4) {
            Text("No soil activity yet")
                .font(.system(size: TrunkTheme.textLg, design: .monospaced))
                .foregroundStyle(Color.inkFaint)

            Text("Plant, water, and harvest sprouts to see your soil history.")
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

// MARK: - Soil Transaction

struct SoilTransaction: Identifiable {
    let id = UUID()
    let date: Date
    let amount: Double
    let reason: String
    let context: String
}

// MARK: - Soil Log Row

struct SoilLogRow: View {
    let transaction: SoilTransaction

    private static let timeFormatter: DateFormatter = {
        let f = DateFormatter()
        f.dateFormat = "h:mm a"
        return f
    }()

    private var formattedTime: String {
        Self.timeFormatter.string(from: transaction.date)
    }

    private var amountText: String {
        if transaction.amount >= 0 {
            return "+\(String(format: "%.2f", transaction.amount))"
        } else {
            return String(format: "%.0f", transaction.amount)
        }
    }

    private var amountColor: Color {
        transaction.amount >= 0 ? .twig : .trunkWarning
    }

    var body: some View {
        HStack {
            VStack(alignment: .leading, spacing: TrunkTheme.space1) {
                Text(transaction.reason)
                    .font(.system(size: TrunkTheme.textBase, design: .monospaced))
                    .foregroundStyle(Color.ink)

                Text(transaction.context)
                    .font(.system(size: TrunkTheme.textSm, design: .monospaced))
                    .foregroundStyle(Color.inkFaint)
            }

            Spacer()

            VStack(alignment: .trailing, spacing: TrunkTheme.space1) {
                Text(amountText)
                    .font(.system(size: TrunkTheme.textBase, design: .monospaced))
                    .fontWeight(.medium)
                    .foregroundStyle(amountColor)

                Text(formattedTime)
                    .font(.system(size: TrunkTheme.textXs, design: .monospaced))
                    .foregroundStyle(Color.inkFaint)
            }
        }
        .padding(TrunkTheme.space3)
        .paperCard()
    }
}

#Preview {
    NavigationStack {
        SoilLogView()
    }
}
