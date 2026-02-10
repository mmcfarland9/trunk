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
    @State private var showDataInfo = false
    @State private var showWaterPicker = false

    // MARK: - Cached State (updated in .task / .onAppear)

    @State private var activeSprouts: [DerivedSprout] = []
    @State private var cachedLeafNames: [String: String] = [:]
    @State private var cachedNextHarvestSprout: DerivedSprout? = nil
    @State private var cachedSoilHistory: [SoilChartPoint] = []
    @State private var selectedSoilRange: SoilChartRange = .inception
    @State private var scrubIndex: Int? = nil

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
        .sheet(isPresented: $showDataInfo) {
            DataInfoSheet(progression: progression)
        }
        .sheet(isPresented: $showWaterPicker) {
            NavigationStack {
                WaterSproutPickerView(
                    sprouts: activeSprouts,
                    wateredTodayIds: Set(activeSprouts.filter { wasWateredToday($0) }.map(\.id)),
                    leafNames: cachedLeafNames,
                    onSelect: { sprout in
                        showWaterPicker = false
                        DispatchQueue.main.asyncAfter(deadline: .now() + 0.3) {
                            selectedSproutForWater = sprout
                        }
                    }
                )
            }
            .presentationDetents([.medium])
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

        // Soil capacity history
        cachedSoilHistory = computeSoilHistory()
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
            showWaterPicker = true
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

    private var filteredSoilHistory: [SoilChartPoint] {
        guard let rangeStart = selectedSoilRange.startDate else {
            return cachedSoilHistory
        }

        let inRange = cachedSoilHistory.filter { $0.date >= rangeStart }

        // Interpolate a boundary point from the last value before the range
        if let lastBefore = cachedSoilHistory.last(where: { $0.date < rangeStart }) {
            let boundary = SoilChartPoint(
                date: rangeStart,
                capacity: lastBefore.capacity,
                available: lastBefore.available
            )
            return [boundary] + inRange
        }

        return inRange
    }

    private var soilCapacitySection: some View {
        let points = filteredSoilHistory

        return VStack(alignment: .leading, spacing: TrunkTheme.space2) {
            // Title + Legend (or scrub data label when active)
            HStack(alignment: .center) {
                if let idx = scrubIndex, idx < points.count {
                    let pt = points[idx]
                    scrubLabel(point: pt)
                } else {
                    Text("SOIL")
                        .monoLabel(size: TrunkTheme.textXs)

                    Spacer()

                    HStack(spacing: TrunkTheme.space3) {
                        legendItem(color: Color.twig, label: "Capacity")
                        legendItem(color: Color.trunkSuccess, label: "Available")
                    }
                }
            }
            .animation(.none, value: scrubIndex)

            if points.count < 2 {
                Text("Harvest sprouts to grow capacity")
                    .font(.system(size: TrunkTheme.textSm, design: .monospaced))
                    .foregroundStyle(Color.inkFaint)
                    .padding(.vertical, TrunkTheme.space3)
            } else {
                let maxCapacity = points.map(\.capacity).max() ?? 15
                let selectedDate = (scrubIndex != nil && scrubIndex! < points.count) ? points[scrubIndex!].date : nil
                Chart {
                    ForEach(Array(points.enumerated()), id: \.offset) { index, point in
                        // Capacity line with subtle fill
                        LineMark(
                            x: .value("Date", point.date),
                            y: .value("Value", point.capacity),
                            series: .value("Series", "Capacity")
                        )
                        .foregroundStyle(Color.twig)
                        .interpolationMethod(.stepEnd)

                        AreaMark(
                            x: .value("Date", point.date),
                            y: .value("Value", point.capacity),
                            series: .value("Series", "Capacity")
                        )
                        .foregroundStyle(Color.twig.opacity(0.06))
                        .interpolationMethod(.stepEnd)

                        // Available line (no area fill to prevent overlap)
                        LineMark(
                            x: .value("Date", point.date),
                            y: .value("Value", point.available),
                            series: .value("Series", "Available")
                        )
                        .foregroundStyle(Color.trunkSuccess)
                        .interpolationMethod(.stepEnd)
                        .lineStyle(StrokeStyle(lineWidth: 2))

                        // Data nodes — small dots at each point
                        PointMark(
                            x: .value("Date", point.date),
                            y: .value("Value", point.capacity)
                        )
                        .foregroundStyle(Color.twig)
                        .symbolSize(index == scrubIndex ? 30 : 12)

                        PointMark(
                            x: .value("Date", point.date),
                            y: .value("Value", point.available)
                        )
                        .foregroundStyle(Color.trunkSuccess)
                        .symbolSize(index == scrubIndex ? 30 : 12)
                    }

                    // Scrub rule line (inside chart for proper coordinate alignment)
                    if let date = selectedDate {
                        RuleMark(x: .value("Scrub", date))
                            .foregroundStyle(Color.inkFaint.opacity(0.4))
                            .lineStyle(StrokeStyle(lineWidth: 1, dash: [4, 3]))
                    }
                }
                // Scrub gesture
                .chartOverlay { proxy in
                    GeometryReader { geo in
                        Rectangle()
                            .fill(Color.clear)
                            .contentShape(Rectangle())
                            .gesture(
                                DragGesture(minimumDistance: 0)
                                    .onChanged { value in
                                        let xPos = value.location.x
                                        guard let date: Date = proxy.value(atX: xPos) else { return }
                                        let newIndex = closestPointIndex(to: date, in: points)
                                        if newIndex != scrubIndex {
                                            if scrubIndex == nil {
                                                HapticManager.tap()
                                            } else {
                                                HapticManager.selection()
                                            }
                                            scrubIndex = newIndex
                                        }
                                    }
                                    .onEnded { _ in
                                        scrubIndex = nil
                                    }
                            )
                    }
                }
                .chartYScale(domain: 0 ... max(maxCapacity, 15))
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
                .chartXScale(domain: (points.first?.date ?? Date()) ... Date())
                .chartForegroundStyleScale([
                    "Capacity": Color.twig,
                    "Available": Color.trunkSuccess
                ])
                .chartLegend(.hidden)
                .frame(height: 140)
                .id(selectedSoilRange)
            }

            // Time range picker
            soilRangePicker
        }
        .padding(TrunkTheme.space3)
        .background(Color.paper)
        .overlay(
            Rectangle()
                .stroke(Color.border, lineWidth: 1)
        )
    }

    private static let scrubDateFormatter: DateFormatter = {
        let f = DateFormatter()
        f.dateFormat = "MMM d, yyyy h:mm a"
        return f
    }()

    private func scrubLabel(point: SoilChartPoint) -> some View {
        return HStack(alignment: .center) {
            VStack(alignment: .leading, spacing: 2) {
                Text(Self.scrubDateFormatter.string(from: point.date))
                    .font(.system(size: TrunkTheme.textXs, design: .monospaced))
                    .foregroundStyle(Color.inkLight)
            }

            Spacer()

            HStack(spacing: TrunkTheme.space3) {
                HStack(spacing: 4) {
                    RoundedRectangle(cornerRadius: 1)
                        .fill(Color.twig)
                        .frame(width: 8, height: 2)
                    Text(String(format: "%.2f", point.capacity))
                        .font(.system(size: TrunkTheme.textXs, design: .monospaced))
                        .foregroundStyle(Color.twig)
                }
                HStack(spacing: 4) {
                    RoundedRectangle(cornerRadius: 1)
                        .fill(Color.trunkSuccess)
                        .frame(width: 8, height: 2)
                    Text(String(format: "%.2f", point.available))
                        .font(.system(size: TrunkTheme.textXs, design: .monospaced))
                        .foregroundStyle(Color.trunkSuccess)
                }
            }
        }
    }

    private func closestPointIndex(to date: Date, in points: [SoilChartPoint]) -> Int? {
        guard !points.isEmpty else { return nil }
        var bestIndex = 0
        var bestDistance = abs(date.timeIntervalSince(points[0].date))
        for i in 1..<points.count {
            let distance = abs(date.timeIntervalSince(points[i].date))
            if distance < bestDistance {
                bestDistance = distance
                bestIndex = i
            }
        }
        return bestIndex
    }

    private func legendItem(color: Color, label: String) -> some View {
        HStack(spacing: 4) {
            RoundedRectangle(cornerRadius: 1)
                .fill(color)
                .frame(width: 12, height: 2)
            Text(label)
                .font(.system(size: TrunkTheme.textXs, design: .monospaced))
                .foregroundStyle(Color.inkFaint)
        }
    }

    private func isRangeAvailable(_ range: SoilChartRange) -> Bool {
        guard let rangeStart = range.startDate,
              let earliest = cachedSoilHistory.first?.date else {
            return true // ALL is always available; no data = nothing to disable
        }
        return earliest <= rangeStart
    }

    private var soilRangePicker: some View {
        HStack(spacing: 0) {
            ForEach(SoilChartRange.allCases, id: \.self) { range in
                let available = isRangeAvailable(range)
                Button {
                    scrubIndex = nil
                    withAnimation(.easeInOut(duration: 0.2)) {
                        selectedSoilRange = range
                    }
                } label: {
                    Text(range.rawValue)
                        .font(.system(size: TrunkTheme.textXs, design: .monospaced))
                        .foregroundStyle(
                            !available ? Color.inkFaint.opacity(0.35)
                            : selectedSoilRange == range ? Color.ink
                            : Color.inkFaint
                        )
                        .padding(.horizontal, 6)
                        .padding(.vertical, 4)
                        .background(
                            selectedSoilRange == range && available
                                ? Color.border
                                : Color.clear
                        )
                        .clipShape(RoundedRectangle(cornerRadius: 3))
                }
                .buttonStyle(.plain)
                .disabled(!available)

                if range != SoilChartRange.allCases.last {
                    Spacer(minLength: 0)
                }
            }
        }
    }

    // MARK: - Computation Helpers

    private func computeSoilHistory() -> [SoilChartPoint] {
        let events = EventStore.shared.events
        var capacity = SharedConstants.Soil.startingCapacity
        var available = SharedConstants.Soil.startingCapacity
        var history: [SoilChartPoint] = []

        // Track planted sprouts for harvest/uproot reward calculation
        var sproutInfo: [String: (season: String, environment: String, soilCost: Int)] = [:]

        // Starting point from first event
        if let firstEvent = events.first {
            let date = Self.parseISO8601(firstEvent.clientTimestamp)
            history.append(SoilChartPoint(date: date, capacity: capacity, available: available))
        }

        for event in events {
            let date = Self.parseISO8601(event.clientTimestamp)
            var changed = false

            switch event.type {
            case "sprout_planted":
                if let sproutId = event.payload["sproutId"]?.value as? String,
                   let season = event.payload["season"]?.value as? String,
                   let environment = event.payload["environment"]?.value as? String,
                   let soilCost = event.payload["soilCost"]?.value as? Int {
                    sproutInfo[sproutId] = (season: season, environment: environment, soilCost: soilCost)
                    available = max(0, available - Double(soilCost))
                    changed = true
                }

            case "sprout_watered":
                available = min(available + SharedConstants.Soil.waterRecovery, capacity)
                changed = true

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
                    let returnedSoil = Double(info.soilCost)
                    available = min(available + returnedSoil, capacity)
                    changed = true
                }

            case "sprout_uprooted":
                if let soilReturned = event.payload["soilReturned"]?.value as? Double {
                    available = min(available + soilReturned, capacity)
                    changed = true
                }

            case "sun_shone":
                available = min(available + SharedConstants.Soil.sunRecovery, capacity)
                changed = true

            default:
                break
            }

            if changed {
                history.append(SoilChartPoint(date: date, capacity: capacity, available: available))
            }
        }

        // Add current date as final point
        history.append(SoilChartPoint(date: Date(), capacity: capacity, available: available))

        return history
    }

    private static func parseISO8601(_ timestamp: String) -> Date {
        ISO8601.parse(timestamp)
    }

    // MARK: - Helpers

    private func wasWateredToday(_ sprout: DerivedSprout) -> Bool {
        let resetTime = getTodayResetTime()
        return sprout.waterEntries.contains { $0.timestamp >= resetTime }
    }
}

