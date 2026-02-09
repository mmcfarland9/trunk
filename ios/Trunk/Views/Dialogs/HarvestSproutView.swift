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
    @State private var errorMessage: String?

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

    private var hasBloomDescriptions: Bool {
        sprout.bloomWither?.isEmpty == false ||
        sprout.bloomBudding?.isEmpty == false ||
        sprout.bloomFlourish?.isEmpty == false
    }

    var body: some View {
        ZStack {
            Color.parchment
                .ignoresSafeArea()

            ScrollView {
                VStack(alignment: .leading, spacing: TrunkTheme.space5) {
                    // Sprout info
                    VStack(alignment: .leading, spacing: TrunkTheme.space2) {
                        Text(sprout.title)
                            .trunkFont(size: TrunkTheme.textLg, weight: .semibold)
                            .foregroundStyle(Color.ink)

                        HStack(spacing: TrunkTheme.space3) {
                            Text(sprout.season.label)
                            Text("·")
                            Text(sprout.environment.label)
                        }
                        .trunkFont(size: TrunkTheme.textSm)
                        .foregroundStyle(Color.inkFaint)
                    }

                    // Bloom reference
                    if hasBloomDescriptions {
                        VStack(alignment: .leading, spacing: TrunkTheme.space2) {
                            Text("YOUR BLOOM DESCRIPTIONS")
                                .monoLabel(size: TrunkTheme.textXs)

                            VStack(alignment: .leading, spacing: TrunkTheme.space2) {
                                if let bloomWither = sprout.bloomWither, !bloomWither.isEmpty {
                                    HStack(alignment: .top, spacing: TrunkTheme.space2) {
                                        Text("1/5")
                                            .trunkFont(size: TrunkTheme.textXs, weight: .semibold)
                                            .frame(width: 30)
                                        Text(bloomWither)
                                            .trunkFont(size: TrunkTheme.textSm)
                                            .foregroundStyle(Color.inkLight)
                                    }
                                }
                                if let bloomBudding = sprout.bloomBudding, !bloomBudding.isEmpty {
                                    HStack(alignment: .top, spacing: TrunkTheme.space2) {
                                        Text("3/5")
                                            .trunkFont(size: TrunkTheme.textXs, weight: .semibold)
                                            .frame(width: 30)
                                        Text(bloomBudding)
                                            .trunkFont(size: TrunkTheme.textSm)
                                            .foregroundStyle(Color.inkLight)
                                    }
                                }
                                if let bloomFlourish = sprout.bloomFlourish, !bloomFlourish.isEmpty {
                                    HStack(alignment: .top, spacing: TrunkTheme.space2) {
                                        Text("5/5")
                                            .trunkFont(size: TrunkTheme.textXs, weight: .semibold)
                                            .frame(width: 30)
                                        Text(bloomFlourish)
                                            .trunkFont(size: TrunkTheme.textSm)
                                            .foregroundStyle(Color.inkLight)
                                    }
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

                    // Emoji result picker
                    VStack(alignment: .leading, spacing: TrunkTheme.space2) {
                        Text("HOW DID IT BLOOM?")
                            .monoLabel(size: TrunkTheme.textXs)

                        VStack(spacing: TrunkTheme.space4) {
                            HStack(spacing: TrunkTheme.space3) {
                                ForEach(resultEmojis, id: \.0) { result, emoji in
                                    Button {
                                        withAnimation(.trunkBounce) {
                                            selectedResult = result
                                            animateSelection = true
                                        }
                                        HapticManager.selection()
                                        DispatchQueue.main.asyncAfter(deadline: .now() + 0.3) {
                                            animateSelection = false
                                        }
                                    } label: {
                                        VStack(spacing: TrunkTheme.space1) {
                                            Text(emoji)
                                                .font(.system(size: 32))
                                                .scaleEffect(selectedResult == result && animateSelection ? 1.2 : 1.0)
                                            Text("\(result)")
                                                .trunkFont(size: TrunkTheme.textXs)
                                                .foregroundStyle(selectedResult == result ? Color.ink : Color.inkFaint)
                                        }
                                        .frame(minWidth: 44, minHeight: 44)
                                        .padding(TrunkTheme.space2)
                                        .background(selectedResult == result ? Color.borderSubtle : Color.clear)
                                        .overlay(
                                            Rectangle()
                                                .stroke(selectedResult == result ? Color.twig : Color.clear, lineWidth: 2)
                                        )
                                    }
                                    .buttonStyle(.plain)
                                    .accessibilityLabel("\(emoji) result \(result) of 5")
                                }
                            }

                            if let desc = resultDescriptions.first(where: { $0.0 == selectedResult }) {
                                VStack(spacing: TrunkTheme.space1) {
                                    Text(desc.1)
                                        .trunkFont(size: TrunkTheme.textSm, weight: .medium)
                                        .foregroundStyle(Color.ink)
                                    Text(desc.2)
                                        .trunkFont(size: TrunkTheme.textXs)
                                        .foregroundStyle(Color.inkFaint)
                                        .multilineTextAlignment(.center)
                                }
                            }
                        }
                        .frame(maxWidth: .infinity)
                        .padding(TrunkTheme.space3)
                        .background(Color.paper)
                        .overlay(
                            Rectangle()
                                .stroke(Color.border, lineWidth: 1)
                        )
                    }

                    // Reward summary
                    VStack(alignment: .leading, spacing: TrunkTheme.space2) {
                        Text("REWARDS")
                            .monoLabel(size: TrunkTheme.textXs)

                        VStack(spacing: 1) {
                            HStack {
                                Text("Soil Returned")
                                    .trunkFont(size: TrunkTheme.textBase)
                                    .foregroundStyle(Color.ink)
                                Spacer()
                                Text("+\(sprout.soilCost)")
                                    .trunkFont(size: TrunkTheme.textBase)
                                    .foregroundStyle(Color.twig)
                            }
                            .padding(TrunkTheme.space3)

                            HStack {
                                Text("Capacity Reward")
                                    .trunkFont(size: TrunkTheme.textBase)
                                    .foregroundStyle(Color.ink)
                                Spacer()
                                Text("+\(String(format: "%.2f", reward))")
                                    .trunkFont(size: TrunkTheme.textBase)
                                    .foregroundStyle(Color.twig)
                            }
                            .padding(TrunkTheme.space3)

                            HStack {
                                Text("New Capacity")
                                    .trunkFont(size: TrunkTheme.textBase, weight: .medium)
                                    .foregroundStyle(Color.ink)
                                Spacer()
                                Text(String(format: "%.1f", progression.soilCapacity + reward))
                                    .trunkFont(size: TrunkTheme.textBase, weight: .semibold)
                                    .foregroundStyle(Color.ink)
                            }
                            .padding(TrunkTheme.space3)
                        }
                        .background(Color.paper)
                        .overlay(
                            Rectangle()
                                .stroke(Color.border, lineWidth: 1)
                        )
                    }

                    // Error message
                    if let error = errorMessage {
                        Text(error)
                            .trunkFont(size: TrunkTheme.textXs)
                            .foregroundStyle(Color.trunkDestructive)
                            .padding(TrunkTheme.space3)
                            .background(Color.trunkDestructive.opacity(0.08))
                            .overlay(
                                Rectangle()
                                    .stroke(Color.trunkDestructive.opacity(0.3), lineWidth: 1)
                            )
                    }

                    // Harvest button
                    Button {
                        harvestSprout()
                    } label: {
                        HStack(spacing: TrunkTheme.space1) {
                            Text("🌻")
                            Text("HARVEST")
                        }
                    }
                    .buttonStyle(.trunk)
                    .disabled(isHarvesting)
                    .opacity(isHarvesting ? 0.5 : 1)
                    .frame(maxWidth: .infinity, alignment: .trailing)
                }
                .padding(TrunkTheme.space4)
            }
        }
        .navigationTitle("")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .cancellationAction) {
                Button("Cancel") {
                    dismiss()
                }
                .trunkFont(size: TrunkTheme.textSm)
                .foregroundStyle(Color.inkFaint)
            }
            ToolbarItem(placement: .principal) {
                Text("HARVEST")
                    .trunkFont(size: TrunkTheme.textBase)
                    .tracking(2)
                    .foregroundStyle(Color.wood)
            }
        }
    }

    private func harvestSprout() {
        isHarvesting = true
        errorMessage = nil
        HapticManager.tap()

        let capacityGained = reward
        let timestamp = ISO8601DateFormatter().string(from: Date())

        Task {
            do {
                try await SyncService.shared.pushEvent(type: "sprout_harvested", payload: [
                    "sproutId": sprout.id,
                    "result": selectedResult,
                    "capacityGained": capacityGained,
                    "timestamp": timestamp
                ])
            } catch {
                print("Harvest push failed (rolled back): \(error)")
            }
        }

        // Dismiss immediately — optimistic update already in EventStore
        progression.refresh()
        HapticManager.success()
        // Brief haptic flourish before dismiss
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.15) {
            HapticManager.impact()
        }
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.3) {
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
