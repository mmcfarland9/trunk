//
//  SoilLogView.swift
//  Trunk
//
//  Historical view of soil transactions (derived from sprouts and entries).
//

import SwiftUI
import SwiftData

struct SoilLogView: View {
    @Query private var sprouts: [Sprout]
    @Query private var sunEntries: [SunEntry]

    private var transactions: [SoilTransaction] {
        var txns: [SoilTransaction] = []

        for sprout in sprouts {
            // Planted = soil spent
            if let plantedAt = sprout.plantedAt {
                txns.append(SoilTransaction(
                    date: plantedAt,
                    amount: -Double(sprout.soilCost),
                    reason: "Planted",
                    context: sprout.title
                ))
            }

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
                    VStack(alignment: .leading, spacing: TrunkTheme.space4) {
                        ForEach(groupedTransactions, id: \.0) { group in
                            VStack(alignment: .leading, spacing: TrunkTheme.space2) {
                                Text(group.0.uppercased())
                                    .monoLabel(size: TrunkTheme.textXs)
                                    .padding(.horizontal, TrunkTheme.space1)

                                ForEach(group.1.indices, id: \.self) { index in
                                    SoilLogRow(transaction: group.1[index])
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

// MARK: - Soil Transaction

struct SoilTransaction {
    let date: Date
    let amount: Double
    let reason: String
    let context: String
}

// MARK: - Soil Log Row

struct SoilLogRow: View {
    let transaction: SoilTransaction

    private var formattedTime: String {
        let formatter = DateFormatter()
        formatter.dateFormat = "h:mm a"
        return formatter.string(from: transaction.date)
    }

    private var amountText: String {
        if transaction.amount >= 0 {
            return "+\(String(format: "%.2f", transaction.amount))"
        } else {
            return String(format: "%.0f", transaction.amount)
        }
    }

    private var amountColor: Color {
        transaction.amount >= 0 ? .twig : Color(red: 0.6, green: 0.35, blue: 0.3)
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
        .background(Color.paper)
        .overlay(
            Rectangle()
                .stroke(Color.border, lineWidth: 1)
        )
    }
}

#Preview {
    NavigationStack {
        SoilLogView()
    }
    .modelContainer(for: [Sprout.self, WaterEntry.self, Leaf.self, NodeData.self, SunEntry.self], inMemory: true)
}
