//
//  TodayView.swift
//  Trunk
//
//  Daily dashboard showing what needs attention today.
//

import SwiftUI

struct TodayView: View {
    @Bindable var progression: ProgressionViewModel

    @Environment(AuthService.self) private var authService

    @State private var selectedSproutForWater: DerivedSprout?
    @State private var selectedSproutForHarvest: DerivedSprout?
    @State private var showShineSheet = false

    // MARK: - Derived State from EventStore

    private var state: DerivedState {
        EventStore.shared.getState()
    }

    private var sprouts: [DerivedSprout] {
        Array(state.sprouts.values)
    }

    private var sunEntries: [DerivedSunEntry] {
        state.sunEntries.sorted { $0.timestamp > $1.timestamp }
    }

    private var leaves: [DerivedLeaf] {
        Array(state.leaves.values).sorted { $0.createdAt > $1.createdAt }
    }

    // MARK: - Computed Properties

    private var activeSprouts: [DerivedSprout] {
        getActiveSprouts(from: state)
    }

    private var readyToHarvest: [DerivedSprout] {
        activeSprouts.filter { isSproutReady($0) }
    }

    private var waterable: [DerivedSprout] {
        activeSprouts.sorted { sprout1, sprout2 in
            // Sort by: not watered this week first, then by title
            let watered1 = wasWateredThisWeek(sprout1)
            let watered2 = wasWateredThisWeek(sprout2)
            if watered1 != watered2 {
                return !watered1
            }
            return sprout1.title < sprout2.title
        }
    }

    /// Leafs that have at least one active sprout
    private var activeLeafs: [DerivedLeaf] {
        leaves.filter { leaf in
            sprouts.contains { $0.leafId == leaf.id && $0.state == .active }
        }
    }

    private var recentActivity: [ActivityItem] {
        var items: [ActivityItem] = []

        // Recent water entries
        for sprout in sprouts {
            for entry in sprout.waterEntries {
                items.append(ActivityItem(
                    date: entry.timestamp,
                    icon: "💧",
                    text: "Watered \"\(sprout.title)\""
                ))
            }

            // Planted
            items.append(ActivityItem(
                date: sprout.plantedAt,
                icon: "🌱",
                text: "Planted \"\(sprout.title)\""
            ))

            // Harvested
            if let harvestedAt = sprout.harvestedAt, sprout.state == .completed {
                let emoji = resultToEmoji(sprout.result ?? 3)
                items.append(ActivityItem(
                    date: harvestedAt,
                    icon: emoji,
                    text: "Harvested \"\(sprout.title)\""
                ))
            }
        }

        // Sun entries
        for entry in sunEntries {
            items.append(ActivityItem(
                date: entry.timestamp,
                icon: "☀️",
                text: "Shined on \(entry.twigLabel)"
            ))
        }

        return Array(items.sorted { $0.date > $1.date }.prefix(5))
    }

    // MARK: - Body

