//
//  SettingsView.swift
//  Trunk
//
//  Sprouts panel: browse, search, and filter all sprouts.
//

import SwiftUI

// MARK: - Filter & Sort

enum SproutFilter: String, CaseIterable {
    case all = "All"
    case active = "Active"
    case completed = "Completed"
}

enum SproutSort: String, CaseIterable {
    case planted = "Planted"
    case alphabetical = "A-Z"
    case status = "Status"
}

// MARK: - Sprouts View

struct SproutsView: View {
    @Bindable var progression: ProgressionViewModel

    @State private var searchText = ""
    @State private var selectedFilter: SproutFilter = .all
    @State private var selectedSort: SproutSort = .planted

    // Cached state - refreshed on appear, not per-keystroke
    @State private var cachedSprouts: [DerivedSprout] = []
    @State private var cachedState: DerivedState? = nil

    private var filteredSprouts: [DerivedSprout] {
        var sprouts = cachedSprouts

        // Apply status filter
        switch selectedFilter {
        case .all:
            break
        case .active:
            sprouts = sprouts.filter { $0.state == .active }
        case .completed:
            sprouts = sprouts.filter { $0.state == .completed }
        }

        // Apply search (case-insensitive against sprout title and leaf name)
        let trimmed = searchText.trimmingCharacters(in: .whitespacesAndNewlines)
        if !trimmed.isEmpty {
            let query = trimmed.lowercased()
            let leaves = cachedState?.leaves ?? [:]
            sprouts = sprouts.filter { sprout in
                if sprout.title.lowercased().contains(query) {
                    return true
                }
                if let leafId = sprout.leafId,
                   let leaf = leaves[leafId],
                   leaf.name.lowercased().contains(query) {
                    return true
                }
                return false
            }
        }

        // Apply sort
        switch selectedSort {
        case .planted:
            sprouts.sort { $0.plantedAt > $1.plantedAt }
        case .alphabetical:
            sprouts.sort { $0.title.localizedCaseInsensitiveCompare($1.title) == .orderedAscending }
        case .status:
            sprouts.sort { sprout1, sprout2 in
                if sprout1.state != sprout2.state {
                    return sprout1.state == .active
                }
                return sprout1.plantedAt > sprout2.plantedAt
            }
        }

        return sprouts
    }

    private var activeCount: Int {
        cachedSprouts.filter { $0.state == .active }.count
    }

    private var completedCount: Int {
        cachedSprouts.filter { $0.state == .completed }.count
    }

