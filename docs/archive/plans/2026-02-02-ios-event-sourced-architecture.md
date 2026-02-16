# iOS Event-Sourced Architecture Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make iOS derive ALL state from cloud events (Supabase), exactly matching web's event-sourced architecture.

**Architecture:** Events are the single source of truth in Supabase. Both iOS and web pull events from cloud, derive state locally using identical formulas. No local storage for resources - everything computed from events.

**Tech Stack:** Swift, SwiftData (for caching derived state), Supabase (cloud events)

---

## Overview

**Current iOS (broken):**
- SwiftData models (Sprout, WaterEntry, SunEntry, Leaf) as source of truth
- ResourceState stored in UserDefaults (soilCapacity, soilAvailable, water, sun)
- When syncing, events converted to SwiftData models but capacity NOT updated

**Target iOS (matches web):**
- Events pulled from Supabase are the source of truth
- ALL state derived by replaying events: `deriveState(events) → DerivedState`
- Water/sun availability derived by counting events since reset time
- SwiftData models kept as derived cache for UI queries
- ResourceState.swift DELETED

---

### Task 1: Create EventDerivation.swift

**Files:**
- Create: `ios/Trunk/Services/EventDerivation.swift`

**Step 1: Create the DerivedState types**

```swift
//
//  EventDerivation.swift
//  Trunk
//
//  State derivation from event log - port of web's derive.ts.
//  All state is computed by replaying events. Events are immutable.
//

import Foundation

// MARK: - Derived State Types

struct DerivedWaterEntry {
    let timestamp: Date
    let content: String
    let prompt: String?
}

struct DerivedSprout {
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
    // Derived state
    var state: SproutState
    let plantedAt: Date
    var harvestedAt: Date?
    var result: Int?
    var reflection: String?
    var waterEntries: [DerivedWaterEntry]
}

struct DerivedLeaf {
    let id: String
    let twigId: String
    let name: String
    let createdAt: Date
}

struct DerivedSunEntry {
    let timestamp: Date
    let content: String
    let prompt: String?
    let twigId: String
    let twigLabel: String
}

struct DerivedState {
    var soilCapacity: Double
    var soilAvailable: Double
    var sprouts: [String: DerivedSprout]
    var leaves: [String: DerivedLeaf]
    var sunEntries: [DerivedSunEntry]
}
```

**Step 2: Implement deriveState function**

Add to the same file:

