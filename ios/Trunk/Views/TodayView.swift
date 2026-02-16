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

    @State private var selectedSproutForHarvest: DerivedSprout?
    @State private var showShineSheet = false
    @State private var showDataInfo = false
    @State private var showWaterSheet = false

    // MARK: - Cached State (updated in .task / .onAppear)

    @State private var activeSprouts: [DerivedSprout] = []
    @State private var cachedLeafNames: [String: String] = [:]
    @State private var cachedNextHarvestSprout: DerivedSprout? = nil
    @State private var cachedRawSoilHistory: [RawSoilSnapshot] = []
    @State private var selectedSoilRange: SoilChartRange = .inception

    // MARK: - Body

    var body: some View {
        ZStack {
            Color.parchment
                .ignoresSafeArea()

            ScrollView {
                VStack(alignment: .leading, spacing: TrunkTheme.space4) {
                    // Greeting header (doesn't depend on event data)
                    GreetingHeader(
                        userName: authService.userFullName,
                        onAvatarTap: { showDataInfo = true }
                    )
                    .animatedCard(index: 0)

                    // Data-dependent sections — hidden until first sync completes
                    // so we never show defaults (empty sprouts, 10/10 soil) as real data
                    if progression.hasLoaded {
                        // Water a sprout
                        WaterSectionView(
                            canWater: progression.waterAvailable > 0 && !activeSprouts.isEmpty,
                            onTap: { showWaterSheet = true }
                        )
                        .animatedCard(index: 1)

                        // Weekly reflection
                        ShineSectionView(
                            canShine: progression.canShine,
                            onTap: { showShineSheet = true }
                        )
                        .animatedCard(index: 2)

                        // Next harvest countdown
                        if let nextSprout = cachedNextHarvestSprout {
                            NextHarvestView(sprout: nextSprout)
                                .animatedCard(index: 3)
                        }

                        // Soil capacity over time
                        SoilChartView(
                            rawHistory: cachedRawSoilHistory,
                            selectedRange: $selectedSoilRange
                        )
                        .animatedCard(index: 4)
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
        .sheet(isPresented: $showWaterSheet) {
            NavigationStack {
                WaterDailySproutsView(
                    sprouts: selectDailySprouts(),
                    progression: progression,
                    wateredTodayIds: Set(activeSprouts.filter { wasWateredToday($0) }.map(\.id))
                )
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
        .sheet(isPresented: $showDataInfo) {
            DataInfoSheet(progression: progression)
        }
        .onAppear {
            progression.refresh()
            refreshCachedState()
        }
        .onChange(of: progression.version) {
            refreshCachedState()
        }
    }

    // MARK: - State Refresh

    private func refreshCachedState() {
        let state = EventStore.shared.getState()

        // Active sprouts + leaf names (from same snapshot)
        let active = getActiveSprouts(from: state)
        activeSprouts = active
        cachedLeafNames = state.leaves.reduce(into: [:]) { map, pair in
            map[pair.key] = pair.value.name
        }

        // Next harvest sprout
        cachedNextHarvestSprout = active
            .filter { !isSproutReady($0) }
            .sorted { sprout1, sprout2 in
                let date1 = ProgressionService.harvestDate(plantedAt: sprout1.plantedAt, season: sprout1.season)
                let date2 = ProgressionService.harvestDate(plantedAt: sprout2.plantedAt, season: sprout2.season)
                return date1 < date2
            }
            .first

        // Soil capacity history (raw snapshots before bucketing)
        cachedRawSoilHistory = SoilHistoryService.computeSoilHistory()
    }

    // MARK: - Helpers

    /// Select up to 3 active sprouts, sorted by least recently watered (oldest first).
    private func selectDailySprouts() -> [DerivedSprout] {
        let sorted = activeSprouts.sorted { a, b in
            let aLast = a.waterEntries.map(\.timestamp).max() ?? .distantPast
            let bLast = b.waterEntries.map(\.timestamp).max() ?? .distantPast
            return aLast < bLast
        }
        return Array(sorted.prefix(3))
    }

    private func wasWateredToday(_ sprout: DerivedSprout) -> Bool {
        let resetTime = getTodayResetTime()
        return sprout.waterEntries.contains { $0.timestamp >= resetTime }
    }
}

#Preview {
    NavigationStack {
        TodayView(progression: ProgressionViewModel())
    }
    .environment(AuthService.shared)
}