    var body: some View {
        ZStack {
            Color.parchment
                .ignoresSafeArea()

            ScrollView {
                VStack(alignment: .leading, spacing: TrunkTheme.space4) {
                    // Greeting header
                    GreetingHeader(
                        userName: authService.userFullName,
                        activeSproutCount: activeSprouts.count,
                        readyToHarvestCount: readyToHarvest.count
                    )
                    .animatedCard(index: 0)

                    // Resource meters
                    resourceMeters
                        .animatedCard(index: 1)

                    // Ready to harvest
                    if !readyToHarvest.isEmpty {
                        harvestSection
                            .animatedCard(index: 2)
                    }

                    // Weekly reflection
                    shineSection
                        .animatedCard(index: 3)

                    // Water your sprouts
                    if !waterable.isEmpty {
                        waterSection
                            .animatedCard(index: 4)
                    }

                    // Active Leafs section (only leafs with active sprouts)
                    if !activeLeafs.isEmpty {
                        leafsSection
                            .animatedCard(index: 5)
                    }

                    // Recent activity
                    if !recentActivity.isEmpty {
                        activitySection
                            .animatedCard(index: 6)
                    }
                }
                .padding(TrunkTheme.space4)
            }
        }
        .navigationTitle("")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .principal) {
                Text("TODAY")
                    .font(.system(size: TrunkTheme.textBase, design: .monospaced))
                    .tracking(2)
                    .foregroundStyle(Color.wood)
            }
        }
        .sheet(item: $selectedSproutForWater) { sprout in
            NavigationStack {
                WaterSproutView(sprout: sprout, progression: progression)
            }
        }
        .sheet(item: $selectedSproutForHarvest) { sprout in
            NavigationStack {
                HarvestSproutView(sprout: sprout, progression: progression)
            }
        }
        .sheet(isPresented: $showShineSheet) {
            NavigationStack {
                ShineView(progression: progression)
            }
        }
        .onAppear {
            progression.refresh()
        }
    }

    // MARK: - Sections

    private var resourceMeters: some View {
        VStack(spacing: TrunkTheme.space3) {
            // Soil bar
            VStack(alignment: .leading, spacing: TrunkTheme.space1) {
                HStack {
                    Text("SOIL")
                        .monoLabel(size: TrunkTheme.textXs)

                    Spacer()

                    Text("\(progression.soilAvailableInt) / \(progression.soilCapacityInt)")
                        .font(.system(size: TrunkTheme.textSm, design: .monospaced))
                        .foregroundStyle(Color.inkFaint)
                }

                GeometryReader { geo in
                    ZStack(alignment: .leading) {
                        Rectangle()
                            .fill(Color.borderSubtle)
                            .frame(height: 8)

                        Rectangle()
                            .fill(Color.twig)
                            .frame(width: geo.size.width * (progression.soilAvailable / progression.soilCapacity), height: 8)
                    }
                }
                .frame(height: 8)
            }

            // Water and sun
            HStack(spacing: TrunkTheme.space4) {
                HStack(spacing: TrunkTheme.space2) {
                    Text("💧")
                    Text("\(progression.waterAvailable)/\(progression.waterCapacity)")
                        .font(.system(size: TrunkTheme.textBase, design: .monospaced))
                        .foregroundStyle(Color.trunkWater)
                }

                Spacer()

                HStack(spacing: TrunkTheme.space2) {
                    Text("☀️")
                    Text("\(progression.canShine ? 1 : 0)/1")
                        .font(.system(size: TrunkTheme.textBase, design: .monospaced))
                        .foregroundStyle(progression.canShine ? Color.trunkSun : Color.inkFaint)
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

    private var harvestSection: some View {
        VStack(alignment: .leading, spacing: TrunkTheme.space2) {
            Text("READY TO HARVEST (\(readyToHarvest.count))")
                .monoLabel(size: TrunkTheme.textXs)

            ForEach(readyToHarvest, id: \.id) { sprout in
                Button {
                    HapticManager.tap()
                    selectedSproutForHarvest = sprout
                } label: {
                    HStack {
                        Text("🌻")
                        Text(sprout.title)
                            .font(.system(size: TrunkTheme.textBase, design: .monospaced))
                            .foregroundStyle(Color.ink)

                        Spacer()

                        Text(sprout.season.label)
                            .font(.system(size: TrunkTheme.textXs, design: .monospaced))
                            .foregroundStyle(Color.inkFaint)

                        Text(">")
                            .font(.system(size: TrunkTheme.textSm, design: .monospaced))
                            .foregroundStyle(Color.inkFaint)
                    }
                    .padding(TrunkTheme.space3)
                    .background(Color.paper)
                    .overlay(
                        Rectangle()
                            .stroke(Color.twig, lineWidth: 1)
                    )
                }
                .buttonStyle(.plain)
            }
        }
    }

    private var shineSection: some View {
        VStack(alignment: .leading, spacing: TrunkTheme.space2) {
            Text("WEEKLY REFLECTION")
                .monoLabel(size: TrunkTheme.textXs)

            Button {
                HapticManager.tap()
                showShineSheet = true
            } label: {
                HStack {
                    Text("☀️")
                    Text(progression.canShine ? "Shine on a twig..." : "Already shined this week")
                        .font(.system(size: TrunkTheme.textBase, design: .monospaced))
                        .foregroundStyle(progression.canShine ? Color.ink : Color.inkFaint)

                    Spacer()

                    if progression.canShine {
                        Text(">")
                            .font(.system(size: TrunkTheme.textSm, design: .monospaced))
                            .foregroundStyle(Color.inkFaint)
                    }
                }
                .padding(TrunkTheme.space3)
                .background(Color.paper)
                .overlay(
                    Rectangle()
                        .stroke(progression.canShine ? Color.trunkSun : Color.border, lineWidth: 1)
                )
            }
            .buttonStyle(.plain)
            .disabled(!progression.canShine)
        }
    }

    private var waterSection: some View {
        VStack(alignment: .leading, spacing: TrunkTheme.space2) {
            Text("WATER YOUR SPROUTS (\(activeSprouts.count))")
                .monoLabel(size: TrunkTheme.textXs)

            ForEach(waterable, id: \.id) { sprout in
                let wateredThisWeek = wasWateredThisWeek(sprout)

                Button {
                    HapticManager.tap()
                    selectedSproutForWater = sprout
                } label: {
                    HStack {
                        Text(sprout.title)
                            .font(.system(size: TrunkTheme.textBase, design: .monospaced))
                            .foregroundStyle(wateredThisWeek ? Color.inkFaint : Color.ink)

                        Spacer()

                        if wateredThisWeek {
                            Text("✓")
                                .font(.system(size: TrunkTheme.textSm, design: .monospaced))
                                .foregroundStyle(Color.inkFaint)
                        } else {
                            Text("💧")
                        }
                    }
                    .padding(TrunkTheme.space3)
                    .background(Color.paper)
                    .overlay(
                        Rectangle()
                            .stroke(wateredThisWeek ? Color.border : Color.trunkWater, lineWidth: 1)
                    )
                }
                .buttonStyle(.plain)
            }
        }
    }

    private var leafsSection: some View {
        VStack(alignment: .leading, spacing: TrunkTheme.space2) {
            Text("ACTIVE LEAFS (\(activeLeafs.count))")
                .monoLabel(size: TrunkTheme.textXs)

            ForEach(activeLeafs, id: \.id) { leaf in
                NavigationLink {
                    SagaDetailView(leaf: leaf, progression: progression)
                } label: {
                    HStack(spacing: TrunkTheme.space3) {
                        // Left border (always twig color since these are active)
                        Rectangle()
                            .fill(Color.twig)
                            .frame(width: 2)

                        VStack(alignment: .leading, spacing: TrunkTheme.space1) {
                            Text(leaf.name)
                                .font(.system(size: TrunkTheme.textBase, design: .monospaced))
                                .foregroundStyle(Color.ink)

                            Text(contextLabel(for: leaf))
                                .font(.system(size: TrunkTheme.textXs, design: .monospaced))
                                .foregroundStyle(Color.inkFaint)
                        }

                        Spacer()

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
                .buttonStyle(.plain)
            }
        }
    }

    private var activitySection: some View {
        VStack(alignment: .leading, spacing: TrunkTheme.space2) {
            Text("RECENT ACTIVITY")
                .monoLabel(size: TrunkTheme.textXs)

            ForEach(recentActivity.indices, id: \.self) { index in
                let item = recentActivity[index]
                HStack {
                    Text(item.icon)
                        .font(.system(size: TrunkTheme.textSm))

                    Text(item.text)
                        .font(.system(size: TrunkTheme.textSm, design: .monospaced))
                        .foregroundStyle(Color.inkLight)
                        .lineLimit(1)

                    Spacer()

                    Text(relativeTime(item.date))
                        .font(.system(size: TrunkTheme.textXs, design: .monospaced))
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

    // MARK: - Helpers

    private func wasWateredThisWeek(_ sprout: DerivedSprout) -> Bool {
        EventStore.shared.checkSproutWateredThisWeek(sproutId: sprout.id)
    }

    private func relativeTime(_ date: Date) -> String {
        let interval = Date().timeIntervalSince(date)

        if interval < 60 {
            return "just now"
        } else if interval < 3600 {
            let minutes = Int(interval / 60)
            return "\(minutes)m ago"
        } else if interval < 86400 {
            let hours = Int(interval / 3600)
            return "\(hours)h ago"
        } else {
            let days = Int(interval / 86400)
            return "\(days)d ago"
        }
    }

    private func resultToEmoji(_ result: Int) -> String {
        switch result {
        case 1: return "🥀"
        case 2: return "🌱"
        case 3: return "🌿"
        case 4: return "🌳"
        case 5: return "🌲"
        default: return "🌿"
        }
    }

    private func sproutsForLeaf(_ leaf: DerivedLeaf) -> [DerivedSprout] {
        sprouts.filter { $0.leafId == leaf.id }
    }

    private func contextLabel(for leaf: DerivedLeaf) -> String {
        // Parse twigId like "branch-0-twig-3" to get branch and twig names
        let parts = leaf.twigId.split(separator: "-")
        guard parts.count >= 4,
              let branchIndex = Int(parts[1]),
              let twigIndex = Int(parts[3]) else {
            return leaf.twigId
        }

        let branchName = SharedConstants.Tree.branchName(branchIndex)
        let twigLabel = SharedConstants.Tree.twigLabel(branchIndex: branchIndex, twigIndex: twigIndex)
        return "\(branchName) / \(twigLabel.capitalized)"
    }
}

// MARK: - Activity Item

struct ActivityItem {
    let date: Date
    let icon: String
    let text: String
}

#Preview {
    NavigationStack {
        TodayView(progression: ProgressionViewModel())
    }
    .environment(AuthService.shared)
}