// MARK: - Soil Chart Types

struct SoilChartPoint: Identifiable {
    let id = UUID()
    let date: Date
    let capacity: Double
    let available: Double
}

enum SoilChartRange: String, CaseIterable {
    case oneDay = "1D"
    case oneWeek = "1W"
    case oneMonth = "1M"
    case threeMonths = "3M"
    case sixMonths = "6M"
    case yearToDate = "YTD"
    case inception = "ALL"

    var startDate: Date? {
        let calendar = Calendar.current
        let now = Date()
        switch self {
        case .oneDay: return calendar.date(byAdding: .day, value: -1, to: now)
        case .oneWeek: return calendar.date(byAdding: .day, value: -7, to: now)
        case .oneMonth: return calendar.date(byAdding: .month, value: -1, to: now)
        case .threeMonths: return calendar.date(byAdding: .month, value: -3, to: now)
        case .sixMonths: return calendar.date(byAdding: .month, value: -6, to: now)
        case .yearToDate:
            return calendar.date(from: calendar.dateComponents([.year], from: now))
        case .inception: return nil
        }
    }
}

// MARK: - Water Sprout Picker

struct WaterSproutPickerView: View {
    let sprouts: [DerivedSprout]
    let wateredTodayIds: Set<String>
    let leafNames: [String: String]
    let onSelect: (DerivedSprout) -> Void

