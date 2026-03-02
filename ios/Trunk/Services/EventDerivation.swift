//
//  EventDerivation.swift
//  Trunk
//
//  Port of web's derive.ts - all state is computed by replaying events.
//  The event log is immutable - we never modify events, only append new ones.
//

import Foundation

// MARK: - Enums (shared with DerivedSprout)

/// Season duration for a sprout
enum Season: String, Codable, CaseIterable {
    case twoWeeks = "2w"
    case oneMonth = "1m"
    case threeMonths = "3m"
    case sixMonths = "6m"
    case oneYear = "1y"

    var label: String {
        SharedConstants.Seasons.labels[rawValue] ?? rawValue
    }

    var durationMs: Int {
        SharedConstants.Seasons.durations[rawValue] ?? 0
    }
}

/// Environment difficulty for a sprout
enum SproutEnvironment: String, Codable, CaseIterable {
    case fertile
    case firm
    case barren

    var label: String {
        SharedConstants.Environments.labels[rawValue] ?? rawValue.capitalized
    }

    var sproutDescription: String {
        SharedConstants.Environments.descriptions[rawValue] ?? ""
    }

    /// Hint text matching web app exactly
    var formHint: String {
        SharedConstants.Environments.formHints[rawValue] ?? ""
    }
}

/// State of a sprout in its lifecycle
enum SproutState: String, Codable {
    case active
    case completed
    case uprooted
}

// MARK: - Derived State Types

/// A water entry derived from events
struct DerivedWaterEntry: Identifiable {
    let id: UUID
    let timestamp: Date
    let content: String
    let prompt: String?

    init(timestamp: Date, content: String, prompt: String?) {
        self.id = UUID()
        self.timestamp = timestamp
        self.content = content
        self.prompt = prompt
    }
}

/// A sprout derived from events
struct DerivedSprout: Identifiable {
    let id: String
    let twigId: String
    var title: String
    let season: Season
    let environment: SproutEnvironment
    let soilCost: Double
    var leafId: String
    var bloomWither: String?
    var bloomBudding: String?
    var bloomFlourish: String?
    var state: SproutState
    let plantedAt: Date
    var harvestedAt: Date?
    var result: Int?
    var reflection: String?
    var uprootedAt: Date? = nil
    var waterEntries: [DerivedWaterEntry]
}

/// A leaf (saga) derived from events
struct DerivedLeaf: Identifiable {
    let id: String
    let twigId: String
    let name: String
    let createdAt: Date
}

/// A sun entry derived from events
struct DerivedSunEntry: Identifiable {
    let id: UUID
    let timestamp: Date
    let content: String
    let prompt: String?
    let twigId: String
    let twigLabel: String

    init(timestamp: Date, content: String, prompt: String?, twigId: String, twigLabel: String) {
        self.id = UUID()
        self.timestamp = timestamp
        self.content = content
        self.prompt = prompt
        self.twigId = twigId
        self.twigLabel = twigLabel
    }
}

/// Complete derived state from the event log
struct DerivedState {
    var soilCapacity: Double
    var soilAvailable: Double
    var sprouts: [String: DerivedSprout]
    var leaves: [String: DerivedLeaf]
    var sunEntries: [DerivedSunEntry]
    var waterAvailable: Int
    var sunAvailable: Int
    var wateringStreak: WateringStreak
    var soilHistory: [RawSoilSnapshot]
    var radarScores: [Double]
}

// MARK: - Soil Rounding

/// Round soil values to 2 decimal places to prevent floating-point drift.
/// Matches web's roundSoil: Math.round(value * 100) / 100
func roundSoil(_ value: Double) -> Double {
    (value * 100).rounded() / 100
}

// MARK: - Event Deduplication

/// Generate a deduplication key for an event.
/// Uses clientId if available, falls back to composite key.
/// Matches web's getEventDedupeKey logic.
private func getEventDedupeKey(_ event: SyncEvent) -> String {
    if !event.clientId.isEmpty { return event.clientId }
    let entityId = getString(event.payload, "sproutId")
        ?? getString(event.payload, "leafId")
        ?? getString(event.payload, "twigId")
        ?? ""
    return "\(event.type)|\(entityId)|\(event.clientTimestamp)"
}