```swift
// MARK: - State Derivation

/// Derive complete state from event log.
/// This replays all events to compute current state - exact port of web's deriveState().
func deriveState(from events: [SyncEvent]) -> DerivedState {
    var soilCapacity = TrunkConstants.Soil.startingCapacity
    var soilAvailable = TrunkConstants.Soil.startingCapacity
    var sprouts: [String: DerivedSprout] = [:]
    var leaves: [String: DerivedLeaf] = [:]
    var sunEntries: [DerivedSunEntry] = []

    let formatter = ISO8601DateFormatter()

    // Sort events by timestamp
    let sortedEvents = events.sorted {
        (formatter.date(from: $0.createdAt) ?? Date.distantPast) <
        (formatter.date(from: $1.createdAt) ?? Date.distantPast)
    }

    for event in sortedEvents {
        let timestamp = formatter.date(from: event.clientTimestamp) ?? Date()

        switch event.type {
        case "sprout_planted":
            guard let sproutId = event.payload["sproutId"]?.value as? String,
                  let twigId = event.payload["twigId"]?.value as? String,
                  let title = event.payload["title"]?.value as? String,
                  let seasonRaw = event.payload["season"]?.value as? String,
                  let environmentRaw = event.payload["environment"]?.value as? String else {
                continue
            }

            let soilCost: Int
            if let intCost = event.payload["soilCost"]?.value as? Int {
                soilCost = intCost
            } else if let doubleCost = event.payload["soilCost"]?.value as? Double {
                soilCost = Int(doubleCost)
            } else {
                continue
            }

            // Spend soil
            soilAvailable = max(0, soilAvailable - Double(soilCost))

            // Create sprout
            sprouts[sproutId] = DerivedSprout(
                id: sproutId,
                twigId: twigId,
                title: title,
                season: Season(rawValue: seasonRaw) ?? .oneMonth,
                environment: SproutEnvironment(rawValue: environmentRaw) ?? .firm,
                soilCost: soilCost,
                leafId: event.payload["leafId"]?.value as? String,
                bloomWither: event.payload["bloomWither"]?.value as? String,
                bloomBudding: event.payload["bloomBudding"]?.value as? String,
                bloomFlourish: event.payload["bloomFlourish"]?.value as? String,
                state: .active,
                plantedAt: timestamp,
                harvestedAt: nil,
                result: nil,
                reflection: nil,
                waterEntries: []
            )

        case "sprout_watered":
            guard let sproutId = event.payload["sproutId"]?.value as? String,
                  let content = event.payload["note"]?.value as? String else {
                continue
            }

            if var sprout = sprouts[sproutId] {
                sprout.waterEntries.append(DerivedWaterEntry(
                    timestamp: timestamp,
                    content: content,
                    prompt: event.payload["prompt"]?.value as? String
                ))
                sprouts[sproutId] = sprout
            }

            // Soil recovery from watering
            soilAvailable = min(soilAvailable + TrunkConstants.Soil.waterRecovery, soilCapacity)

        case "sprout_harvested":
            guard let sproutId = event.payload["sproutId"]?.value as? String else {
                continue
            }

            let result: Int
            if let intResult = event.payload["result"]?.value as? Int {
                result = intResult
            } else if let doubleResult = event.payload["result"]?.value as? Double {
                result = Int(doubleResult)
            } else {
                continue
            }

            let capacityGained: Double
            if let intGain = event.payload["capacityGained"]?.value as? Int {
                capacityGained = Double(intGain)
            } else if let doubleGain = event.payload["capacityGained"]?.value as? Double {
                capacityGained = doubleGain
            } else {
                capacityGained = 0
            }

            if var sprout = sprouts[sproutId] {
                sprout.state = .completed
                sprout.result = result
                sprout.reflection = event.payload["reflection"]?.value as? String
                sprout.harvestedAt = timestamp

                // Return soil cost + gain capacity
                soilCapacity += capacityGained
                soilAvailable = min(soilAvailable + Double(sprout.soilCost), soilCapacity)

                sprouts[sproutId] = sprout
            }

        case "sprout_uprooted":
            guard let sproutId = event.payload["sproutId"]?.value as? String else {
                continue
            }

            let soilReturned: Double
            if let intReturn = event.payload["soilReturned"]?.value as? Int {
                soilReturned = Double(intReturn)
            } else if let doubleReturn = event.payload["soilReturned"]?.value as? Double {
                soilReturned = doubleReturn
            } else {
                soilReturned = 0
            }

            // Return partial soil
            soilAvailable = min(soilAvailable + soilReturned, soilCapacity)
            // Remove sprout
            sprouts.removeValue(forKey: sproutId)

        case "sun_shone":
            guard let twigId = event.payload["twigId"]?.value as? String,
                  let content = event.payload["note"]?.value as? String else {
                continue
            }

            sunEntries.append(DerivedSunEntry(
                timestamp: timestamp,
                content: content,
                prompt: event.payload["prompt"]?.value as? String,
                twigId: twigId,
                twigLabel: event.payload["twigLabel"]?.value as? String ?? ""
            ))

            // Soil recovery from sun
            soilAvailable = min(soilAvailable + TrunkConstants.Soil.sunRecovery, soilCapacity)

        case "leaf_created":
            guard let leafId = event.payload["leafId"]?.value as? String,
                  let twigId = event.payload["twigId"]?.value as? String,
                  let name = event.payload["name"]?.value as? String else {
                continue
            }

            leaves[leafId] = DerivedLeaf(
                id: leafId,
                twigId: twigId,
                name: name,
                createdAt: timestamp
            )

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
```

