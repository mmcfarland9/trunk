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

    // MARK: - Cached State (updated in .task / .onAppear)

    @State private var activeSprouts: [DerivedSprout] = []
    @State private var readyToHarvest: [DerivedSprout] = []
    @State private var activeLeafs: [DerivedLeaf] = []
    @State private var cachedWeeklyActivity: [(waters: Int, shines: Int)] = Array(repeating: (waters: 0, shines: 0), count: 7)
    @State private var cachedBranchActivity: [Int] = Array(repeating: 0, count: SharedConstants.Tree.branchCount)
    @State private var cachedWeeklySoilGain: Double = 0
    @State private var cachedSoilAvailable: Double = 0
    @State private var cachedNextHarvestSprout: DerivedSprout? = nil
    @State private var cachedRecentActivity: [ActivityItem] = []

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

                    // Weekly rhythm heatmap
                    weeklyRhythmSection
                        .animatedCard(index: 2)

                    // Branch balance radar
                    branchBalanceSection
                        .animatedCard(index: 3)

                    // Soil forecast
                    soilForecastSection
                        .animatedCard(index: 4)

                    // Next harvest countdown
                    if let nextSprout = cachedNextHarvestSprout {
                        nextHarvestSection(sprout: nextSprout)
                            .animatedCard(index: 5)
                    }

                    // Ready to harvest
                    if !readyToHarvest.isEmpty {
                        harvestSection
                            .animatedCard(index: 6)
                    }

                    // Water a sprout
                    waterSection
                        .animatedCard(index: 7)

                    // Weekly reflection
                    shineSection
                        .animatedCard(index: 8)

                    // Active Leafs section (only leafs with active sprouts)
                    if !activeLeafs.isEmpty {
                        leafsSection
                            .animatedCard(index: 9)
                    }

                    // Recent activity
                    if !cachedRecentActivity.isEmpty {
                        activitySection
                            .animatedCard(index: 10)
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
            refreshCachedState()
        }
    }

    // MARK: - State Refresh

    private func refreshCachedState() {
        let state = EventStore.shared.getState()
        let allSprouts = Array(state.sprouts.values)
        let allSunEntries = state.sunEntries
        let allLeaves = Array(state.leaves.values).sorted { $0.createdAt > $1.createdAt }

        // Active sprouts & harvest-ready
        let active = getActiveSprouts(from: state)
        activeSprouts = active
        readyToHarvest = active.filter { isSproutReady($0) }

        // Active leafs
        activeLeafs = allLeaves.filter { leaf in
            allSprouts.contains { $0.leafId == leaf.id && $0.state == .active }
        }

        // Soil available for forecast
        cachedSoilAvailable = state.soilAvailable

        // Weekly activity counts
        cachedWeeklyActivity = computeWeeklyActivity(sprouts: allSprouts, sunEntries: allSunEntries)

        // Branch activity counts
        cachedBranchActivity = computeBranchActivity(sprouts: allSprouts, sunEntries: allSunEntries)

        // Weekly soil gain
        cachedWeeklySoilGain = computeWeeklySoilGain(sprouts: allSprouts, sunEntries: allSunEntries)

        // Next harvest sprout
        cachedNextHarvestSprout = active
            .filter { !isSproutReady($0) }
            .sorted { sprout1, sprout2 in
                let date1 = ProgressionService.harvestDate(plantedAt: sprout1.plantedAt, season: sprout1.season)
                let date2 = ProgressionService.harvestDate(plantedAt: sprout2.plantedAt, season: sprout2.season)
                return date1 < date2
            }
            .first

        // Recent activity
        cachedRecentActivity = computeRecentActivity(
            sprouts: allSprouts,
            sunEntries: allSunEntries.sorted { $0.timestamp > $1.timestamp }
        )
    }

    // MARK: - Computation Helpers

    private func computeWeeklyActivity(sprouts: [DerivedSprout], sunEntries: [DerivedSunEntry]) -> [(waters: Int, shines: Int)] {
        let calendar = Calendar.current
        let now = Date()

        let weekday = calendar.component(.weekday, from: now)
        let daysSinceMonday = (weekday - 2 + 7) % 7
        guard let mondayStart = calendar.date(byAdding: .day, value: -daysSinceMonday, to: calendar.startOfDay(for: now)) else {
            return Array(repeating: (waters: 0, shines: 0), count: 7)
        }

        var counts: [(waters: Int, shines: Int)] = []
        for dayOffset in 0..<7 {
            guard let dayStart = calendar.date(byAdding: .day, value: dayOffset, to: mondayStart),
                  let dayEnd = calendar.date(byAdding: .day, value: 1, to: dayStart) else {
                counts.append((waters: 0, shines: 0))
                continue
            }

            if dayStart > now {
                counts.append((waters: 0, shines: 0))
                continue
            }

            let waterCount = sprouts.flatMap(\.waterEntries).filter { entry in
                entry.timestamp >= dayStart && entry.timestamp < dayEnd
            }.count

            let shineCount = sunEntries.filter { entry in
                entry.timestamp >= dayStart && entry.timestamp < dayEnd
            }.count

            counts.append((waters: waterCount, shines: shineCount))
        }

        return counts
    }

    private func computeBranchActivity(sprouts: [DerivedSprout], sunEntries: [DerivedSunEntry]) -> [Int] {
        let now = Date()
        let thirtyDaysAgo = Calendar.current.date(byAdding: .day, value: -30, to: now) ?? now

        var counts = Array(repeating: 0, count: SharedConstants.Tree.branchCount)

        for sprout in sprouts {
            guard let bIndex = branchIndex(from: sprout.twigId) else { continue }

            let recentWaters = sprout.waterEntries.filter { $0.timestamp >= thirtyDaysAgo }.count
            counts[bIndex] += recentWaters

            if sprout.plantedAt >= thirtyDaysAgo {
                counts[bIndex] += 1
            }

            if let harvestedAt = sprout.harvestedAt, harvestedAt >= thirtyDaysAgo {
                counts[bIndex] += 1
            }
        }

        for entry in sunEntries {
            guard entry.timestamp >= thirtyDaysAgo,
                  let bIndex = branchIndex(from: entry.twigId) else { continue }
            counts[bIndex] += 1
        }

        return counts
    }

    private func computeWeeklySoilGain(sprouts: [DerivedSprout], sunEntries: [DerivedSunEntry]) -> Double {
        let now = Date()
        let sevenDaysAgo = Calendar.current.date(byAdding: .day, value: -7, to: now) ?? now

        let recentWaterCount = sprouts.flatMap(\.waterEntries).filter { $0.timestamp >= sevenDaysAgo }.count
        let recentShineCount = sunEntries.filter { $0.timestamp >= sevenDaysAgo }.count

        return Double(recentWaterCount) * SharedConstants.Soil.waterRecovery
            + Double(recentShineCount) * SharedConstants.Soil.sunRecovery
    }

    private func computeRecentActivity(sprouts: [DerivedSprout], sunEntries: [DerivedSunEntry]) -> [ActivityItem] {
        var items: [ActivityItem] = []

        for sprout in sprouts {
            for entry in sprout.waterEntries {
                items.append(ActivityItem(
                    date: entry.timestamp,
                    icon: "💧",
                    text: "Watered \"\(sprout.title)\""
                ))
            }

            items.append(ActivityItem(
                date: sprout.plantedAt,
                icon: "🌱",
                text: "Planted \"\(sprout.title)\""
            ))

            if let harvestedAt = sprout.harvestedAt, sprout.state == .completed {
                let emoji = resultToEmoji(sprout.result ?? 3)
                items.append(ActivityItem(
                    date: harvestedAt,
                    icon: emoji,
                    text: "Harvested \"\(sprout.title)\""
                ))
            }
        }

        for entry in sunEntries {
            items.append(ActivityItem(
                date: entry.timestamp,
                icon: "☀️",
                text: "Shined on \(entry.twigLabel)"
            ))
        }

        return Array(items.sorted { $0.date > $1.date }.prefix(5))
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
                    let fillWidth = progression.soilCapacity > 0
                        ? geo.size.width * min(1.0, progression.soilAvailable / progression.soilCapacity)
                        : 0.0

                    ZStack(alignment: .leading) {
                        Rectangle()
                            .fill(Color.borderSubtle)
                            .frame(height: 8)

                        Rectangle()
                            .fill(Color.twig)
                            .frame(width: max(0, fillWidth), height: 8)
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

    private var weeklyRhythmSection: some View {
        let dayInitials = ["M", "T", "W", "T", "F", "S", "S"]
        let counts = cachedWeeklyActivity

        return VStack(alignment: .leading, spacing: TrunkTheme.space2) {
            Text("THIS WEEK")
                .monoLabel(size: TrunkTheme.textXs)

            HStack(spacing: 0) {
                ForEach(0..<7, id: \.self) { index in
                    let total = counts[index].waters + counts[index].shines

                    VStack(spacing: TrunkTheme.space1) {
                        Text(dayInitials[index])
                            .font(.system(size: TrunkTheme.textXs, design: .monospaced))
                            .foregroundStyle(Color.inkFaint)

                        Text(total == 0 ? "\u{00B7}" : total >= 3 ? "\u{25CF}" : "\u{25CB}")
                            .font(.system(size: TrunkTheme.textBase, design: .monospaced))
                            .foregroundStyle(total == 0 ? Color.inkFaint : total >= 3 ? Color.twig : Color.inkLight)

                        Text("\(total)")
                            .font(.system(size: TrunkTheme.textXs, design: .monospaced))
                            .foregroundStyle(Color.inkFaint)
                    }
                    .frame(maxWidth: .infinity)
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

    private var branchBalanceSection: some View {
        let counts = cachedBranchActivity
        let maxCount = counts.max() ?? 0

        return VStack(alignment: .leading, spacing: TrunkTheme.space2) {
            Text("BRANCH BALANCE")
                .monoLabel(size: TrunkTheme.textXs)

            if maxCount == 0 {
                Text("No recent activity")
                    .font(.system(size: TrunkTheme.textSm, design: .monospaced))
                    .foregroundStyle(Color.inkFaint)
            } else {
                ForEach(0..<SharedConstants.Tree.branchCount, id: \.self) { index in
                    let count = counts[index]
                    let barLength = maxCount > 0 ? Int(Double(count) / Double(maxCount) * 10.0) : 0
                    let filled = String(repeating: "\u{2501}", count: barLength)
                    let empty = String(repeating: "\u{2500}", count: 10 - barLength)

                    HStack(spacing: TrunkTheme.space2) {
                        Text(SharedConstants.Tree.branchName(index))
                            .font(.system(size: TrunkTheme.textXs, design: .monospaced))
                            .foregroundStyle(Color.inkLight)
                            .frame(width: 52, alignment: .leading)

                        HStack(spacing: 0) {
                            Text(filled)
                                .font(.system(size: TrunkTheme.textXs, design: .monospaced))
                                .foregroundStyle(count > 0 ? Color.twig : Color.inkFaint)

                            Text(empty)
                                .font(.system(size: TrunkTheme.textXs, design: .monospaced))
                                .foregroundStyle(Color.inkFaint)
                        }

                        Text("\(count)")
                            .font(.system(size: TrunkTheme.textXs, design: .monospaced))
                            .foregroundStyle(Color.inkFaint)
                            .frame(width: 20, alignment: .trailing)
                    }
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

    private var soilForecastSection: some View {
        let gain = cachedWeeklySoilGain
        let currentSoil = cachedSoilAvailable
        let maxSoil = SharedConstants.Soil.maxCapacity

        // ASCII progress bar for current/max
        let barTotal = 16
        let filled = Int((currentSoil / maxSoil) * Double(barTotal))
        let clampedFilled = min(barTotal, max(0, filled))
        let barFilled = String(repeating: "\u{2501}", count: clampedFilled)
        let barEmpty = String(repeating: "\u{2500}", count: barTotal - clampedFilled)
        let progressBar = "[\(barFilled)\(barEmpty)]"

        let forecastText: String = {
            guard gain > 0 else { return "" }
            let projected = min(maxSoil, currentSoil + gain * 4.0)
            let targetDate = Calendar.current.date(byAdding: .day, value: 28, to: Date()) ?? Date()
            let formatter = DateFormatter()
            formatter.dateFormat = "MMM d"
            let dateString = formatter.string(from: targetDate)
            return "At this pace: \(Int(currentSoil.rounded())) \u{2192} \(Int(projected.rounded())) soil by \(dateString)"
        }()

        return VStack(alignment: .leading, spacing: TrunkTheme.space2) {
            Text("SOIL FORECAST")
                .monoLabel(size: TrunkTheme.textXs)

            if gain <= 0 {
                Text("Start watering to see your forecast")
                    .font(.system(size: TrunkTheme.textSm, design: .monospaced))
                    .foregroundStyle(Color.inkFaint)
            } else {
                Text(forecastText)
                    .font(.system(size: TrunkTheme.textSm, design: .monospaced))
                    .foregroundStyle(Color.ink)
            }

            Text(progressBar)
                .font(.system(size: TrunkTheme.textXs, design: .monospaced))
                .foregroundStyle(Color.twig)
        }
        .padding(TrunkTheme.space3)
        .background(Color.paper)
        .overlay(
            Rectangle()
                .stroke(Color.border, lineWidth: 1)
        )
    }

    private func nextHarvestSection(sprout: DerivedSprout) -> some View {
        let harvestDate = ProgressionService.harvestDate(plantedAt: sprout.plantedAt, season: sprout.season)
        let daysRemaining = max(0, Int(ceil(harvestDate.timeIntervalSince(Date()) / 86400)))
        let progress = ProgressionService.progress(plantedAt: sprout.plantedAt, season: sprout.season)
        let percentage = Int((progress * 100).rounded())

        // ASCII progress bar
        let barTotal = 10
        let filled = Int(progress * Double(barTotal))
        let clampedFilled = min(barTotal, max(0, filled))
        let barFilled = String(repeating: "\u{2501}", count: clampedFilled)
        let barEmpty = String(repeating: "\u{2500}", count: barTotal - clampedFilled)
        let progressBar = "[\(barFilled)\(barEmpty)]"

        return VStack(alignment: .leading, spacing: TrunkTheme.space2) {
            Text("NEXT HARVEST")
                .monoLabel(size: TrunkTheme.textXs)

            HStack {
                VStack(alignment: .leading, spacing: TrunkTheme.space1) {
                    Text(sprout.title)
                        .font(.system(size: TrunkTheme.textBase, design: .monospaced))
                        .foregroundStyle(Color.ink)
                        .lineLimit(1)

                    Text("\(daysRemaining) day\(daysRemaining == 1 ? "" : "s") remaining")
                        .font(.system(size: TrunkTheme.textSm, design: .monospaced))
                        .foregroundStyle(Color.inkFaint)
                }

                Spacer()

                VStack(alignment: .trailing, spacing: TrunkTheme.space1) {
                    Text(progressBar)
                        .font(.system(size: TrunkTheme.textXs, design: .monospaced))
                        .foregroundStyle(Color.twig)

                    Text("\(percentage)%")
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

    private var waterSection: some View {
        let canWater = progression.waterAvailable > 0 && !activeSprouts.isEmpty
        let nextSprout = activeSprouts.first { !wasWateredToday($0) } ?? activeSprouts.first

        let label: String = {
            if activeSprouts.isEmpty {
                return "No sprouts to water"
            } else if progression.waterAvailable > 0 {
                return "Water a sprout..."
            } else {
                return "All watered today"
            }
        }()

        return VStack(alignment: .leading, spacing: TrunkTheme.space2) {
            Text("WATER A SPROUT (\(progression.waterAvailable)/\(progression.waterCapacity))")
                .monoLabel(size: TrunkTheme.textXs)

            Button {
                HapticManager.tap()
                selectedSproutForWater = nextSprout
            } label: {
                HStack {
                    Text("💧")
                    Text(label)
                        .font(.system(size: TrunkTheme.textBase, design: .monospaced))
                        .foregroundStyle(canWater ? Color.ink : Color.inkFaint)

                    Spacer()

                    if canWater {
                        Text(">")
                            .font(.system(size: TrunkTheme.textSm, design: .monospaced))
                            .foregroundStyle(Color.inkFaint)
                    }
                }
                .padding(TrunkTheme.space3)
                .background(Color.paper)
                .overlay(
                    Rectangle()
                        .stroke(canWater ? Color.trunkWater : Color.border, lineWidth: 1)
                )
            }
            .buttonStyle(.plain)
            .disabled(!canWater)
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

            ForEach(cachedRecentActivity.indices, id: \.self) { index in
                let item = cachedRecentActivity[index]
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

    private func wasWateredToday(_ sprout: DerivedSprout) -> Bool {
        let calendar = Calendar.current
        let startOfDay = calendar.startOfDay(for: Date())
        return sprout.waterEntries.contains { $0.timestamp >= startOfDay }
    }

    /// Extract branch index from a twig ID like "branch-2-twig-5"
    private func branchIndex(from twigId: String) -> Int? {
        let parts = twigId.split(separator: "-")
        guard parts.count >= 2, let index = Int(parts[1]) else { return nil }
        return index
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