// MARK: - State Derivation

/// Derive complete state from event log.
/// This replays all events to compute current state, including water/sun/streak
/// and radar scores in a single pass (avoiding redundant event iteration).
func deriveState(from events: [SyncEvent], now: Date = Date()) -> DerivedState {
    var soilCapacity = SharedConstants.Soil.startingCapacity
    var soilAvailable = SharedConstants.Soil.startingCapacity

    var sprouts: [String: DerivedSprout] = [:]
    var leaves: [String: DerivedLeaf] = [:]
    var sunEntries: [DerivedSunEntry] = []

    // Single-pass accumulators for water/sun/streak
    let waterResetTime = getTodayResetTime(now: now)
    let sunResetTime = getWeekResetTime(now: now)
    var waterCountSinceReset = 0
    var sunCountSinceReset = 0
    var waterTimestamps: [Date] = []

    // Soil history snapshots (replaces SoilHistoryService.computeSoilHistory)
    var soilHistory: [RawSoilSnapshot] = []
    var soilHistorySproutInfo: [String: (soilCost: Double, isActive: Bool)] = [:]

    // Radar score accumulators (replaces RadarChartView.computeScores)
    let branchCount = SharedConstants.Tree.branchCount
    var radarWeighted = Array(repeating: 0.0, count: branchCount)
    var radarSproutInfo: [String: (twigId: String, soilCost: Double)] = [:]
    let radarWWater = 0.05
    let radarWSun = 0.35
    let radarCeiling = 100.0

    // Timestamp cache: avoid re-parsing the same ISO8601 string multiple times
    var timestampCache: [String: Date] = [:]
    func cachedParse(_ ts: String) -> Date? {
        if let cached = timestampCache[ts] { return cached }
        let parsed = ISO8601.parse(ts)
        if let parsed { timestampCache[ts] = parsed }
        return parsed
    }

    // Sort events by timestamp to ensure correct ordering (matches web derive.ts)
    let sorted = events.sorted { ($0.clientTimestamp) < ($1.clientTimestamp) }

    // Deduplicate events before replay to prevent double-counting (matches web C13)
    var seenKeys = Set<String>()
    let dedupedEvents = sorted.filter { event in
        let key = getEventDedupeKey(event)
        if seenKeys.contains(key) { return false }
        seenKeys.insert(key)
        return true
    }

    // Add starting point for soil history from first event
    if let firstEvent = dedupedEvents.first,
       let date = cachedParse(firstEvent.clientTimestamp) {
        soilHistory.append(RawSoilSnapshot(date: date, capacity: soilCapacity, available: soilAvailable))
    }

    for event in dedupedEvents {
        // Parse timestamp ONCE per event, reuse for all processing
        let eventTimestamp = cachedParse(event.clientTimestamp)

        switch event.type {
        case "sprout_planted":
            processSproutPlanted(event: event, timestamp: eventTimestamp, soilAvailable: &soilAvailable, sprouts: &sprouts)
            // Radar: accumulate soil cost per branch
            if let sproutId = getString(event.payload, "sproutId"),
               let twigId = getString(event.payload, "twigId") {
                let soilCost = getDouble(event.payload, "soilCost") ?? 0
                radarSproutInfo[sproutId] = (twigId: twigId, soilCost: soilCost)
                if let bi = extractBranchIndex(from: twigId, branchCount: branchCount) {
                    radarWeighted[bi] += soilCost
                }
            }
            // Soil history tracking
            if let sproutId = getString(event.payload, "sproutId"),
               let soilCost = getDouble(event.payload, "soilCost"),
               let date = eventTimestamp {
                soilHistorySproutInfo[sproutId] = (soilCost: soilCost, isActive: true)
                soilHistory.append(RawSoilSnapshot(date: date, capacity: soilCapacity, available: soilAvailable))
            }

        case "sprout_watered":
            processSproutWatered(event: event, timestamp: eventTimestamp, soilAvailable: &soilAvailable, soilCapacity: soilCapacity, sprouts: &sprouts)
            // Radar: water recovery per branch
            if let sproutId = getString(event.payload, "sproutId"),
               let twigId = radarSproutInfo[sproutId]?.twigId,
               let bi = extractBranchIndex(from: twigId, branchCount: branchCount) {
                radarWeighted[bi] += radarWWater
            }
            // Water counting + streak accumulation
            if let ts = eventTimestamp {
                waterTimestamps.append(ts)
                if ts >= waterResetTime {
                    waterCountSinceReset += 1
                }
                // Soil history tracking
                if let sproutId = getString(event.payload, "sproutId"),
                   let info = soilHistorySproutInfo[sproutId], info.isActive {
                    soilHistory.append(RawSoilSnapshot(date: ts, capacity: soilCapacity, available: soilAvailable))
                }
            }

        case "sprout_harvested":
            processSproutHarvested(event: event, timestamp: eventTimestamp, soilCapacity: &soilCapacity, soilAvailable: &soilAvailable, sprouts: &sprouts)
            // Radar: harvest reward per branch
            if let sproutId = getString(event.payload, "sproutId"),
               let info = radarSproutInfo[sproutId],
               let bi = extractBranchIndex(from: info.twigId, branchCount: branchCount) {
                let result = getInt(event.payload, "result") ?? 3
                let rm = SharedConstants.Soil.resultMultipliers[result] ?? 0.7
                radarWeighted[bi] += info.soilCost * rm
            }
            // Soil history tracking
            if let sproutId = getString(event.payload, "sproutId"),
               let date = eventTimestamp,
               let info = soilHistorySproutInfo[sproutId] {
                soilHistorySproutInfo[sproutId] = (soilCost: info.soilCost, isActive: false)
                soilHistory.append(RawSoilSnapshot(date: date, capacity: soilCapacity, available: soilAvailable))
            }

        case "sprout_uprooted":
            processSproutUprooted(event: event, timestamp: eventTimestamp, soilAvailable: &soilAvailable, soilCapacity: soilCapacity, sprouts: &sprouts)
            // Soil history tracking
            if let sproutId = getString(event.payload, "sproutId"),
               let date = eventTimestamp {
                if let info = soilHistorySproutInfo[sproutId] {
                    soilHistorySproutInfo[sproutId] = (soilCost: info.soilCost, isActive: false)
                }
                soilHistory.append(RawSoilSnapshot(date: date, capacity: soilCapacity, available: soilAvailable))
            }

        case "sun_shone":
            processSunShone(event: event, timestamp: eventTimestamp, soilAvailable: &soilAvailable, soilCapacity: soilCapacity, sunEntries: &sunEntries)
            // Radar: sun recovery per branch
            if let twigId = getString(event.payload, "twigId"),
               let bi = extractBranchIndex(from: twigId, branchCount: branchCount) {
                radarWeighted[bi] += radarWSun
            }
            // Sun counting + soil history
            if let ts = eventTimestamp {
                if ts >= sunResetTime {
                    sunCountSinceReset += 1
                }
                soilHistory.append(RawSoilSnapshot(date: ts, capacity: soilCapacity, available: soilAvailable))
            }

        case "sprout_edited":
            processSproutEdited(event: event, sprouts: &sprouts)

        case "leaf_created":
            processLeafCreated(event: event, timestamp: eventTimestamp, leaves: &leaves)

        default:
            break
        }
    }

    // Add current date as final soil history point
    soilHistory.append(RawSoilSnapshot(date: now, capacity: soilCapacity, available: soilAvailable))

    // Compute streak from collected timestamps
    let streak = computeStreakFromTimestamps(waterTimestamps, now: now)

    // Normalize radar scores
    let radarScores = radarWeighted.map { min(1.0, $0 / radarCeiling) }

    return DerivedState(
        soilCapacity: soilCapacity,
        soilAvailable: soilAvailable,
        sprouts: sprouts,
        leaves: leaves,
        sunEntries: sunEntries,
        waterAvailable: max(0, SharedConstants.Water.dailyCapacity - waterCountSinceReset),
        sunAvailable: max(0, SharedConstants.Sun.weeklyCapacity - sunCountSinceReset),
        wateringStreak: streak,
        soilHistory: soilHistory,
        radarScores: radarScores
    )
}

