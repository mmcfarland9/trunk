//
//  EventStore.swift
//  Trunk
//
//  Manages cloud events and derived state - port of web's store.ts.
//  Events are fetched from Supabase and state is derived locally.
//

import Foundation
import Combine

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

    /// Append multiple events then invalidate caches once (for batch sync)
    func appendEvents(_ newEvents: [SyncEvent]) {
        guard !newEvents.isEmpty else { return }
        events.append(contentsOf: newEvents)
        invalidateCache()
    }

    /// Remove a single event by clientId (used to rollback optimistic updates on push failure)
    func removeEvent(withClientId clientId: String) {
        events.removeAll { $0.clientId == clientId }
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
    func checkSproutWateredThisWeek(sproutId: String, now: Date = Date()) -> Bool {
        wasSproutWateredThisWeek(events: events, sproutId: sproutId, now: now)
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