**Step 3: Implement water/sun availability derivation**

Add to the same file:

```swift
// MARK: - Resource Availability (derived from event timestamps)

/// Get reset time for daily water (6am local time)
func getTodayResetTime(now: Date = Date()) -> Date {
    let calendar = Calendar.current
    var components = calendar.dateComponents([.year, .month, .day], from: now)
    components.hour = TrunkConstants.Water.resetHour
    components.minute = 0
    components.second = 0

    guard let reset = calendar.date(from: components) else { return now }

    // If before 6am, reset was yesterday
    if now < reset {
        return calendar.date(byAdding: .day, value: -1, to: reset) ?? reset
    }
    return reset
}

/// Get reset time for weekly sun (Monday 6am local time)
func getWeekResetTime(now: Date = Date()) -> Date {
    let calendar = Calendar.current
    var components = calendar.dateComponents([.yearForWeekOfYear, .weekOfYear], from: now)
    components.weekday = 2 // Monday
    components.hour = TrunkConstants.Sun.resetHour
    components.minute = 0
    components.second = 0

    guard let reset = calendar.date(from: components) else { return now }

    // If today is Monday but before 6am, go back a week
    let weekday = calendar.component(.weekday, from: now)
    let hour = calendar.component(.hour, from: now)
    if weekday == 2 && hour < TrunkConstants.Sun.resetHour {
        return calendar.date(byAdding: .weekOfYear, value: -1, to: reset) ?? reset
    }

    // If reset is in the future, go back a week
    if reset > now {
        return calendar.date(byAdding: .weekOfYear, value: -1, to: reset) ?? reset
    }

    return reset
}

/// Derive water available from events.
/// Water = capacity - waters since 6am today
func deriveWaterAvailable(from events: [SyncEvent], now: Date = Date()) -> Int {
    let resetTime = getTodayResetTime(now: now)
    let formatter = ISO8601DateFormatter()

    let waterCount = events.filter { event in
        guard event.type == "sprout_watered",
              let timestamp = formatter.date(from: event.clientTimestamp) else {
            return false
        }
        return timestamp >= resetTime
    }.count

    return max(0, TrunkConstants.Water.dailyCapacity - waterCount)
}

/// Derive sun available from events.
/// Sun = capacity - shines since Monday 6am
func deriveSunAvailable(from events: [SyncEvent], now: Date = Date()) -> Int {
    let resetTime = getWeekResetTime(now: now)
    let formatter = ISO8601DateFormatter()

    let sunCount = events.filter { event in
        guard event.type == "sun_shone",
              let timestamp = formatter.date(from: event.clientTimestamp) else {
            return false
        }
        return timestamp >= resetTime
    }.count

    return max(0, TrunkConstants.Sun.weeklyCapacity - sunCount)
}

/// Check if a sprout was watered this week
func wasSproutWateredThisWeek(events: [SyncEvent], sproutId: String, now: Date = Date()) -> Bool {
    let resetTime = getWeekResetTime(now: now)
    let formatter = ISO8601DateFormatter()

    return events.contains { event in
        guard event.type == "sprout_watered",
              event.payload["sproutId"]?.value as? String == sproutId,
              let timestamp = formatter.date(from: event.clientTimestamp) else {
            return false
        }
        return timestamp >= resetTime
    }
}

// MARK: - Helper Functions

/// Get active sprouts from derived state
func getActiveSprouts(from state: DerivedState) -> [DerivedSprout] {
    state.sprouts.values.filter { $0.state == .active }
}

/// Get sprouts for a specific twig
func getSproutsForTwig(from state: DerivedState, twigId: String) -> [DerivedSprout] {
    state.sprouts.values.filter { $0.twigId == twigId }
}

/// Get leaves for a specific twig
func getLeavesForTwig(from state: DerivedState, twigId: String) -> [DerivedLeaf] {
    state.leaves.values.filter { $0.twigId == twigId }
}

/// Check if a derived sprout is ready for harvest
func isSproutReady(_ sprout: DerivedSprout) -> Bool {
    guard sprout.state == .active else { return false }
    let elapsed = Date().timeIntervalSince(sprout.plantedAt) * 1000
    return Int(elapsed) >= sprout.season.durationMs
}
```