/// Extract branch index from twig ID (e.g. "branch-3-twig-..." → 3)
private func extractBranchIndex(from twigId: String, branchCount: Int) -> Int? {
    for i in 0..<branchCount {
        if twigId.hasPrefix("branch-\(i)") {
            return i
        }
    }
    return nil
}

/// Compute watering streak from pre-collected timestamps (avoids re-iterating events).
private func computeStreakFromTimestamps(_ timestamps: [Date], now: Date) -> WateringStreak {
    guard !timestamps.isEmpty else {
        return WateringStreak(current: 0, longest: 0)
    }

    // Build set of unique watering days (keyed by 6am boundary date)
    var waterDays = Set<String>()
    for ts in timestamps {
        waterDays.insert(dayKey(getTodayResetTime(now: ts)))
    }

    // Current streak: walk back from today (or yesterday if not watered today)
    let calendar = Calendar.current
    var cursor = getTodayResetTime(now: now)
    if !waterDays.contains(dayKey(cursor)) {
        cursor = calendar.date(byAdding: .day, value: -1, to: cursor) ?? cursor
    }

    var current = 0
    while waterDays.contains(dayKey(cursor)) {
        current += 1
        cursor = calendar.date(byAdding: .day, value: -1, to: cursor) ?? cursor
    }

    // Longest streak: find longest consecutive run in sorted days
    let sortedDays = waterDays.sorted()
    var longest = sortedDays.isEmpty ? 0 : 1
    var run = 1
    let noonFormatter = ISO8601DateFormatter()
    noonFormatter.formatOptions = [.withInternetDateTime]
    for i in 1..<sortedDays.count {
        let prevDate = noonFormatter.date(from: sortedDays[i - 1] + "T12:00:00Z") ?? Date()
        let nextExpected = calendar.date(byAdding: .day, value: 1, to: prevDate) ?? prevDate
        if dayKey(nextExpected) == sortedDays[i] {
            run += 1
        } else {
            longest = max(longest, run)
            run = 1
        }
    }
    longest = max(longest, run)

    return WateringStreak(current: current, longest: longest)
}

