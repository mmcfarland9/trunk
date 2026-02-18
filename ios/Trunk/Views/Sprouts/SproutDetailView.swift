//
//  SproutDetailView.swift
//  Trunk
//
//  Detail view for a single sprout showing metadata, bloom, harvest, and water log.
//

import SwiftUI

struct SproutDetailView: View {
    let sproutId: String

    // Derived state from EventStore
    private var state: DerivedState {
        EventStore.shared.getState()
    }

    private var sprout: DerivedSprout? {
        state.sprouts[sproutId]
    }

    private var locationLabel: String {
        guard let sprout else { return "" }
        return twigLocationLabel(for: sprout.twigId)
    }

    private var leafName: String? {
        guard let leafId = sprout?.leafId else { return nil }
        return state.leaves[leafId]?.name
    }

    private static let dateFormatter: DateFormatter = {
        let formatter = DateFormatter()
        formatter.dateFormat = "MMM d, yyyy"
        return formatter
    }()

    private var formattedPlantedDate: String {
        guard let sprout else { return "" }
        return Self.dateFormatter.string(from: sprout.plantedAt)
    }

    private var formattedHarvestDate: String? {
        guard let harvestedAt = sprout?.harvestedAt else { return nil }
        return Self.dateFormatter.string(from: harvestedAt)
    }