    @Environment(\.dismiss) private var dismiss

    /// Un-watered sprouts first (sorted by longest since last watering),
    /// watered-today sprouts at the bottom.
    private var sortedSprouts: [DerivedSprout] {
        sprouts.sorted { a, b in
            let aWatered = wateredTodayIds.contains(a.id)
            let bWatered = wateredTodayIds.contains(b.id)
            if aWatered != bWatered { return !aWatered }
            // Within each group, oldest last-watered first (never watered = distant past)
            let aLast = a.waterEntries.map(\.timestamp).max() ?? .distantPast
            let bLast = b.waterEntries.map(\.timestamp).max() ?? .distantPast
            return aLast < bLast
        }
    }

    var body: some View {
        ZStack {
            Color.parchment
                .ignoresSafeArea()

            ScrollView {
                VStack(spacing: TrunkTheme.space2) {
                    ForEach(sortedSprouts, id: \.id) { sprout in
                        let alreadyWatered = wateredTodayIds.contains(sprout.id)
                        Button {
                            onSelect(sprout)
                        } label: {
                            HStack(spacing: TrunkTheme.space3) {
                                Rectangle()
                                    .fill(alreadyWatered ? Color.inkFaint.opacity(0.3) : Color.twig)
                                    .frame(width: 2)

                                VStack(alignment: .leading, spacing: TrunkTheme.space1) {
                                    // Leaf name (prominent, above title)
                                    if let leafId = sprout.leafId,
                                       let leafName = leafNames[leafId] {
                                        Text(leafName)
                                            .font(.system(size: TrunkTheme.textBase, weight: .medium, design: .monospaced))
                                            .foregroundStyle(alreadyWatered ? Color.inkFaint : Color.wood)
                                            .lineLimit(1)
                                    }

                                    Text(sprout.title)
                                        .font(.system(size: TrunkTheme.textSm, design: .monospaced))
                                        .foregroundStyle(alreadyWatered ? Color.inkFaint : Color.ink)
                                        .lineLimit(1)

                                    HStack(spacing: TrunkTheme.space2) {
                                        Text(alreadyWatered ? "Watered today" : sprout.season.label)
                                            .font(.system(size: TrunkTheme.textXs, design: .monospaced))
                                            .foregroundStyle(Color.inkFaint)

                                        if !alreadyWatered {
                                            Text("\u{00B7}")
                                                .foregroundStyle(Color.inkFaint)

                                            Text(sprout.environment.label)
                                                .font(.system(size: TrunkTheme.textXs, design: .monospaced))
                                                .foregroundStyle(Color.inkFaint)
                                        }
                                    }
                                }

                                Spacer()

                                Text(alreadyWatered ? "\u{2713}" : "\u{1F4A7}")
                                    .foregroundStyle(alreadyWatered ? Color.inkFaint : Color.ink)
                            }
                            .padding(TrunkTheme.space3)
                            .background(Color.paper)
                            .overlay(
                                Rectangle()
                                    .stroke(Color.border, lineWidth: 1)
                            )
                        }
                        .buttonStyle(.plain)
                        .disabled(alreadyWatered)
                    }
                }
                .padding(TrunkTheme.space4)
            }
        }
        .navigationTitle("")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .cancellationAction) {
                Button("Cancel") {
                    dismiss()
                }
                .font(.system(size: TrunkTheme.textSm, design: .monospaced))
                .foregroundStyle(Color.inkFaint)
            }
            ToolbarItem(placement: .principal) {
                Text("CHOOSE SPROUT")
                    .font(.system(size: TrunkTheme.textBase, design: .monospaced))
                    .tracking(2)
                    .foregroundStyle(Color.trunkWater)
            }
        }
    }
}

#Preview {
    NavigationStack {
        TodayView(progression: ProgressionViewModel())
    }
    .environment(AuthService.shared)
}