// MARK: - Event Processing

private func processSproutPlanted(event: SyncEvent, timestamp: Date?, soilAvailable: inout Double, sprouts: inout [String: DerivedSprout]) {
    let payload = event.payload

    guard let sproutId = getString(payload, "sproutId"),
          let twigId = getString(payload, "twigId"),
          let title = getString(payload, "title"),
          let seasonRaw = getString(payload, "season"),
          let environmentRaw = getString(payload, "environment"),
          let season = Season(rawValue: seasonRaw),
          let environment = SproutEnvironment(rawValue: environmentRaw),
          let leafId = getString(payload, "leafId"),
          let guardedTimestamp = timestamp,
          let soilCost = getDouble(payload, "soilCost") else {
        return
    }

    // Spend soil (clamped to 0 minimum)
    soilAvailable = roundSoil(max(0, soilAvailable - soilCost))

    // Create sprout
    let sprout = DerivedSprout(
        id: sproutId,
        twigId: twigId,
        title: title,
        season: season,
        environment: environment,
        soilCost: soilCost,
        leafId: leafId,
        bloomWither: getString(payload, "bloomWither"),
        bloomBudding: getString(payload, "bloomBudding"),
        bloomFlourish: getString(payload, "bloomFlourish"),
        state: .active,
        plantedAt: guardedTimestamp,
        harvestedAt: nil,
        result: nil,
        reflection: nil,
        waterEntries: []
    )

    sprouts[sproutId] = sprout
}

private func processSproutWatered(event: SyncEvent, timestamp: Date?, soilAvailable: inout Double, soilCapacity: Double, sprouts: inout [String: DerivedSprout]) {
    let payload = event.payload

    guard let sproutId = getString(payload, "sproutId"),
          let ts = timestamp else {
        return
    }

    let content = getString(payload, "content") ?? ""
    let prompt = getString(payload, "prompt")

    // Add water entry to sprout
    if var sprout = sprouts[sproutId] {
        let waterEntry = DerivedWaterEntry(
            timestamp: ts,
            content: content,
            prompt: prompt
        )
        sprout.waterEntries.append(waterEntry)
        sprouts[sproutId] = sprout
    }

    // C2: Only recover soil if sprout exists and is active (matches web derive.ts)
    if let sprout = sprouts[sproutId], sprout.state == .active {
        soilAvailable = roundSoil(min(soilAvailable + SharedConstants.Soil.waterRecovery, soilCapacity))
    }
}

