//
//  SproutActionsView.swift
//  Trunk
//
//  Action hub for interacting with a sprout (plant, water, harvest).
//

import SwiftUI

struct SproutActionsView: View {
    let sprout: DerivedSprout
    @Bindable var progression: ProgressionViewModel

    @Environment(\.dismiss) private var dismiss

    @State private var showingWaterSheet = false
    @State private var showingHarvestSheet = false

    // Helper to check if bloom descriptions exist
    private var hasBloomDescriptions: Bool {
        (sprout.bloomWither != nil && !sprout.bloomWither!.isEmpty) ||
        (sprout.bloomBudding != nil && !sprout.bloomBudding!.isEmpty) ||
        (sprout.bloomFlourish != nil && !sprout.bloomFlourish!.isEmpty)
    }

    var body: some View {
        List {
            // Sprout info
            Section {
                VStack(alignment: .leading, spacing: 8) {
                    Text(sprout.title)
                        .font(.title2)
                        .fontWeight(.bold)

                    HStack(spacing: 12) {
                        Label(sprout.season.label, systemImage: "calendar")
                        Label(sprout.environment.label, systemImage: "leaf")
                    }
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                }
                .padding(.vertical, 4)
            }

            // State-specific content
            switch sprout.state {
            case .active:
                activeSection
            case .completed:
                completedSection
            }

            // Bloom descriptions
            if hasBloomDescriptions {
                Section("Bloom Descriptions") {
                    if let bloomWither = sprout.bloomWither, !bloomWither.isEmpty {
                        VStack(alignment: .leading, spacing: 2) {
                            Text("1/5 Withering")
                                .font(.caption)
                                .foregroundStyle(.secondary)
                            Text(bloomWither)
                        }
                    }
                    if let bloomBudding = sprout.bloomBudding, !bloomBudding.isEmpty {
                        VStack(alignment: .leading, spacing: 2) {
                            Text("3/5 Budding")
                                .font(.caption)
                                .foregroundStyle(.secondary)
                            Text(bloomBudding)
                        }
                    }
                    if let bloomFlourish = sprout.bloomFlourish, !bloomFlourish.isEmpty {
                        VStack(alignment: .leading, spacing: 2) {
                            Text("5/5 Flourishing")
                                .font(.caption)
                                .foregroundStyle(.secondary)
                            Text(bloomFlourish)
                        }
                    }
                }
            }

            // Water entries
            if !sprout.waterEntries.isEmpty {
                Section("Water Journal") {
                    ForEach(sprout.waterEntries.sorted(by: { $0.timestamp > $1.timestamp }), id: \.timestamp) { entry in
                        VStack(alignment: .leading, spacing: 2) {
                            Text(entry.timestamp, style: .date)
                                .font(.caption)
                                .foregroundStyle(.secondary)
                            if !entry.content.isEmpty {
                                Text(entry.content)
                                    .font(.subheadline)
                            }
                        }
                        .padding(.vertical, 2)
                    }
                }
            }
        }
        .navigationTitle("Sprout")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .cancellationAction) {
                Button("Done") {
                    dismiss()
                }
            }
        }
        .sheet(isPresented: $showingWaterSheet) {
            NavigationStack {
                WaterSproutView(sprout: sprout, progression: progression)
            }
            .presentationDetents([.medium])
        }
        .sheet(isPresented: $showingHarvestSheet) {
            NavigationStack {
                HarvestSproutView(sprout: sprout, progression: progression)
            }
        }
    }

    // MARK: - Active State

    @ViewBuilder
    private var activeSection: some View {
        // Progress
        Section("Progress") {
            let progress = ProgressionService.progress(plantedAt: sprout.plantedAt, season: sprout.season)
            let harvestDate = ProgressionService.harvestDate(plantedAt: sprout.plantedAt, season: sprout.season)

            VStack(alignment: .leading, spacing: 8) {
                ProgressView(value: progress)
                    .tint(.green)

                HStack {
                    Text("Planted \(sprout.plantedAt, style: .date)")
                    Spacer()
                    if isSproutReady(sprout) {
                        Text("Ready!")
                            .fontWeight(.bold)
                            .foregroundStyle(.green)
                    } else {
                        Text("Ready \(harvestDate, style: .date)")
                    }
                }
                .font(.caption)
                .foregroundStyle(.secondary)
            }

            Text("Watered \(sprout.waterEntries.count) times")
                .font(.subheadline)
                .foregroundStyle(.secondary)
        }

        // Actions
        Section("Actions") {
            Button {
                showingWaterSheet = true
            } label: {
                Label("Water Sprout", systemImage: "drop.fill")
            }
            .disabled(!progression.canWater)

            if isSproutReady(sprout) {
                Button {
                    showingHarvestSheet = true
                } label: {
                    Label("Harvest Sprout", systemImage: "sparkles")
                }
            }
        }

        Section {
            Button(role: .destructive) {
                // Calculate soil to return (25% of cost)
                let soilReturned = Double(sprout.soilCost) * 0.25

                // Push event to cloud
                Task {
                    try? await SyncService.shared.pushEvent(type: "sprout_uprooted", payload: [
                        "sproutId": sprout.id,
                        "soilReturned": soilReturned
                    ])
                }

                dismiss()
            } label: {
                Label("Uproot", systemImage: "xmark.circle")
            }
        }
    }

    // MARK: - Completed State

    @ViewBuilder
    private var completedSection: some View {
        Section("Result") {
            if let result = sprout.result {
                HStack {
                    Text("Harvest Result")
                    Spacer()
                    HStack(spacing: 2) {
                        ForEach(0..<5, id: \.self) { i in
                            Image(systemName: i < result ? "star.fill" : "star")
                                .foregroundStyle(i < result ? .yellow : .secondary)
                        }
                    }
                }

                if let harvestedAt = sprout.harvestedAt {
                    HStack {
                        Text("Harvested")
                        Spacer()
                        Text(harvestedAt, style: .date)
                            .foregroundStyle(.secondary)
                    }
                }
            }
        }

        // No delete button for completed sprouts since they're derived from events
        // (they'll remain in history)
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
        bloomWither: nil,
        bloomBudding: nil,
        bloomFlourish: nil,
        state: .active,
        plantedAt: Date(),
        harvestedAt: nil,
        result: nil,
        reflection: nil,
        waterEntries: []
    )
    return NavigationStack {
        SproutActionsView(sprout: sprout, progression: ProgressionViewModel())
    }
}
