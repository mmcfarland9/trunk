//
//  TodayView.swift
//  Trunk
//
//  Daily dashboard showing what needs attention today.
//

import SwiftUI
import Charts

struct TodayView: View {
    @Bindable var progression: ProgressionViewModel

    @Environment(AuthService.self) private var authService

    @State private var selectedSproutForWater: DerivedSprout?
    @State private var selectedSproutForHarvest: DerivedSprout?
    @State private var showShineSheet = false

    // MARK: - Cached State (updated in .task / .onAppear)

    @State private var activeSprouts: [DerivedSprout] = []
    @State private var readyToHarvest: [DerivedSprout] = []
    @State private var cachedNextHarvestSprout: DerivedSprout? = nil
    @State private var cachedSoilHistory: [SoilCapacityPoint] = []

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

                    // Water a sprout
                    waterSection
                        .animatedCard(index: 1)

                    // Weekly reflection
                    shineSection
                        .animatedCard(index: 2)

                    // Next harvest countdown
                    if let nextSprout = cachedNextHarvestSprout {
                        nextHarvestSection(sprout: nextSprout)
                            .animatedCard(index: 3)
                    }

                    // Soil capacity over time
                    soilCapacitySection
                        .animatedCard(index: 4)

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

        // Active sprouts & harvest-ready
        let active = getActiveSprouts(from: state)
        activeSprouts = active
        readyToHarvest = active.filter { isSproutReady($0) }

        // Next harvest sprout
        cachedNextHarvestSprout = active
            .filter { !isSproutReady($0) }
            .sorted { sprout1, sprout2 in
                let date1 = ProgressionService.harvestDate(plantedAt: sprout1.plantedAt, season: sprout1.season)
                let date2 = ProgressionService.harvestDate(plantedAt: sprout2.plantedAt, season: sprout2.season)
                return date1 < date2
            }
            .first