    var body: some View {
        ZStack {
            Color.parchment
                .ignoresSafeArea()

            if let sprout {
                ScrollView {
                    VStack(alignment: .leading, spacing: TrunkTheme.space4) {
                        // Status and metadata
                        metadataSection(sprout)
                            .animatedCard(index: 0)

                        // Bloom descriptions
                        if sprout.bloomWither != nil || sprout.bloomBudding != nil || sprout.bloomFlourish != nil {
                            bloomSection(sprout)
                                .animatedCard(index: 1)
                        }

                        // Result (if completed)
                        if sprout.state == .completed {
                            resultSection(sprout)
                                .animatedCard(index: 2)
                        }

                        // Water entries
                        if !sprout.waterEntries.isEmpty {
                            waterSection(sprout)
                                .animatedCard(index: 3)
                        }
                    }
                    .padding(TrunkTheme.space4)
                }
            } else {
                Text("Sprout not found")
                    .font(.system(size: TrunkTheme.textBase, design: .monospaced))
                    .foregroundStyle(Color.inkFaint)
            }
        }
        .navigationTitle("")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .principal) {
                Text((sprout?.title ?? "SPROUT").uppercased())
                    .font(.system(size: TrunkTheme.textBase, design: .monospaced))
                    .tracking(2)
                    .foregroundStyle(Color.wood)
                    .lineLimit(1)
            }
        }
    }

    // MARK: - Metadata Section

    private func metadataSection(_ sprout: DerivedSprout) -> some View {
        VStack(alignment: .leading, spacing: TrunkTheme.space2) {
            Text("DETAILS")
                .monoLabel(size: TrunkTheme.textXs)

            VStack(spacing: 0) {
                detailRow(label: "Status", value: sprout.state == .active ? "Active" : sprout.state == .uprooted ? "Uprooted" : "Completed",
                         valueColor: sprout.state == .active ? Color.twig : sprout.state == .uprooted ? Color.trunkDestructive : Color.inkFaint)

                Divider().overlay(Color.borderSubtle)

                detailRow(label: "Season", value: sprout.season.label)

                Divider().overlay(Color.borderSubtle)

                detailRow(label: "Environment", value: sprout.environment.label)

                Divider().overlay(Color.borderSubtle)

                detailRow(label: "Soil Cost", value: "\(sprout.soilCost)")

                Divider().overlay(Color.borderSubtle)

                detailRow(label: "Planted", value: formattedPlantedDate)

                if let harvestDate = formattedHarvestDate {
                    Divider().overlay(Color.borderSubtle)

                    detailRow(label: "Harvested", value: harvestDate)
                }

                Divider().overlay(Color.borderSubtle)

                detailRow(label: "Location", value: locationLabel)

                if let leafName {
                    Divider().overlay(Color.borderSubtle)

                    detailRow(label: "Leaf", value: leafName)
                }
            }
            .background(Color.paper)
            .overlay(
                Rectangle()
                    .stroke(Color.border, lineWidth: 1)
            )
        }
    }

    private func detailRow(label: String, value: String, valueColor: Color = Color.ink) -> some View {
        HStack {
            Text(label)
                .font(.system(size: TrunkTheme.textBase, design: .monospaced))
                .foregroundStyle(Color.inkFaint)

            Spacer()

            Text(value)
                .font(.system(size: TrunkTheme.textBase, design: .monospaced))
                .foregroundStyle(valueColor)
        }
        .padding(TrunkTheme.space3)
    }

    // MARK: - Bloom Section

    private func bloomSection(_ sprout: DerivedSprout) -> some View {
        VStack(alignment: .leading, spacing: TrunkTheme.space2) {
            Text("BLOOM")
                .monoLabel(size: TrunkTheme.textXs)

            VStack(spacing: 0) {
                if let wither = sprout.bloomWither {
                    bloomRow(level: "1/5", description: wither)
                }

                if sprout.bloomWither != nil && sprout.bloomBudding != nil {
                    Divider().overlay(Color.borderSubtle)
                }

                if let budding = sprout.bloomBudding {
                    bloomRow(level: "3/5", description: budding)
                }

                if sprout.bloomBudding != nil && sprout.bloomFlourish != nil {
                    Divider().overlay(Color.borderSubtle)
                }

                if let flourish = sprout.bloomFlourish {
                    bloomRow(level: "5/5", description: flourish)
                }
            }
            .background(Color.paper)
            .overlay(
                Rectangle()
                    .stroke(Color.border, lineWidth: 1)
            )
        }
    }

    private func bloomRow(level: String, description: String) -> some View {
        HStack(alignment: .top, spacing: TrunkTheme.space3) {
            Text(level)
                .font(.system(size: TrunkTheme.textXs, design: .monospaced))
                .foregroundStyle(Color.inkFaint)
                .frame(width: 28, alignment: .leading)

            Text(description)
                .font(.system(size: TrunkTheme.textSm, design: .monospaced))
                .foregroundStyle(Color.ink)
        }
        .padding(TrunkTheme.space3)
    }

    // MARK: - Result Section

    private func resultSection(_ sprout: DerivedSprout) -> some View {
        VStack(alignment: .leading, spacing: TrunkTheme.space2) {
            Text("HARVEST")
                .monoLabel(size: TrunkTheme.textXs)

            VStack(spacing: 0) {
                if let result = sprout.result {
                    HStack {
                        Text("Result")
                            .font(.system(size: TrunkTheme.textBase, design: .monospaced))
                            .foregroundStyle(Color.inkFaint)

                        Spacer()

                        HStack(spacing: TrunkTheme.space2) {
                            Text(resultToEmoji(result))
                                .font(.system(size: TrunkTheme.textBase))

                            Text("\(result)/5")
                                .font(.system(size: TrunkTheme.textBase, design: .monospaced))
                                .foregroundStyle(Color.ink)
                        }
                    }
                    .padding(TrunkTheme.space3)
                }

                if let reflection = sprout.reflection, !reflection.isEmpty {
                    Divider().overlay(Color.borderSubtle)

                    VStack(alignment: .leading, spacing: TrunkTheme.space1) {
                        Text("Reflection")
                            .font(.system(size: TrunkTheme.textXs, design: .monospaced))
                            .foregroundStyle(Color.inkFaint)

                        Text(reflection)
                            .font(.system(size: TrunkTheme.textSm, design: .monospaced))
                            .foregroundStyle(Color.ink)
                    }
                    .padding(TrunkTheme.space3)
                    .frame(maxWidth: .infinity, alignment: .leading)
                }
            }
            .background(Color.paper)
            .overlay(
                Rectangle()
                    .stroke(Color.border, lineWidth: 1)
            )
        }
    }

    // MARK: - Water Entries Section

    private func waterSection(_ sprout: DerivedSprout) -> some View {
        VStack(alignment: .leading, spacing: TrunkTheme.space2) {
            Text("WATER LOG (\(sprout.waterEntries.count))")
                .monoLabel(size: TrunkTheme.textXs)

            let sortedEntries = sprout.waterEntries.sorted { $0.timestamp > $1.timestamp }

            VStack(spacing: 0) {
                ForEach(Array(sortedEntries.enumerated()), id: \.element.id) { index, entry in
                    if index > 0 {
                        Divider().overlay(Color.borderSubtle)
                    }

                    waterEntryRow(entry)
                }
            }
            .background(Color.paper)
            .overlay(
                Rectangle()
                    .stroke(Color.border, lineWidth: 1)
            )
        }
    }

    private func waterEntryRow(_ entry: DerivedWaterEntry) -> some View {
        VStack(alignment: .leading, spacing: TrunkTheme.space1) {
            HStack {
                Text("💧")
                    .font(.system(size: TrunkTheme.textSm))

                Text(formatWaterDate(entry.timestamp))
                    .font(.system(size: TrunkTheme.textXs, design: .monospaced))
                    .foregroundStyle(Color.inkFaint)

                Spacer()
            }

            if let prompt = entry.prompt, !prompt.isEmpty {
                Text("\"\(prompt)\"")
                    .font(.system(size: TrunkTheme.textXs, design: .monospaced))
                    .italic()
                    .foregroundStyle(Color.inkFaint)
            }

            if !entry.content.isEmpty {
                Text(entry.content)
                    .font(.system(size: TrunkTheme.textSm, design: .monospaced))
                    .foregroundStyle(Color.inkLight)
            }
        }
        .padding(TrunkTheme.space3)
    }

    private static let waterDateFormatter: DateFormatter = {
        let formatter = DateFormatter()
        formatter.dateFormat = "MMM d, yyyy 'at' h:mm a"
        return formatter
    }()

    private func formatWaterDate(_ date: Date) -> String {
        Self.waterDateFormatter.string(from: date)
    }
}
