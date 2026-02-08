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
}

// MARK: - Derived State Types

/// A water entry derived from events
struct DerivedWaterEntry: Identifiable {
    var id: Date { timestamp }
    let timestamp: Date
    let content: String
    let prompt: String?
}

/// A sprout derived from events
struct DerivedSprout: Identifiable {
    let id: String
    let twigId: String
    let title: String
    let season: Season
    let environment: SproutEnvironment
    let soilCost: Int
    let leafId: String?
    let bloomWither: String?
    let bloomBudding: String?
    let bloomFlourish: String?
    var state: SproutState
    let plantedAt: Date
    var harvestedAt: Date?
    var result: Int?
    var reflection: String?
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
    var id: Date { timestamp }
    let timestamp: Date
    let content: String
    let prompt: String?
    let twigId: String
    let twigLabel: String
}

/// Complete derived state from the event log
struct DerivedState {
    var soilCapacity: Double
    var soilAvailable: Double
    var sprouts: [String: DerivedSprout]
    var leaves: [String: DerivedLeaf]
    var sunEntries: [DerivedSunEntry]
}

// MARK: - State Derivation

/// Derive complete state from event log.
/// This replays all events to compute current state.
func deriveState(from events: [SyncEvent]) -> DerivedState {
    var soilCapacity = SharedConstants.Soil.startingCapacity
    var soilAvailable = SharedConstants.Soil.startingCapacity

    var sprouts: [String: DerivedSprout] = [:]
    var leaves: [String: DerivedLeaf] = [:]
    var sunEntries: [DerivedSunEntry] = []

    // Sort events by timestamp to ensure correct ordering
    let sortedEvents = events.sorted { event1, event2 in
        parseTimestamp(event1.clientTimestamp) < parseTimestamp(event2.clientTimestamp)
    }

    for event in sortedEvents {
        switch event.type {
        case "sprout_planted":
            processSproutPlanted(event: event, soilAvailable: &soilAvailable, sprouts: &sprouts)

        case "sprout_watered":
            processSproutWatered(event: event, soilAvailable: &soilAvailable, soilCapacity: soilCapacity, sprouts: &sprouts)

        case "sprout_harvested":
            processSproutHarvested(event: event, soilCapacity: &soilCapacity, soilAvailable: &soilAvailable, sprouts: &sprouts)

        case "sprout_uprooted":
            processSproutUprooted(event: event, soilAvailable: &soilAvailable, soilCapacity: soilCapacity, sprouts: &sprouts)

        case "sun_shone":
            processSunShone(event: event, soilAvailable: &soilAvailable, soilCapacity: soilCapacity, sunEntries: &sunEntries)

        case "leaf_created":
            processLeafCreated(event: event, leaves: &leaves)

        default:
            break
        }
    }

    return DerivedState(
        soilCapacity: soilCapacity,
        soilAvailable: soilAvailable,
        sprouts: sprouts,
        leaves: leaves,
        sunEntries: sunEntries
    )
}

// MARK: - Event Processing

private func processSproutPlanted(event: SyncEvent, soilAvailable: inout Double, sprouts: inout [String: DerivedSprout]) {
    let payload = event.payload

    guard let sproutId = getString(payload, "sproutId"),
          let twigId = getString(payload, "twigId"),
          let title = getString(payload, "title"),
          let seasonRaw = getString(payload, "season"),
          let environmentRaw = getString(payload, "environment"),
          let season = Season(rawValue: seasonRaw),
          let environment = SproutEnvironment(rawValue: environmentRaw) else {
        return
    }

    let soilCost = getInt(payload, "soilCost") ?? 0

    // Spend soil (clamped to 0 minimum)
    soilAvailable = max(0, soilAvailable - Double(soilCost))

    // Create sprout
    let sprout = DerivedSprout(
        id: sproutId,
        twigId: twigId,
        title: title,
        season: season,
        environment: environment,
        soilCost: soilCost,
        leafId: getString(payload, "leafId"),
        bloomWither: getString(payload, "bloomWither"),
        bloomBudding: getString(payload, "bloomBudding"),
        bloomFlourish: getString(payload, "bloomFlourish"),
        state: .active,
        plantedAt: parseTimestamp(event.clientTimestamp),
        harvestedAt: nil,
        result: nil,
        reflection: nil,
        waterEntries: []
    )

    sprouts[sproutId] = sprout
}

private func processSproutWatered(event: SyncEvent, soilAvailable: inout Double, soilCapacity: Double, sprouts: inout [String: DerivedSprout]) {
    let payload = event.payload

    guard let sproutId = getString(payload, "sproutId") else {
        return
    }

    // Event payloads use "note" for content
    let content = getString(payload, "note") ?? getString(payload, "content") ?? ""
    let prompt = getString(payload, "prompt")
    let timestamp = parseTimestamp(event.clientTimestamp)

    // Add water entry to sprout
    if var sprout = sprouts[sproutId] {
        let waterEntry = DerivedWaterEntry(
            timestamp: timestamp,
            content: content,
            prompt: prompt
        )
        sprout.waterEntries.append(waterEntry)
        sprouts[sproutId] = sprout
    }

    // Soil recovery from watering
    soilAvailable = min(soilAvailable + SharedConstants.Soil.waterRecovery, soilCapacity)
}