private func processSproutHarvested(event: SyncEvent, timestamp: Date?, soilCapacity: inout Double, soilAvailable: inout Double, sprouts: inout [String: DerivedSprout]) {
    let payload = event.payload

    guard let sproutId = getString(payload, "sproutId"),
          let ts = timestamp else {
        return
    }

    let result = getInt(payload, "result")
    let reflection = getString(payload, "reflection")
    let capacityGained = getDouble(payload, "capacityGained") ?? 0

    // Update sprout state
    if var sprout = sprouts[sproutId] {
        sprout.state = .completed
        sprout.result = result
        sprout.reflection = reflection
        sprout.harvestedAt = ts

        // Return soil cost + gain capacity
        // C14: Clamp capacity to maxCapacity (no rounding — capacity retains full precision)
        let returnedSoil = sprout.soilCost
        soilCapacity = min(soilCapacity + capacityGained, SharedConstants.Soil.maxCapacity)
        soilAvailable = roundSoil(min(soilAvailable + returnedSoil, soilCapacity))

        sprouts[sproutId] = sprout
    }
}

private func processSproutUprooted(event: SyncEvent, timestamp: Date?, soilAvailable: inout Double, soilCapacity: Double, sprouts: inout [String: DerivedSprout]) {
    let payload = event.payload

    guard let sproutId = getString(payload, "sproutId"),
          let soilReturned = getDouble(payload, "soilReturned") else {
        return
    }

    // Return partial soil
    soilAvailable = roundSoil(min(soilAvailable + soilReturned, soilCapacity))

    // Transition sprout to uprooted state (preserve all data)
    if var sprout = sprouts[sproutId], sprout.state == .active {
        sprout.state = .uprooted
        sprout.uprootedAt = timestamp
        sprouts[sproutId] = sprout
    }
}

private func processSunShone(event: SyncEvent, timestamp: Date?, soilAvailable: inout Double, soilCapacity: Double, sunEntries: inout [DerivedSunEntry]) {
    let payload = event.payload

    guard let ts = timestamp,
          let twigId = getString(payload, "twigId"),
          let twigLabel = getString(payload, "twigLabel"),
          let content = getString(payload, "content") else {
        return
    }

    let prompt = getString(payload, "prompt")

    let sunEntry = DerivedSunEntry(
        timestamp: ts,
        content: content,
        prompt: prompt,
        twigId: twigId,
        twigLabel: twigLabel
    )
    sunEntries.append(sunEntry)

    // Soil recovery from sun
    soilAvailable = roundSoil(min(soilAvailable + SharedConstants.Soil.sunRecovery, soilCapacity))
}

/// Sparse-merge mutable sprout fields. Matches web derive.ts:217-227.
/// Only overwrites fields present in the payload — absent fields are left unchanged.
private func processSproutEdited(event: SyncEvent, sprouts: inout [String: DerivedSprout]) {
    let payload = event.payload

    guard let sproutId = getString(payload, "sproutId"),
          var sprout = sprouts[sproutId] else {
        return
    }

    if let title = getString(payload, "title") {
        sprout.title = title
    }
    if let bloomWither = getString(payload, "bloomWither") {
        sprout.bloomWither = bloomWither
    }
    if let bloomBudding = getString(payload, "bloomBudding") {
        sprout.bloomBudding = bloomBudding
    }
    if let bloomFlourish = getString(payload, "bloomFlourish") {
        sprout.bloomFlourish = bloomFlourish
    }
    if let leafId = getString(payload, "leafId") {
        sprout.leafId = leafId
    }

    sprouts[sproutId] = sprout
}

