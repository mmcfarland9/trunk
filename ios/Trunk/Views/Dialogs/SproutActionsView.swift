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
    @State private var isUprooting = false
    @State private var errorMessage: String?
    @State private var showUprootConfirmation = false

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
                LazyVStack(alignment: .leading, spacing: TrunkTheme.space5) {
                    // Sprout info
                    VStack(alignment: .leading, spacing: TrunkTheme.space2) {
                        Text(sprout.title)
                            .trunkFont(size: TrunkTheme.textXl, weight: .semibold)
                            .foregroundStyle(Color.ink)

                        HStack(spacing: TrunkTheme.space3) {
                            Text(sprout.season.label)
                            Text("·")
                            Text(sprout.environment.label)
                        }
                        .trunkFont(size: TrunkTheme.textSm)
                        .foregroundStyle(Color.inkFaint)
                    }

                    // State-specific content
                    switch sprout.state {
                    case .active:
                        activeSection
                    case .completed:
                        completedSection
                    case .uprooted:
                        uprootedSection
                    }

                    // Bloom descriptions
                    if hasBloomDescriptions {
                        VStack(alignment: .leading, spacing: TrunkTheme.space2) {
                            Text("BLOOM DESCRIPTIONS")
                                .monoLabel(size: TrunkTheme.textXs)

                            BloomDescriptionsView(
                                bloomWither: sprout.bloomWither,
                                bloomBudding: sprout.bloomBudding,
                                bloomFlourish: sprout.bloomFlourish
                            )
                            .padding(TrunkTheme.space3)
                            .paperCard()
                        }
                    }

                    // Water entries
                    if !sprout.waterEntries.isEmpty {
                        VStack(alignment: .leading, spacing: TrunkTheme.space2) {
                            Text("WATER JOURNAL")
                                .monoLabel(size: TrunkTheme.textXs)

                            VStack(spacing: 1) {
                                ForEach(sprout.waterEntries.sorted(by: { $0.timestamp > $1.timestamp })) { entry in
                                    VStack(alignment: .leading, spacing: TrunkTheme.space1) {
                                        Text(entry.timestamp, style: .date)
                                            .trunkFont(size: TrunkTheme.textXs)
                                            .foregroundStyle(Color.inkFaint)
                                        if let prompt = entry.prompt, !prompt.isEmpty {
                                            Text("\"\(prompt)\"")
                                                .trunkFont(size: TrunkTheme.textXs)
                                                .italic()
                                                .foregroundStyle(Color.inkFaint)
                                        }
                                        if !entry.content.isEmpty {
                                            Text(entry.content)
                                                .trunkFont(size: TrunkTheme.textSm)
                                                .foregroundStyle(Color.inkLight)
                                        }
                                    }
                                    .padding(TrunkTheme.space3)
                                }
                            }
                            .paperCard()
                        }
                    }
                }
                .padding(TrunkTheme.space4)
            }
        }
        .navigationTitle("")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .cancellationAction) {
                Button("Done") {
                    dismiss()
                }
                .trunkFont(size: TrunkTheme.textSm)
                .foregroundStyle(Color.inkFaint)
            }
            ToolbarItem(placement: .principal) {
                Text("SPROUT")
                    .trunkFont(size: TrunkTheme.textBase)
                    .tracking(2)
                    .foregroundStyle(Color.wood)
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
        let progress = ProgressionService.progress(plantedAt: sprout.plantedAt, season: sprout.season)
        let harvestDate = ProgressionService.harvestDate(plantedAt: sprout.plantedAt, season: sprout.season)

        // Progress
        VStack(alignment: .leading, spacing: TrunkTheme.space2) {
            Text("PROGRESS")
                .monoLabel(size: TrunkTheme.textXs)

            VStack(alignment: .leading, spacing: TrunkTheme.space3) {
                // Progress bar
                GeometryReader { geo in
                    ZStack(alignment: .leading) {
                        Rectangle()
                            .fill(Color.borderSubtle)
                            .frame(height: 6)

                        Rectangle()
                            .fill(Color.twig)
                            .frame(width: geo.size.width * progress, height: 6)
                    }
                }
                .frame(height: 6)

                HStack {
                    Text("Planted \(sprout.plantedAt, style: .date)")
                        .trunkFont(size: TrunkTheme.textXs)
                        .foregroundStyle(Color.inkFaint)
                    Spacer()
                    if isSproutReady(sprout) {
                        Text("Ready!")
                            .trunkFont(size: TrunkTheme.textXs, weight: .semibold)
                            .foregroundStyle(Color.twig)
                    } else {
                        Text("Ready \(harvestDate, style: .date)")
                            .trunkFont(size: TrunkTheme.textXs)
                            .foregroundStyle(Color.inkFaint)
                    }
                }

                Text("Watered \(sprout.waterEntries.count) times")
                    .trunkFont(size: TrunkTheme.textSm)
                    .foregroundStyle(Color.inkFaint)
            }
            .padding(TrunkTheme.space3)
            .paperCard()
        }

        // Actions
        VStack(alignment: .leading, spacing: TrunkTheme.space2) {
            Text("ACTIONS")
                .monoLabel(size: TrunkTheme.textXs)

            VStack(spacing: TrunkTheme.space2) {
                Button {
                    showingWaterSheet = true
                } label: {
                    HStack(spacing: TrunkTheme.space1) {
                        Text("💧")
                        Text("WATER SPROUT")
                    }
                }
                .buttonStyle(.trunkWater)
                .disabled(!progression.canWater)
                .opacity(progression.canWater ? 1 : 0.5)

                if isSproutReady(sprout) {
                    Button {
                        showingHarvestSheet = true
                    } label: {
                        HStack(spacing: TrunkTheme.space1) {
                            Text("🌻")
                            Text("HARVEST SPROUT")
                        }
                    }
                    .buttonStyle(.trunk)
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

                Button {
                    showUprootConfirmation = true
                } label: {
                    HStack(spacing: TrunkTheme.space1) {
                        Text("✕")
                        Text("UPROOT")
                    }
                }
                .buttonStyle(.trunkDestructive)
                .disabled(isUprooting)
                .confirmationDialog("Are you sure you want to uproot this sprout?", isPresented: $showUprootConfirmation, titleVisibility: .visible) {
                    Button("Uproot", role: .destructive) {
                        uprootSprout()
                    }
                    Button("Cancel", role: .cancel) { }
                }
            }
        }
    }

    // MARK: - Completed State

    @ViewBuilder
    private var completedSection: some View {
        VStack(alignment: .leading, spacing: TrunkTheme.space2) {
            Text("RESULT")
                .monoLabel(size: TrunkTheme.textXs)

            VStack(spacing: 1) {
                if let result = sprout.result {
                    HStack {
                        Text("Harvest Result")
                            .trunkFont(size: TrunkTheme.textBase)
                            .foregroundStyle(Color.ink)
                        Spacer()
                        Text(String(repeating: "★", count: result) + String(repeating: "☆", count: 5 - result))
                            .trunkFont(size: TrunkTheme.textSm)
                            .foregroundStyle(Color.trunkSun)
                    }
                    .padding(TrunkTheme.space3)

                    if let harvestedAt = sprout.harvestedAt {
                        HStack {
                            Text("Harvested")
                                .trunkFont(size: TrunkTheme.textBase)
                                .foregroundStyle(Color.ink)
                            Spacer()
                            Text(harvestedAt, style: .date)
                                .trunkFont(size: TrunkTheme.textSm)
                                .foregroundStyle(Color.inkFaint)
                        }
                        .padding(TrunkTheme.space3)
                    }
                }
            }
            .paperCard()
        }
    }

    // MARK: - Uprooted State

    @ViewBuilder
    private var uprootedSection: some View {
        VStack(alignment: .leading, spacing: TrunkTheme.space2) {
            Text("STATUS")
                .monoLabel(size: TrunkTheme.textXs)

            VStack(spacing: 1) {
                HStack {
                    Text("Uprooted")
                        .trunkFont(size: TrunkTheme.textBase)
                        .foregroundStyle(Color.trunkDestructive)
                    Spacer()
                    if let uprootedAt = sprout.uprootedAt {
                        Text(uprootedAt, style: .date)
                            .trunkFont(size: TrunkTheme.textSm)
                            .foregroundStyle(Color.inkFaint)
                    }
                }
                .padding(TrunkTheme.space3)
            }
            .paperCard()
        }
    }

    // MARK: - Uproot

    private func uprootSprout() {
        isUprooting = true
        errorMessage = nil

        let soilReturned = sprout.soilCost * SharedConstants.Soil.uprootRefundRate

        Task {
            do {
                try await SyncService.shared.pushEvent(type: "sprout_uprooted", payload: [
                    "sproutId": .string(sprout.id),
                    "soilReturned": .double(soilReturned)
                ])
            } catch {
                print("Uproot push failed (queued for retry): \(error)")
            }
        }

        // Dismiss immediately — optimistic update already in EventStore
        progression.refresh()
        HapticManager.impact()
        dismiss()
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
