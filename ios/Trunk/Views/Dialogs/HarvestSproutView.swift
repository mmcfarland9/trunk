//
//  HarvestSproutView.swift
//  Trunk
//
//  Dialog for harvesting a sprout with result selection.
//

import SwiftUI

struct HarvestSproutView: View {
    let sprout: DerivedSprout
    @Bindable var progression: ProgressionViewModel

    @Environment(\.dismiss) private var dismiss

    @State private var selectedResult: Int = 3
    @State private var isHarvesting = false
    @State private var animateSelection = false

    private var resultEmojis: [(Int, String)] {
        [
            (1, "🥀"),
            (2, "🌱"),
            (3, "🌿"),
            (4, "🌳"),
            (5, "🌲")
        ]
    }

    private var resultDescriptions: [(Int, String, String)] {
        (1...5).map { result in
            (result,
             SharedConstants.Results.labels[result] ?? "Result \(result)",
             SharedConstants.Results.descriptions[result] ?? "")
        }
    }

    private var reward: Double {
        ProgressionService.capacityReward(
            season: sprout.season,
            environment: sprout.environment,
            result: selectedResult,
            currentCapacity: progression.soilCapacity
        )
    }

    // Helper to check if bloom descriptions exist
    private var hasBloomDescriptions: Bool {
        (sprout.bloomWither != nil && !sprout.bloomWither!.isEmpty) ||
        (sprout.bloomBudding != nil && !sprout.bloomBudding!.isEmpty) ||
        (sprout.bloomFlourish != nil && !sprout.bloomFlourish!.isEmpty)
    }

    var body: some View {
        Form {
            // Sprout info
            Section {
                VStack(alignment: .leading, spacing: 8) {
                    Text(sprout.title)
                        .font(.headline)

                    HStack(spacing: 12) {
                        Label(sprout.season.label, systemImage: "calendar")
                        Label(sprout.environment.label, systemImage: "leaf")
                    }
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                }
            }

            // Bloom reference
            if hasBloomDescriptions {
                Section("Your Bloom Descriptions") {
                    if let bloomWither = sprout.bloomWither, !bloomWither.isEmpty {
                        HStack(alignment: .top) {
                            Text("1/5")
                                .font(.caption)
                                .fontWeight(.bold)
                                .frame(width: 30)
                            Text(bloomWither)
                                .font(.caption)
                        }
                    }
                    if let bloomBudding = sprout.bloomBudding, !bloomBudding.isEmpty {
                        HStack(alignment: .top) {
                            Text("3/5")
                                .font(.caption)
                                .fontWeight(.bold)
                                .frame(width: 30)
                            Text(bloomBudding)
                                .font(.caption)
                        }
                    }
                    if let bloomFlourish = sprout.bloomFlourish, !bloomFlourish.isEmpty {
                        HStack(alignment: .top) {
                            Text("5/5")
                                .font(.caption)
                                .fontWeight(.bold)
                                .frame(width: 30)
                            Text(bloomFlourish)
                                .font(.caption)
                        }
                    }
                }
            }

            // Emoji result picker
            Section {
                VStack(spacing: 16) {
                    HStack(spacing: 12) {
                        ForEach(resultEmojis, id: \.0) { result, emoji in
                            Button {
                                withAnimation(.trunkBounce) {
                                    selectedResult = result
                                    animateSelection = true
                                }
                                HapticManager.selection()
                                // Reset animation flag
                                DispatchQueue.main.asyncAfter(deadline: .now() + 0.3) {
                                    animateSelection = false
                                }
                            } label: {
                                VStack(spacing: 4) {
                                    Text(emoji)
                                        .font(.system(size: 32))
                                        .scaleEffect(selectedResult == result && animateSelection ? 1.2 : 1.0)
                                    Text("\(result)")
                                        .font(.system(size: TrunkTheme.textXs, design: .monospaced))
                                        .foregroundStyle(selectedResult == result ? Color.ink : Color.inkFaint)
                                }
                                .padding(8)
                                .background(
                                    RoundedRectangle(cornerRadius: 8)
                                        .fill(selectedResult == result ? Color.borderSubtle : Color.clear)
                                )
                                .overlay(
                                    RoundedRectangle(cornerRadius: 8)
                                        .stroke(selectedResult == result ? Color.twig : Color.clear, lineWidth: 2)
                                )
                            }
                            .buttonStyle(.plain)
                        }
                    }

                    // Selected result description
                    if let desc = resultDescriptions.first(where: { $0.0 == selectedResult }) {
                        VStack(spacing: 4) {
                            Text(desc.1)
                                .font(.system(size: TrunkTheme.textSm, weight: .medium, design: .monospaced))
                                .foregroundStyle(Color.ink)
                            Text(desc.2)
                                .font(.system(size: TrunkTheme.textXs, design: .monospaced))
                                .foregroundStyle(Color.inkFaint)
                                .multilineTextAlignment(.center)
                        }
                    }
                }
                .frame(maxWidth: .infinity)
                .padding(.vertical, 8)
            } header: {
                Text("How did it bloom?")
            }

            // Reward summary
            Section {
                HStack {
                    Text("Soil Returned")
                    Spacer()
                    Text("+\(sprout.soilCost)")
                        .foregroundStyle(.brown)
                }

                HStack {
                    Text("Capacity Reward")
                    Spacer()
                    Text("+\(String(format: "%.2f", reward))")
                        .foregroundStyle(.green)
                }

                HStack {
                    Text("New Capacity")
                    Spacer()
                    Text(String(format: "%.1f", progression.soilCapacity + reward))
                        .fontWeight(.bold)
                }
            } header: {
                Text("Rewards")
            }
        }
        .navigationTitle("Harvest")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .cancellationAction) {
                Button("Cancel") {
                    dismiss()
                }
            }
            ToolbarItem(placement: .primaryAction) {
                Button {
                    harvestSprout()
                } label: {
                    HStack(spacing: 4) {
                        Text("🌻")
                        Text("Harvest")
                    }
                }
                .disabled(isHarvesting)
            }
        }
    }

    private func harvestSprout() {
        isHarvesting = true
        HapticManager.tap()

        // Calculate capacity gained (same formula as web - pre-calculated at harvest time)
        let capacityGained = reward
        let timestamp = ISO8601DateFormatter().string(from: Date())

        // Push to cloud - state will derive automatically from events
        Task {
            try? await SyncService.shared.pushEvent(type: "sprout_harvested", payload: [
                "sproutId": sprout.id,
                "result": selectedResult,
                "capacityGained": capacityGained,
                "timestamp": timestamp
            ])
        }

        // Celebration haptic sequence and dismiss
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) {
            HapticManager.success()
        }
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.25) {
            HapticManager.impact()
        }
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.4) {
            dismiss()
        }
    }
}

#Preview {
    let sprout = DerivedSprout(
        id: "preview-sprout",
        twigId: "branch-0-twig-0",
        title: "Learn SwiftUI",
        season: .threeMonths,
        environment: .firm,
        soilCost: 8,
        leafId: nil,
        bloomWither: "Completed one tutorial",
        bloomBudding: "Built a small app",
        bloomFlourish: "Published an app to the App Store",
        state: .active,
        plantedAt: Date().addingTimeInterval(-86400 * 90), // 90 days ago
        harvestedAt: nil,
        result: nil,
        reflection: nil,
        waterEntries: []
    )

    return NavigationStack {
        HarvestSproutView(sprout: sprout, progression: ProgressionViewModel())
    }
}