private func processLeafCreated(event: SyncEvent, timestamp: Date?, leaves: inout [String: DerivedLeaf]) {
    let payload = event.payload

    guard let leafId = getString(payload, "leafId"),
          let twigId = getString(payload, "twigId"),
          let name = getString(payload, "name"),
          let ts = timestamp else {
        return
    }

    let leaf = DerivedLeaf(
        id: leafId,
        twigId: twigId,
        name: name,
        createdAt: ts
    )

    leaves[leafId] = leaf
}

// MARK: - Water/Sun Availability Derivation

/// Format a Date as "YYYY-MM-DD" using local calendar components.
/// Shared day-key utility — use with getTodayResetTime() to identify
/// which "day" (6am–6am) a timestamp belongs to.
func dayKey(_ date: Date) -> String {
    let calendar = Calendar.current
    let components = calendar.dateComponents([.year, .month, .day], from: date)
    return String(format: "%04d-%02d-%02d", components.year ?? 0, components.month ?? 0, components.day ?? 0)
}

/// Get reset time for daily water (6am local time)
func getTodayResetTime(now: Date = Date()) -> Date {
    var calendar = Calendar.current
    calendar.timeZone = TimeZone.current

    var components = calendar.dateComponents([.year, .month, .day], from: now)
    components.hour = SharedConstants.Water.resetHour
    components.minute = 0
    components.second = 0

    guard let reset = calendar.date(from: components) else {
        return now
    }

    // If before reset hour, reset was yesterday
    if now < reset {
        return calendar.date(byAdding: .day, value: -1, to: reset) ?? reset
    }

    return reset
}

/// Get reset time for weekly sun (Monday 6am local time)
func getWeekResetTime(now: Date = Date()) -> Date {
    var calendar = Calendar.current
    calendar.timeZone = TimeZone.current
    calendar.firstWeekday = 2 // Monday = 2

    var components = calendar.dateComponents([.year, .month, .day, .weekday], from: now)
    components.hour = SharedConstants.Sun.resetHour
    components.minute = 0
    components.second = 0

    // Find most recent Monday
    let weekday = components.weekday ?? 1
    // Days since Monday (Monday = 2, so Monday - 2 = 0, Tuesday - 2 = 1, etc.)
    // Sunday = 1, so Sunday - 2 = -1, needs to be 6
    let daysSinceMonday = (weekday - 2 + 7) % 7

    guard let todayAtReset = calendar.date(from: components),
          let mondayAtReset = calendar.date(byAdding: .day, value: -daysSinceMonday, to: todayAtReset) else {
        return now
    }

    // If today is Monday but before reset hour, go back a week
    if daysSinceMonday == 0 && now < mondayAtReset {
        return calendar.date(byAdding: .day, value: -7, to: mondayAtReset) ?? mondayAtReset
    }

    return mondayAtReset
}

/// Derive water available from events.
/// Water = capacity - waters since 6am today
func deriveWaterAvailable(from events: [SyncEvent], now: Date = Date()) -> Int {
    let resetTime = getTodayResetTime(now: now)

    let waterCount = events.filter { event in
        event.type == "sprout_watered" && (parseTimestamp(event.clientTimestamp) ?? .distantPast) >= resetTime
    }.count

    return max(0, SharedConstants.Water.dailyCapacity - waterCount)
}

/// Derive sun available from events.
/// Sun = capacity - shines since Monday 6am
func deriveSunAvailable(from events: [SyncEvent], now: Date = Date()) -> Int {
    let resetTime = getWeekResetTime(now: now)

    let sunCount = events.filter { event in
        event.type == "sun_shone" && (parseTimestamp(event.clientTimestamp) ?? .distantPast) >= resetTime
    }.count

    return max(0, SharedConstants.Sun.weeklyCapacity - sunCount)
}

/// Check if a sprout was watered this week
func wasSproutWateredThisWeek(events: [SyncEvent], sproutId: String, now: Date = Date()) -> Bool {
    let resetTime = getWeekResetTime(now: now)

    return events.contains { event in
        guard event.type == "sprout_watered",
              let eventSproutId = getString(event.payload, "sproutId") else {
            return false
        }
        return eventSproutId == sproutId && (parseTimestamp(event.clientTimestamp) ?? .distantPast) >= resetTime
    }
}