        // Soil capacity history
        cachedSoilHistory = computeSoilCapacityHistory()
    }

    // MARK: - Sections

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

        return Button {
            HapticManager.tap()
            selectedSproutForWater = nextSprout
        } label: {
            HStack {
                Text("💧")
                Text(label)
                    .font(.system(size: TrunkTheme.textBase, design: .monospaced))
                    .foregroundStyle(canWater ? Color.ink : Color.inkFaint)

                Spacer()

                Text("(\(progression.waterAvailable)/\(progression.waterCapacity))")
                    .font(.system(size: TrunkTheme.textSm, design: .monospaced))
                    .foregroundStyle(Color.inkFaint)
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

    private var shineSection: some View {
        let sunUsed = progression.canShine ? 0 : 1
        let sunCapacity = 1

        return Button {
            HapticManager.tap()
            showShineSheet = true
        } label: {
            HStack {
                Text("☀️")
                Text(progression.canShine ? "Shine on a twig..." : "Already shined this week")
                    .font(.system(size: TrunkTheme.textBase, design: .monospaced))
                    .foregroundStyle(progression.canShine ? Color.ink : Color.inkFaint)

                Spacer()

                Text("(\(sunCapacity - sunUsed)/\(sunCapacity))")
                    .font(.system(size: TrunkTheme.textSm, design: .monospaced))
                    .foregroundStyle(Color.inkFaint)
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

    private var soilCapacitySection: some View {
        VStack(alignment: .leading, spacing: TrunkTheme.space2) {
            Text("SOIL CAPACITY")
                .monoLabel(size: TrunkTheme.textXs)

            if cachedSoilHistory.count < 2 {
                Text("Harvest sprouts to grow capacity")
                    .font(.system(size: TrunkTheme.textSm, design: .monospaced))
                    .foregroundStyle(Color.inkFaint)
                    .padding(.vertical, TrunkTheme.space3)
            } else {
                Chart(cachedSoilHistory) { point in
                    LineMark(
                        x: .value("Date", point.date),
                        y: .value("Capacity", point.capacity)
                    )
                    .foregroundStyle(Color.twig)
                    .interpolationMethod(.stepEnd)

                    AreaMark(
                        x: .value("Date", point.date),
                        y: .value("Capacity", point.capacity)
                    )
                    .foregroundStyle(Color.twig.opacity(0.1))
                    .interpolationMethod(.stepEnd)
                }
                .chartYScale(domain: 0 ... max(cachedSoilHistory.last?.capacity ?? 10, 15))
                .chartXAxis {
                    AxisMarks(values: .automatic(desiredCount: 4)) { _ in
                        AxisGridLine()
                            .foregroundStyle(Color.border)
                        AxisValueLabel()
                            .font(.system(size: TrunkTheme.textXs, design: .monospaced))
                            .foregroundStyle(Color.inkFaint)
                    }
                }
                .chartYAxis {
                    AxisMarks(values: .automatic(desiredCount: 4)) { _ in
                        AxisGridLine()
                            .foregroundStyle(Color.border)
                        AxisValueLabel()
                            .font(.system(size: TrunkTheme.textXs, design: .monospaced))
                            .foregroundStyle(Color.inkFaint)
                    }
                }
                .frame(height: 140)
            }
        }
        .padding(TrunkTheme.space3)
        .background(Color.paper)
        .overlay(
            Rectangle()
                .stroke(Color.border, lineWidth: 1)
        )
    }

    // MARK: - Computation Helpers

    private func computeSoilCapacityHistory() -> [SoilCapacityPoint] {
        let events = EventStore.shared.events
        var capacity = SharedConstants.Soil.startingCapacity
        var history: [SoilCapacityPoint] = []

        // Track planted sprouts so we can compute harvest rewards
        var sproutInfo: [String: (season: String, environment: String)] = [:]

        // Find earliest event for starting point
        if let firstEvent = events.first {
            let date = Self.parseISO8601(firstEvent.clientTimestamp)
            history.append(SoilCapacityPoint(date: date, capacity: capacity))
        }

        for event in events {
            let date = Self.parseISO8601(event.clientTimestamp)

            switch event.type {
            case "sprout_planted":
                if let sproutId = event.payload["sproutId"]?.value as? String,
                   let season = event.payload["season"]?.value as? String,
                   let environment = event.payload["environment"]?.value as? String {
                    sproutInfo[sproutId] = (season: season, environment: environment)
                }

            case "sprout_harvested":
                if let sproutId = event.payload["sproutId"]?.value as? String,
                   let result = event.payload["result"]?.value as? Int,
                   let info = sproutInfo[sproutId],
                   let season = Season(rawValue: info.season),
                   let environment = SproutEnvironment(rawValue: info.environment) {
                    let reward = ProgressionService.capacityReward(
                        season: season,
                        environment: environment,
                        result: result,
                        currentCapacity: capacity
                    )
                    capacity += reward
                    history.append(SoilCapacityPoint(date: date, capacity: capacity))
                }

            default:
                break
            }
        }

        // Add current date as final point
        history.append(SoilCapacityPoint(date: Date(), capacity: capacity))

        return history
    }

    private static let iso8601Fractional: ISO8601DateFormatter = {
        let f = ISO8601DateFormatter()
        f.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        return f
    }()

    private static let iso8601Standard: ISO8601DateFormatter = {
        let f = ISO8601DateFormatter()
        f.formatOptions = [.withInternetDateTime]
        return f
    }()

    private static func parseISO8601(_ timestamp: String) -> Date {
        iso8601Fractional.date(from: timestamp)
            ?? iso8601Standard.date(from: timestamp)
            ?? Date.distantPast
    }

    // MARK: - Helpers

    private func wasWateredToday(_ sprout: DerivedSprout) -> Bool {
        let calendar = Calendar.current
        let startOfDay = calendar.startOfDay(for: Date())
        return sprout.waterEntries.contains { $0.timestamp >= startOfDay }
    }
}

// MARK: - Soil Capacity Point

struct SoilCapacityPoint: Identifiable {
    let id = UUID()
    let date: Date
    let capacity: Double
}

#Preview {
    NavigationStack {
        TodayView(progression: ProgressionViewModel())
    }
    .environment(AuthService.shared)
}
