//
//  SproutActionsView.swift
//  Trunk
//
//  Action hub for interacting with a sprout (plant, water, harvest).
//

import SwiftUI
import SwiftData

struct SproutActionsView: View {
    @Bindable var sprout: Sprout
    @Bindable var progression: ProgressionViewModel

    @Environment(\.modelContext) private var modelContext
    @Environment(\.dismiss) private var dismiss

    @State private var showingWaterSheet = false
    @State private var showingHarvestSheet = false

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
            if !sprout.bloomWither.isEmpty || !sprout.bloomBudding.isEmpty || !sprout.bloomFlourish.isEmpty {
                Section("Bloom Descriptions") {
                    if !sprout.bloomWither.isEmpty {
                        VStack(alignment: .leading, spacing: 2) {
                            Text("1/5 Withering")
                                .font(.caption)
                                .foregroundStyle(.secondary)
                            Text(sprout.bloomWither)
                        }
                    }
                    if !sprout.bloomBudding.isEmpty {
                        VStack(alignment: .leading, spacing: 2) {
                            Text("3/5 Budding")
                                .font(.caption)
                                .foregroundStyle(.secondary)
                            Text(sprout.bloomBudding)
                        }
                    }
                    if !sprout.bloomFlourish.isEmpty {
                        VStack(alignment: .leading, spacing: 2) {
                            Text("5/5 Flourishing")
                                .font(.caption)
                                .foregroundStyle(.secondary)
                            Text(sprout.bloomFlourish)
                        }
                    }
                }
            }

            // Water entries
            if !sprout.waterEntries.isEmpty {
                Section("Water Journal") {
                    ForEach(sprout.waterEntries.sorted(by: { $0.timestamp > $1.timestamp }), id: \.id) { entry in
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
            if let plantedAt = sprout.plantedAt {
                let progress = ProgressionService.progress(plantedAt: plantedAt, season: sprout.season)
                let harvestDate = ProgressionService.harvestDate(plantedAt: plantedAt, season: sprout.season)

                VStack(alignment: .leading, spacing: 8) {
                    ProgressView(value: progress)
                        .tint(.green)

                    HStack {
                        Text("Planted \(plantedAt, style: .date)")
                        Spacer()
                        if sprout.isReady {
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

            if sprout.isReady {
                Button {
                    showingHarvestSheet = true
                } label: {
                    Label("Harvest Sprout", systemImage: "sparkles")
                }
            }
        }

        Section {
            Button(role: .destructive) {
                // Return 25% of soil cost (matches web behavior)
                let soilReturn = Int(Double(sprout.soilCost) * 0.25)
                progression.returnSoil(soilReturn)

                // Push to cloud before deleting
                let sproutId = sprout.sproutId
                Task {
                    try? await SyncService.shared.pushEvent(type: "sprout_uprooted", payload: [
                        "sproutId": sproutId
                    ])
                }

                // Delete the sprout (web removes entirely, not just marks failed)
                modelContext.delete(sprout)
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

        Section {
            Button(role: .destructive) {
                modelContext.delete(sprout)
                dismiss()
            } label: {
                Label("Delete Sprout", systemImage: "trash")
            }
        }
    }
}

#Preview {
    let sprout = Sprout(
        title: "Learn SwiftUI",
        season: .threeMonths,
        environment: .firm,
        nodeId: "branch-0-twig-0",
        soilCost: 8
    )
    return NavigationStack {
        SproutActionsView(sprout: sprout, progression: ProgressionViewModel())
    }
    .modelContainer(for: [Sprout.self, WaterEntry.self, Leaf.self, NodeData.self, SunEntry.self], inMemory: true)
}