// MARK: - Helper Functions

/// Get active sprouts (not yet harvested)
func getActiveSprouts(from state: DerivedState) -> [DerivedSprout] {
    return state.sprouts.values.filter { $0.state == .active }
}

/// Get completed sprouts (harvested)
func getCompletedSprouts(from state: DerivedState) -> [DerivedSprout] {
    return state.sprouts.values.filter { $0.state == .completed }
}

/// Get all sprouts for a specific twig
func getSproutsForTwig(from state: DerivedState, twigId: String) -> [DerivedSprout] {
    return state.sprouts.values.filter { $0.twigId == twigId }
}

/// Get all leaves for a specific twig
func getLeavesForTwig(from state: DerivedState, twigId: String) -> [DerivedLeaf] {
    return state.leaves.values.filter { $0.twigId == twigId }
}

/// Check if a sprout's duration has elapsed and it's ready to harvest
func isSproutReady(_ sprout: DerivedSprout) -> Bool {
    guard sprout.state == .active else { return false }
    let elapsed = Date().timeIntervalSince(sprout.plantedAt) * 1000
    return Int(elapsed) >= sprout.season.durationMs
}

/// Convert a harvest result (1-5) to its display emoji
func resultToEmoji(_ result: Int) -> String {
    SharedConstants.Results.emojis[result] ?? "🌿"
}

/// Get a human-readable context label for a leaf (e.g., "CORE / Movement")
func contextLabel(for leaf: DerivedLeaf) -> String {
    twigLocationLabel(for: leaf.twigId)
}

// MARK: - Payload Parsing Helpers

private func parseTimestamp(_ timestamp: String) -> Date? {
    ISO8601.parse(timestamp)
}

// Payload parsing helpers (getString, getInt, getDouble) are in Utils/PayloadHelpers.swift

// MARK: - Watering Streak

/// Watering streak data
struct WateringStreak {
    let current: Int
    let longest: Int
}

/// Derive watering streak from events.
/// A "watering day" runs from 6am to 6am (matching the daily reset).
/// Current streak: consecutive days ending at today (or yesterday if not yet watered today).
/// Longest streak: longest consecutive run ever.
func deriveWateringStreak(from events: [SyncEvent], now: Date = Date()) -> WateringStreak {
    let waterTimestamps = events
        .filter { $0.type == "sprout_watered" }
        .compactMap { parseTimestamp($0.clientTimestamp) }

    guard !waterTimestamps.isEmpty else {
        return WateringStreak(current: 0, longest: 0)
    }

    // Build set of unique watering days (keyed by 6am boundary date)
    var waterDays = Set<String>()
    for ts in waterTimestamps {
        waterDays.insert(dayKey(getTodayResetTime(now: ts)))
    }

    // Current streak: walk back from today (or yesterday if not watered today)
    let calendar = Calendar.current
    var cursor = getTodayResetTime(now: now)
    if !waterDays.contains(dayKey(cursor)) {
        cursor = calendar.date(byAdding: .day, value: -1, to: cursor) ?? cursor
    }

    var current = 0
    while waterDays.contains(dayKey(cursor)) {
        current += 1
        cursor = calendar.date(byAdding: .day, value: -1, to: cursor) ?? cursor
    }

    // Longest streak: find longest consecutive run in sorted days
    let sortedDays = waterDays.sorted()
    var longest = sortedDays.isEmpty ? 0 : 1
    var run = 1
    let noonFmt = ISO8601DateFormatter()
    noonFmt.formatOptions = [.withInternetDateTime]
    for i in 1..<sortedDays.count {
        // Parse previous day at noon (DST-safe), add 1 day, compare key
        let prevDate = noonFmt.date(from: sortedDays[i - 1] + "T12:00:00Z") ?? Date()
        let nextExpected = calendar.date(byAdding: .day, value: 1, to: prevDate) ?? prevDate
        if dayKey(nextExpected) == sortedDays[i] {
            run += 1
        } else {
            longest = max(longest, run)
            run = 1
        }
    }
    longest = max(longest, run)

    return WateringStreak(current: current, longest: longest)
}