    var body: some View {
        ZStack {
            Color.parchment
                .ignoresSafeArea()

            if cachedSprouts.isEmpty {
                emptyState
            } else {
                ScrollView {
                    VStack(alignment: .leading, spacing: TrunkTheme.space4) {
                        // Summary bar
                        summaryBar
                            .animatedCard(index: 0)

                        // Search
                        searchBar
                            .animatedCard(index: 1)

                        // Filters and sort
                        filtersSection
                            .animatedCard(index: 2)

                        // Sprout list
                        if filteredSprouts.isEmpty {
                            noMatchState
                                .animatedCard(index: 3)
                        } else {
                            sproutList
                                .animatedCard(index: 3)
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
                Text("SPROUTS")
                    .font(.system(size: TrunkTheme.textBase, design: .monospaced))
                    .tracking(2)
                    .foregroundStyle(Color.wood)
            }
        }
        .onAppear {
            refreshCachedState()
        }
    }

    private func refreshCachedState() {
        let state = EventStore.shared.getState()
        cachedState = state
        cachedSprouts = Array(state.sprouts.values)
    }

    // MARK: - Summary Bar

    private var summaryBar: some View {
        HStack(spacing: TrunkTheme.space4) {
            HStack(spacing: TrunkTheme.space2) {
                Text("\(cachedSprouts.count)")
                    .font(.system(size: TrunkTheme.textLg, design: .monospaced))
                    .foregroundStyle(Color.ink)

                Text("total")
                    .font(.system(size: TrunkTheme.textXs, design: .monospaced))
                    .foregroundStyle(Color.inkFaint)
            }

            Spacer()

            HStack(spacing: TrunkTheme.space2) {
                Text("\(activeCount)")
                    .font(.system(size: TrunkTheme.textLg, design: .monospaced))
                    .foregroundStyle(Color.twig)

                Text("active")
                    .font(.system(size: TrunkTheme.textXs, design: .monospaced))
                    .foregroundStyle(Color.inkFaint)
            }

            HStack(spacing: TrunkTheme.space2) {
                Text("\(completedCount)")
                    .font(.system(size: TrunkTheme.textLg, design: .monospaced))
                    .foregroundStyle(Color.inkLight)

                Text("done")
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

    // MARK: - Search Bar

    private var searchBar: some View {
        HStack(spacing: TrunkTheme.space2) {
            Text("?")
                .font(.system(size: TrunkTheme.textBase, design: .monospaced))
                .foregroundStyle(Color.inkFaint)

            TextField("Search sprouts...", text: $searchText)
                .font(.system(size: TrunkTheme.textBase, design: .monospaced))
                .foregroundStyle(Color.ink)
                .autocorrectionDisabled()
                .textInputAutocapitalization(.never)

            if !searchText.isEmpty {
                Button {
                    searchText = ""
                } label: {
                    Text("x")
                        .font(.system(size: TrunkTheme.textSm, design: .monospaced))
                        .foregroundStyle(Color.inkFaint)
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

    // MARK: - Filters

    private var filtersSection: some View {
        VStack(alignment: .leading, spacing: TrunkTheme.space2) {
            // Status filter
            HStack(spacing: TrunkTheme.space1) {
                ForEach(SproutFilter.allCases, id: \.self) { filter in
                    Button {
                        HapticManager.tap()
                        selectedFilter = filter
                    } label: {
                        Text(filter.rawValue)
                            .font(.system(size: TrunkTheme.textXs, design: .monospaced))
                            .foregroundStyle(selectedFilter == filter ? Color.wood : Color.inkFaint)
                            .padding(.horizontal, TrunkTheme.space2)
                            .padding(.vertical, TrunkTheme.space1)
                            .background(selectedFilter == filter ? Color.wood.opacity(0.08) : Color.clear)
                            .overlay(
                                Rectangle()
                                    .stroke(selectedFilter == filter ? Color.wood : Color.border, lineWidth: 1)
                            )
                    }
                    .buttonStyle(.plain)
                }

                Spacer()

                // Sort control
                Menu {
                    ForEach(SproutSort.allCases, id: \.self) { sort in
                        Button {
                            selectedSort = sort
                        } label: {
                            HStack {
                                Text(sort.rawValue)
                                if selectedSort == sort {
                                    Image(systemName: "checkmark")
                                }
                            }
                        }
                    }
                } label: {
                    HStack(spacing: TrunkTheme.space1) {
                        Text("Sort: \(selectedSort.rawValue)")
                            .font(.system(size: TrunkTheme.textXs, design: .monospaced))
                            .foregroundStyle(Color.inkFaint)

                        Text("\u{25BE}")
                            .font(.system(size: TrunkTheme.textXs, design: .monospaced))
                            .foregroundStyle(Color.inkFaint)
                    }
                    .padding(.horizontal, TrunkTheme.space2)
                    .padding(.vertical, TrunkTheme.space1)
                    .overlay(
                        Rectangle()
                            .stroke(Color.border, lineWidth: 1)
                    )
                }
            }
        }
    }

    // MARK: - Sprout List

    private var sproutList: some View {
        VStack(spacing: TrunkTheme.space2) {
            ForEach(filteredSprouts, id: \.id) { sprout in
                NavigationLink {
                    SproutDetailView(sproutId: sprout.id)
                } label: {
                    SproutListRow(sprout: sprout, state: cachedState ?? EventStore.shared.getState())
                }
                .buttonStyle(.plain)
            }
        }
    }

    // MARK: - Empty States

    private var emptyState: some View {
        VStack(spacing: TrunkTheme.space3) {
            Text("( )")
                .font(.system(size: 24, design: .monospaced))
                .foregroundStyle(Color.inkFaint)

            Text("No sprouts yet")
                .font(.system(size: TrunkTheme.textBase, design: .monospaced))
                .foregroundStyle(Color.inkFaint)

            Text("Plant your first sprout from the Trunk tab to see it here.")
                .font(.system(size: TrunkTheme.textXs, design: .monospaced))
                .foregroundStyle(Color.inkFaint)
                .multilineTextAlignment(.center)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, TrunkTheme.space6)
        .padding(.horizontal, TrunkTheme.space4)
    }

    private var noMatchState: some View {
        VStack(spacing: TrunkTheme.space3) {
            Text("No matches")
                .font(.system(size: TrunkTheme.textBase, design: .monospaced))
                .foregroundStyle(Color.inkFaint)

            Text("Try a different search or filter.")
                .font(.system(size: TrunkTheme.textXs, design: .monospaced))
                .foregroundStyle(Color.inkFaint)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, TrunkTheme.space5)
        .padding(.horizontal, TrunkTheme.space4)
        .background(Color.paper)
        .overlay(
            Rectangle()
                .stroke(Color.border, lineWidth: 1)
        )
    }
}

// MARK: - Sprout List Row

struct SproutListRow: View {
    let sprout: DerivedSprout
    let state: DerivedState

    private var isReady: Bool {
        isSproutReady(sprout)
    }

    private var locationLabel: String {
        let parts = sprout.twigId.split(separator: "-")
        guard parts.count >= 4,
              let branchIndex = Int(parts[1]),
              let twigIndex = Int(parts[3]) else {
            return sprout.twigId
        }

        let branchName = SharedConstants.Tree.branchName(branchIndex)
        let twigLabel = SharedConstants.Tree.twigLabel(branchIndex: branchIndex, twigIndex: twigIndex)
        return "\(branchName) / \(twigLabel.capitalized)"
    }

    private var leafName: String? {
        guard let leafId = sprout.leafId else { return nil }
        return state.leaves[leafId]?.name
    }

    var body: some View {
        HStack(spacing: TrunkTheme.space3) {
            // Left border indicator
            Rectangle()
                .fill(sprout.state == .active ? Color.twig : Color.border)
                .frame(width: 2)

            VStack(alignment: .leading, spacing: TrunkTheme.space1) {
                // Title row
                HStack {
                    Text(sprout.title)
                        .font(.system(size: TrunkTheme.textBase, design: .monospaced))
                        .foregroundStyle(Color.ink)
                        .lineLimit(1)

                    Spacer()

                    // Status badge
                    if sprout.state == .completed, let result = sprout.result {
                        Text(resultToEmoji(result))
                            .font(.system(size: TrunkTheme.textSm))
                    } else if isReady {
                        Text("ready")
                            .font(.system(size: TrunkTheme.textXs, design: .monospaced))
                            .foregroundStyle(Color.twig)
                            .padding(.horizontal, TrunkTheme.space1)
                            .overlay(
                                Rectangle()
                                    .stroke(Color.twig, lineWidth: 1)
                            )
                    }
                }

                // Detail row
                HStack(spacing: TrunkTheme.space2) {
                    // Status
                    Text(sprout.state == .active ? "active" : "completed")
                        .font(.system(size: TrunkTheme.textXs, design: .monospaced))
                        .foregroundStyle(sprout.state == .active ? Color.twig : Color.inkFaint)

                    Text("·")
                        .foregroundStyle(Color.inkFaint)

                    // Season
                    Text(sprout.season.label)
                        .font(.system(size: TrunkTheme.textXs, design: .monospaced))
                        .foregroundStyle(Color.inkFaint)

                    Text("·")
                        .foregroundStyle(Color.inkFaint)

                    // Environment
                    Text(sprout.environment.label)
                        .font(.system(size: TrunkTheme.textXs, design: .monospaced))
                        .foregroundStyle(Color.inkFaint)
                }

                // Leaf name (prominent)
                if let leafName {
                    Text(leafName)
                        .font(.system(size: TrunkTheme.textSm, weight: .medium, design: .monospaced))
                        .foregroundStyle(Color.wood)
                        .lineLimit(1)
                }

                // Location row
                Text(locationLabel)
                    .font(.system(size: TrunkTheme.textXs, design: .monospaced))
                    .foregroundStyle(Color.inkFaint)
                    .lineLimit(1)
            }

            Text(">")
                .font(.system(size: TrunkTheme.textSm, design: .monospaced))
                .foregroundStyle(Color.inkFaint)
        }
        .padding(.vertical, TrunkTheme.space3)
        .padding(.horizontal, TrunkTheme.space3)
        .background(Color.paper)
        .overlay(
            Rectangle()
                .stroke(Color.border, lineWidth: 1)
        )
    }
}

// MARK: - Sprout Detail View

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
        let parts = sprout.twigId.split(separator: "-")
        guard parts.count >= 4,
              let branchIndex = Int(parts[1]),
              let twigIndex = Int(parts[3]) else {
            return sprout.twigId
        }

        let branchName = SharedConstants.Tree.branchName(branchIndex)
        let twigLabel = SharedConstants.Tree.twigLabel(branchIndex: branchIndex, twigIndex: twigIndex)
        return "\(branchName) / \(twigLabel.capitalized)"
    }

    private var leafName: String? {
        guard let leafId = sprout?.leafId else { return nil }
        return state.leaves[leafId]?.name
    }

    private var formattedPlantedDate: String {
        guard let sprout else { return "" }
        let formatter = DateFormatter()
        formatter.dateFormat = "MMM d, yyyy"
        return formatter.string(from: sprout.plantedAt)
    }

    private var formattedHarvestDate: String? {
        guard let harvestedAt = sprout?.harvestedAt else { return nil }
        let formatter = DateFormatter()
        formatter.dateFormat = "MMM d, yyyy"
        return formatter.string(from: harvestedAt)
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
                detailRow(label: "Status", value: sprout.state == .active ? "Active" : "Completed",
                         valueColor: sprout.state == .active ? Color.twig : Color.inkFaint)

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

            if !entry.content.isEmpty {
                Text(entry.content)
                    .font(.system(size: TrunkTheme.textSm, design: .monospaced))
                    .foregroundStyle(Color.inkLight)
            }
        }
        .padding(TrunkTheme.space3)
    }

    private func formatWaterDate(_ date: Date) -> String {
        let formatter = DateFormatter()
        formatter.dateFormat = "MMM d, yyyy 'at' h:mm a"
        return formatter.string(from: date)
    }
}

// MARK: - Previews

#Preview {
    NavigationStack {
        SproutsView(progression: ProgressionViewModel())
    }
}