**Step 4: Commit**

```bash
git add ios/Trunk/Services/EventDerivation.swift
git commit -m "feat(ios): add EventDerivation.swift - port of web's derive.ts"
```

---

### Task 2: Create EventStore.swift

**Files:**
- Create: `ios/Trunk/Services/EventStore.swift`

**Step 1: Create the EventStore class**

```swift
//
//  EventStore.swift
//  Trunk
//
//  Manages cloud events and derived state - port of web's store.ts.
//  Events are fetched from Supabase and state is derived locally.
//

import Foundation

@MainActor
final class EventStore: ObservableObject {
    static let shared = EventStore()

    // Cached events from cloud
    @Published private(set) var events: [SyncEvent] = []

    // Cached derived state (invalidated on event changes)
    private var cachedState: DerivedState?
    private var cachedWaterAvailable: Int?
    private var cachedSunAvailable: Int?

    private init() {}

    // MARK: - Event Management

    /// Replace all events (after pulling from cloud)
    func setEvents(_ newEvents: [SyncEvent]) {
        events = newEvents
        invalidateCache()
    }

    /// Append a single event (after pushing to cloud)
    func appendEvent(_ event: SyncEvent) {
        events.append(event)
        invalidateCache()
    }

    /// Clear all events (for logout)
    func clearEvents() {
        events = []
        invalidateCache()
    }

    // MARK: - State Derivation

    /// Get derived state (cached)
    func getState() -> DerivedState {
        if let cached = cachedState {
            return cached
        }
        let state = deriveState(from: events)
        cachedState = state
        return state
    }

    /// Get water available (cached)
    func getWaterAvailable(now: Date = Date()) -> Int {
        if let cached = cachedWaterAvailable {
            return cached
        }
        let water = deriveWaterAvailable(from: events, now: now)
        cachedWaterAvailable = water
        return water
    }

    /// Get sun available (cached)
    func getSunAvailable(now: Date = Date()) -> Int {
        if let cached = cachedSunAvailable {
            return cached
        }
        let sun = deriveSunAvailable(from: events, now: now)
        cachedSunAvailable = sun
        return sun
    }

    /// Check if sprout was watered this week
    func wasSproutWateredThisWeek(sproutId: String, now: Date = Date()) -> Bool {
        Trunk.wasSproutWateredThisWeek(events: events, sproutId: sproutId, now: now)
    }

    // MARK: - Cache Management

    private func invalidateCache() {
        cachedState = nil
        cachedWaterAvailable = nil
        cachedSunAvailable = nil
    }

    /// Force refresh (e.g., when crossing time boundaries)
    func refresh() {
        invalidateCache()
    }
}
```

**Step 2: Commit**

```bash
git add ios/Trunk/Services/EventStore.swift
git commit -m "feat(ios): add EventStore.swift - central state management from cloud events"
```

---

### Task 3: Update SyncService to populate EventStore

**Files:**
- Modify: `ios/Trunk/Services/SyncService.swift`

**Step 1: Update pullEvents to return events and populate EventStore**

Replace the `pullEvents` method:

