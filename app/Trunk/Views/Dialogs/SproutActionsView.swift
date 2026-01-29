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
            case .draft:
                draftSection
            case .active:
                activeSection
            case .completed:
                completedSection
            case .failed:
                failedSection
            }

            // Bloom descriptions
            if !sprout.bloomLow.isEmpty || !sprout.bloomMid.isEmpty || !sprout.bloomHigh.isEmpty {
                Section("Bloom Descriptions") {
                    if !sprout.bloomLow.isEmpty {
                        VStack(alignment: .leading, spacing: 2) {
                            Text("1/5 Minimal")
                                .font(.caption)
                                .foregroundStyle(.secondary)
                            Text(sprout.bloomLow)
                        }
                    }
                    if !sprout.bloomMid.isEmpty {
                        VStack(alignment: .leading, spacing: 2) {
                            Text("3/5 Good")
                                .font(.caption)
                                .foregroundStyle(.secondary)
                            Text(sprout.bloomMid)
                        }
                    }
                    if !sprout.bloomHigh.isEmpty {
                        VStack(alignment: .leading, spacing: 2) {
                            Text("5/5 Exceptional")
                                .font(.caption)
                                .foregroundStyle(.secondary)
                            Text(sprout.bloomHigh)
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
                            if !entry.note.isEmpty {
                                Text(entry.note)
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

    // MARK: - Draft State

    @ViewBuilder
    private var draftSection: some View {
        Section {
            HStack {
                Text("Soil Cost")
                Spacer()
                Text("\(sprout.soilCost)")
                    .fontWeight(.bold)
                    .foregroundStyle(.brown)
            }

            Button {
                progression.plantSprout(sprout)
            } label: {
                Label("Plant Sprout", systemImage: "leaf.arrow.triangle.circlepath")
            }
            .disabled(!progression.canAfford(cost: sprout.soilCost))

        } header: {
            Text("Actions")
        } footer: {
            if !progression.canAfford(cost: sprout.soilCost) {
                Text("Not enough soil. You have \(progression.soilAvailableInt) available.")
                    .foregroundStyle(.red)
            }
        }

        Section {
            Button(role: .destructive) {
                modelContext.delete(sprout)
                dismiss()
            } label: {
                Label("Delete Draft", systemImage: "trash")
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
                sprout.fail()
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

    // MARK: - Failed State

    @ViewBuilder
    private var failedSection: some View {
        Section {
            Text("This sprout was uprooted.")
                .foregroundStyle(.secondary)

            if let harvestedAt = sprout.harvestedAt {
                HStack {
                    Text("Uprooted")
                    Spacer()
                    Text(harvestedAt, style: .date)
                        .foregroundStyle(.secondary)
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
