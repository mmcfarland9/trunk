//
//  HarvestSproutView.swift
//  Trunk
//
//  Dialog for harvesting a sprout with result selection.
//

import SwiftUI
import SwiftData

struct HarvestSproutView: View {
    @Bindable var sprout: Sprout
    @Bindable var progression: ProgressionViewModel

    @Environment(\.dismiss) private var dismiss

    @State private var selectedResult: Int = 3

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
            if !sprout.bloomWither.isEmpty || !sprout.bloomBudding.isEmpty || !sprout.bloomFlourish.isEmpty {
                Section("Your Bloom Descriptions") {
                    if !sprout.bloomWither.isEmpty {
                        HStack(alignment: .top) {
                            Text("1/5")
                                .font(.caption)
                                .fontWeight(.bold)
                                .frame(width: 30)
                            Text(sprout.bloomWither)
                                .font(.caption)
                        }
                    }
                    if !sprout.bloomBudding.isEmpty {
                        HStack(alignment: .top) {
                            Text("3/5")
                                .font(.caption)
                                .fontWeight(.bold)
                                .frame(width: 30)
                            Text(sprout.bloomBudding)
                                .font(.caption)
                        }
                    }
                    if !sprout.bloomFlourish.isEmpty {
                        HStack(alignment: .top) {
                            Text("5/5")
                                .font(.caption)
                                .fontWeight(.bold)
                                .frame(width: 30)
                            Text(sprout.bloomFlourish)
                                .font(.caption)
                        }
                    }
                }
            }

            // Result picker
            Section {
                ForEach(resultDescriptions, id: \.0) { result, label, description in
                    Button {
                        selectedResult = result
                    } label: {
                        HStack {
                            VStack(alignment: .leading, spacing: 2) {
                                HStack(spacing: 4) {
                                    ForEach(0..<5, id: \.self) { i in
                                        Image(systemName: i < result ? "star.fill" : "star")
                                            .font(.caption)
                                            .foregroundStyle(i < result ? .yellow : .secondary)
                                    }
                                    Text(label)
                                        .font(.subheadline)
                                        .fontWeight(.medium)
                                }
                                Text(description)
                                    .font(.caption)
                                    .foregroundStyle(.secondary)
                            }

                            Spacer()

                            if selectedResult == result {
                                Image(systemName: "checkmark.circle.fill")
                                    .foregroundStyle(.green)
                            }
                        }
                    }
                    .buttonStyle(.plain)
                }
            } header: {
                Text("How did it go?")
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
                Button("Harvest") {
                    harvestSprout()
                }
            }
        }
    }

    private func harvestSprout() {
        progression.harvestSprout(sprout, result: selectedResult)
        sprout.harvest(result: selectedResult)
        dismiss()
    }
}

#Preview {
    let sprout = Sprout(
        title: "Learn SwiftUI",
        season: .threeMonths,
        environment: .firm,
        nodeId: "branch-0-twig-0",
        soilCost: 8,
        bloomWither: "Completed one tutorial",
        bloomBudding: "Built a small app",
        bloomFlourish: "Published an app to the App Store"
    )

    return NavigationStack {
        HarvestSproutView(sprout: sprout, progression: ProgressionViewModel())
    }
    .modelContainer(for: [Sprout.self, WaterEntry.self, Leaf.self, NodeData.self, SunEntry.self], inMemory: true)
}