```swift
/// Pull ALL events from Supabase (not incremental - we derive state from full log)
func pullAllEvents() async throws -> Int {
    guard let client = SupabaseClientProvider.shared else {
        throw SyncError.notConfigured
    }

    guard AuthService.shared.isAuthenticated else {
        throw SyncError.notAuthenticated
    }

    let events: [SyncEvent] = try await client
        .from("events")
        .select()
        .order("created_at")
        .execute()
        .value

    // Update EventStore with all events
    await MainActor.run {
        EventStore.shared.setEvents(events)
    }

    return events.count
}
```

**Step 2: Update pushEvent to also append to EventStore**

Update the `pushEvent` method to create a local SyncEvent and append it:

```swift
/// Push a single event to Supabase and update local EventStore
func pushEvent(type: String, payload: [String: Any]) async throws {
    guard let client = SupabaseClientProvider.shared else {
        throw SyncError.notConfigured
    }

    guard let userId = AuthService.shared.user?.id else {
        throw SyncError.notAuthenticated
    }

    let clientId = "\(ISO8601DateFormatter().string(from: Date()))-\(randomString(length: 6))"
    let clientTimestamp = ISO8601DateFormatter().string(from: Date())

    let eventInsert = SyncEventInsert(
        userId: userId.uuidString,
        type: type,
        payload: payload.mapValues { AnyCodable($0) },
        clientId: clientId,
        clientTimestamp: clientTimestamp
    )

    // Push to cloud
    let response: [SyncEvent] = try await client
        .from("events")
        .insert(eventInsert)
        .select()
        .execute()
        .value

    // Append returned event to local store (has server-generated id and created_at)
    if let event = response.first {
        await MainActor.run {
            EventStore.shared.appendEvent(event)
        }
    }
}
```

**Step 3: Remove old applyEvent methods**

Delete these methods as they're no longer needed:
- `applyEvent(_:to:)`
- `applySproutPlanted(_:to:)`
- `applySproutWatered(_:to:)`
- `applySproutHarvested(_:to:)`
- `applySproutUprooted(_:to:)`
- `applySunShone(_:to:)`
- `applyLeafCreated(_:to:)`

Also remove the old incremental `pullEvents(modelContext:)` method.

**Step 4: Update realtime subscription**

Update `subscribeToRealtime` to just refresh EventStore:

```swift
/// Subscribe to realtime events from other devices
func subscribeToRealtime(onEvent: @escaping (SyncEvent) -> Void) {
    guard let client = SupabaseClientProvider.shared else { return }
    guard let userId = AuthService.shared.user?.id else { return }

    onRealtimeEvent = onEvent
    unsubscribeFromRealtime()

    Task {
        do {
            let channel = client.realtimeV2.channel("events-realtime")
            let insertions = channel.postgresChange(InsertAction.self, table: "events", filter: .eq("user_id", value: userId.uuidString))

            try await channel.subscribe()

            for await insertion in insertions {
                do {
                    let event = try insertion.decodeRecord(as: SyncEvent.self, decoder: JSONDecoder())

                    // Append to local EventStore
                    await MainActor.run {
                        EventStore.shared.appendEvent(event)
                    }

                    onRealtimeEvent?(event)
                    print("Realtime: received event - \(event.type)")
                } catch {
                    print("Realtime: failed to decode - \(error)")
                }
            }
        } catch {
            print("Realtime: failed to subscribe - \(error)")
        }
    }
}
```

**Step 5: Commit**

```bash
git add ios/Trunk/Services/SyncService.swift
git commit -m "refactor(ios): update SyncService to use EventStore instead of SwiftData models"
```

---

### Task 4: Rewrite ProgressionViewModel to derive from EventStore

**Files:**
- Modify: `ios/Trunk/ViewModels/ProgressionViewModel.swift`

**Step 1: Replace entire file**