private func processSproutHarvested(event: SyncEvent, soilCapacity: inout Double, soilAvailable: inout Double, sprouts: inout [String: DerivedSprout]) {
    let payload = event.payload

    guard let sproutId = getString(payload, "sproutId") else {
        return
    }

    let result = getInt(payload, "result")
    let reflection = getString(payload, "reflection") ?? getString(payload, "note")
    let capacityGained = getDouble(payload, "capacityGained") ?? 0
    let timestamp = parseTimestamp(event.clientTimestamp)

    // Update sprout state
    if var sprout = sprouts[sproutId] {
        sprout.state = .completed
        sprout.result = result
        sprout.reflection = reflection
        sprout.harvestedAt = timestamp

        // Return soil cost + gain capacity
        let returnedSoil = Double(sprout.soilCost)
        soilCapacity += capacityGained
        soilAvailable = min(soilAvailable + returnedSoil, soilCapacity)

        sprouts[sproutId] = sprout
    }
}

private func processSproutUprooted(event: SyncEvent, soilAvailable: inout Double, soilCapacity: Double, sprouts: inout [String: DerivedSprout]) {
    let payload = event.payload

    guard let sproutId = getString(payload, "sproutId") else {
        return
    }

    let soilReturned = getDouble(payload, "soilReturned") ?? 0

    // Return partial soil
    soilAvailable = min(soilAvailable + soilReturned, soilCapacity)

    // Remove sprout from active tracking
    sprouts.removeValue(forKey: sproutId)
}

private func processSunShone(event: SyncEvent, soilAvailable: inout Double, soilCapacity: Double, sunEntries: inout [DerivedSunEntry]) {
    let payload = event.payload

    // Event payloads use "note" for content
    let content = getString(payload, "note") ?? getString(payload, "content") ?? ""
    let prompt = getString(payload, "prompt")
    let twigId = getString(payload, "twigId") ?? ""
    let twigLabel = getString(payload, "twigLabel") ?? ""
    let timestamp = parseTimestamp(event.clientTimestamp)

    let sunEntry = DerivedSunEntry(
        timestamp: timestamp,
        content: content,
        prompt: prompt,
        twigId: twigId,
        twigLabel: twigLabel
    )
    sunEntries.append(sunEntry)

    // Soil recovery from sun
    soilAvailable = min(soilAvailable + SharedConstants.Soil.sunRecovery, soilCapacity)
}

private func processLeafCreated(event: SyncEvent, leaves: inout [String: DerivedLeaf]) {
    let payload = event.payload

    guard let leafId = getString(payload, "leafId"),
          let twigId = getString(payload, "twigId"),
          let name = getString(payload, "name") else {
        return
    }

    let timestamp = parseTimestamp(event.clientTimestamp)

    let leaf = DerivedLeaf(
        id: leafId,
        twigId: twigId,
        name: name,
        createdAt: timestamp
    )

    leaves[leafId] = leaf
}

// MARK: - Water/Sun Availability Derivation

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
        event.type == "sprout_watered" && parseTimestamp(event.clientTimestamp) >= resetTime
    }.count

    return max(0, SharedConstants.Water.dailyCapacity - waterCount)
}

/// Derive sun available from events.
/// Sun = capacity - shines since Monday 6am
func deriveSunAvailable(from events: [SyncEvent], now: Date = Date()) -> Int {
    let resetTime = getWeekResetTime(now: now)

    let sunCount = events.filter { event in
        event.type == "sun_shone" && parseTimestamp(event.clientTimestamp) >= resetTime
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
        return eventSproutId == sproutId && parseTimestamp(event.clientTimestamp) >= resetTime
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
    switch result {
    case 1: return "🥀"
    case 2: return "🌱"
    case 3: return "🌿"
    case 4: return "🌳"
    case 5: return "🌲"
    default: return "🌿"
    }
}

/// Get a human-readable context label for a leaf (e.g., "CORE / Movement")
func contextLabel(for leaf: DerivedLeaf) -> String {
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

// MARK: - Payload Parsing Helpers

/// Parse ISO8601 timestamp string to Date
private func parseTimestamp(_ timestamp: String) -> Date {
    let formatter = ISO8601DateFormatter()
    formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
    if let date = formatter.date(from: timestamp) {
        return date
    }
    // Try without fractional seconds
    formatter.formatOptions = [.withInternetDateTime]
    return formatter.date(from: timestamp) ?? Date.distantPast
}

/// Safely get a string value from payload
private func getString(_ payload: [String: AnyCodable], _ key: String) -> String? {
    guard let codable = payload[key] else { return nil }
    return codable.value as? String
}

/// Safely get an int value from payload (handles both Int and Double)
private func getInt(_ payload: [String: AnyCodable], _ key: String) -> Int? {
    guard let codable = payload[key] else { return nil }
    if let intValue = codable.value as? Int {
        return intValue
    }
    if let doubleValue = codable.value as? Double {
        return Int(doubleValue)
    }
    return nil
}

/// Safely get a double value from payload (handles both Int and Double)
private func getDouble(_ payload: [String: AnyCodable], _ key: String) -> Double? {
    guard let codable = payload[key] else { return nil }
    if let doubleValue = codable.value as? Double {
        return doubleValue
    }
    if let intValue = codable.value as? Int {
        return Double(intValue)
    }
    return nil
}