```swift
//
//  ProgressionViewModel.swift
//  Trunk
//
//  Observable state derived from EventStore - no local storage.
//

import Foundation

@Observable
final class ProgressionViewModel {

    init() {}

    // MARK: - Derived State Access

    private var state: DerivedState {
        EventStore.shared.getState()
    }

    // MARK: - Soil

    var soilCapacity: Double {
        state.soilCapacity
    }

    var soilAvailable: Double {
        state.soilAvailable
    }

    var soilCapacityInt: Int {
        Int(state.soilCapacity.rounded())
    }

    var soilAvailableInt: Int {
        Int(state.soilAvailable.rounded())
    }

    func canAfford(cost: Int) -> Bool {
        soilAvailable >= Double(cost)
    }

    // MARK: - Water

    var waterAvailable: Int {
        EventStore.shared.getWaterAvailable()
    }

    var waterCapacity: Int {
        TrunkConstants.Water.dailyCapacity
    }

    var canWater: Bool {
        waterAvailable > 0
    }

    // MARK: - Sun

    var sunAvailable: Int {
        EventStore.shared.getSunAvailable()
    }

    var sunCapacity: Int {
        TrunkConstants.Sun.weeklyCapacity
    }

    var canShine: Bool {
        sunAvailable > 0
    }

    // MARK: - Refresh

    /// Refresh state (invalidate caches for time-based resources)
    func refresh() {
        EventStore.shared.refresh()
    }

    // MARK: - Debug

    func resetToDefaults() {
        // Clear local events - would need to clear cloud too for real reset
        EventStore.shared.clearEvents()
    }
}
```

**Step 2: Commit**

```bash
git add ios/Trunk/ViewModels/ProgressionViewModel.swift
git commit -m "refactor(ios): ProgressionViewModel now derives state from EventStore"
```

---

### Task 5: Delete ResourceState.swift

**Files:**
- Delete: `ios/Trunk/Models/ResourceState.swift`

**Step 1: Delete the file**

```bash
rm ios/Trunk/Models/ResourceState.swift
```

**Step 2: Commit**

```bash
git add -A
git commit -m "chore(ios): delete ResourceState.swift - resources now derived from events"
```

---

### Task 6: Update views to remove ProgressionViewModel action methods

The views currently call methods like `progression.plantSprout(sprout)` and `progression.useWater()`. Since state is now derived from events, these methods are no longer needed - the views just push events to cloud.

**Files:**
- Modify: `ios/Trunk/Views/Dialogs/CreateSproutView.swift`
- Modify: `ios/Trunk/Views/Dialogs/WaterSproutView.swift`
- Modify: `ios/Trunk/Views/Dialogs/HarvestSproutView.swift`
- Modify: `ios/Trunk/Views/Dialogs/ShineView.swift`

**Step 1: Update CreateSproutView.swift**

In `plantSprout()`, remove the `progression.plantSprout(sprout)` call. The soil is already deducted when deriveState processes the `sprout_planted` event:

```swift
private func plantSprout() {
    let sproutId = UUID().uuidString
    let cost = soilCost

    // Push to cloud - state will derive automatically
    Task {
        try? await SyncService.shared.pushEvent(type: "sprout_planted", payload: [
            "sproutId": sproutId,
            "title": title.trimmingCharacters(in: .whitespacesAndNewlines),
            "twigId": nodeId,
            "season": season.rawValue,
            "environment": environment.rawValue,
            "soilCost": cost,
            "leafId": selectedLeafId as Any,
            "bloomWither": bloomWither,
            "bloomBudding": bloomBudding,
            "bloomFlourish": bloomFlourish
        ])
    }

    HapticManager.success()
    dismiss()
}
```

Also remove the SwiftData model insertion since state is derived from events.

**Step 2: Update WaterSproutView.swift**

Remove `progression.useWater()` call - water availability is derived from event count:

```swift
private func waterSprout() {
    // Push to cloud - state will derive automatically
    Task {
        try? await SyncService.shared.pushEvent(type: "sprout_watered", payload: [
            "sproutId": sprout.sproutId,
            "note": reflection.trimmingCharacters(in: .whitespacesAndNewlines),
            "timestamp": ISO8601DateFormatter().string(from: Date())
        ])
    }

    HapticManager.success()
    dismiss()
}
```

**Step 3: Update HarvestSproutView.swift**

Remove `progression.harvestSprout(sprout, result:)` call - capacity is gained when deriveState processes the event:

```swift
private func harvestSprout() {
    // Calculate capacity gained (same formula as web)
    let capacityGained = ProgressionService.capacityReward(
        season: sprout.season,
        environment: sprout.environment,
        result: selectedResult,
        currentCapacity: progression.soilCapacity
    )

    // Push to cloud - state will derive automatically
    Task {
        try? await SyncService.shared.pushEvent(type: "sprout_harvested", payload: [
            "sproutId": sprout.sproutId,
            "result": selectedResult,
            "capacityGained": capacityGained,
            "reflection": reflection.trimmingCharacters(in: .whitespacesAndNewlines),
            "timestamp": ISO8601DateFormatter().string(from: Date())
        ])
    }

    HapticManager.success()
    dismiss()
}
```

**Step 4: Update ShineView.swift**

Remove `progression.useSun()` call - sun availability is derived from event count:

```swift
private func performShine(twig: TwigContext) {
    // Push to cloud - state will derive automatically
    Task {
        try? await SyncService.shared.pushEvent(type: "sun_shone", payload: [
            "twigId": twig.nodeId,
            "twigLabel": twig.label,
            "note": reflection.trimmingCharacters(in: .whitespacesAndNewlines),
            "timestamp": ISO8601DateFormatter().string(from: Date())
        ])
    }

    HapticManager.success()
    dismiss()
}
```

**Step 5: Commit**

```bash
git add ios/Trunk/Views/Dialogs/CreateSproutView.swift ios/Trunk/Views/Dialogs/WaterSproutView.swift ios/Trunk/Views/Dialogs/HarvestSproutView.swift ios/Trunk/Views/Dialogs/ShineView.swift
git commit -m "refactor(ios): update dialogs to only push events, state derives automatically"
```

---

### Task 7: Update ContentView to pull events on auth

**Files:**
- Modify: `ios/Trunk/ContentView.swift`

**Step 1: Read current file**

Read the file to understand current structure.

**Step 2: Update to pull all events on authentication**

Add event pulling when user authenticates:

```swift
.task {
    if authService.isAuthenticated {
        do {
            _ = try await SyncService.shared.pullAllEvents()
            SyncService.shared.subscribeToRealtime { _ in
                // Event already appended to EventStore by SyncService
            }
        } catch {
            print("Failed to pull events: \(error)")
        }
    }
}
.onChange(of: authService.isAuthenticated) { _, isAuthenticated in
    if isAuthenticated {
        Task {
            do {
                _ = try await SyncService.shared.pullAllEvents()
                SyncService.shared.subscribeToRealtime { _ in }
            } catch {
                print("Failed to pull events: \(error)")
            }
        }
    } else {
        EventStore.shared.clearEvents()
        SyncService.shared.unsubscribeFromRealtime()
    }
}
```

**Step 3: Commit**

```bash
git add ios/Trunk/ContentView.swift
git commit -m "feat(ios): pull all events from cloud on authentication"
```

---

### Task 8: Update views to use EventStore for sprout/leaf data

Views currently use SwiftData `@Query` to fetch sprouts and leaves. They need to use derived state instead.

**Files:**
- Modify: `ios/Trunk/Views/TodayView.swift`
- Modify: `ios/Trunk/Views/OverviewView.swift`
- Modify: `ios/Trunk/Views/TwigDetailView.swift`
- Modify: `ios/Trunk/Views/SagasView.swift`

**Step 1: Create a helper to convert DerivedSprout for UI**

Since many views expect `Sprout` model, we can add a computed property or use derived sprouts directly. For simplicity, update views to use derived state.

Example pattern for TodayView:

```swift
// Replace @Query private var sprouts: [Sprout]
// With computed property from EventStore:

private var activeSprouts: [DerivedSprout] {
    getActiveSprouts(from: EventStore.shared.getState())
}

private var readyToHarvest: [DerivedSprout] {
    activeSprouts.filter { isSproutReady($0) }
}
```

**Step 2: Update each view**

For each view that uses `@Query private var sprouts`:
1. Remove the `@Query` line
2. Add computed property that reads from `EventStore.shared.getState()`
3. Update UI bindings to use `DerivedSprout` properties

**Step 3: Commit after each view**

```bash
git add ios/Trunk/Views/TodayView.swift
git commit -m "refactor(ios): TodayView uses EventStore derived state"

git add ios/Trunk/Views/OverviewView.swift
git commit -m "refactor(ios): OverviewView uses EventStore derived state"

git add ios/Trunk/Views/TwigDetailView.swift
git commit -m "refactor(ios): TwigDetailView uses EventStore derived state"

git add ios/Trunk/Views/SagasView.swift
git commit -m "refactor(ios): SagasView uses EventStore derived state"
```

---

### Task 9: Remove SwiftData models (optional cleanup)

Once all views use derived state, the SwiftData models (Sprout, WaterEntry, SunEntry, Leaf, NodeData) are no longer needed as source of truth. They can be:

1. **Kept as cache** - for offline support, sync models from derived state
2. **Removed entirely** - simplest approach if always online

**Files:**
- Potentially delete: `ios/Trunk/Models/Sprout.swift`
- Potentially delete: `ios/Trunk/Models/WaterEntry.swift`
- Potentially delete: `ios/Trunk/Models/SunEntry.swift`
- Potentially delete: `ios/Trunk/Models/Leaf.swift`
- Modify: `ios/Trunk/TrunkApp.swift` (remove from ModelContainer)

**Decision:** Keep models but don't use them as source of truth. This allows future offline caching.

**Step 1: Update TrunkApp.swift to remove unused models from container (optional)**

For now, keep the models in the schema but don't populate them. This maintains schema compatibility.

**Step 2: Commit**

```bash
git add ios/Trunk/TrunkApp.swift
git commit -m "chore(ios): models kept for schema compatibility, state derived from events"
```

---

### Task 10: Test complete flow

**Manual verification steps:**

1. **Fresh install test:**
   - Delete app
   - Install fresh
   - Login with email
   - Verify events pulled from cloud
   - Verify soil/water/sun display correctly

2. **Cross-platform sync test:**
   - Create sprout on web
   - Verify it appears on iOS immediately (realtime) or after refresh
   - Water sprout on iOS
   - Verify water entry appears on web
   - Harvest sprout on web
   - Verify iOS shows updated soil capacity

3. **Resource derivation test:**
   - Use all 3 waters on web
   - Verify iOS shows 0 water available
   - Wait until 6am reset
   - Verify both platforms show 3 water available

4. **Capacity calculation test:**
   - Note current soil capacity on both platforms
   - Harvest a sprout on one platform
   - Verify BOTH platforms show same increased capacity

**Step 1: Run the app and verify**

```bash
# Open Xcode and run on simulator
open ios/Trunk.xcodeproj
```

**Step 2: Final commit if all tests pass**

```bash
git add -A
git commit -m "feat(ios): complete event-sourced architecture - matches web exactly"
```

---

## Summary

After completing all tasks:

1. **Events are the single source of truth** - stored in Supabase `events` table
2. **Both platforms derive identical state** - using same formulas from `shared/constants.json`
3. **No local resource storage** - ResourceState.swift deleted, soilCapacity/soilAvailable derived
4. **Water/sun availability derived from timestamps** - count events since reset time
5. **Real-time sync works** - events pushed/pulled, state derived automatically

The iOS app now works **exactly** like the web app.
